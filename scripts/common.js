// scripts/common.js

const AppConfig = {
    schedule: {
        startHour: 7,
        endHour: 17,
        breakText: 'Przerwa',
        defaultCellColor: '#e0e0e0',
        contentCellColor: '#ffffff',
    },
    leaves: {
        careLimits: {
            child_care_art_188: 2,
            sick_child_care: 60,
            family_member_care: 14,
        },
        leaveTypeColors: {
            vacation: '#80deea',
            child_care_art_188: '#ffcc80',
            sick_child_care: '#f48fb1',
            family_member_care: '#cf93d9',
            default: '#e6ee9b'
        }
    },
    firestore: {
        collections: {
            schedules: 'schedules',
            leaves: 'leaves'
        },
        docs: {
            mainSchedule: 'mainSchedule',
            mainLeaves: 'mainLeaves'
        }
    },
    undoManager: {
        maxStates: 20
    }
};

const months = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];

function showToast(message, duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 500);
    }, duration);
}

function hideLoadingOverlay(overlay) {
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function searchAndHighlight(searchTerm, tableSelector, cellSelector) {
    const table = document.querySelector(tableSelector);
    if (!table) return;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    table.querySelectorAll(cellSelector).forEach(cell => {
        const cellText = cell.textContent.toLowerCase();
        const row = cell.closest('tr');
        if (row) {
            if (cellText.includes(lowerCaseSearchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
}

class UndoManager {
    constructor({ maxStates = 20, onUpdate = () => {} }) {
        this.maxStates = maxStates;
        this.onUpdate = onUpdate;
        this.stack = [];
        this.currentIndex = -1;
    }

    initialize(initialState) {
        this.stack = [JSON.parse(JSON.stringify(initialState))];
        this.currentIndex = 0;
        this.onUpdate(this);
    }

    pushState(state) {
        if (this.currentIndex < this.stack.length - 1) {
            this.stack = this.stack.slice(0, this.currentIndex + 1);
        }
        this.stack.push(JSON.parse(JSON.stringify(state)));
        if (this.stack.length > this.maxStates) {
            this.stack.shift();
        }
        this.currentIndex = this.stack.length - 1;
        this.onUpdate(this);
    }

    undo() {
        if (this.canUndo()) {
            this.currentIndex--;
            this.onUpdate(this);
            return JSON.parse(JSON.stringify(this.stack[this.currentIndex]));
        }
        return null;
    }

    canUndo() {
        return this.currentIndex > 0;
    }
}


window.showToast = showToast;
