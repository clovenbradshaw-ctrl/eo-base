// Views rendering module

class ViewManager {
    constructor() {
        this.currentView = 'table';
        this.currentTableId = null;
        this.searchFilter = '';
        this.currentMonth = new Date();
    }

    // Set current table
    setTable(tableId) {
        this.currentTableId = tableId;
        this.render();
    }

    // Set current view
    setView(viewName) {
        this.currentView = viewName;
        
        // Update active button
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });

        this.render();
    }

    // Set search filter
    setFilter(search) {
        this.searchFilter = search;
        this.render();
    }

    // Render current view
    render() {
        if (!this.currentTableId) {
            this.showWelcomeScreen();
            return;
        }

        // Hide welcome screen
        document.getElementById('welcomeScreen').style.display = 'none';

        // Hide all views
        document.querySelectorAll('.view-container').forEach(view => {
            view.style.display = 'none';
        });

        // Show current view
        switch (this.currentView) {
            case 'table':
                this.renderTableView();
                break;
            case 'kanban':
                this.renderKanbanView();
                break;
            case 'calendar':
                this.renderCalendarView();
                break;
            case 'cards':
                this.renderCardsView();
                break;
        }
    }

    // Show welcome screen
    showWelcomeScreen() {
        document.querySelectorAll('.view-container').forEach(view => {
            view.style.display = 'none';
        });
        document.getElementById('welcomeScreen').style.display = 'block';
    }

    // TABLE VIEW
    renderTableView() {
        const container = document.getElementById('tableView');
        container.style.display = 'block';

        const table = db.getTable(this.currentTableId);
        if (!table) return;

        const fields = db.getFields(this.currentTableId);
        const records = db.getRecords(this.currentTableId, { search: this.searchFilter });

        // Render header
        const thead = document.getElementById('tableHead');
        thead.innerHTML = `
            <tr>
                ${fields.map(field => `<th>${field.name}</th>`).join('')}
                <th>Actions</th>
            </tr>
        `;

        // Render body with editable cells
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = records.map(record => `
            <tr data-record-id="${record.id}">
                ${fields.map(field => `
                    <td class="editable-cell" 
                        data-record-id="${record.id}"
                        data-field="${field.name}"
                        data-field-type="${field.type}">
                        ${this.formatFieldValue(field, record[field.name])}
                        <span class="cell-edit-indicator">✎</span>
                    </td>
                `).join('')}
                <td>
                    <div class="record-actions">
                        <button onclick="views.editRecord('${record.id}')">Edit</button>
                        <button onclick="views.deleteRecord('${record.id}')">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Add inline editing handlers
        tbody.querySelectorAll('.editable-cell').forEach(cell => {
            cell.addEventListener('click', (e) => {
                if (!e.target.closest('.record-actions')) {
                    this.startInlineEdit(cell);
                }
            });
        });
    }

    // KANBAN VIEW
    renderKanbanView() {
        const container = document.getElementById('kanbanView');
        container.style.display = 'block';

        const table = db.getTable(this.currentTableId);
        if (!table) return;

        // Find first select field for grouping
        const groupField = table.fields.find(f => f.type === 'select');
        
        if (!groupField) {
            document.getElementById('kanbanBoard').innerHTML = `
                <div style="padding: 2rem; text-align: center;">
                    <p>Kanban view requires at least one Select field.</p>
                    <button onclick="app.showFieldsModal()" class="btn-primary">Add Select Field</button>
                </div>
            `;
            return;
        }

        const groups = db.getRecordsByGroup(this.currentTableId, groupField.name);
        const titleField = table.fields.find(f => f.type === 'text') || table.fields[0];

        const board = document.getElementById('kanbanBoard');
        board.innerHTML = Object.entries(groups).map(([groupName, records]) => `
            <div class="kanban-column">
                <div class="kanban-column-header">
                    <span class="kanban-column-title">${groupName}</span>
                    <span class="kanban-column-count">${records.length}</span>
                </div>
                <div class="kanban-cards" data-column-value="${groupName}" data-field-name="${groupField.name}">
                    ${records.map(record => `
                        <div class="kanban-card" 
                             data-record-id="${record.id}"
                             data-column-value="${groupName}"
                             onclick="views.editRecord('${record.id}')">
                            <div class="kanban-card-title">${record[titleField.name] || 'Untitled'}</div>
                            <div class="kanban-card-meta">
                                ${Object.entries(record)
                                    .filter(([key]) => key !== 'id' && key !== titleField.name && key !== groupField.name)
                                    .slice(0, 2)
                                    .map(([key, value]) => `<div>${key}: ${this.formatFieldValue({type: 'text'}, value)}</div>`)
                                    .join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        // Setup drag and drop
        this.setupKanbanDragDrop();
    }

    // CALENDAR VIEW
    renderCalendarView() {
        const container = document.getElementById('calendarView');
        container.style.display = 'block';

        const table = db.getTable(this.currentTableId);
        if (!table) return;

        // Find first date field
        const dateField = table.fields.find(f => f.type === 'date');
        
        if (!dateField) {
            document.getElementById('calendarGrid').innerHTML = `
                <div style="padding: 2rem; text-align: center; grid-column: 1 / -1;">
                    <p>Calendar view requires at least one Date field.</p>
                    <button onclick="app.showFieldsModal()" class="btn-primary">Add Date Field</button>
                </div>
            `;
            return;
        }

        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        
        // Update header
        document.getElementById('currentMonth').textContent = 
            this.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        // Get records for this month
        const recordsByDate = db.getRecordsByDate(this.currentTableId, dateField.name, year, month);

        // Calculate calendar grid
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDayOfWeek = firstDay.getDay();
        const totalDays = lastDay.getDate();

        const grid = document.getElementById('calendarGrid');
        let html = '';

        // Day headers
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayNames.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });

        // Empty cells before first day
        for (let i = 0; i < startingDayOfWeek; i++) {
            html += `<div class="calendar-day other-month"></div>`;
        }

        // Days of month
        const today = new Date();
        const titleField = table.fields.find(f => f.type === 'text') || table.fields[0];

        for (let day = 1; day <= totalDays; day++) {
            const date = new Date(year, month, day);
            const dateKey = date.toISOString().split('T')[0];
            const isToday = date.toDateString() === today.toDateString();
            const records = recordsByDate[dateKey] || [];

            html += `
                <div class="calendar-day ${isToday ? 'today' : ''}">
                    <div class="calendar-day-number">${day}</div>
                    ${records.map(record => `
                        <div class="calendar-event" onclick="views.editRecord('${record.id}')">
                            ${record[titleField.name] || 'Untitled'}
                        </div>
                    `).join('')}
                </div>
            `;
        }

        grid.innerHTML = html;
    }

    // CARDS VIEW
    renderCardsView() {
        const container = document.getElementById('cardsView');
        container.style.display = 'block';

        const table = db.getTable(this.currentTableId);
        if (!table) return;

        const fields = db.getFields(this.currentTableId);
        const records = db.getRecords(this.currentTableId, { search: this.searchFilter });
        const titleField = fields.find(f => f.type === 'text') || fields[0];

        const grid = document.getElementById('cardsGrid');
        grid.innerHTML = records.map(record => `
            <div class="data-card" onclick="views.editRecord('${record.id}')">
                <div class="data-card-title">${record[titleField.name] || 'Untitled'}</div>
                ${fields.filter(f => f.name !== titleField.name).map(field => `
                    <div class="data-card-field">
                        <div class="data-card-label">${field.name}</div>
                        <div class="data-card-value">${this.formatFieldValue(field, record[field.name])}</div>
                    </div>
                `).join('')}
            </div>
        `).join('');
    }

    // Format field value for display
    formatFieldValue(field, value) {
        if (value === null || value === undefined || value === '') {
            return '<span style="color: var(--text-secondary)">—</span>';
        }

        switch (field.type) {
            case 'date':
                return new Date(value).toLocaleDateString();
            
            case 'checkbox':
                return value ? '☑' : '☐';
            
            case 'url':
                return `<a href="${value}" target="_blank" onclick="event.stopPropagation()">${value}</a>`;
            
            case 'email':
                return `<a href="mailto:${value}" onclick="event.stopPropagation()">${value}</a>`;
            
            default:
                return String(value).length > 50 
                    ? String(value).substring(0, 50) + '...' 
                    : String(value);
        }
    }

    // Edit record
    editRecord(recordId) {
        const record = db.getRecord(this.currentTableId, recordId);
        if (!record) return;

        app.showRecordModal(record);
    }

    // Delete record
    async deleteRecord(recordId) {
        if (!confirm('Are you sure you want to delete this record?')) return;

        await db.deleteRecord(this.currentTableId, recordId);
        this.render();
    }

    // Navigate calendar
    nextMonth() {
        this.currentMonth = new Date(
            this.currentMonth.getFullYear(),
            this.currentMonth.getMonth() + 1,
            1
        );
        this.renderCalendarView();
    }

    prevMonth() {
        this.currentMonth = new Date(
            this.currentMonth.getFullYear(),
            this.currentMonth.getMonth() - 1,
            1
        );
        this.renderCalendarView();
    }

    // INLINE EDITING

    startInlineEdit(cell) {
        if (cell.classList.contains('editing')) return;

        const recordId = cell.dataset.recordId;
        const fieldName = cell.dataset.field;
        const fieldType = cell.dataset.fieldType;
        const field = db.getField(this.currentTableId, fieldName);
        const record = db.getRecord(this.currentTableId, recordId);
        const currentValue = record[fieldName] || '';

        cell.classList.add('editing');
        
        let input;
        
        switch (fieldType) {
            case 'textarea':
                input = document.createElement('textarea');
                input.value = currentValue;
                break;
            
            case 'select':
                input = document.createElement('select');
                input.innerHTML = '<option value="">Select...</option>' +
                    (field.options || []).map(opt => 
                        `<option value="${opt}" ${currentValue === opt ? 'selected' : ''}>${opt}</option>`
                    ).join('');
                break;
            
            case 'checkbox':
                input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = currentValue;
                break;
            
            case 'date':
                input = document.createElement('input');
                input.type = 'date';
                input.value = currentValue;
                break;
            
            case 'number':
                input = document.createElement('input');
                input.type = 'number';
                input.value = currentValue;
                break;
            
            default:
                input = document.createElement('input');
                input.type = 'text';
                input.value = currentValue;
        }

        // Save on blur or Enter
        const save = async () => {
            const newValue = fieldType === 'checkbox' ? input.checked : input.value;
            
            if (newValue !== currentValue) {
                await db.updateRecord(this.currentTableId, recordId, {
                    [fieldName]: newValue
                }, 'inline_edit');
            }
            
            this.render();
        };

        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && fieldType !== 'textarea') {
                e.preventDefault();
                input.blur();
            } else if (e.key === 'Escape') {
                this.render();
            }
        });

        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus();
    }

    // KANBAN DRAG AND DROP

    setupKanbanDragDrop() {
        const cards = document.querySelectorAll('.kanban-card');
        const columns = document.querySelectorAll('.kanban-cards');

        cards.forEach(card => {
            card.draggable = true;

            card.addEventListener('dragstart', (e) => {
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', card.innerHTML);
                e.dataTransfer.setData('recordId', card.dataset.recordId);
                e.dataTransfer.setData('fromColumn', card.dataset.columnValue);
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
            });
        });

        columns.forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                column.classList.add('drag-over');
            });

            column.addEventListener('dragleave', () => {
                column.classList.remove('drag-over');
            });

            column.addEventListener('drop', async (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');

                const recordId = e.dataTransfer.getData('recordId');
                const fromColumn = e.dataTransfer.getData('fromColumn');
                const toColumn = column.dataset.columnValue;
                const field = column.dataset.fieldName;

                if (fromColumn !== toColumn) {
                    await db.moveRecord(this.currentTableId, recordId, field, fromColumn, toColumn);
                    this.render();
                }
            });
        });
    }
}

// Create singleton instance
const views = new ViewManager();
