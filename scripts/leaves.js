document.addEventListener('DOMContentLoaded', () => {
    // --- SELEKTORY I ZMIENNE GLOBALNE ---
    const loadingOverlay = document.getElementById('loadingOverlay');
    const leavesTableBody = document.getElementById('leavesTableBody');
    const leavesHeaderRow = document.getElementById('leavesHeaderRow');
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearch');

    // Selektory dla widoków
    const monthlyViewBtn = document.getElementById('monthlyViewBtn');
    const summaryViewBtn = document.getElementById('summaryViewBtn');
    const careViewBtn = document.getElementById('careViewBtn');
    const monthlyViewContainer = document.getElementById('leavesTable');
    const careViewContainer = document.getElementById('careViewContainer');

    let currentYear = new Date().getUTCFullYear();

    // --- FUNKCJE POMOCNICZE UTC ---
    const toUTCDate = (dateString) => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day));
    };

    // --- GŁÓWNA LOGIKA APLIKACJI ---

    const generateLegend = () => {
        const legendContainer = document.getElementById('leavesLegend');
        legendContainer.innerHTML = '<h4>Legenda:</h4>';
        const leaveTypeSelect = document.getElementById('leaveTypeSelect');
        
        Array.from(leaveTypeSelect.options).forEach(option => {
            const key = option.value;
            const color = AppConfig.leaves.leaveTypeColors[key] || AppConfig.leaves.leaveTypeColors.default;
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `<span class="legend-color-box" style="background-color: ${color};"></span> ${option.textContent}`;
            legendContainer.appendChild(legendItem);
        });
    };

    const initializePage = async () => {
        loadingOverlay.style.display = 'flex';
        try {
            await EmployeeManager.load();
            setupEventListeners();
            await showMonthlyView();
            generateLegend();

            // --- Inicjalizacja Menu Kontekstowego ---
            const contextMenuItems = [
                { id: 'contextClearCell', action: (cell) => clearCellLeaves(cell) }
            ];
            window.initializeContextMenu('contextMenu', '.day-cell', contextMenuItems);

        } catch (error) {
            console.error("Błąd inicjalizacji strony urlopów:", error);
            window.showToast("Wystąpił krytyczny błąd inicjalizacji. Odśwież stronę.", 5000);
        } finally {
            hideLoadingOverlay(loadingOverlay);
        }
    };

    const setupEventListeners = () => {
        monthlyViewBtn.addEventListener('click', showMonthlyView);
        summaryViewBtn.addEventListener('click', showSummaryView);
        careViewBtn.addEventListener('click', showCareView);
        
        leavesTableBody.addEventListener('click', async (event) => {
            const targetCell = event.target.closest('.day-cell');
            if (!targetCell) return;

            const employeeName = targetCell.closest('tr').dataset.employee;
            const monthIndex = parseInt(targetCell.dataset.month, 10);
            
            try {
                const allLeaves = await getAllLeavesData();
                const existingLeaves = allLeaves[employeeName] || [];
                const updatedLeaves = await CalendarModal.open(employeeName, existingLeaves, monthIndex);
                
                await saveLeavesData(employeeName, updatedLeaves);
                renderSingleEmployeeLeaves(employeeName, updatedLeaves);
            } catch (error) {
                console.log("Operacja w kalendarzu została anulowana.", error);
                window.showToast("Anulowano zmiany.", 2000);
            }
        });

        searchInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value.trim().toLowerCase();
            document.querySelectorAll('#leavesTableBody tr').forEach(row => {
                row.style.display = row.dataset.employee.toLowerCase().includes(searchTerm) ? '' : 'none';
            });
            clearSearchBtn.style.display = searchTerm ? 'block' : 'none';
        });

        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
        });
    };

    const showMonthlyView = async () => {
        monthlyViewBtn.classList.add('active');
        summaryViewBtn.classList.remove('active');
        careViewBtn.classList.remove('active');

        monthlyViewContainer.style.display = '';
        careViewContainer.style.display = 'none';

        generateTableHeaders();
        const employees = EmployeeManager.getAll();
        generateTableRows(employees);
        const allLeaves = await getAllLeavesData();
        renderAllEmployeeLeaves(allLeaves);
    };

    const showSummaryView = async () => {
        monthlyViewBtn.classList.remove('active');
        summaryViewBtn.classList.add('active');
        careViewBtn.classList.remove('active');
        
        monthlyViewContainer.style.display = ''; // Podsumowanie roczne używa tej samej tabeli
        careViewContainer.style.display = 'none';

        const allLeaves = await getAllLeavesData();
        LeavesSummary.render(leavesHeaderRow, leavesTableBody, allLeaves);
    };

    const showCareView = async () => {
        monthlyViewBtn.classList.remove('active');
        summaryViewBtn.classList.remove('active');
        careViewBtn.classList.add('active');

        monthlyViewContainer.style.display = 'none';
        careViewContainer.style.display = 'block';

        const allLeaves = await getAllLeavesData();
        LeavesCareSummary.render(careViewContainer, allLeaves);
    };

    const generateTableHeaders = () => {
        leavesHeaderRow.innerHTML = `<th>Pracownik / ${currentYear}</th>`;
        months.forEach(month => {
            const th = document.createElement('th');
            th.textContent = month;
            leavesHeaderRow.appendChild(th);
        });
    };

    const generateTableRows = (employees) => {
        leavesTableBody.innerHTML = '';
        const sortedEmployeeNames = Object.values(employees).map(emp => emp.name).filter(Boolean).sort();
        sortedEmployeeNames.forEach(name => {
            const tr = document.createElement('tr');
            tr.dataset.employee = name;
            const nameTd = document.createElement('td');
            nameTd.textContent = name;
            nameTd.classList.add('employee-name-cell');
            tr.appendChild(nameTd);
            months.forEach((_, monthIndex) => {
                const monthTd = document.createElement('td');
                monthTd.classList.add('day-cell');
                monthTd.dataset.month = monthIndex;
                monthTd.setAttribute('tabindex', '0');
                tr.appendChild(monthTd);
            });
            leavesTableBody.appendChild(tr);
        });
    };

    const getAllLeavesData = async () => {
        try {
            const docRef = db.collection(AppConfig.firestore.collections.leaves).doc(AppConfig.firestore.docs.mainLeaves);
            const doc = await docRef.get();
            return doc.exists ? doc.data() : {};
        } catch (error) {
            console.error("Błąd podczas ładowania danych o urlopach z Firestore:", error);
            window.showToast("Wystąpił błąd podczas ładowania danych o urlopach. Spróbuj ponownie.", 5000);
            return {};
        }
    };

    const saveLeavesData = async (employeeName, leaves) => {
        try {
            await db.collection(AppConfig.firestore.collections.leaves).doc(AppConfig.firestore.docs.mainLeaves).set({ [employeeName]: leaves }, { merge: true });
            window.showToast('Urlopy zapisane pomyślnie.', 2000);
        } catch (error) {
            console.error('Błąd podczas zapisu urlopów do Firestore:', error);
            window.showToast('Wystąpił błąd podczas zapisu urlopów. Spróbuj ponownie.', 5000);
        }
    };

    const renderAllEmployeeLeaves = (allLeaves) => {
        Object.keys(allLeaves).forEach(employeeName => {
            renderSingleEmployeeLeaves(employeeName, allLeaves[employeeName] || []);
        });
    };

    const renderSingleEmployeeLeaves = (employeeName, leaves) => {
        const employeeRow = leavesTableBody.querySelector(`tr[data-employee="${employeeName}"]`);
        if (!employeeRow) return;
        employeeRow.querySelectorAll('.day-cell').forEach(cell => { cell.innerHTML = ''; });

        leaves.forEach(leave => {
            if (!leave.id || !leave.startDate || !leave.endDate) return;
            
            const bgColor = AppConfig.leaves.leaveTypeColors[leave.type] || AppConfig.leaves.leaveTypeColors.default;
            const start = toUTCDate(leave.startDate);
            const end = toUTCDate(leave.endDate);
            let currentMonth = -1;
            for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
                if (d.getUTCFullYear() !== currentYear) continue;
                if (d.getUTCMonth() !== currentMonth) {
                    currentMonth = d.getUTCMonth();
                    const cell = employeeRow.querySelector(`td[data-month="${currentMonth}"]`);
                    if (!cell) continue;
                    const monthStart = new Date(Math.max(start, Date.UTC(currentYear, currentMonth, 1)));
                    const monthEnd = new Date(Math.min(end, Date.UTC(currentYear, currentMonth + 1, 0)));
                    const div = document.createElement('div');
                    div.classList.add('leave-block');
                    div.style.backgroundColor = bgColor;
                    let text = '';
                    if (start < monthStart) text += `<span class="arrow">←</span> `;
                    text += `${monthStart.getUTCDate()}`;
                    if (monthStart.getTime() !== monthEnd.getTime()) text += `-${monthEnd.getUTCDate()}`;
                    if (end > monthEnd) text += ` <span class="arrow">→</span>`;
                    div.innerHTML = text;
                    cell.appendChild(div);
                }
            }
        });
    };

    const clearCellLeaves = async (cell) => {
        if (!cell) return;
        const employeeName = cell.closest('tr').dataset.employee;
        const monthToClear = parseInt(cell.dataset.month, 10);
        try {
            const allLeaves = await getAllLeavesData();
            const employeeLeaves = allLeaves[employeeName] || [];
            const remainingLeaves = employeeLeaves.filter(leave => {
                const start = toUTCDate(leave.startDate);
                const end = toUTCDate(leave.endDate);
                return end.getUTCMonth() < monthToClear || start.getUTCMonth() > monthToClear;
            });
            await saveLeavesData(employeeName, remainingLeaves);
            renderSingleEmployeeLeaves(employeeName, remainingLeaves);
        } catch (error) {
            console.error("Błąd podczas czyszczenia urlopów w komórce:", error);
            window.showToast("Wystąpił błąd podczas czyszczenia urlopów. Spróbuj ponownie.", 5000);
        }
    };

    initializePage();
});
