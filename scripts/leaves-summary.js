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
     * Zwraca kolor tła w zależności od liczby pozostałych dni urlopu.
     * @param {number} days - Liczba pozostałych dni.
     * @returns {string} Kolor tła w formacie hex.
     */
    const getRemainingDaysColor = (days) => {
        if (days > 10) return '#d4edda'; // Zielony
        if (days > 2) return '#fff3cd';  // Żółty
        if (days > 0) return '#ffeeba';  // Pomarańczowy
        return '#f8d7da';               // Czerwony
    };

    /**
     * Renderuje tabelę podsumowania rocznego urlopów w istniejącej strukturze tabeli.
     * @param {HTMLElement} tableHeader - Element <tr> nagłówka tabeli.
     * @param {HTMLElement} tableBody - Element <tbody> tabeli.
     * @param {object} allLeavesData - Obiekt z danymi urlopowymi wszystkich pracowników.
     */
    const render = (tableHeader, tableBody, allLeavesData) => {
        const employees = EmployeeManager.getAll();
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalizuj do północy dla spójnych porównań

        // Wyczyść istniejącą zawartość tabeli
        tableHeader.innerHTML = '';
        tableBody.innerHTML = '';

        // Wygeneruj nowy nagłówek dla podsumowania
        tableHeader.innerHTML = `
            <th>Pracownik</th>
            <th>Należny</th>
            <th>Zaległy</th>
            <th>Łącznie</th>
            <th>Wykorzystano</th>
            <th>Zaplanowano</th>
            <th>Pozostało</th>
        `;

        // Przetwórz dane i wygeneruj wiersze
        for (const employeeId in employees) {
            const employee = employees[employeeId];
            if (!employee || !employee.name) continue;

            const employeeLeaves = allLeavesData[employee.name] || [];
            
            const entitlement = employee.leaveEntitlement || 0;
            const carriedOver = employee.carriedOverLeave || 0;
            const total = entitlement + carriedOver;
            
            let usedDays = 0;
            let scheduledDays = 0;

            employeeLeaves.forEach(leave => {
                const leaveStartDate = new Date(leave.startDate + 'T00:00:00Z');
                const leaveDuration = countWorkdays(leave.startDate, leave.endDate);

                // Jeśli urlop rozpoczyna się w przyszłości, jest "zaplanowany"
                if (leaveStartDate > today) {
                    scheduledDays += leaveDuration;
                } else {
                // Jeśli rozpoczął się dzisiaj lub w przeszłości, jest "wykorzystany"
                    usedDays += leaveDuration;
                }
            });

            const remaining = total - usedDays - scheduledDays;

            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${employee.name}</td>
                <td>${entitlement}</td>
                <td>${carriedOver}</td>
                <td><strong>${total}</strong></td>
                <td>${usedDays}</td>
                <td>${scheduledDays}</td>
                <td style="background-color: ${getRemainingDaysColor(remaining)};"><strong>${remaining}</strong></td>
            `;
        }
    };

    // Publiczne API modułu
    return {
        render
    };
})();
