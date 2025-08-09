document.addEventListener('DOMContentLoaded', () => {
    // --- SELEKTORY I ZMIENNE GLOBALNE ---
    const loadingOverlay = document.getElementById('loadingOverlay');
    const leavesTableBody = document.getElementById('leavesTableBody');
    const leavesHeaderRow = document.getElementById('leavesHeaderRow');
    const modal = document.getElementById('calendarModal');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const confirmBtn = document.getElementById('confirmSelectionBtn');
    const cancelBtn = document.getElementById('cancelSelectionBtn');
    const clearSelectionBtn = document.getElementById('clearSelectionBtn');
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearch');

    // Selektory dla widoków
    const monthlyViewBtn = document.getElementById('monthlyViewBtn');
    const summaryViewBtn = document.getElementById('summaryViewBtn');
    const careViewBtn = document.getElementById('careViewBtn');
    const monthlyViewContainer = document.getElementById('leavesTable');
    const careViewContainer = document.getElementById('careViewContainer');


    // Nowe selektory dla modala z dwoma kalendarzami
    const startDatePreview = document.getElementById('startDatePreview');
    const endDatePreview = document.getElementById('endDatePreview');
    const calendarSlider = document.querySelector('.calendar-slider');
    const workdaysCounter = document.getElementById('workdaysCounter');


    let currentEmployee = null;
    let currentYear = new Date().getUTCFullYear();
    let leftCalendarDate = new Date(Date.UTC(currentYear, new Date().getUTCMonth(), 1));
    
    let selectionStartDate = null;
    let hoverEndDate = null;
    let singleSelectedDays = new Set();
    let isRangeSelectionActive = false;
    let isAnimating = false;
    let dateToTypeMap = new Map();

    // --- FUNKCJE POMOCNICZE UTC ---
    const toUTCDate = (dateString) => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day));
    };

    const toDateString = (date) => {
        return date.toISOString().split('T')[0];
    };

    /**
     * Zlicza dni robocze (pon-pt) w danym secie dat.
     * @param {Set<string>} datesSet - Set z datami w formacie YYYY-MM-DD.
     * @returns {number} Liczba dni roboczych.
     */
    const countWorkdaysInSet = (datesSet) => {
        let workdays = 0;
        datesSet.forEach(dateString => {
            const day = new Date(dateString + 'T00:00:00Z').getUTCDay();
            if (day !== 0 && day !== 6) { // 0 = Niedziela, 6 = Sobota
                workdays++;
            }
        });
        return workdays;
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
                { id: 'contextOpenCalendar', action: (cell) => openModal(cell) },
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
        
        leavesTableBody.addEventListener('click', (event) => {
            const targetCell = event.target.closest('.day-cell');
            if (targetCell) openModal(targetCell);
        });

    prevMonthBtn.addEventListener('click', handlePrevMonth);
    nextMonthBtn.addEventListener('click', handleNextMonth);

    calendarSlider.addEventListener('click', handleDayClick);
    calendarSlider.addEventListener('mouseover', handleDayMouseOver);

        confirmBtn.addEventListener('click', confirmSelection);
        cancelBtn.addEventListener('click', closeModal);

        clearSelectionBtn.addEventListener('click', () => {
            resetSelection();
            updateAllDayCells();
            updateSelectionPreview();
        });

        modal.addEventListener('click', (event) => {
            if (event.target === modal) closeModal();
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
            return {}; // Zwróć pusty obiekt w przypadku błędu, aby uniknąć dalszych problemów
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

    const openModal = (cell) => {
        if (!cell) return;
        currentEmployee = cell.closest('tr').dataset.employee;
        const monthIndex = parseInt(cell.dataset.month, 10);
        leftCalendarDate = new Date(Date.UTC(currentYear, monthIndex, 1));
        dateToTypeMap.clear();
        resetSelection();
        loadEmployeeLeavesForModal();
        modal.style.display = 'flex';
    };

    const closeModal = () => {
        modal.style.display = 'none';
        currentEmployee = null;
    };

    const resetSelection = () => {
        selectionStartDate = null;
        hoverEndDate = null;
        singleSelectedDays.clear();
        isRangeSelectionActive = false;
        updateSelectionPreview();
    };

    const loadEmployeeLeavesForModal = async () => {
        try {
            const allLeaves = await getAllLeavesData();
            const employeeLeaves = allLeaves[currentEmployee] || [];
            employeeLeaves.forEach(leave => {
                const start = toUTCDate(leave.startDate);
                const end = toUTCDate(leave.endDate);
                for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
                    const dateString = toDateString(d);
                    singleSelectedDays.add(dateString);
                    // Zapisz typ dla każdego dnia istniejącego urlopu
                    dateToTypeMap.set(dateString, leave.type || 'vacation');
                }
            });
        } catch (error) {
            console.error("Błąd ładowania urlopów pracownika do modala:", error);
            window.showToast("Nie udało się załadować szczegółów urlopu.", 5000);
        } finally {
            generateInitialCalendars();
            updateSelectionPreview();
        }
    };

    const createCalendar = (year, month) => {
        const calendarWrapper = document.createElement('div');
        calendarWrapper.className = 'calendar-wrapper';

        const header = document.createElement('h2');
        header.textContent = `${months[month]} ${year}`;

        const grid = document.createElement('div');
        grid.className = 'calendar-grid';
        grid.innerHTML = `<div class="day-name">Po</div><div class="day-name">Wt</div><div class="day-name">Śr</div><div class="day-name">Cz</div><div class="day-name">Pi</div><div class="day-name">So</div><div class="day-name">Ni</div>`;

        const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
        const startingDay = (firstDayOfMonth.getUTCDay() === 0) ? 6 : firstDayOfMonth.getUTCDay() - 1;
        for (let i = 0; i < startingDay; i++) {
            grid.insertAdjacentHTML('beforeend', `<div class="day-cell-calendar other-month"></div>`);
        }

        const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        for (let i = 1; i <= daysInMonth; i++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'day-cell-calendar';
            dayCell.textContent = i;
            dayCell.dataset.date = toDateString(new Date(Date.UTC(year, month, i)));
            grid.appendChild(dayCell);
        }

        calendarWrapper.appendChild(header);
        calendarWrapper.appendChild(grid);
        return calendarWrapper;
    };

    const generateInitialCalendars = () => {
        calendarSlider.innerHTML = '';
        
        const currentMonthDate = new Date(leftCalendarDate);
        const nextMonthDate = new Date(leftCalendarDate);
        nextMonthDate.setUTCMonth(nextMonthDate.getUTCMonth() + 1);

        calendarSlider.appendChild(createCalendar(currentMonthDate.getUTCFullYear(), currentMonthDate.getUTCMonth()));
        calendarSlider.appendChild(createCalendar(nextMonthDate.getUTCFullYear(), nextMonthDate.getUTCMonth()));
        
        calendarSlider.style.width = '100%';
        calendarSlider.style.transform = 'translateX(0)';

        updateAllDayCells();
    };

    const handleNextMonth = () => {
        if (isAnimating) return;
        isAnimating = true;
        prevMonthBtn.disabled = true;
        nextMonthBtn.disabled = true;

        leftCalendarDate.setUTCMonth(leftCalendarDate.getUTCMonth() + 1);
        
        const nextMonthDate = new Date(leftCalendarDate);
        nextMonthDate.setUTCMonth(nextMonthDate.getUTCMonth() + 1);
        const newCalendar = createCalendar(nextMonthDate.getUTCFullYear(), nextMonthDate.getUTCMonth());
        
        calendarSlider.appendChild(newCalendar);
        calendarSlider.style.transform = 'translateX(-50%)';

        const onTransitionEnd = () => {
            calendarSlider.removeEventListener('transitionend', onTransitionEnd);
            calendarSlider.classList.add('no-transition');
            calendarSlider.removeChild(calendarSlider.firstElementChild);
            calendarSlider.style.transform = 'translateX(0)';
            updateAllDayCells();

            void calendarSlider.offsetWidth;
            calendarSlider.classList.remove('no-transition');

            isAnimating = false;
            prevMonthBtn.disabled = false;
            nextMonthBtn.disabled = false;
        };

        calendarSlider.addEventListener('transitionend', onTransitionEnd);
    };

    const handlePrevMonth = () => {
        if (isAnimating) return;
        isAnimating = true;
        prevMonthBtn.disabled = true;
        nextMonthBtn.disabled = true;

        leftCalendarDate.setUTCMonth(leftCalendarDate.getUTCMonth() - 1);

        const newMonthDate = new Date(leftCalendarDate);
        const newCalendar = createCalendar(newMonthDate.getUTCFullYear(), newMonthDate.getUTCMonth());
        
        calendarSlider.insertBefore(newCalendar, calendarSlider.firstElementChild);
        calendarSlider.classList.add('no-transition');
        calendarSlider.style.transform = 'translateX(-50%)';
        
        void calendarSlider.offsetWidth;
        calendarSlider.classList.remove('no-transition');
        calendarSlider.style.transform = 'translateX(0)';


        const onTransitionEnd = () => {
            calendarSlider.removeEventListener('transitionend', onTransitionEnd);
            calendarSlider.classList.add('no-transition');
            calendarSlider.removeChild(calendarSlider.lastElementChild);
            calendarSlider.style.transform = 'translateX(0)';
            updateAllDayCells();
            
            void calendarSlider.offsetWidth;
            calendarSlider.classList.remove('no-transition');

            isAnimating = false;
            prevMonthBtn.disabled = false;
            nextMonthBtn.disabled = false;
        };

        calendarSlider.addEventListener('transitionend', onTransitionEnd);
    };

    const updateAllDayCells = () => {
        document.querySelectorAll('#calendarModal .day-cell-calendar').forEach(cell => {
            if (cell.dataset.date) updateDayCellSelection(cell);
        });
    };

    const updateDayCellSelection = (dayCell) => {
        const dateString = dayCell.dataset.date;
        dayCell.className = 'day-cell-calendar';
        let startStr = selectionStartDate;
        let endStr = hoverEndDate;
        if (startStr && endStr && startStr > endStr) [startStr, endStr] = [endStr, startStr];
        const isInRange = isRangeSelectionActive && startStr && endStr && dateString >= startStr && dateString <= endStr;
        if (singleSelectedDays.has(dateString) || isInRange) {
            dayCell.classList.add('selected');
            const isStartDate = dateString === startStr || (singleSelectedDays.has(dateString) && !singleSelectedDays.has(toDateString(new Date(toUTCDate(dateString).getTime() - 86400000))));
            const isEndDate = dateString === endStr || (singleSelectedDays.has(dateString) && !singleSelectedDays.has(toDateString(new Date(toUTCDate(dateString).getTime() + 86400000))));
            if (isInRange && dateString !== startStr && dateString !== endStr) dayCell.classList.add('in-range');
            if (isStartDate) dayCell.classList.add('start-date');
            if (isEndDate) dayCell.classList.add('end-date');
        }
    };

    const handleDayClick = (event) => {
        const target = event.target.closest('.day-cell-calendar');
        if (!target || !target.dataset.date) return;
        const clickedDate = target.dataset.date;
        if (event.ctrlKey || event.metaKey) {
            isRangeSelectionActive = false;
            selectionStartDate = null;
            if (singleSelectedDays.has(clickedDate)) {
                singleSelectedDays.delete(clickedDate);
            } else {
                singleSelectedDays.add(clickedDate);
            }
        } else {
            if (!isRangeSelectionActive) {
                isRangeSelectionActive = true;
                selectionStartDate = clickedDate;
            } else {
                let start = selectionStartDate;
                let end = clickedDate;
                if (start > end) [start, end] = [end, start];
                const startDate = toUTCDate(start);
                const endDate = toUTCDate(end);
                for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
                    singleSelectedDays.add(toDateString(d));
                }
                isRangeSelectionActive = false;
                selectionStartDate = null;
            }
        }
        hoverEndDate = null;
        updateAllDayCells();
        updateSelectionPreview();
    };

    const handleDayMouseOver = (event) => {
        const target = event.target.closest('.day-cell-calendar');
        if (!target || !target.dataset.date || !isRangeSelectionActive) return;
        if (hoverEndDate !== target.dataset.date) {
            hoverEndDate = target.dataset.date;
            updateAllDayCells();
        }
    };

    const updateSelectionPreview = () => {
        const dates = Array.from(singleSelectedDays).sort();
        startDatePreview.textContent = dates.length > 0 ? dates[0] : '-';
        endDatePreview.textContent = dates.length > 0 ? dates[dates.length - 1] : '-';
        workdaysCounter.textContent = countWorkdaysInSet(singleSelectedDays);
    };

    const confirmSelection = async () => {
        if (!currentEmployee) return;

        const leaveTypeSelect = document.getElementById('leaveTypeSelect');
        const selectedLeaveType = leaveTypeSelect.value;

        const sortedDays = Array.from(singleSelectedDays).sort();
        const newLeaves = [];
        if (sortedDays.length > 0) {
            let rangeStart = sortedDays[0];
            let rangeEnd = sortedDays[0];

            for (let i = 1; i < sortedDays.length; i++) {
                const prevDay = toUTCDate(sortedDays[i - 1]);
                const currentDay = toUTCDate(sortedDays[i]);
                const diff = (currentDay - prevDay) / (1000 * 60 * 60 * 24);

                // Sprawdź, czy typ bieżącego dnia jest taki sam jak typ dnia początkowego zakresu
                const startType = dateToTypeMap.get(rangeStart) || selectedLeaveType;
                const currentType = dateToTypeMap.get(sortedDays[i]) || selectedLeaveType;

                if (diff === 1 && startType === currentType) {
                    rangeEnd = sortedDays[i];
                } else {
                    // Zapisz poprzedni blok
                    newLeaves.push({
                        id: toUTCDate(rangeStart).getTime().toString(),
                        startDate: rangeStart,
                        endDate: rangeEnd,
                        type: startType
                    });
                    // Rozpocznij nowy blok
                    rangeStart = sortedDays[i];
                    rangeEnd = sortedDays[i];
                }
            }
            // Zapisz ostatni blok
            newLeaves.push({
                id: toUTCDate(rangeStart).getTime().toString(),
                startDate: rangeStart,
                endDate: rangeEnd,
                type: dateToTypeMap.get(rangeStart) || selectedLeaveType
            });
        }
        await saveLeavesData(currentEmployee, newLeaves);
        renderSingleEmployeeLeaves(currentEmployee, newLeaves);
        closeModal();
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
