// views.js - Grid and View Management
class ViewManager {
    constructor() {
        this.currentView = null;
        this.currentTable = null;
        this.hotInstance = null;
        this.pendingDeleteIds = [];
    }

    async renderTableView(tableId) {
        const table = await window.db.getTable(tableId);
        if (!table) return;

        this.currentTable = table;
        const records = await window.db.getRecords(tableId);

        const data = records.map(record => ({
            id: record.id,
            ...record.data
        }));

        const columns = this.createColumns(table.fields || []);

        const containerWrapper = document.getElementById('gridView');
        if (containerWrapper) {
            containerWrapper.style.display = 'block';
        }

        const container = document.getElementById('grid-container');
        if (!container) return;
        container.innerHTML = '';

        if (this.hotInstance) {
            this.hotInstance.destroy();
        }

        this.hotInstance = new Handsontable(container, {
            data,
            columns,
            colHeaders: (table.fields || []).map(field => field.name),
            rowHeaders: true,
            width: '100%',
            height: container?.offsetHeight || '100%',
            licenseKey: 'non-commercial-and-evaluation',
            contextMenu: true,
            manualColumnResize: true,
            manualRowResize: true,
            filters: true,
            dropdownMenu: true,
            columnSorting: true,
            copyPaste: true,
            selectionMode: 'multiple',
            undo: true,
            afterChange: (changes, source) => {
                if (source === 'loadData' || !changes) return;
                this.handleCellChanges(changes);
            },
            afterCreateRow: (index, amount) => {
                this.handleCreateRow(index, amount);
            },
            beforeRemoveRow: (index, amount, physicalRows) => {
                this.captureRowsForDeletion(physicalRows);
            },
            afterRemoveRow: () => {
                this.handleRemoveRow();
            }
        });
    }

    createColumns(fields) {
        return fields.map(field => {
            const column = {
                data: field.name,
                type: this.getHandsontableType(field.type)
            };

            switch (field.type) {
                case 'select':
                    column.type = 'dropdown';
                    column.source = field.options || [];
                    column.strict = false;
                    break;
                case 'checkbox':
                    column.type = 'checkbox';
                    break;
                case 'date':
                    column.type = 'date';
                    column.dateFormat = 'YYYY-MM-DD';
                    column.correctFormat = true;
                    break;
                case 'number':
                    column.type = 'numeric';
                    column.numericFormat = { pattern: '0,0.00' };
                    break;
                case 'email':
                case 'url':
                case 'text':
                case 'textarea':
                default:
                    column.type = 'text';
                    break;
            }

            if (field.required) {
                column.allowEmpty = false;
            }

            return column;
        });
    }

    getHandsontableType(fieldType) {
        const typeMap = {
            text: 'text',
            textarea: 'text',
            number: 'numeric',
            select: 'dropdown',
            date: 'date',
            checkbox: 'checkbox',
            email: 'text',
            url: 'text'
        };
        return typeMap[fieldType] || 'text';
    }

    async handleCellChanges(changes) {
        const updates = [];

        for (const [row, prop, oldVal, newVal] of changes) {
            if (oldVal === newVal) continue;
            const rowData = this.hotInstance.getSourceDataAtRow(row);
            const recordId = rowData?.id;
            if (!recordId) continue;

            const record = await window.db.getRecord(recordId);
            if (!record) continue;
            record.data[prop] = newVal;
            updates.push({ id: recordId, data: record.data });
        }

        if (updates.length > 0) {
            await window.db.bulkUpdateRecords(updates);
        }
    }

    async handleCreateRow(index, amount) {
        if (!this.currentTable) return;

        for (let i = 0; i < amount; i++) {
            const defaultData = {};
            (this.currentTable.fields || []).forEach(field => {
                defaultData[field.name] = this.getDefaultValue(field.type);
            });

            const record = await window.db.createRecord(this.currentTable.id, defaultData);
            const rowIndex = index + i;
            this.hotInstance.setDataAtRowProp(rowIndex, 'id', record.id, 'loadData');
            Object.entries(defaultData).forEach(([key, value]) => {
                this.hotInstance.setDataAtRowProp(rowIndex, key, value, 'loadData');
            });
        }
    }

    captureRowsForDeletion(physicalRows = []) {
        this.pendingDeleteIds = physicalRows
            .map(rowIndex => this.hotInstance?.getSourceDataAtRow(rowIndex)?.id)
            .filter(Boolean);
    }

    async handleRemoveRow() {
        if (!this.pendingDeleteIds.length) return;

        const idsToDelete = [...this.pendingDeleteIds];
        this.pendingDeleteIds = [];

        await Promise.all(idsToDelete.map(id => window.db.deleteRecord(id)));
    }

    getDefaultValue(fieldType) {
        const defaults = {
            text: '',
            textarea: '',
            number: 0,
            select: '',
            date: '',
            checkbox: false,
            email: '',
            url: ''
        };
        return defaults[fieldType] ?? '';
    }

    async renderKanbanView() {
        const container = document.getElementById('kanbanView');
        if (container) {
            container.style.display = 'block';
        }
        console.log('Kanban view not yet implemented');
    }

    async renderCalendarView() {
        const container = document.getElementById('calendarView');
        if (container) {
            container.style.display = 'block';
        }
        console.log('Calendar view not yet implemented');
    }

    async renderCardsView() {
        const container = document.getElementById('cardsView');
        if (container) {
            container.style.display = 'block';
        }
        console.log('Cards view not yet implemented');
    }

    destroy() {
        if (this.hotInstance) {
            this.hotInstance.destroy();
            this.hotInstance = null;
        }
    }
}

window.viewManager = new ViewManager();
