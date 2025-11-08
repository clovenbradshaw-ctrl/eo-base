// storage.js - Cloud Sync Adapter
class StorageAdapter {
    constructor() {
        this.filenConfig = null;
        this.autoSync = false;
        this.syncQueue = [];
        this.isSyncing = false;
    }

    async init(config = null) {
        if (config && config.filenApiKey) {
            this.filenConfig = config;
            this.autoSync = config.autoSync || false;

            const connected = await this.testFilenConnection();
            if (connected) {
                console.log('✓ Connected to filen.io');
                await this.pullFromCloud();

                if (this.autoSync) {
                    this.startPeriodicSync();
                }
            }
            return connected;
        }
        return true;
    }

    async testFilenConnection() {
        try {
            const response = await fetch('https://api.filen.io/v3/user/info', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.filenConfig.filenApiKey}`
                }
            });
            return response.ok;
        } catch (error) {
            console.error('filen.io connection failed:', error);
            return false;
        }
    }

    queueSync(type, action, data) {
        this.syncQueue.push({ type, action, data, timestamp: Date.now() });

        clearTimeout(this.syncTimeout);
        this.syncTimeout = setTimeout(() => this.pushToCloud(), 2000);
    }

    async pushToCloud() {
        if (!this.filenConfig || this.isSyncing) return;

        this.isSyncing = true;
        try {
            const data = await window.db.exportData();

            const jsonData = JSON.stringify(data);
            const blob = new Blob([jsonData], { type: 'application/json' });

            const formData = new FormData();
            formData.append('file', blob, 'flexibase-data.json');
            formData.append('parent', this.filenConfig.folderId || 'default');

            const response = await fetch('https://api.filen.io/v3/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.filenConfig.filenApiKey}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }

            const result = await response.json();
            this.filenConfig.fileUuid = result.uuid;

            await window.db.setMetadata('filen_file_uuid', result.uuid);

            console.log('✓ Synced to filen.io');
            this.syncQueue = [];
        } catch (error) {
            console.error('Failed to sync to filen.io:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    async pullFromCloud() {
        if (!this.filenConfig) return;

        try {
            const fileUuid = this.filenConfig.fileUuid ||
                await window.db.getMetadata('filen_file_uuid');

            if (!fileUuid) {
                console.log('No cloud data found');
                return;
            }

            const response = await fetch('https://api.filen.io/v3/file/download', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.filenConfig.filenApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ uuid: fileUuid })
            });

            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }

            const data = await response.json();

            await window.db.importData(data);

            console.log('✓ Pulled data from filen.io');
        } catch (error) {
            console.error('Failed to pull from filen.io:', error);
        }
    }

    startPeriodicSync() {
        this.syncInterval = setInterval(() => {
            this.pushToCloud();
        }, 5 * 60 * 1000);
    }

    stopPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
    }

    async manualSync() {
        await this.pushToCloud();
        await this.pullFromCloud();
    }

    async exportToFile() {
        const data = await window.db.exportData();
        const jsonData = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `flexibase-backup-${Date.now()}.json`;
        a.click();

        URL.revokeObjectURL(url);
    }

    async importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    await window.db.importData(data);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
}

window.storageAdapter = new StorageAdapter();
