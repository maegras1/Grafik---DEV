// scripts/calendar-modal.js
const CalendarModal = (() => {
    // --- SELEKTORY I ZMIENNE WEWNĘTRZNE MODUŁU ---
    const modal = document.getElementById('calendarModal');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const confirmBtn = document.getElementById('confirmSelectionBtn');
    const cancelBtn = document.getElementById('cancelSelectionBtn');
    const clearSelectionBtn = document.getElementById('clearSelectionBtn');
    const startDatePreview = document.getElementById('startDatePreview');
    const endDatePreview = document.getElementById('endDatePreview');
    const calendarSlider = document.querySelector('.calendar-slider');
    const workdaysCounter = document.getElementById('workdaysCounter');
    const leaveTypeSelect = document.getElementById('leaveTypeSelect');

    let currentEmployee = null;
    let currentYear = new Date().getUTCFullYear();
    let leftCalendarDate = new Date(Date.UTC(currentYear, new Date().getUTCMonth(), 1));
    
    let selectionStartDate = null;
    let hoverEndDate = null;
    let singleSelectedDays = new Set();
    let isRangeSelectionActive = false;
    let isAnimating = false;
    let dateToTypeMap = new Map();

    let _resolvePromise;
    let _rejectPromise;

    // --- FUNKCJE WEWNĘTRZNE MODUŁU ---

    const toUTCDate = (dateString) => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day));
    };

    const toDateString = (date) => {
        return date.toISOString().split('T')[0];
    };

    const countWorkdaysInSet = (datesSet) => {
        let workdays = 0;
        datesSet.forEach(dateString => {
            const day = new Date(dateString + 'T00:00:00Z').getUTCDay();
            if (day !== 0 && day !== 6) {
                workdays++;
            }
        });
        return workdays;
    };

    const resetSelection = () => {
        selectionStartDate = null;
        hoverEndDate = null;
        singleSelectedDays.clear();
        isRangeSelectionActive = false;
        updateSelectionPreview();
    };

    const loadEmployeeLeavesForModal = (employeeLeaves) => {
        dateToTypeMap.clear();
        employeeLeaves.forEach(leave => {
            const start = toUTCDate(leave.startDate);
            const end = toUTCDate(leave.endDate);
            for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
                const dateString = toDateString(d);
                singleSelectedDays.add(dateString);
                dateToTypeMap.set(dateString, leave.type || 'vacation');
            }
        });
        generateInitialCalendars();
        updateSelectionPreview();
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

    const confirmSelection = () => {
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
                const startType = dateToTypeMap.get(rangeStart) || selectedLeaveType;
                const currentType = dateToTypeMap.get(sortedDays[i]) || selectedLeaveType;
                if (diff === 1 && startType === currentType) {
                    rangeEnd = sortedDays[i];
                } else {
                    newLeaves.push({ id: toUTCDate(rangeStart).getTime().toString(), startDate: rangeStart, endDate: rangeEnd, type: startType });
                    rangeStart = sortedDays[i];
                    rangeEnd = sortedDays[i];
                }
            }
            newLeaves.push({ id: toUTCDate(rangeStart).getTime().toString(), startDate: rangeStart, endDate: rangeEnd, type: dateToTypeMap.get(rangeStart) || selectedLeaveType });
        }
        if (_resolvePromise) {
            _resolvePromise(newLeaves);
        }
        closeModal();
    };

    const closeModal = () => {
        modal.style.display = 'none';
        if (_rejectPromise) {
            _rejectPromise('Modal closed without confirmation');
        }
        _resolvePromise = null;
        _rejectPromise = null;
    };

    const setupEventListeners = () => {
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
    };

    const open = (employeeName, existingLeaves, monthIndex) => {
        currentEmployee = employeeName;
        // Ustawienie widoku kalendarza na podstawie klikniętego miesiąca
        leftCalendarDate = new Date(Date.UTC(currentYear, monthIndex, 1));
        resetSelection();
        loadEmployeeLeavesForModal(existingLeaves);
        modal.style.display = 'flex';
        return new Promise((resolve, reject) => {
            _resolvePromise = resolve;
            _rejectPromise = reject;
        });
    };

    setupEventListeners();

    return {
        open
    };
})();
