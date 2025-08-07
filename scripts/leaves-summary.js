// scripts/leaves-summary.js

const LeavesSummary = (() => {

    /**
     * Zlicza dni robocze (pon-pt) w danym zakresie dat.
     * @param {string} startDate - Data początkowa w formacie YYYY-MM-DD.
     * @param {string} endDate - Data końcowa w formacie YYYY-MM-DD.
     * @returns {number} Liczba dni roboczych.
     */
    const countWorkdays = (startDate, endDate) => {
        let count = 0;
        const start = new Date(startDate + 'T00:00:00Z');
        const end = new Date(endDate + 'T00:00:00Z');

        let current = new Date(start);

        while (current <= end) {
            const day = current.getUTCDay(); // 0 = Niedziela, 1 = Poniedziałek, ..., 6 = Sobota
            if (day !== 0 && day !== 6) {
                count++;
            }
            current.setUTCDate(current.getUTCDate() + 1);
        }
        return count;
    };

    /**
     * Renderuje tabelę podsumowania rocznego urlopów.
     * @param {HTMLElement} container - Element, w którym ma być renderowana tabela.
     * @param {object} allLeavesData - Obiekt z danymi urlopowymi wszystkich pracowników.
     */
    const render = (container, allLeavesData) => {
        const employees = EmployeeManager.getAll();
        container.innerHTML = ''; // Wyczyść kontener

        const table = document.createElement('table');
        table.className = 'summary-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Pracownik</th>
                    <th>Należny</th>
                    <th>Zaległy</th>
                    <th>Łącznie</th>
                    <th>Wykorzystano</th>
                    <th>Pozostało</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;

        const tbody = table.querySelector('tbody');

        for (const employeeId in employees) {
            const employee = employees[employeeId];
            if (!employee || !employee.name) continue;

            const employeeLeaves = allLeavesData[employee.name] || [];
            
            const entitlement = employee.leaveEntitlement || 0;
            const carriedOver = employee.carriedOverLeave || 0;
            const total = entitlement + carriedOver;
            
            let usedDays = 0;
            employeeLeaves.forEach(leave => {
                usedDays += countWorkdays(leave.startDate, leave.endDate);
            });

            const remaining = total - usedDays;

            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${employee.name}</td>
                <td>${entitlement}</td>
                <td>${carriedOver}</td>
                <td><strong>${total}</strong></td>
                <td>${usedDays}</td>
                <td><strong>${remaining}</strong></td>
            `;
        }

        container.appendChild(table);
    };

    // Publiczne API modułu
    return {
        render
    };
})();
