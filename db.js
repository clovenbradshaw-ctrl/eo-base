// db.js - IndexedDB Database Layer
class FlexiDatabase {
    constructor() {
        this.db = new Dexie('FlexiBase');
        this.initSchema();
        this.tablesStore = this.db.table('tables');
        this.recordsStore = this.db.table('records');
        this.viewsStore = this.db.table('views');
        this.metadataStore = this.db.table('metadata');
    }

    initSchema() {
        this.db.version(1).stores({
            tables: 'id, name, created, modified',
            records: '++id, tableId, [tableId+id]',
            views: 'id, tableId, name, type',
            metadata: 'key'
        });

        this.db.table('tables').hook('creating', (primKey, obj) => this.onDataChange('table', 'create', obj));
        this.db.table('tables').hook('updating', (mods, primKey, obj) => this.onDataChange('table', 'update', { id: primKey, ...obj, ...mods }));
        this.db.table('tables').hook('deleting', (primKey, obj) => this.onDataChange('table', 'delete', obj || { id: primKey }));

        this.db.table('records').hook('creating', (primKey, obj) => this.onDataChange('record', 'create', obj));
        this.db.table('records').hook('updating', (mods, primKey, obj) => this.onDataChange('record', 'update', { id: primKey, ...obj, data: { ...obj?.data, ...mods?.data } }));
        this.db.table('records').hook('deleting', (primKey, obj) => this.onDataChange('record', 'delete', obj || { id: primKey }));
    }

    onDataChange(type, action, data) {
        if (window.storageAdapter && window.storageAdapter.autoSync) {
            window.storageAdapter.queueSync(type, action, data);
        }

        window.dispatchEvent(new CustomEvent('db-change', {
            detail: { type, action, data }
        }));
    }

    async createTable(tableData) {
        const id = `table_${Date.now()}`;
        const table = {
            id,
            name: tableData.name || 'Untitled Table',
            fields: tableData.fields || [],
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };
        await this.tablesStore.add(table);
        return table;
    }

    async getTable(id) {
        return await this.tablesStore.get(id);
    }

    async getAllTables() {
        return await this.tablesStore.toArray();
    }

    async updateTable(id, updates) {
        await this.tablesStore.update(id, {
            ...updates,
            modified: new Date().toISOString()
        });
    }

    async deleteTable(id) {
        await this.recordsStore.where('tableId').equals(id).delete();
        await this.tablesStore.delete(id);
    }

    async createRecord(tableId, data) {
        const record = {
            tableId,
            data,
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };
        const id = await this.recordsStore.add(record);
        return { id, ...record };
    }

    async getRecords(tableId) {
        return await this.recordsStore
            .where('tableId')
            .equals(tableId)
            .toArray();
    }

    async getRecord(id) {
        return await this.recordsStore.get(id);
    }

    async updateRecord(id, data) {
        await this.recordsStore.update(id, {
            data,
            modified: new Date().toISOString()
        });
    }

    async deleteRecord(id) {
        await this.recordsStore.delete(id);
    }

    async bulkUpdateRecords(updates) {
        const promises = updates.map(({ id, data }) =>
            this.updateRecord(id, data)
        );
        await Promise.all(promises);
    }

    async createView(tableId, viewData) {
        const id = `view_${Date.now()}`;
        const view = {
            id,
            tableId,
            name: viewData.name || 'Untitled View',
            type: viewData.type || 'grid',
            config: viewData.config || {},
            created: new Date().toISOString()
        };
        await this.viewsStore.add(view);
        return view;
    }

    async getViews(tableId) {
        return await this.viewsStore
            .where('tableId')
            .equals(tableId)
            .toArray();
    }

    async setMetadata(key, value) {
        await this.metadataStore.put({ key, value });
    }

    async getMetadata(key) {
        const result = await this.metadataStore.get(key);
        return result ? result.value : null;
    }

    async exportData() {
        const tables = await this.tablesStore.toArray();
        const records = await this.recordsStore.toArray();
        const views = await this.viewsStore.toArray();

        return {
            version: '2.0',
            exported: new Date().toISOString(),
            tables,
            records,
            views
        };
    }

    async importData(data) {
        await this.tablesStore.clear();
        await this.recordsStore.clear();
        await this.viewsStore.clear();

        if (data.tables) await this.tablesStore.bulkAdd(data.tables);
        if (data.records) await this.recordsStore.bulkAdd(data.records);
        if (data.views) await this.viewsStore.bulkAdd(data.views);
    }

    async searchRecords(tableId, searchTerm) {
        const records = await this.getRecords(tableId);
        if (!searchTerm) return records;

        const term = searchTerm.toLowerCase();
        return records.filter(record => {
            return Object.values(record.data).some(value =>
                String(value).toLowerCase().includes(term)
            );
        });
    }
}

window.db = new FlexiDatabase();
