// Main application controller - V3 with Activity Stream

class Application {
    constructor() {
        this.initialized = false;
        this.currentFieldEditorMode = null;
        this.currentFieldEditorData = null;
        this.importData = { step: 1, file: null, mapping: {}, preview: [] };
        this.selectOptionColors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
    }

    async init() {
        if (this.initialized) return;

        try {
            await storage.init();
            await db.init();

            this.setupEventListeners();
            this.setupFieldEditorListeners();
            this.setupImportListeners();
            this.setupActivityLogListeners();
            
            this.updateTableList();
            this.updateSyncStatus();

            db.subscribe(() => {
                this.updateTableList();
                views.render();
            });

            this.initialized = true;

            const tables = db.getTables();
            if (tables.length > 0) {
                this.selectTable(tables[0].id);
            }
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showAlert('Error', 'Failed to initialize application. Check console for details.');
        }
    }

    // CUSTOM DIALOGS
    
    showAlert(title, message) {
        const modal = document.getElementById('alertDialog');
        document.getElementById('alertTitle').textContent = title;
        document.getElementById('alertMessage').textContent = message;
        
        return new Promise((resolve) => {
            const okBtn = document.getElementById('alertOk');
            const handler = () => {
                this.closeModal('alertDialog');
                okBtn.removeEventListener('click', handler);
                resolve();
            };
            okBtn.addEventListener('click', handler);
            modal.classList.add('active');
        });
    }

    showConfirm(title, message) {
        const modal = document.getElementById('confirmDialog');
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        
        return new Promise((resolve) => {
            const okBtn = document.getElementById('confirmOk');
            const cancelBtn = document.getElementById('confirmCancel');
            
            const cleanup = (result) => {
                this.closeModal('confirmDialog');
                okBtn.removeEventListener('click', okHandler);
                cancelBtn.removeEventListener('click', cancelHandler);
                resolve(result);
            };
            
            const okHandler = () => cleanup(true);
            const cancelHandler = () => cleanup(false);
            
            okBtn.addEventListener('click', okHandler);
            cancelBtn.addEventListener('click', cancelHandler);
            
            modal.classList.add('active');
        });
    }

    // MAIN EVENT LISTENERS
    
    setupEventListeners() {
        document.getElementById('tableSelect').addEventListener('change', (e) => {
            if (e.target.value) this.selectTable(e.target.value);
        });

        document.getElementById('newTableBtn').addEventListener('click', () => this.showTableModal());
        document.getElementById('createFirstTable').addEventListener('click', () => this.showTableModal());

        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => views.setView(btn.dataset.view));
        });

        document.getElementById('searchInput').addEventListener('input', (e) => views.setFilter(e.target.value));
        document.getElementById('newRecordBtn').addEventListener('click', () => this.showRecordModal());
        document.getElementById('manageFieldsBtn').addEventListener('click', () => this.showFieldsModal());
        document.getElementById('viewActivitiesBtn').addEventListener('click', () => this.showActivityLog());
        document.getElementById('exportBtn').addEventListener('click', () => storage.exportData());
        document.getElementById('importBtn').addEventListener('click', () => this.showImportModal());
        document.getElementById('syncBtn').addEventListener('click', async () => await this.syncData());

        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeAllModals();
            });
        });

        document.getElementById('prevMonth').addEventListener('click', () => views.prevMonth());
        document.getElementById('nextMonth').addEventListener('click', () => views.nextMonth());
        document.getElementById('createTable').addEventListener('click', () => this.createTable());
        document.getElementById('cancelTable').addEventListener('click', () => this.closeModal('tableModal'));
        document.getElementById('addFieldBtn').addEventListener('click', () => this.addFieldInput());
        document.getElementById('saveRecord').addEventListener('click', () => this.saveRecord());
        document.getElementById('cancelRecord').addEventListener('click', () => this.closeModal('recordModal'));
        document.getElementById('closeFields').addEventListener('click', () => this.closeModal('fieldsModal'));
        document.getElementById('addNewField').addEventListener('click', () => this.showFieldEditor());
    }

    // FIELD EDITOR
    
    setupFieldEditorListeners() {
        document.querySelectorAll('.field-type-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.field-type-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                document.getElementById('selectOptionsConfig').style.display = option.dataset.type === 'select' ? 'block' : 'none';
                this.updateFieldPreview();
            });
        });

        document.getElementById('fieldEditorName').addEventListener('input', () => this.updateFieldPreview());
        document.getElementById('fieldEditorRequired').addEventListener('change', () => this.updateFieldPreview());
        document.getElementById('addSelectOption').addEventListener('click', () => this.addSelectOptionInput());
        document.getElementById('saveFieldEditor').addEventListener('click', () => this.saveFieldFromEditor());
        document.getElementById('cancelFieldEditor').addEventListener('click', () => this.closeModal('fieldEditorModal'));
    }

    showFieldEditor(field = null, fieldName = null) {
        this.currentFieldEditorMode = field ? 'edit' : 'add';
        this.currentFieldEditorData = fieldName;

        document.getElementById('fieldEditorTitle').textContent = field ? 'Edit Field' : 'Add Field';
        document.getElementById('fieldEditorName').value = field ? field.name : '';
        document.getElementById('fieldEditorRequired').checked = field ? field.required : false;

        document.querySelectorAll('.field-type-option').forEach(opt => {
            opt.classList.remove('selected');
            if (opt.dataset.type === (field ? field.type : 'text')) opt.classList.add('selected');
        });

        const selectConfig = document.getElementById('selectOptionsConfig');
        if (field && field.type === 'select') {
            selectConfig.style.display = 'block';
            document.getElementById('selectOptionsList').innerHTML = '';
            if (field.options) {
                field.options.forEach((option, index) => {
                    this.addSelectOptionInput(option, field.colors ? field.colors[index] : this.selectOptionColors[index % this.selectOptionColors.length]);
                });
            }
        } else {
            selectConfig.style.display = 'none';
            document.getElementById('selectOptionsList').innerHTML = '';
        }

        this.updateFieldPreview();
        document.getElementById('fieldEditorModal').classList.add('active');
    }

    addSelectOptionInput(value = '', color = null) {
        const container = document.getElementById('selectOptionsList');
        const optionId = 'opt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        if (!color) {
            const existingOptions = container.querySelectorAll('.select-option-item').length;
            color = this.selectOptionColors[existingOptions % this.selectOptionColors.length];
        }

        const html = `
            <div class="select-option-item" data-option-id="${optionId}">
                <input type="text" class="select-option-value" value="${value}" placeholder="Option name">
                <input type="color" class="select-option-color" value="${color}">
                <button type="button" class="select-option-remove">×</button>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', html);

        const item = container.querySelector(`[data-option-id="${optionId}"]`);
        item.querySelector('.select-option-remove').addEventListener('click', () => {
            item.remove();
            this.updateFieldPreview();
        });

        item.querySelector('.select-option-value').addEventListener('input', () => this.updateFieldPreview());
        item.querySelector('.select-option-color').addEventListener('change', () => this.updateFieldPreview());
    }

    updateFieldPreview() {
        const name = document.getElementById('fieldEditorName').value || 'Field Name';
        const required = document.getElementById('fieldEditorRequired').checked;
        const selectedType = document.querySelector('.field-type-option.selected');
        const type = selectedType ? selectedType.dataset.type : 'text';

        const preview = document.getElementById('fieldPreview');
        preview.innerHTML = `
            <div class="field-preview-label">${name}${required ? ' *' : ''}</div>
            <div class="field-preview-input">${this.getFieldPreviewHTML(type)}</div>
        `;
    }

    getFieldPreviewHTML(type) {
        switch (type) {
            case 'textarea': return '<textarea placeholder="Enter long text..." disabled></textarea>';
            case 'number': return '<input type="number" placeholder="0" disabled>';
            case 'select':
                const options = Array.from(document.querySelectorAll('.select-option-value'))
                    .map((input, index) => {
                        const color = document.querySelectorAll('.select-option-color')[index].value;
                        const value = input.value || `Option ${index + 1}`;
                        return `<option style="background: ${color}20">${value}</option>`;
                    });
                return `<select disabled><option>Select...</option>${options.join('')}</select>`;
            case 'date': return '<input type="date" disabled>';
            case 'checkbox': return '<input type="checkbox" disabled style="width: auto;">';
            case 'email': return '<input type="email" placeholder="email@example.com" disabled>';
            case 'url': return '<input type="url" placeholder="https://example.com" disabled>';
            default: return '<input type="text" placeholder="Enter text..." disabled>';
        }
    }

    async saveFieldFromEditor() {
        const name = document.getElementById('fieldEditorName').value.trim();
        if (!name) {
            await this.showAlert('Error', 'Please enter a field name');
            return;
        }

        const selectedType = document.querySelector('.field-type-option.selected');
        if (!selectedType) {
            await this.showAlert('Error', 'Please select a field type');
            return;
        }

        const field = {
            name: name,
            type: selectedType.dataset.type,
            required: document.getElementById('fieldEditorRequired').checked
        };

        if (field.type === 'select') {
            const options = Array.from(document.querySelectorAll('.select-option-value'))
                .map(input => input.value.trim())
                .filter(val => val);
            
            if (options.length === 0) {
                await this.showAlert('Error', 'Please add at least one option for the select field');
                return;
            }

            field.options = options;
            field.colors = Array.from(document.querySelectorAll('.select-option-color')).map(input => input.value);
        }

        try {
            if (this.currentFieldEditorMode === 'edit') {
                await db.updateField(views.currentTableId, this.currentFieldEditorData, field);
            } else {
                await db.addField(views.currentTableId, field);
            }

            this.closeModal('fieldEditorModal');
            this.renderFieldsList();
            views.render();
        } catch (error) {
            await this.showAlert('Error', error.message || 'Failed to save field');
        }
    }

    // IMPORT SYSTEM
    
    setupImportListeners() {
        const dropZone = document.getElementById('fileDropZone');
        const fileInput = document.getElementById('importFileInput');

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) this.handleImportFile(e.dataTransfer.files[0]);
        });

        document.getElementById('selectFileBtn').addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) this.handleImportFile(e.target.files[0]);
        });

        document.getElementById('nextImportStep').addEventListener('click', () => this.nextImportStep());
        document.getElementById('prevImportStep').addEventListener('click', () => this.prevImportStep());
        document.getElementById('confirmImport').addEventListener('click', () => this.executeImport());
        document.getElementById('cancelImport').addEventListener('click', () => {
            this.closeModal('importModal');
            this.resetImport();
        });
    }

    showImportModal() {
        this.resetImport();
        document.getElementById('importModal').classList.add('active');
    }

    resetImport() {
        this.importData = { step: 1, file: null, mapping: {}, preview: [], data: null };
        document.getElementById('importFileInput').value = '';
        document.getElementById('importStep1').style.display = 'block';
        document.getElementById('importStep2').style.display = 'none';
        document.getElementById('importStep3').style.display = 'none';
        document.getElementById('nextImportStep').style.display = 'inline-block';
        document.getElementById('prevImportStep').style.display = 'none';
        document.getElementById('confirmImport').style.display = 'none';
    }

    async handleImportFile(file) {
        const extension = file.name.split('.').pop().toLowerCase();
        
        try {
            if (extension === 'json') {
                await this.handleJSONImport(file);
            } else if (extension === 'csv' || extension === 'tsv' || extension === 'txt') {
                await this.handleCSVImport(file, extension === 'tsv' ? '\t' : ',');
            } else {
                await this.showAlert('Error', 'Unsupported file type. Please use JSON, CSV, or TSV files.');
                return;
            }
            
            this.importData.file = file;
            this.nextImportStep();
        } catch (error) {
            await this.showAlert('Error', 'Failed to read file: ' + error.message);
        }
    }

    async handleJSONImport(file) {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (data.tables && data.meta) {
            const confirmed = await this.showConfirm('Import Database', 'This will replace all existing tables. Continue?');
            
            if (confirmed) {
                await storage.importData(file);
                await db.init();
                this.updateTableList();
                this.closeModal('importModal');
            }
            return;
        }
        
        this.importData.data = Array.isArray(data) ? data : [data];
        this.importData.fileType = 'json';
    }

    async handleCSVImport(file, delimiter) {
        const text = await file.text();
        const lines = text.trim().split('\n');
        
        if (lines.length < 2) {
            throw new Error('File must contain header row and at least one data row');
        }

        const headers = this.parseCSVLine(lines[0], delimiter);
        
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i], delimiter);
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            data.push(row);
        }

        this.importData.data = data;
        this.importData.headers = headers;
        this.importData.fileType = 'csv';
    }

    parseCSVLine(line, delimiter) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    nextImportStep() {
        if (this.importData.step === 1) {
            if (!this.importData.data) return;
            this.showImportMapping();
            this.importData.step = 2;
        } else if (this.importData.step === 2) {
            this.showImportPreview();
            this.importData.step = 3;
        }
    }

    prevImportStep() {
        if (this.importData.step === 3) {
            this.showImportMapping();
            this.importData.step = 2;
        } else if (this.importData.step === 2) {
            document.getElementById('importStep1').style.display = 'block';
            document.getElementById('importStep2').style.display = 'none';
            document.getElementById('prevImportStep').style.display = 'none';
            this.importData.step = 1;
        }
    }

    showImportMapping() {
        document.getElementById('importStep1').style.display = 'none';
        document.getElementById('importStep2').style.display = 'block';
        document.getElementById('prevImportStep').style.display = 'inline-block';

        const fields = db.getFields(views.currentTableId);
        const sampleData = this.importData.data[0];
        const sourceFields = Object.keys(sampleData);

        let html = '<p>Map the columns from your file to your table fields:</p><table class="import-mapping-table"><thead><tr><th>Source Column</th><th>Sample Data</th><th>Maps To</th></tr></thead><tbody>';

        sourceFields.forEach(sourceField => {
            const sampleValue = sampleData[sourceField];
            const suggestedField = fields.find(f => f.name.toLowerCase() === sourceField.toLowerCase());

            html += `<tr><td><strong>${sourceField}</strong></td><td><code>${sampleValue}</code></td><td>
                <select class="mapping-select" data-source="${sourceField}">
                    <option value="">Skip this column</option>
                    ${fields.map(field => `<option value="${field.name}" ${suggestedField && suggestedField.name === field.name ? 'selected' : ''}>${field.name} (${field.type})</option>`).join('')}
                </select>
            </td></tr>`;
        });

        html += '</tbody></table>';
        document.getElementById('importMapping').innerHTML = html;

        document.querySelectorAll('.mapping-select').forEach(select => {
            const source = select.dataset.source;
            const target = select.value;
            if (target) this.importData.mapping[source] = target;

            select.addEventListener('change', (e) => {
                const source = e.target.dataset.source;
                const target = e.target.value;
                if (target) {
                    this.importData.mapping[source] = target;
                } else {
                    delete this.importData.mapping[source];
                }
            });
        });
    }

    showImportPreview() {
        document.getElementById('importStep2').style.display = 'none';
        document.getElementById('importStep3').style.display = 'block';
        document.getElementById('nextImportStep').style.display = 'none';
        document.getElementById('confirmImport').style.display = 'inline-block';

        this.importData.preview = this.importData.data.map(row => {
            const mapped = {};
            Object.entries(this.importData.mapping).forEach(([source, target]) => {
                mapped[target] = row[source];
            });
            return mapped;
        });

        const fields = db.getFields(views.currentTableId);
        const previewRows = this.importData.preview.slice(0, 5);

        let html = `
            <div class="import-preview-stats">
                <p><strong>${this.importData.preview.length}</strong> records will be imported</p>
                <p><strong>${Object.keys(this.importData.mapping).length}</strong> columns mapped</p>
            </div>
            <p>Preview of first 5 records:</p>
            <table class="import-preview-table">
                <thead><tr>${fields.map(f => `<th>${f.name}</th>`).join('')}</tr></thead>
                <tbody>${previewRows.map(row => `<tr>${fields.map(f => `<td>${row[f.name] || ''}</td>`).join('')}</tr>`).join('')}</tbody>
            </table>
        `;

        document.getElementById('importPreview').innerHTML = html;
    }

    async executeImport() {
        try {
            for (const record of this.importData.preview) {
                await db.createRecord(views.currentTableId, record);
            }

            await this.showAlert('Success', `Imported ${this.importData.preview.length} records successfully!`);
            this.closeModal('importModal');
            this.resetImport();
            views.render();
        } catch (error) {
            await this.showAlert('Error', 'Import failed: ' + error.message);
        }
    }

    // ACTIVITY LOG
    
    setupActivityLogListeners() {
        document.getElementById('activityViewTable').addEventListener('click', () => {
            document.getElementById('activityTableView').style.display = 'block';
            document.getElementById('activityJsonView').style.display = 'none';
            document.getElementById('activityViewTable').classList.add('active');
            document.getElementById('activityViewJson').classList.remove('active');
        });

        document.getElementById('activityViewJson').addEventListener('click', () => {
            document.getElementById('activityTableView').style.display = 'none';
            document.getElementById('activityJsonView').style.display = 'block';
            document.getElementById('activityViewTable').classList.remove('active');
            document.getElementById('activityViewJson').classList.add('active');
            this.renderActivityJson();
        });

        document.getElementById('activityTableFilter').addEventListener('change', () => this.applyActivityFilters());
        document.getElementById('activityTypeFilter').addEventListener('change', () => this.applyActivityFilters());
        document.getElementById('activityDateFilter').addEventListener('change', () => this.applyActivityFilters());
        document.getElementById('exportActivitiesBtn').addEventListener('click', () => this.exportActivities());
        
        document.getElementById('copyJsonBtn').addEventListener('click', () => {
            const json = document.getElementById('activityJsonContent').textContent;
            navigator.clipboard.writeText(json);
            this.showAlert('Success', 'JSON copied to clipboard!');
        });

        document.getElementById('downloadJsonBtn').addEventListener('click', () => this.exportActivities());
        document.getElementById('closeActivityLog').addEventListener('click', () => this.closeModal('activityLogModal'));
    }

    showActivityLog() {
        const tables = db.getTables();
        const tableFilter = document.getElementById('activityTableFilter');
        tableFilter.innerHTML = '<option value="">All Tables</option>' + tables.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
        
        this.renderActivityLog();
        document.getElementById('activityLogModal').classList.add('active');
    }

    renderActivityLog(filters = {}) {
        const activities = db.getActivities(filters);
        document.getElementById('activityCount').textContent = `${activities.length} ${activities.length === 1 ? 'activity' : 'activities'}`;
        
        const timeline = document.getElementById('activityTimeline');
        
        if (activities.length === 0) {
            timeline.innerHTML = '<div class="activity-empty"><div class="activity-empty-icon">📜</div><p>No activities yet. Start creating and editing records!</p></div>';
            return;
        }

        timeline.innerHTML = activities.map(activity => this.renderActivityItem(activity)).join('');
    }

    renderActivityItem(activity) {
        const icons = {
            'record.created': '➕', 'record.updated': '✏️', 'record.deleted': '🗑️',
            'record.moved': '↔️', 'cell.edited': '✎', 'field.added': '🆕',
            'field.updated': '🔄', 'field.deleted': '❌', 'table.created': '📋'
        };

        const typeClass = activity.type.split('.')[1];
        const icon = icons[activity.type] || '📝';
        const time = this.formatActivityTime(activity.timestamp);

        let description = '';
        let details = '';

        switch (activity.type) {
            case 'record.created':
                description = `Created new record in <strong>${activity.tableName}</strong>`;
                details = Object.entries(activity.data).map(([key, value]) => `<div>${key}: ${value}</div>`).join('');
                break;

            case 'cell.edited':
                description = `Edited <strong>${activity.field}</strong> in <strong>${activity.tableName}</strong>`;
                details = `<div class="activity-change"><span class="activity-old-value">${activity.previousValue || '(empty)'}</span><span>→</span><span class="activity-new-value">${activity.newValue || '(empty)'}</span></div>`;
                break;

            case 'record.updated':
                description = `Updated <strong>${activity.field}</strong> in <strong>${activity.tableName}</strong>`;
                details = `<div class="activity-change"><span class="activity-old-value">${activity.previousValue || '(empty)'}</span><span>→</span><span class="activity-new-value">${activity.newValue || '(empty)'}</span></div>`;
                break;

            case 'record.moved':
                description = `Moved card in <strong>${activity.tableName}</strong>`;
                details = `<div class="activity-change"><span class="activity-old-value">${activity.fromColumn}</span><span>→</span><span class="activity-new-value">${activity.toColumn}</span></div>`;
                break;

            case 'record.deleted':
                description = `Deleted record from <strong>${activity.tableName}</strong>`;
                break;

            case 'field.added':
                description = `Added field <strong>${activity.field.name}</strong> (${activity.field.type}) to <strong>${activity.tableName}</strong>`;
                break;

            case 'field.updated':
                description = `Updated field in <strong>${activity.tableName}</strong>`;
                details = `<div>Changed: ${activity.oldField.name} → ${activity.newField.name}</div>`;
                break;

            case 'field.deleted':
                description = `Deleted field <strong>${activity.fieldName}</strong> from <strong>${activity.tableName}</strong>`;
                break;

            case 'table.created':
                description = `Created table <strong>${activity.tableName}</strong>`;
                break;
        }

        return `
            <div class="activity-item type-${typeClass}">
                <div class="activity-icon">${icon}</div>
                <div class="activity-content">
                    <div class="activity-header">
                        <div class="activity-title">${description}</div>
                        <div class="activity-time">${time}</div>
                    </div>
                    ${details ? `<div class="activity-details">${details}</div>` : ''}
                    <div class="activity-actor">${activity.actor}</div>
                </div>
            </div>
        `;
    }

    formatActivityTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    applyActivityFilters() {
        const tableId = document.getElementById('activityTableFilter').value;
        const type = document.getElementById('activityTypeFilter').value;
        const date = document.getElementById('activityDateFilter').value;

        const filters = {};
        if (tableId) filters.tableId = tableId;
        if (type) filters.type = type;
        if (date) filters.date = date;

        this.renderActivityLog(filters);
    }

    renderActivityJson() {
        const tableId = document.getElementById('activityTableFilter').value;
        const type = document.getElementById('activityTypeFilter').value;
        const date = document.getElementById('activityDateFilter').value;

        const filters = {};
        if (tableId) filters.tableId = tableId;
        if (type) filters.type = type;
        if (date) filters.date = date;

        const activities = db.getActivities(filters);
        const json = JSON.stringify(activities, null, 2);
        
        document.getElementById('activityJsonContent').textContent = json;
    }

    exportActivities() {
        const tableId = document.getElementById('activityTableFilter').value;
        const type = document.getElementById('activityTypeFilter').value;
        const date = document.getElementById('activityDateFilter').value;

        const filters = {};
        if (tableId) filters.tableId = tableId;
        if (type) filters.type = type;
        if (date) filters.date = date;

        const activities = db.getActivities(filters);
        const dataStr = JSON.stringify(activities, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `activity_log_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }

    // TABLE OPERATIONS
    
    updateTableList() {
        const select = document.getElementById('tableSelect');
        const tables = db.getTables();

        select.innerHTML = '<option value="">Select a table...</option>' + tables.map(table => `<option value="${table.id}">${table.name}</option>`).join('');

        if (views.currentTableId) select.value = views.currentTableId;
    }

    selectTable(tableId) {
        views.setTable(tableId);
        document.getElementById('tableSelect').value = tableId;
    }

    updateSyncStatus() {
        const status = storage.getStatus();
        const statusEl = document.getElementById('syncStatus');
        const syncBtn = document.getElementById('syncBtn');

        if (status.type === 'filen') {
            statusEl.textContent = status.connected ? 'Connected to filen.io' : 'Disconnected';
            syncBtn.style.display = 'flex';
        } else {
            statusEl.textContent = 'Local Storage';
            syncBtn.style.display = 'none';
        }

        if (status.syncing) {
            syncBtn.classList.add('syncing');
        } else {
            syncBtn.classList.remove('syncing');
        }
    }

    async syncData() {
        const syncBtn = document.getElementById('syncBtn');
        syncBtn.classList.add('syncing');

        try {
            await storage.sync();
            await db.init();
            await this.showAlert('Success', 'Data synced successfully!');
        } catch (error) {
            console.error('Sync failed:', error);
            await this.showAlert('Error', 'Sync failed. Check console for details.');
        } finally {
            syncBtn.classList.remove('syncing');
        }
    }

    showTableModal() {
        const modal = document.getElementById('tableModal');
        document.getElementById('tableName').value = '';
        document.getElementById('initialFields').innerHTML = '';
        
        for (let i = 0; i < 3; i++) this.addFieldInput();

        modal.classList.add('active');
    }

    addFieldInput(field = null) {
        const container = document.getElementById('initialFields');
        const fieldId = 'field_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        const fieldHtml = `
            <div class="form-group" data-field-id="${fieldId}">
                <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <input type="text" placeholder="Field name" class="field-name-input" value="${field?.name || ''}" style="flex: 2;">
                    <select class="field-type-input" style="flex: 1;">
                        <option value="text" ${field?.type === 'text' ? 'selected' : ''}>Text</option>
                        <option value="textarea" ${field?.type === 'textarea' ? 'selected' : ''}>Long Text</option>
                        <option value="number" ${field?.type === 'number' ? 'selected' : ''}>Number</option>
                        <option value="select" ${field?.type === 'select' ? 'selected' : ''}>Select</option>
                        <option value="date" ${field?.type === 'date' ? 'selected' : ''}>Date</option>
                        <option value="checkbox" ${field?.type === 'checkbox' ? 'selected' : ''}>Checkbox</option>
                        <option value="email" ${field?.type === 'email' ? 'selected' : ''}>Email</option>
                        <option value="url" ${field?.type === 'url' ? 'selected' : ''}>URL</option>
                    </select>
                    <button type="button" onclick="this.closest('.form-group').remove()" class="btn-icon" style="padding: 0.5rem;">×</button>
                </div>
                <div class="field-options" style="display: ${field?.type === 'select' ? 'block' : 'none'};">
                    <input type="text" placeholder="Options (comma-separated)" class="field-options-input" value="${field?.options?.join(', ') || ''}">
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', fieldHtml);

        const fieldGroup = container.querySelector(`[data-field-id="${fieldId}"]`);
        const typeSelect = fieldGroup.querySelector('.field-type-input');
        const optionsDiv = fieldGroup.querySelector('.field-options');

        typeSelect.addEventListener('change', () => {
            optionsDiv.style.display = typeSelect.value === 'select' ? 'block' : 'none';
        });
    }

    async createTable() {
        const name = document.getElementById('tableName').value.trim();
        
        if (!name) {
            await this.showAlert('Error', 'Please enter a table name');
            return;
        }

        const fields = [];
        document.querySelectorAll('#initialFields .form-group').forEach(group => {
            const nameInput = group.querySelector('.field-name-input');
            const typeSelect = group.querySelector('.field-type-input');
            const optionsInput = group.querySelector('.field-options-input');

            const fieldName = nameInput.value.trim();
            if (fieldName) {
                const field = { name: fieldName, type: typeSelect.value, required: false };

                if (typeSelect.value === 'select' && optionsInput) {
                    const options = optionsInput.value.split(',').map(opt => opt.trim()).filter(opt => opt);
                    if (options.length > 0) field.options = options;
                }

                fields.push(field);
            }
        });

        try {
            const tableId = await db.createTable(name, fields);
            this.closeModal('tableModal');
            this.selectTable(tableId);
        } catch (error) {
            console.error('Failed to create table:', error);
            await this.showAlert('Error', 'Failed to create table. Check console for details.');
        }
    }

    // RECORD OPERATIONS
    
    showRecordModal(record = null) {
        if (!views.currentTableId) return;

        const modal = document.getElementById('recordModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('recordForm');

        title.textContent = record ? 'Edit Record' : 'New Record';

        const fields = db.getFields(views.currentTableId);

        form.innerHTML = fields.map(field => {
            const value = record ? record[field.name] : '';
            return this.createFieldInput(field, value);
        }).join('');

        form.dataset.recordId = record ? record.id : '';

        modal.classList.add('active');
    }

    createFieldInput(field, value = '') {
        const fieldId = 'input_' + field.name.replace(/\s+/g, '_');

        let input = '';
        switch (field.type) {
            case 'textarea':
                input = `<textarea id="${fieldId}" name="${field.name}" ${field.required ? 'required' : ''}>${value}</textarea>`;
                break;

            case 'select':
                const options = (field.options || []).map((opt, index) => {
                    const colorIndex = field.options.indexOf(opt);
                    const color = field.colors ? field.colors[colorIndex] : this.selectOptionColors[colorIndex % this.selectOptionColors.length];
                    return `<option value="${opt}" ${value === opt ? 'selected' : ''} style="background: ${color}20">${opt}</option>`;
                }).join('');
                
                input = `<select id="${fieldId}" name="${field.name}" ${field.required ? 'required' : ''}><option value="">Select...</option>${options}</select>`;
                break;

            case 'checkbox':
                input = `<input type="checkbox" id="${fieldId}" name="${field.name}" ${value ? 'checked' : ''}>`;
                break;

            case 'date':
                input = `<input type="date" id="${fieldId}" name="${field.name}" value="${value}" ${field.required ? 'required' : ''}>`;
                break;

            case 'number':
                input = `<input type="number" id="${fieldId}" name="${field.name}" value="${value}" ${field.required ? 'required' : ''}>`;
                break;

            case 'email':
                input = `<input type="email" id="${fieldId}" name="${field.name}" value="${value}" ${field.required ? 'required' : ''}>`;
                break;

            case 'url':
                input = `<input type="url" id="${fieldId}" name="${field.name}" value="${value}" ${field.required ? 'required' : ''}>`;
                break;

            default:
                input = `<input type="text" id="${fieldId}" name="${field.name}" value="${value}" ${field.required ? 'required' : ''}>`;
        }

        return `<div class="form-group"><label for="${fieldId}">${field.name}${field.required ? ' *' : ''}</label>${input}</div>`;
    }

    async saveRecord() {
        const form = document.getElementById('recordForm');
        const recordId = form.dataset.recordId;

        const formData = new FormData(form);
        const data = {};

        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }

        const fields = db.getFields(views.currentTableId);
        fields.forEach(field => {
            if (field.type === 'checkbox' && !(field.name in data)) {
                data[field.name] = false;
            } else if (field.type === 'checkbox') {
                data[field.name] = true;
            }
        });

        try {
            if (recordId) {
                await db.updateRecord(views.currentTableId, recordId, data);
            } else {
                await db.createRecord(views.currentTableId, data);
            }

            this.closeModal('recordModal');
            views.render();
        } catch (error) {
            await this.showAlert('Error', error.message);
        }
    }

    // FIELD OPERATIONS
    
    showFieldsModal() {
        if (!views.currentTableId) return;

        const modal = document.getElementById('fieldsModal');
        this.renderFieldsList();
        modal.classList.add('active');
    }

    renderFieldsList() {
        const container = document.getElementById('fieldsList');
        const fields = db.getFields(views.currentTableId);

        container.innerHTML = fields.map(field => `
            <div class="field-item" data-field-name="${field.name}">
                <div class="field-info">
                    <div class="field-name">
                        <span class="field-type-badge">${this.getFieldTypeIcon(field.type)}</span>
                        ${field.name}
                    </div>
                    <div class="field-type">${field.type}${field.required ? ' • required' : ''}</div>
                </div>
                <div class="field-actions">
                    <button onclick="app.editField('${field.name}')" class="btn-icon">✎</button>
                    <button onclick="app.deleteField('${field.name}')" class="btn-icon">×</button>
                </div>
            </div>
        `).join('');
    }

    getFieldTypeIcon(type) {
        const icons = {
            text: 'T', textarea: '¶', number: '#', select: '▼',
            date: '📅', checkbox: '☑', email: '@', url: '🔗'
        };
        return icons[type] || '?';
    }

    editField(fieldName) {
        const field = db.getField(views.currentTableId, fieldName);
        if (!field) return;
        this.showFieldEditor(field, fieldName);
    }

    async deleteField(fieldName) {
        const confirmed = await this.showConfirm('Delete Field', `Delete field "${fieldName}"? This will remove the field from all records.`);
        if (!confirmed) return;

        await db.deleteField(views.currentTableId, fieldName);
        this.renderFieldsList();
        views.render();
    }

    // UTILITIES
    
    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
    }
}

// Create singleton and initialize
const app = new Application();
window.addEventListener('DOMContentLoaded', () => app.init());
