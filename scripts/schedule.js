document.addEventListener('DOMContentLoaded', () => {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const undoButton = document.getElementById('undoButton');

    const appState = {
        scheduleCells: {}
    };

    const undoManager = new UndoManager({
        maxStates: AppConfig.undoManager.maxStates,
        onUpdate: (manager) => {
            undoButton.disabled = !manager.canUndo();
        }
    });

    const loadSchedule = async () => {
        try {
            const docRef = db.collection(AppConfig.firestore.collections.schedules).doc(AppConfig.firestore.docs.mainSchedule);
            const doc = await docRef.get();
            if (doc.exists) {
                const savedData = doc.data();
                appState.scheduleCells = savedData.scheduleCells || {};
            } else {
                console.log("No schedule found, creating a new one.");
            }
        } catch (error) {
            console.error('Error loading schedule from Firestore:', error);
            window.showToast('Błąd podczas ładowania grafiku. Spróbuj ponownie.', 5000);
        }
    };

    const saveSchedule = async () => {
        try {
            await db.collection(AppConfig.firestore.collections.schedules).doc(AppConfig.firestore.docs.mainSchedule).set(appState, { merge: true });
            window.showToast('Grafik zapisany pomyślnie.', 2000);
        } catch (error) {
            console.error('Error saving schedule to Firestore:', error);
            window.showToast('Wystąpił błąd podczas zapisu grafiku. Spróbuj ponownie.', 5000);
        }
    };

    const renderAndSave = () => {
        ScheduleUI.render();
        saveSchedule();
    };

    const updateCellState = (cell, updateFn) => {
        if (!cell) return;
        undoManager.pushState(getCurrentTableState());
        const time = cell.dataset.time;
        const employeeIndex = cell.dataset.employeeIndex;
        if (!appState.scheduleCells[time]) appState.scheduleCells[time] = {};
        let cellState = appState.scheduleCells[time][employeeIndex] || {};
        
        updateFn(cellState);

        appState.scheduleCells[time][employeeIndex] = cellState;
        
        renderAndSave();
        undoManager.pushState(getCurrentTableState());
    };
    
    const getCurrentTableState = () => JSON.parse(JSON.stringify(appState));

    const init = async () => {
        loadingOverlay.style.display = 'flex';
        try {
            await EmployeeManager.load();
            await loadSchedule();
            
            ScheduleUI.initialize(appState);
            ScheduleEvents.initialize({
                appState: appState,
                undoManager: undoManager,
                ui: ScheduleUI,
                updateCellState: updateCellState,
                renderAndSave: renderAndSave,
                getCurrentTableState: getCurrentTableState,
                // Przekaż wszystkie potrzebne funkcje z oryginalnego pliku z zachowaniem kontekstu
                exitEditMode: mainController.exitEditMode.bind(mainController),
                enterEditMode: mainController.enterEditMode.bind(mainController),
                getCurrentTableStateForCell: mainController.getCurrentTableStateForCell.bind(mainController),
                openPatientInfoModal: mainController.openPatientInfoModal.bind(mainController),
                toggleSpecialStyle: mainController.toggleSpecialStyle.bind(mainController),
                undoLastAction: mainController.undoLastAction.bind(mainController)
            });

            ScheduleUI.render();
            undoManager.initialize(getCurrentTableState());

        } catch (error) {
            console.error("Błąd inicjalizacji strony harmonogramu:", error);
            window.showToast("Wystąpił krytyczny błąd inicjalizacji. Odśwież stronę.", 5000);
        } finally {
            hideLoadingOverlay(loadingOverlay);
        }
    };

    // Obiekt kontrolera, aby zachować metody, które są przekazywane
    const mainController = {
        exitEditMode(element) {
            if (!element || element.getAttribute('contenteditable') !== 'true') return;
            const newText = capitalizeFirstLetter(element.textContent.trim());
            element.setAttribute('contenteditable', 'false');
            const parentCell = element.closest('td');
            if (!parentCell) return;
            const employeeIndex = parentCell.dataset.employeeIndex;
            const time = parentCell.dataset.time;
            const duplicate = this.findDuplicateEntry(newText, time, employeeIndex);
            const updateSchedule = (isMove = false) => {
                if (isMove && duplicate) {
                    const oldCellState = appState.scheduleCells[duplicate.time][duplicate.employeeIndex];
                    if (oldCellState.content?.toLowerCase() === newText.toLowerCase()) delete oldCellState.content;
                    if (oldCellState.content1?.toLowerCase() === newText.toLowerCase()) delete oldCellState.content1;
                    if (oldCellState.content2?.toLowerCase() === newText.toLowerCase()) delete oldCellState.content2;
                    if (oldCellState.isSplit && !oldCellState.content1 && !oldCellState.content2) delete oldCellState.isSplit;
                }
                if (!appState.scheduleCells[time]) appState.scheduleCells[time] = {};
                if (!appState.scheduleCells[time][employeeIndex]) appState.scheduleCells[time][employeeIndex] = {};
                let cellState = appState.scheduleCells[time][employeeIndex];
                if (newText.includes('/')) {
                    const parts = newText.split('/', 2);
                    cellState = { isSplit: true, content1: parts[0], content2: parts[1] };
                } else if (cellState.isSplit) {
                    const isFirstDiv = element === parentCell.querySelector('div:first-child');
                    if (isFirstDiv) cellState.content1 = newText;
                    else cellState.content2 = newText;
                    if (!cellState.content1 && !cellState.content2) cellState = {};
                } else {
                    cellState = { content: newText };
                }
                appState.scheduleCells[time][employeeIndex] = cellState;
                renderAndSave();
                undoManager.pushState(getCurrentTableState());
            };
            if (duplicate) {
                this.showDuplicateConfirmationDialog(duplicate, () => updateSchedule(true), () => updateSchedule(false), () => { ScheduleUI.render(); });
            } else {
                updateSchedule(false);
            }
        },
        enterEditMode(element, clearContent = false, initialChar = '') {
            if (!element || element.classList.contains('break-cell') || element.getAttribute('contenteditable') === 'true') return;
            if (element.tagName === 'TD' && element.classList.contains('split-cell')) {
                const firstDiv = element.querySelector('div');
                if (firstDiv) {
                    this.enterEditMode(firstDiv, clearContent, initialChar);
                }
                return;
            }
            const isEditableTarget = (element.tagName === 'TD' && !element.classList.contains('split-cell')) || (element.tagName === 'DIV' && element.parentNode.classList.contains('split-cell'));
            if (!isEditableTarget) return;
            undoManager.pushState(getCurrentTableState());
            const originalValue = ScheduleUI.getElementText(element);
            element.dataset.originalValue = originalValue;
            element.innerHTML = ScheduleUI.getElementText(element);
            element.setAttribute('contenteditable', 'true');
            element.classList.remove('massage-text', 'pnf-text');
            delete element.dataset.isMassage;
            delete element.dataset.isPnf;
            if (clearContent) {
                element.textContent = initialChar;
            } else if (initialChar) {
                element.textContent += initialChar;
            }
            element.focus();
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(element);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        },
        findDuplicateEntry(text, currentTime, currentEmployeeIndex) {
            if (!text) return null;
            const lowerCaseText = text.toLowerCase();
            for (const time in appState.scheduleCells) {
                for (const employeeIndex in appState.scheduleCells[time]) {
                    if (time === currentTime && employeeIndex === currentEmployeeIndex) {
                        continue;
                    }
                    const cellData = appState.scheduleCells[time][employeeIndex];
                    if (cellData.content?.toLowerCase() === lowerCaseText ||
                        cellData.content1?.toLowerCase() === lowerCaseText ||
                        cellData.content2?.toLowerCase() === lowerCaseText) {
                        return { time, employeeIndex, cellData };
                    }
                }
            }
            return null;
        },
        showDuplicateConfirmationDialog(duplicateInfo, onMove, onAdd, onCancel) {
            const modal = document.getElementById('duplicateModal');
            const modalText = document.getElementById('duplicateModalText');
            const moveBtn = document.getElementById('moveEntryBtn');
            const addBtn = document.getElementById('addAnywayBtn');
            const cancelBtn = document.getElementById('cancelBtn');
            const employeeName = EmployeeManager.getNameById(duplicateInfo.employeeIndex);
            modalText.innerHTML = `Znaleziono identyczny wpis dla "<b>${employeeName}</b>" o godzinie ${duplicateInfo.time}. Co chcesz zrobić?`;
            modal.style.display = 'block';
            const closeAndCleanup = () => {
                modal.style.display = 'none';
                moveBtn.onclick = null;
                addBtn.onclick = null;
                cancelBtn.onclick = null;
            };
            moveBtn.onclick = () => { closeAndCleanup(); onMove(); };
            addBtn.onclick = () => { closeAndCleanup(); onAdd(); };
            cancelBtn.onclick = () => {
                closeAndCleanup();
                if (onCancel) onCancel();
            };
        },
        getCurrentTableStateForCell(cell) {
            if (cell.tagName === 'TH') {
                return { content: ScheduleUI.getElementText(cell) };
            }
            if (cell.classList.contains('break-cell')) {
                return { content: AppConfig.schedule.breakText, isBreak: true };
            }
            if (cell.classList.contains('split-cell')) {
                const part1 = cell.children[0];
                const part2 = cell.children[1];
                return {
                    content1: ScheduleUI.getElementText(part1),
                    content2: ScheduleUI.getElementText(part2),
                    isSplit: true,
                    isMassage1: part1?.dataset.isMassage === 'true',
                    isMassage2: part2?.dataset.isMassage === 'true',
                    isPnf1: part1?.dataset.isPnf === 'true',
                    isPnf2: part2?.dataset.isPnf === 'true'
                };
            }
            return {
                content: ScheduleUI.getElementText(cell),
                isMassage: cell.dataset.isMassage === 'true',
                isPnf: cell.dataset.isPnf === 'true'
            };
        },
        openPatientInfoModal(cell) {
            const patientName = ScheduleUI.getElementText(cell);
            if (!patientName) {
                window.showToast("Brak pacjenta w tej komórce.", 3000);
                return;
            }
            const modal = document.getElementById('patientInfoModal');
            const patientNameInput = document.getElementById('patientName');
            const startDateInput = document.getElementById('treatmentStartDate');
            const extensionDaysInput = document.getElementById('treatmentExtensionDays');
            const endDateInput = document.getElementById('treatmentEndDate');
            const saveModalBtn = document.getElementById('savePatientInfoModal');
            const closeModalBtn = document.getElementById('closePatientInfoModal');
            const time = cell.dataset.time;
            const employeeIndex = cell.dataset.employeeIndex;
            const cellState = appState.scheduleCells[time]?.[employeeIndex] || {};
            patientNameInput.value = patientName;
            startDateInput.value = cellState.treatmentStartDate || new Date().toISOString().split('T')[0];
            extensionDaysInput.value = cellState.treatmentExtensionDays || 0;
            const calculateEndDate = (startDate, extensionDays) => {
                let endDate = new Date(startDate);
                let totalDays = 15 + parseInt(extensionDays, 10);
                let daysAdded = 0;
                while (daysAdded < totalDays) {
                    endDate.setDate(endDate.getDate() + 1);
                    const dayOfWeek = endDate.getDay();
                    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                        daysAdded++;
                    }
                }
                return endDate.toISOString().split('T')[0];
            };
            const updateEndDate = () => {
                endDateInput.value = calculateEndDate(startDateInput.value, extensionDaysInput.value);
            };
            updateEndDate();
            startDateInput.addEventListener('change', updateEndDate);
            extensionDaysInput.addEventListener('input', updateEndDate);
            const closeModal = () => {
                startDateInput.removeEventListener('change', updateEndDate);
                extensionDaysInput.removeEventListener('input', updateEndDate);
                modal.style.display = 'none';
            };
            saveModalBtn.onclick = () => {
                updateCellState(cell, state => {
                    state.treatmentStartDate = startDateInput.value;
                    state.treatmentExtensionDays = parseInt(extensionDaysInput.value, 10);
                    state.treatmentEndDate = endDateInput.value;
                });
                window.showToast("Zapisano daty zabiegów.");
                closeModal();
            };
            closeModalBtn.onclick = closeModal;
            modal.onclick = (event) => {
                if (event.target === modal) {
                    closeModal();
                }
            };
            modal.style.display = 'flex';
        },
        toggleSpecialStyle(cell, dataAttribute) {
            updateCellState(cell, state => {
                state[dataAttribute] = !state[dataAttribute];
                 if (state.isSplit) {
                    state[`${dataAttribute}1`] = state[dataAttribute];
                    state[`${dataAttribute}2`] = state[dataAttribute];
                }
                window.showToast('Zmieniono styl');
            });
        },
        undoLastAction() {
            const prevState = undoManager.undo();
            if (prevState) {
                appState.scheduleCells = prevState.scheduleCells;
                renderAndSave();
            }
        }
    };

    init();
});
