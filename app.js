// app.js - Application Controller
class FlexiBaseApp {
    constructor() {
        this.currentTable = null;
        this.currentView = 'grid';
        this.initialized = false;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        if (this.initialized) return;
        this.initialized = true;

        await window.db.db.open();
        await this.initStorage();
        this.setupEventListeners();
        await this.loadTables();

        window.addEventListener('db-change', (event) => {
            this.handleDBChange(event.detail);
        });
    }

    async initStorage() {
        const filenConfig = await window.db.getMetadata('filen_config');
        if (filenConfig) {
            await window.storageAdapter.init(filenConfig);
        }
    }

    setupEventListeners() {
        const tableSelector = document.getElementById('table-selector');
        tableSelector?.addEventListener('change', (event) => {
            const tableId = event.target.value;
            if (tableId) {
                this.switchTable(tableId);
            }
        });

        document.getElementById('create-table-btn')?.addEventListener('click', () => {
            this.showCreateTableDialog();
        });

        document.getElementById('sync-btn')?.addEventListener('click', () => {
            window.storageAdapter.manualSync();
        });

        document.querySelectorAll('.view-btn').forEach((button) => {
            button.addEventListener('click', (event) => {
                const viewType = event.currentTarget.dataset.view;
                this.switchView(viewType);
            });
        });

        document.getElementById('export-btn')?.addEventListener('click', () => {
            window.storageAdapter.exportToFile();
        });

        document.getElementById('import-btn')?.addEventListener('click', () => {
            this.showImportDialog();
        });

        document.getElementById('manage-fields-btn')?.addEventListener('click', () => {
            this.showManageFieldsDialog();
        });

        document.getElementById('new-record-btn')?.addEventListener('click', () => {
            this.createNewRecord();
        });

        document.getElementById('search-input')?.addEventListener('input', (event) => {
            this.handleSearch(event.target.value);
        });
    }

    async loadTables() {
        const tables = await window.db.getAllTables();
        this.updateTableSelector(tables);

        if (tables.length === 0) {
            this.currentTable = null;
            this.showWelcome();
            return;
        }

        if (!this.currentTable || !tables.find(table => table.id === this.currentTable)) {
            this.currentTable = tables[0].id;
        }

        const selector = document.getElementById('table-selector');
        if (selector) {
            selector.value = this.currentTable;
        }

        await this.renderCurrentView();
    }

    updateTableSelector(tables) {
        const selector = document.getElementById('table-selector');
        if (!selector) return;

        selector.innerHTML = '';
        tables.forEach((table) => {
            const option = document.createElement('option');
            option.value = table.id;
            option.textContent = table.name;
            selector.appendChild(option);
        });
    }

    async switchTable(tableId) {
        this.currentTable = tableId;
        await this.renderCurrentView();
    }

    async switchView(viewType) {
        if (!viewType) return;
        this.currentView = viewType;
        await this.renderCurrentView();
    }

    async renderCurrentView() {
        if (!this.currentTable) return;

        document.querySelectorAll('.view-btn').forEach((button) => {
            button.classList.toggle('active', button.dataset.view === this.currentView);
        });

        this.toggleViewContainers(this.currentView);

        switch (this.currentView) {
            case 'grid':
                await window.viewManager.renderTableView(this.currentTable);
                break;
            case 'kanban':
                await window.viewManager.renderKanbanView(this.currentTable);
                break;
            case 'calendar':
                await window.viewManager.renderCalendarView(this.currentTable);
                break;
            case 'cards':
                await window.viewManager.renderCardsView(this.currentTable);
                break;
            default:
                await window.viewManager.renderTableView(this.currentTable);
                break;
        }
    }

    toggleViewContainers(activeView) {
        const views = {
            grid: document.getElementById('gridView'),
            kanban: document.getElementById('kanbanView'),
            calendar: document.getElementById('calendarView'),
            cards: document.getElementById('cardsView')
        };

        Object.entries(views).forEach(([view, element]) => {
            if (!element) return;
            element.style.display = view === activeView ? 'block' : 'none';
        });

        if (activeView !== 'grid') {
            window.viewManager.destroy();
        }
    }

    showCreateTableDialog() {
        if (!document.getElementById('create-table-dialog')) {
            this.createTableDialog();
        }
        const dialog = document.getElementById('create-table-dialog');
        if (dialog) {
            dialog.style.display = 'block';
        }
    }

    createTableDialog() {
        const template = `
            <div id="create-table-dialog" class="modal" style="display: none;">
                <div class="modal-content">
                    <h2>Create New Table</h2>
                    <form id="create-table-form">
                        <div class="form-group">
                            <label>Table Name</label>
                            <input type="text" id="table-name" required>
                        </div>
                        <div class="form-group">
                            <label>Fields</label>
                            <div id="fields-container">
                                <div class="field-row">
                                    <input type="text" placeholder="Field name" class="field-name" required>
                                    <select class="field-type">
                                        <option value="text">Text</option>
                                        <option value="number">Number</option>
                                        <option value="select">Select</option>
                                        <option value="date">Date</option>
                                        <option value="checkbox">Checkbox</option>
                                        <option value="email">Email</option>
                                        <option value="url">URL</option>
                                    </select>
                                    <label><input type="checkbox" class="field-required"> Required</label>
                                </div>
                            </div>
                            <button type="button" id="add-field-btn">+ Add Field</button>
                        </div>
                        <div class="form-actions">
                            <button type="submit">Create Table</button>
                            <button type="button" class="cancel">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', template);

        document.getElementById('add-field-btn')?.addEventListener('click', () => {
            this.addFieldRow();
        });

        document.getElementById('create-table-form')?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.createTable();
        });

        document.querySelector('#create-table-dialog .cancel')?.addEventListener('click', () => {
            const dialog = document.getElementById('create-table-dialog');
            if (dialog) {
                dialog.style.display = 'none';
            }
        });
    }

    addFieldRow() {
        const container = document.getElementById('fields-container');
        if (!container) return;
        const html = `
            <div class="field-row">
                <input type="text" placeholder="Field name" class="field-name" required>
                <select class="field-type">
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="select">Select</option>
                    <option value="date">Date</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="email">Email</option>
                    <option value="url">URL</option>
                </select>
                <label><input type="checkbox" class="field-required"> Required</label>
                <button type="button" class="remove-field">×</button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
        const row = container.lastElementChild;
        row?.querySelector('.remove-field')?.addEventListener('click', (event) => {
            const target = event.currentTarget;
            target.closest('.field-row')?.remove();
        });
    }

    async createTable() {
        const nameInput = document.getElementById('table-name');
        if (!nameInput) return;
        const name = nameInput.value.trim();
        const fieldRows = document.querySelectorAll('#fields-container .field-row');

        const fields = Array.from(fieldRows).map((row) => ({
            name: row.querySelector('.field-name').value.trim(),
            type: row.querySelector('.field-type').value,
            required: row.querySelector('.field-required').checked
        })).filter(field => field.name);

        const table = await window.db.createTable({ name, fields });

        const dialog = document.getElementById('create-table-dialog');
        if (dialog) {
            dialog.style.display = 'none';
        }

        await this.loadTables();
        await this.switchTable(table.id);
    }

    async createNewRecord() {
        if (!this.currentTable) return;
        const table = await window.db.getTable(this.currentTable);
        if (!table) return;

        const data = {};
        (table.fields || []).forEach(field => {
            data[field.name] = this.getDefaultValue(field.type);
        });

        await window.db.createRecord(this.currentTable, data);
        await this.renderCurrentView();
    }

    getDefaultValue(type) {
        const defaults = {
            text: '',
            number: 0,
            select: '',
            date: '',
            checkbox: false,
            email: '',
            url: ''
        };
        return defaults[type] ?? '';
    }

    async handleSearch(searchTerm) {
        if (!this.currentTable) return;
        const records = await window.db.searchRecords(this.currentTable, searchTerm);
        if (window.viewManager.hotInstance) {
            const data = records.map(record => ({ id: record.id, ...record.data }));
            window.viewManager.hotInstance.loadData(data);
        }
    }

    showImportDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (event) => {
            const file = event.target.files?.[0];
            if (file) {
                await window.storageAdapter.importFromFile(file);
                await this.loadTables();
            }
        };
        input.click();
    }

    showManageFieldsDialog() {
        alert('Field management coming soon!');
    }

    handleDBChange(detail) {
        if (detail.type === 'table') {
            this.loadTables();
        } else if (detail.type === 'record' && detail.data.tableId === this.currentTable) {
            this.renderCurrentView();
        }
    }

    showWelcome() {
        const container = document.getElementById('grid-container');
        if (!container) return;
        container.innerHTML = `
            <div class="welcome-screen">
                <h1>Welcome to FlexiBase</h1>
                <p>Create your first table to get started.</p>
                <button class="btn-primary" onclick="app.showCreateTableDialog()">Create Your First Table</button>
            </div>
        `;
        const wrapper = document.getElementById('gridView');
        if (wrapper) {
            wrapper.style.display = 'block';
        }
        this.toggleViewContainers('grid');
    }
}

window.app = new FlexiBaseApp();
