// scripts/schedule-events.js

const ScheduleEvents = (() => {
    let _dependencies = {};
    
    const mainTable = document.getElementById('mainScheduleTable');
    const searchInput = document.getElementById('searchInput');
    const clearSearchButton = document.getElementById('clearSearchButton');

    let draggedCell = null;
    let activeCell = null;

    const clearDuplicateHighlights = () => {
        document.querySelectorAll('.duplicate-highlight').forEach(el => {
            el.classList.remove('duplicate-highlight');
        });
    };

    const highlightDuplicates = (searchText) => {
        clearDuplicateHighlights();
        const cleanedSearchText = searchText.trim().toLowerCase();
        if (cleanedSearchText === '' || cleanedSearchText === AppConfig.schedule.breakText.toLowerCase()) {
            return;
        }
        const allCells = document.querySelectorAll('td.editable-cell');
        const matchingCells = [];
        allCells.forEach(cell => {
            const cellText = _dependencies.ui.getElementText(cell).toLowerCase();
            if (cellText.includes(cleanedSearchText)) {
                matchingCells.push(cell);
            }
        });
        if (matchingCells.length > 1) {
            matchingCells.forEach(td => td.classList.add('duplicate-highlight'));
        }
    };

    const setActiveCell = (cell) => {
        if (activeCell) {
            activeCell.classList.remove('active-cell');
            if (activeCell.tagName === 'DIV' && activeCell.parentNode.classList.contains('active-cell')) {
                 activeCell.parentNode.classList.remove('active-cell');
            }
            if (activeCell.getAttribute('contenteditable') === 'true') {
                _dependencies.exitEditMode(activeCell);
            }
            clearDuplicateHighlights();
        }
        
        activeCell = cell;

        if (activeCell) {
            activeCell.classList.add('active-cell');
            if (activeCell.tagName === 'DIV') {
                activeCell.parentNode.classList.add('active-cell');
            }
            activeCell.focus();
            highlightDuplicates(_dependencies.ui.getElementText(activeCell));
        }
    };

    const initialize = (deps) => {
        _dependencies = deps;

        mainTable.addEventListener('click', (event) => {
            const target = event.target.closest('td.editable-cell, div[tabindex="0"]');
            if (target) {
                if (activeCell === target && target.getAttribute('contenteditable') === 'true') return;
                if (activeCell && activeCell.getAttribute('contenteditable') === 'true') _dependencies.exitEditMode(activeCell);
                setActiveCell(target);
            } else {
                if (activeCell && activeCell.getAttribute('contenteditable') === 'true') _dependencies.exitEditMode(activeCell);
                setActiveCell(null);
            }
        });

        mainTable.addEventListener('dblclick', (event) => {
            const target = event.target.closest('td.editable-cell, div[tabindex="0"]');
            if (target) _dependencies.enterEditMode(target);
        });

        document.addEventListener('click', (event) => {
            if (!event.target.closest('.active-cell')) {
                 if (activeCell && activeCell.getAttribute('contenteditable') === 'true') {
                    _dependencies.exitEditMode(activeCell);
                }
                setActiveCell(null);
            }
        });

        mainTable.addEventListener('dragstart', (event) => {
            const target = event.target.closest('td.editable-cell');
            if (target && !target.classList.contains('break-cell')) {
                draggedCell = target;
                event.dataTransfer.setData('application/json', JSON.stringify(_dependencies.getCurrentTableStateForCell(target)));
                event.dataTransfer.effectAllowed = 'move';
                draggedCell.classList.add('is-dragging');
            } else {
                event.preventDefault();
            }
        });

        mainTable.addEventListener('dragover', (event) => {
            event.preventDefault();
            const dropTargetCell = event.target.closest('td.editable-cell');
            document.querySelectorAll('.drag-over-target').forEach(el => el.classList.remove('drag-over-target'));
            if (dropTargetCell && !dropTargetCell.classList.contains('break-cell') && draggedCell !== dropTargetCell) {
                event.dataTransfer.dropEffect = 'move';
                dropTargetCell.classList.add('drag-over-target');
            } else {
                event.dataTransfer.dropEffect = 'none';
            }
        });

        mainTable.addEventListener('dragleave', (event) => {
            event.target.closest('.drag-over-target')?.classList.remove('drag-over-target');
        });

        mainTable.addEventListener('drop', (event) => {
            event.preventDefault();
            const dropTargetCell = event.target.closest('td.editable-cell');
            document.querySelectorAll('.drag-over-target').forEach(el => el.classList.remove('drag-over-target'));
            
            if (dropTargetCell && !dropTargetCell.classList.contains('break-cell') && draggedCell && draggedCell !== dropTargetCell) {
                _dependencies.undoManager.pushState(_dependencies.getCurrentTableState());

                const sourceTime = draggedCell.dataset.time;
                const sourceIndex = draggedCell.dataset.employeeIndex;
                const targetTime = dropTargetCell.dataset.time;
                const targetIndex = dropTargetCell.dataset.employeeIndex;

                const sourceData = _dependencies.appState.scheduleCells[sourceTime]?.[sourceIndex] || {};
                const targetData = _dependencies.appState.scheduleCells[targetTime]?.[targetIndex] || {};

                if (!_dependencies.appState.scheduleCells[sourceTime]) _dependencies.appState.scheduleCells[sourceTime] = {};
                _dependencies.appState.scheduleCells[sourceTime][sourceIndex] = targetData;
                
                if (!_dependencies.appState.scheduleCells[targetTime]) _dependencies.appState.scheduleCells[targetTime] = {};
                _dependencies.appState.scheduleCells[targetTime][targetIndex] = sourceData;

                _dependencies.renderAndSave();
                _dependencies.undoManager.pushState(_dependencies.getCurrentTableState());
            }
        });

        mainTable.addEventListener('dragend', () => {
            draggedCell?.classList.remove('is-dragging');
            draggedCell = null;
            document.querySelectorAll('.drag-over-target').forEach(el => el.classList.remove('drag-over-target'));
        });
        
        document.addEventListener('keydown', (event) => {
             if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
                event.preventDefault();
                _dependencies.undoLastAction();
                return;
            }

            const target = document.activeElement;
            const isEditing = target.getAttribute('contenteditable') === 'true';

            if(isEditing) {
                if (event.key === 'Escape') _dependencies.exitEditMode(target);
                if (event.key === 'Enter') {
                     event.preventDefault();
                     _dependencies.exitEditMode(target);
                     const parentCell = target.closest('td');
                     if (parentCell) {
                         const nextRow = parentCell.closest('tr').nextElementSibling;
                         if (nextRow) {
                             const nextCell = nextRow.cells[parentCell.cellIndex];
                             setActiveCell(nextCell);
                         }
                     }
                }
                return;
            }
            
            if (!activeCell) return;

            if (event.key === 'Delete' || event.key === 'Backspace') {
                event.preventDefault();
                const cellToClear = activeCell.closest('td.editable-cell');
                if (cellToClear) {
                    _dependencies.updateCellState(cellToClear, state => {
                        Object.keys(state).forEach(key => delete state[key]);
                        window.showToast('Wyczyszczono komórkę');
                    });
                }
                return;
            }

            if (event.key === 'Enter') {
                event.preventDefault();
                _dependencies.enterEditMode(activeCell);
                return;
            }
            
            if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
                event.preventDefault();
                _dependencies.enterEditMode(activeCell, true, event.key);
                return;
            }

            let nextElement = null;
            const currentParentTd = activeCell.closest('td, th');
            const currentRow = currentParentTd.closest('tr');
            const currentIndexInRow = Array.from(currentRow.cells).indexOf(currentParentTd);

            switch (event.key) {
                case 'ArrowRight':
                     if(activeCell.tagName === 'DIV' && activeCell.nextElementSibling) {
                         nextElement = activeCell.nextElementSibling;
                     } else {
                         const nextCell = currentRow.cells[currentIndexInRow + 1];
                         if(nextCell) nextElement = nextCell.querySelector('div') || nextCell;
                     }
                    break;
                case 'ArrowLeft':
                     if(activeCell.tagName === 'DIV' && activeCell.previousElementSibling) {
                         nextElement = activeCell.previousElementSibling;
                     } else {
                        const prevCell = currentRow.cells[currentIndexInRow - 1];
                        if (prevCell && prevCell.matches('.editable-cell, .editable-header')) {
                             nextElement = Array.from(prevCell.querySelectorAll('div')).pop() || prevCell;
                        }
                     }
                    break;
                case 'ArrowDown':
                    const nextRow = currentRow.nextElementSibling;
                    if(nextRow) {
                        const nextCell = nextRow.cells[currentIndexInRow];
                        if (nextCell) nextElement = nextCell.querySelector('div') || nextCell;
                    }
                    break;
                case 'ArrowUp':
                    const prevRow = currentRow.previousElementSibling;
                     if(prevRow) {
                        const prevCell = prevRow.cells[currentIndexInRow];
                        if (prevCell) nextElement = prevCell.querySelector('div') || prevCell;
                    }
                    break;
            }

            if (nextElement) {
                event.preventDefault();
                setActiveCell(nextElement);
            }
        });

        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim();
            searchAndHighlight(searchTerm, '#mainScheduleTable', 'td.editable-cell, th');
            clearSearchButton.style.display = searchTerm ? 'block' : 'none';
        });

        clearSearchButton.addEventListener('click', () => {
            searchInput.value = '';
            searchAndHighlight('', '#mainScheduleTable', 'td.editable-cell, th');
            clearSearchButton.style.display = 'none';
            searchInput.focus();
        });

        const contextMenuItems = [
            { id: 'contextPatientInfo', class: 'info', condition: cell => !cell.classList.contains('break-cell') && _dependencies.ui.getElementText(cell).trim() !== '', action: cell => _dependencies.openPatientInfoModal(cell) },
            { id: 'contextAddBreak', action: cell => _dependencies.updateCellState(cell, state => { state.isBreak = true; window.showToast('Dodano przerwę'); }) },
            { id: 'contextRemoveBreak', class: 'danger', condition: cell => cell.classList.contains('break-cell'), action: cell => _dependencies.updateCellState(cell, state => { delete state.isBreak; window.showToast('Usunięto przerwę'); }) },
            { id: 'contextClear', class: 'danger', action: cell => _dependencies.updateCellState(cell, state => { Object.keys(state).forEach(key => delete state[key]); window.showToast('Wyczyszczono komórkę'); }) },
            { id: 'contextSplitCell', action: cell => _dependencies.updateCellState(cell, state => { state.content1 = state.content || ''; state.content2 = ''; delete state.content; state.isSplit = true; window.showToast('Podzielono komórkę'); }) },
            { id: 'contextMassage', action: cell => _dependencies.toggleSpecialStyle(cell, 'isMassage') },
            { id: 'contextPnf', action: cell => _dependencies.toggleSpecialStyle(cell, 'isPnf') }
        ];
        window.initializeContextMenu('contextMenu', 'td.editable-cell', contextMenuItems);
    };

    return {
        initialize
    };
})();
