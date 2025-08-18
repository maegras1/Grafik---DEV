const Changes = (() => {
    let changesTableBody, changesHeaderRow;

    const holidays = [ // Święta w 2025 roku
        '2025-01-01', '2025-01-06', '2025-04-20', '2025-04-21', '2025-05-01', '2025-05-03',
        '2025-06-08', '2025-06-19', '2025-08-15', '2025-11-01', '2025-11-11', '2025-12-25', '2025-12-26'
    ];

    const isWeekendOrHoliday = (date) => {
        const day = date.getUTCDay();
        if (day === 0 || day === 6) return true;
        const dateString = date.toISOString().split('T')[0];
        return holidays.includes(dateString);
    };

    const generateTwoWeekPeriods = (year) => {
        const periods = [];
        let currentDate = new Date(Date.UTC(year, 0, 1));
        while (currentDate.getUTCDay() !== 1) {
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }

        while (currentDate.getUTCFullYear() === year) {
            const startDate = new Date(currentDate);
            let endDate = new Date(startDate);
            let workDaysCount = 0;

            while (workDaysCount < 10) {
                if (!isWeekendOrHoliday(endDate)) {
                    workDaysCount++;
                }
                if (workDaysCount < 10) {
                   endDate.setUTCDate(endDate.getUTCDate() + 1);
                }
            }
            
            periods.push({
                start: startDate.toISOString().split('T')[0],
                end: endDate.toISOString().split('T')[0]
            });

            currentDate = new Date(endDate);
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            while (isWeekendOrHoliday(currentDate)) {
                currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            }
        }
        return periods;
    };

    const renderTable = (periods) => {
        changesHeaderRow.innerHTML = '';
        const headers = ["Okres", "HYDRO 7:00-14:30", "MASAŻ 7-14:30", "FIZYKO 7-14:30", "SALA 7-14:30", "MASAŻ 10:30-18:00", "FIZYKO 10:30-18:00", "SALA 10:30-18:00", "URLOPY"];
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            changesHeaderRow.appendChild(th);
        });

        changesTableBody.innerHTML = '';
        periods.forEach(period => {
            const tr = document.createElement('tr');
            tr.dataset.startDate = period.start;
            tr.dataset.endDate = period.end;
            const start = new Date(period.start);
            const end = new Date(period.end);
            tr.innerHTML = `
                <td>${start.getUTCDate()}.${(start.getUTCMonth() + 1).toString().padStart(2, '0')} - ${end.getUTCDate()}.${(end.getUTCMonth() + 1).toString().padStart(2, '0')}</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td class="leaves-cell"></td>
            `;
            changesTableBody.appendChild(tr);
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

    const populateLeavesColumn = (allLeavesData) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        document.querySelectorAll('#changesTableBody tr').forEach(row => {
            const periodStart = new Date(row.dataset.startDate);
            const periodEnd = new Date(row.dataset.endDate);
            const leavesCell = row.querySelector('.leaves-cell');
            let leavesHtml = '';

            for (const employeeName in allLeavesData) {
                const employeeLeaves = allLeavesData[employeeName];
                employeeLeaves.forEach(leave => {
                    const leaveStart = new Date(leave.startDate);
                    const leaveEnd = new Date(leave.endDate);

                    if (leaveEnd >= today && !(leaveEnd < periodStart || leaveStart > periodEnd)) {
                        leavesHtml += `${employeeName}<br>`;
                    }
                });
            }
            leavesCell.innerHTML = leavesHtml;
        });
    };

    const init = async () => {
        changesTableBody = document.getElementById('changesTableBody');
        changesHeaderRow = document.getElementById('changesHeaderRow');

        if (!changesTableBody || !changesHeaderRow) {
            console.error("Changes module: Required table elements not found. Aborting initialization.");
            return;
        }
        
        const currentYear = new Date().getUTCFullYear();
        const periods = generateTwoWeekPeriods(currentYear);
        renderTable(periods);

        const allLeaves = await getAllLeavesData();
        populateLeavesColumn(allLeaves);
    };

    const destroy = () => {
        console.log("Changes module destroyed");
    };

    return {
        init,
        destroy
    };
})();
