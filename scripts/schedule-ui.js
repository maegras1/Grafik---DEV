// scripts/schedule-ui.js
import { AppConfig, capitalizeFirstLetter } from './common.js';
import { EmployeeManager } from './employee-manager.js';
import { Shared } from './shared.js';
import { auth } from './firebase-config.js';

export const ScheduleUI = (() => {
    let _appState = null;
    let _employeeTooltip = null; // Globalny element tooltipa
    let _currentTimeInterval = null;

    const _createEmployeeTooltip = () => {
        if (document.getElementById('globalEmployeeTooltip')) {
            _employeeTooltip = document.getElementById('globalEmployeeTooltip');
            return;
        }

        _employeeTooltip = document.createElement('div');
        _employeeTooltip.id = 'globalEmployeeTooltip';
        _employeeTooltip.classList.add('employee-tooltip');
        document.body.appendChild(_employeeTooltip);
    };

    const _showEmployeeTooltip = (event) => {
        const th = event.currentTarget;
        const fullName = th.dataset.fullName;
        const employeeNumber = th.dataset.employeeNumber;

        _employeeTooltip.innerHTML = ''; // Clear previous content

        const nameP = document.createElement('p');
        nameP.textContent = fullName;
        _employeeTooltip.appendChild(nameP);

        if (employeeNumber) {
            const numberP = document.createElement('p');
            numberP.classList.add('employee-number-tooltip');
            const strong = document.createElement('strong');
            strong.textContent = employeeNumber;
            numberP.appendChild(document.createTextNode('Numer: '));
            numberP.appendChild(strong);
            _employeeTooltip.appendChild(numberP);
        }

        const rect = th.getBoundingClientRect();
        _employeeTooltip.style.left = `${rect.left + rect.width / 2}px`;
        _employeeTooltip.style.top = `${rect.top - _employeeTooltip.offsetHeight - 10}px`; // 10px odstępu od góry nagłówka
        _employeeTooltip.style.transform = 'translateX(-50%)';
        _employeeTooltip.style.display = 'block';
    };

    const _hideEmployeeTooltip = () => {
        _employeeTooltip.style.display = 'none';
    };

    const initialize = (appState) => {
        _appState = appState;
        _createEmployeeTooltip(); // Utwórz globalny tooltip przy inicjalizacji
    };

    const getElementText = (element) => {
        if (!element || element.classList.contains('break-cell')) return '';
        const clone = element.cloneNode(true);
        const icons = clone.querySelectorAll('.cell-icon');
        icons.forEach(icon => icon.remove());
        const spans = clone.querySelectorAll('span');
        let text = '';
        if (spans.length > 0) {
            spans.forEach(span => { text += span.textContent + ' ' });
        } else {
            text = clone.textContent;
        }
        return text.trim();
    };

    const applyCellDataToDom = (cell, cellObj) => {
        cell.className = 'editable-cell';
        cell.innerHTML = ''; // Clear content safely
        delete cell.dataset.isMassage;
        delete cell.dataset.isPnf;
        delete cell.dataset.isEveryOtherDay; // Usuń stary atrybut

        if (cell.tagName === 'TH') {
            cell.textContent = cellObj.content || '';
            return;
        }

        if (cellObj.isBreak) {
            cell.textContent = AppConfig.schedule.breakText;
            cell.classList.add('break-cell');
        } else if (cellObj.isSplit) {
            const createPart = (content, isMassage, isPnf, isEveryOtherDay, gender) => {
                const div = document.createElement('div');
                div.setAttribute('tabindex', '0');

                const span = document.createElement('span');
                span.textContent = capitalizeFirstLetter(content || '');
                div.appendChild(span);

                if (isMassage) {
                    div.classList.add('massage-text');
                    div.dataset.isMassage = 'true';
                }
                if (isPnf) {
                    div.classList.add('pnf-text');
                    div.dataset.isPnf = 'true';
                }
                if (isEveryOtherDay) {
                    div.classList.add('every-other-day-text');
                    div.dataset.isEveryOtherDay = 'true';
                }
                return div;
            };
            cell.classList.add('split-cell');
            cell.style.backgroundColor = AppConfig.schedule.contentCellColor;
            cell.appendChild(createPart(cellObj.content1, cellObj.isMassage1, cellObj.isPnf1, cellObj.isEveryOtherDay1, cellObj.treatmentData1?.gender));
            cell.appendChild(createPart(cellObj.content2, cellObj.isMassage2, cellObj.isPnf2, cellObj.isEveryOtherDay2, cellObj.treatmentData2?.gender));
        } else {
            const span = document.createElement('span');
            span.textContent = capitalizeFirstLetter(cellObj.content || '');
            cell.appendChild(span);

            if (cellObj.isMassage) {
                cell.classList.add('massage-text');
                cell.dataset.isMassage = 'true';
            }
            if (cellObj.isPnf) {
                cell.classList.add('pnf-text');
                cell.dataset.isPnf = 'true';
            }
            if (cellObj.isEveryOtherDay) {
                cell.classList.add('every-other-day-text');
                cell.dataset.isEveryOtherDay = 'true';
            }
            cell.style.backgroundColor = (getElementText(cell).trim() !== '') ? AppConfig.schedule.contentCellColor : AppConfig.schedule.defaultCellColor;
        }

        const today = new Date().toISOString().split('T')[0];
        if (cellObj.isSplit) {
            if (cellObj.treatmentData1?.endDate && cellObj.treatmentData1.endDate <= today) {
                cell.children[0]?.classList.add('treatment-end-marker');
            }
            if (cellObj.treatmentData2?.endDate && cellObj.treatmentData2.endDate <= today) {
                cell.children[1]?.classList.add('treatment-end-marker');
            }
        } else if (cellObj.treatmentEndDate) {
            if (cellObj.treatmentEndDate <= today) {
                cell.classList.add('treatment-end-marker');
            }
        }
    };

    const refreshAllRowHeights = () => {
        document.querySelectorAll('#mainScheduleTable tbody tr').forEach(row => {
            row.style.height = 'auto';
        });
    };

    const renderTable = () => {
        const mainTable = document.getElementById('mainScheduleTable');
        if (!mainTable) {
            return; // Zakończ, jeśli tabela nie istnieje
        }

        const tableHeaderRow = document.getElementById('tableHeaderRow');
        const tbody = mainTable.querySelector('tbody');

        if (!tableHeaderRow || !tbody) {
            console.error("Table header row or tbody not found, cannot render schedule.");
            return;
        }

        tableHeaderRow.innerHTML = ''; // Clear header safely
        const thTime = document.createElement('th');
        thTime.textContent = 'Godz.';
        tableHeaderRow.appendChild(thTime);

        tbody.innerHTML = '';

        let employeeIndices = [];
        let isSingleUserView = false;

        const currentUser = auth.currentUser;
        if (currentUser) {
            if (EmployeeManager.isUserAdmin(currentUser.uid)) {
                const allEmployees = EmployeeManager.getAll();
                employeeIndices = Object.keys(allEmployees)
                    .filter(id => !allEmployees[id].isHidden)
                    .sort((a, b) => parseInt(a) - parseInt(b));
                isSingleUserView = false;
            } else {
                const employee = EmployeeManager.getEmployeeByUid(currentUser.uid);
                if (employee) {
                    employeeIndices.push(employee.id);
                    isSingleUserView = true;
                } else {
                    employeeIndices = [];
                    isSingleUserView = true;
                    const tr = document.createElement('tr');
                    const td = document.createElement('td');
                    td.colSpan = 2;
                    td.className = 'unassigned-user-message';
                    td.textContent = 'Twoje konto nie jest przypisane do żadnego pracownika. Skontaktuj się z administratorem.';
                    tr.appendChild(td);
                    tbody.appendChild(tr);
                }
            }
        } else {
            const allEmployees = EmployeeManager.getAll();
            employeeIndices = Object.keys(allEmployees)
                .filter(id => !allEmployees[id].isHidden)
                .sort((a, b) => parseInt(a) - parseInt(b));
            isSingleUserView = false;
        }

        mainTable.classList.toggle('single-user-view', isSingleUserView);

        for (const i of employeeIndices) {
            const th = document.createElement('th');
            const employeeData = EmployeeManager.getById(i);
            const displayName = employeeData?.displayName || employeeData?.name || `Pracownik ${parseInt(i) + 1}`;
            const fullName = EmployeeManager.getFullNameById(i);
            const employeeNumber = employeeData?.employeeNumber || '';

            th.setAttribute('data-employee-index', i);
            th.setAttribute('tabindex', '0');
            th.classList.add('employee-header'); // Dodaj klasę dla identyfikacji

            const span = document.createElement('span');
            span.textContent = capitalizeFirstLetter(displayName);
            th.appendChild(span);

            th.dataset.fullName = fullName;
            th.dataset.employeeNumber = employeeNumber;
            tableHeaderRow.appendChild(th);

            // Dodaj event listenery dla nowego podejścia do tooltipa
            th.addEventListener('mouseover', _showEmployeeTooltip);
            th.addEventListener('mouseout', _hideEmployeeTooltip);
        }

        for (let hour = AppConfig.schedule.startHour; hour <= AppConfig.schedule.endHour; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                if (hour === AppConfig.schedule.endHour && minute === 30) continue;
                const tr = tbody.insertRow();
                const timeString = `${hour}:${minute.toString().padStart(2, '0')}`;
                tr.insertCell().textContent = timeString;

                for (const i of employeeIndices) {
                    const cell = tr.insertCell();
                    const cellData = _appState.scheduleCells[timeString]?.[i] || {};
                    applyCellDataToDom(cell, cellData);
                    cell.setAttribute('data-time', timeString);
                    cell.setAttribute('data-employee-index', i);
                    cell.setAttribute('draggable', 'true');
                    cell.setAttribute('tabindex', '0');
                }
            }
        }
        refreshAllRowHeights();

        // Usuń ewentualny stary interwał, aby uniknąć duplikatów
        if (_currentTimeInterval) {
            clearInterval(_currentTimeInterval);
        }

        // Ustaw nowy interwał, który będzie aktualizował podświetlenie
        _currentTimeInterval = setInterval(() => {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const roundedMinutes = minutes < 30 ? '00' : '30';
            const timeString = `${hours}:${roundedMinutes}`;

            // Usuń podświetlenie ze wszystkich wierszy
            document.querySelectorAll('#mainScheduleTable tbody tr.current-time-row').forEach(row => {
                row.classList.remove('current-time-row');
            });

            // Znajdź i podświetl nowy, właściwy wiersz
            const allTimeCells = document.querySelectorAll('#mainScheduleTable tbody td:first-child');
            for (const cell of allTimeCells) {
                if (cell.textContent.trim() === timeString) {
                    cell.parentElement.classList.add('current-time-row');
                    break;
                }
            }
        }, 60000); // Uruchamiaj co minutę

        updatePatientCount(); // Zaktualizuj liczbę pacjentów po renderowaniu tabeli
    };

    const updatePatientCount = () => {
        const patientCountElement = document.getElementById('patientCount');
        if (!patientCountElement) return;

        let therapyCount = 0;
        const cells = document.querySelectorAll('#mainScheduleTable tbody td.editable-cell');

        cells.forEach(cell => {
            if (cell.classList.contains('break-cell')) return;

            if (cell.classList.contains('split-cell')) {
                const parts = cell.querySelectorAll('div > span');
                const name1 = parts[0]?.textContent.trim();
                const name2 = parts[1]?.textContent.trim();
                if (name1) therapyCount++;
                if (name2) therapyCount++;
            } else {
                const name = getElementText(cell).trim();
                if (name) therapyCount++;
            }
        });
        patientCountElement.textContent = `Terapie: ${therapyCount}`;
    };

    const destroy = () => {
        if (_currentTimeInterval) {
            clearInterval(_currentTimeInterval);
            _currentTimeInterval = null;
        }
    };

    return {
        initialize,
        render: renderTable,
        getElementText,
        updatePatientCount,
        destroy
    };
})();

// Backward compatibility
window.ScheduleUI = ScheduleUI;
