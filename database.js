// Database management module

class Database {
    constructor() {
        this.data = null;
        this.currentTable = null;
        this.listeners = [];
    }

    // Initialize database
    async init() {
        this.data = await storage.getData();
        
        // Ensure activities array exists
        if (!this.data.activities) {
            this.data.activities = [];
        }
        
        this.notifyListeners();
    }

    // Subscribe to data changes
    subscribe(callback) {
        this.listeners.push(callback);
    }

    // Notify all listeners of changes
    notifyListeners() {
        this.listeners.forEach(callback => callback(this.data));
    }

    // Save data
    async save() {
        await storage.saveData(this.data);
        this.notifyListeners();
    }

    // ACTIVITY TRACKING

    logActivity(activity) {
        const fullActivity = {
            id: this.generateId().replace('rec_', 'act_'),
            timestamp: new Date().toISOString(),
            actor: 'user', // TODO: Add user system
            ...activity
        };
        
        this.data.activities.push(fullActivity);
        return fullActivity;
    }

    getActivities(filters = {}) {
        let activities = [...this.data.activities];

        // Filter by table
        if (filters.tableId) {
            activities = activities.filter(a => a.tableId === filters.tableId);
        }

        // Filter by type
        if (filters.type) {
            activities = activities.filter(a => a.type === filters.type);
        }

        // Filter by date
        if (filters.date) {
            const filterDate = new Date(filters.date).toISOString().split('T')[0];
            activities = activities.filter(a => {
                const activityDate = new Date(a.timestamp).toISOString().split('T')[0];
                return activityDate === filterDate;
            });
        }

        // Filter by record
        if (filters.recordId) {
            activities = activities.filter(a => a.recordId === filters.recordId);
        }

        // Sort by timestamp (newest first)
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return activities;
    }

    getRecordHistory(tableId, recordId) {
        return this.getActivities({ tableId, recordId });
    }

    // TABLE OPERATIONS

    // Get all tables
    getTables() {
        return Object.keys(this.data.tables).map(id => ({
            id,
            ...this.data.tables[id].meta
        }));
    }

    // Get specific table
    getTable(tableId) {
        return this.data.tables[tableId];
    }

    // Create new table
    async createTable(name, fields = []) {
        const tableId = this.generateId();
        
        // Default fields if none provided
        if (fields.length === 0) {
            fields = [
                { name: 'Name', type: 'text', required: true },
                { name: 'Description', type: 'textarea', required: false },
                { name: 'Status', type: 'select', required: true, options: ['Todo', 'In Progress', 'Done'] },
                { name: 'Date', type: 'date', required: false }
            ];
        }

        // Add ID field automatically
        const allFields = [
            { name: 'id', type: 'id', required: true, hidden: true },
            ...fields
        ];

        this.data.tables[tableId] = {
            meta: {
                name,
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            },
            fields: allFields,
            records: []
        };

        await this.save();
        return tableId;
    }

    // Update table metadata
    async updateTableMeta(tableId, updates) {
        if (!this.data.tables[tableId]) return false;
        
        this.data.tables[tableId].meta = {
            ...this.data.tables[tableId].meta,
            ...updates,
            modified: new Date().toISOString()
        };

        await this.save();
        return true;
    }

    // Delete table
    async deleteTable(tableId) {
        if (!this.data.tables[tableId]) return false;
        
        delete this.data.tables[tableId];
        await this.save();
        return true;
    }

    // FIELD OPERATIONS

    // Add field to table
    async addField(tableId, field) {
        if (!this.data.tables[tableId]) return false;

        // Validate field
        if (!field.name || !field.type) return false;

        // Check for duplicate field names
        const exists = this.data.tables[tableId].fields.some(
            f => f.name.toLowerCase() === field.name.toLowerCase()
        );

        if (exists) return false;

        this.data.tables[tableId].fields.push({
            name: field.name,
            type: field.type,
            required: field.required || false,
            options: field.options || null,
            colors: field.colors || null
        });

        // Log activity
        this.logActivity({
            type: 'field.added',
            tableId,
            tableName: this.data.tables[tableId].meta.name,
            field: { ...field }
        });

        await this.save();
        return true;
    }

    // Update field
    async updateField(tableId, oldName, newField) {
        if (!this.data.tables[tableId]) return false;

        const fieldIndex = this.data.tables[tableId].fields.findIndex(
            f => f.name === oldName
        );

        if (fieldIndex === -1) return false;

        const oldField = { ...this.data.tables[tableId].fields[fieldIndex] };

        // Update field definition
        this.data.tables[tableId].fields[fieldIndex] = {
            ...this.data.tables[tableId].fields[fieldIndex],
            ...newField
        };

        // If field name changed, update all records
        if (oldName !== newField.name) {
            this.data.tables[tableId].records.forEach(record => {
                if (record[oldName] !== undefined) {
                    record[newField.name] = record[oldName];
                    delete record[oldName];
                }
            });
        }

        // Log activity
        this.logActivity({
            type: 'field.updated',
            tableId,
            tableName: this.data.tables[tableId].meta.name,
            oldField,
            newField: { ...newField }
        });

        await this.save();
        return true;
    }

    // Delete field
    async deleteField(tableId, fieldName) {
        if (!this.data.tables[tableId]) return false;

        // Can't delete ID field
        if (fieldName === 'id') return false;

        const field = this.data.tables[tableId].fields.find(f => f.name === fieldName);
        if (!field) return false;

        // Remove field definition
        this.data.tables[tableId].fields = this.data.tables[tableId].fields.filter(
            f => f.name !== fieldName
        );

        // Remove field from all records
        this.data.tables[tableId].records.forEach(record => {
            delete record[fieldName];
        });

        // Log activity
        this.logActivity({
            type: 'field.deleted',
            tableId,
            tableName: this.data.tables[tableId].meta.name,
            fieldName,
            field: { ...field }
        });

        await this.save();
        return true;
    }

    // RECORD OPERATIONS

    // Get all records from table
    getRecords(tableId, filter = null) {
        if (!this.data.tables[tableId]) return [];

        let records = this.data.tables[tableId].records;

        // Apply filter if provided
        if (filter && filter.search) {
            const search = filter.search.toLowerCase();
            records = records.filter(record => {
                return Object.values(record).some(value => {
                    if (value === null || value === undefined) return false;
                    return String(value).toLowerCase().includes(search);
                });
            });
        }

        return records;
    }

    // Get single record
    getRecord(tableId, recordId) {
        if (!this.data.tables[tableId]) return null;

        return this.data.tables[tableId].records.find(r => r.id === recordId);
    }

    // Create record
    async createRecord(tableId, recordData) {
        if (!this.data.tables[tableId]) return null;

        const table = this.data.tables[tableId];
        
        // Generate ID
        const record = {
            id: this.generateId(),
            ...recordData
        };

        // Validate required fields
        for (const field of table.fields) {
            if (field.required && !field.hidden && !record[field.name]) {
                throw new Error(`Field "${field.name}" is required`);
            }
        }

        table.records.push(record);
        table.meta.modified = new Date().toISOString();

        // Log activity
        this.logActivity({
            type: 'record.created',
            tableId,
            recordId: record.id,
            tableName: table.meta.name,
            data: { ...recordData }
        });

        await this.save();
        return record.id;
    }

    // Update record
    async updateRecord(tableId, recordId, updates, method = 'modal_edit') {
        if (!this.data.tables[tableId]) return false;

        const table = this.data.tables[tableId];
        const recordIndex = table.records.findIndex(r => r.id === recordId);

        if (recordIndex === -1) return false;

        const oldRecord = { ...table.records[recordIndex] };

        // Track which fields changed
        const changes = {};
        for (const [field, newValue] of Object.entries(updates)) {
            if (oldRecord[field] !== newValue) {
                changes[field] = {
                    from: oldRecord[field],
                    to: newValue
                };
            }
        }

        // Merge updates
        table.records[recordIndex] = {
            ...table.records[recordIndex],
            ...updates,
            id: recordId // Ensure ID doesn't change
        };

        table.meta.modified = new Date().toISOString();

        // Log activity for each changed field
        Object.entries(changes).forEach(([field, change]) => {
            this.logActivity({
                type: method === 'inline_edit' ? 'cell.edited' : 'record.updated',
                tableId,
                recordId,
                tableName: table.meta.name,
                field,
                previousValue: change.from,
                newValue: change.to,
                method
            });
        });

        await this.save();
        return true;
    }

    // Delete record
    async deleteRecord(tableId, recordId) {
        if (!this.data.tables[tableId]) return false;

        const table = this.data.tables[tableId];
        const record = table.records.find(r => r.id === recordId);
        
        if (!record) return false;

        const initialLength = table.records.length;
        table.records = table.records.filter(r => r.id !== recordId);

        if (table.records.length === initialLength) return false;

        table.meta.modified = new Date().toISOString();

        // Log activity
        this.logActivity({
            type: 'record.deleted',
            tableId,
            recordId,
            tableName: table.meta.name,
            deletedData: { ...record }
        });

        await this.save();
        return true;
    }

    // Move record (for Kanban drag-drop)
    async moveRecord(tableId, recordId, field, fromValue, toValue) {
        if (!this.data.tables[tableId]) return false;

        const updates = { [field]: toValue };
        const success = await this.updateRecord(tableId, recordId, updates, 'drag_drop');

        if (success) {
            // Additional activity log for the move specifically
            this.logActivity({
                type: 'record.moved',
                tableId,
                recordId,
                tableName: this.data.tables[tableId].meta.name,
                field,
                fromColumn: fromValue,
                toColumn: toValue
            });
            
            await this.save();
        }

        return success;
    }

    // UTILITY METHODS

    // Generate unique ID
    generateId() {
        return 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Get field configuration for a table
    getFields(tableId) {
        if (!this.data.tables[tableId]) return [];
        return this.data.tables[tableId].fields.filter(f => !f.hidden);
    }

    // Get field by name
    getField(tableId, fieldName) {
        if (!this.data.tables[tableId]) return null;
        return this.data.tables[tableId].fields.find(f => f.name === fieldName);
    }

    // Validate field value
    validateField(field, value) {
        // Required check
        if (field.required && (!value || value === '')) {
            return { valid: false, error: `${field.name} is required` };
        }

        // Type-specific validation
        switch (field.type) {
            case 'email':
                if (value && !this.isValidEmail(value)) {
                    return { valid: false, error: 'Invalid email format' };
                }
                break;
            
            case 'url':
                if (value && !this.isValidUrl(value)) {
                    return { valid: false, error: 'Invalid URL format' };
                }
                break;
            
            case 'number':
                if (value && isNaN(value)) {
                    return { valid: false, error: 'Must be a number' };
                }
                break;
            
            case 'date':
                if (value && !this.isValidDate(value)) {
                    return { valid: false, error: 'Invalid date format' };
                }
                break;
        }

        return { valid: true };
    }

    // Helper validation functions
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    isValidDate(dateString) {
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    }

    // Get records grouped by field value (for Kanban)
    getRecordsByGroup(tableId, groupField) {
        if (!this.data.tables[tableId]) return {};

        const records = this.data.tables[tableId].records;
        const field = this.getField(tableId, groupField);
        
        if (!field) return {};

        const groups = {};

        // Initialize groups based on field type
        if (field.type === 'select' && field.options) {
            field.options.forEach(option => {
                groups[option] = [];
            });
        }

        // Organize records into groups
        records.forEach(record => {
            const groupValue = record[groupField] || 'Ungrouped';
            if (!groups[groupValue]) {
                groups[groupValue] = [];
            }
            groups[groupValue].push(record);
        });

        return groups;
    }

    // Get records by date field (for Calendar)
    getRecordsByDate(tableId, dateField, year, month) {
        if (!this.data.tables[tableId]) return {};

        const records = this.data.tables[tableId].records;
        const byDate = {};

        records.forEach(record => {
            const dateValue = record[dateField];
            if (!dateValue) return;

            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return;

            // Check if date is in the specified month
            if (date.getFullYear() === year && date.getMonth() === month) {
                const dateKey = date.toISOString().split('T')[0];
                if (!byDate[dateKey]) {
                    byDate[dateKey] = [];
                }
                byDate[dateKey].push(record);
            }
        });

        return byDate;
    }
}

// Create singleton instance
const db = new Database();
