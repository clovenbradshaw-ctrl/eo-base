// Storage abstraction layer
// This can be easily swapped to use filen.io API

class StorageAdapter {
    constructor() {
        this.storageType = 'local'; // Will be 'filen' when API is configured
        this.filenConfig = null;
        this.syncInProgress = false;
    }

    // Initialize storage (will setup filen.io connection later)
    async init(config = null) {
        if (config && config.filenApiKey) {
            this.filenConfig = config;
            this.storageType = 'filen';
            return await this.testFilenConnection();
        }
        return true;
    }

    // Test filen.io connection
    async testFilenConnection() {
        if (!this.filenConfig) return false;
        
        try {
            // TODO: Add actual filen.io API test call when credentials are provided
            // const response = await fetch('https://api.filen.io/v3/user/info', {
            //     headers: {
            //         'Authorization': `Bearer ${this.filenConfig.apiKey}`
            //     }
            // });
            // return response.ok;
            
            console.log('filen.io API not yet configured');
            return false;
        } catch (error) {
            console.error('Failed to connect to filen.io:', error);
            return false;
        }
    }

    // Get all data
    async getData() {
        if (this.storageType === 'filen') {
            return await this.getDataFromFilen();
        }
        return this.getDataFromLocal();
    }

    // Save all data
    async saveData(data) {
        if (this.storageType === 'filen') {
            return await this.saveDataToFilen(data);
        }
        return this.saveDataToLocal(data);
    }

    // LOCAL STORAGE METHODS
    getDataFromLocal() {
        try {
            const data = localStorage.getItem('flexibase_data');
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error reading from localStorage:', error);
        }
        
        // Return default structure
        return {
            tables: {},
            activities: [],
            meta: {
                version: '2.0.0',
                lastModified: new Date().toISOString()
            }
        };
    }

    saveDataToLocal(data) {
        try {
            data.meta.lastModified = new Date().toISOString();
            localStorage.setItem('flexibase_data', JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    // FILEN.IO METHODS (placeholders for now)
    async getDataFromFilen() {
        try {
            // TODO: Implement filen.io fetch
            // 1. List files in designated folder
            // 2. Download the database file (e.g., flexibase.json)
            // 3. Parse and return the data
            
            /*
            Example structure:
            const response = await fetch('https://api.filen.io/v3/file/download', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.filenConfig.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    uuid: this.filenConfig.fileUuid
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                return data;
            }
            */
            
            console.warn('filen.io get not implemented yet, falling back to local storage');
            return this.getDataFromLocal();
        } catch (error) {
            console.error('Error fetching from filen.io:', error);
            return this.getDataFromLocal();
        }
    }

    async saveDataToFilen(data) {
        try {
            // TODO: Implement filen.io save
            // 1. Convert data to JSON
            // 2. Upload to filen.io
            // 3. Update file metadata
            
            /*
            Example structure:
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            
            const formData = new FormData();
            formData.append('file', blob, 'flexibase.json');
            formData.append('parent', this.filenConfig.folderId);
            
            const response = await fetch('https://api.filen.io/v3/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.filenConfig.apiKey}`
                },
                body: formData
            });
            
            return response.ok;
            */
            
            console.warn('filen.io save not implemented yet, saving to local storage');
            return this.saveDataToLocal(data);
        } catch (error) {
            console.error('Error saving to filen.io:', error);
            return this.saveDataToLocal(data);
        }
    }

    // Sync between local and remote
    async sync() {
        if (this.storageType !== 'filen' || this.syncInProgress) {
            return false;
        }

        this.syncInProgress = true;
        
        try {
            // TODO: Implement proper sync logic
            // 1. Get remote data
            // 2. Get local data
            // 3. Compare timestamps
            // 4. Merge changes (last-write-wins or more sophisticated conflict resolution)
            // 5. Save merged data to both locations
            
            const localData = this.getDataFromLocal();
            const remoteData = await this.getDataFromFilen();
            
            // Simple last-write-wins for now
            let mergedData;
            if (new Date(localData.meta.lastModified) > new Date(remoteData.meta.lastModified)) {
                mergedData = localData;
                await this.saveDataToFilen(mergedData);
            } else {
                mergedData = remoteData;
                this.saveDataToLocal(mergedData);
            }
            
            return true;
        } catch (error) {
            console.error('Sync error:', error);
            return false;
        } finally {
            this.syncInProgress = false;
        }
    }

    // Export data for backup
    exportData() {
        const data = this.getDataFromLocal();
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `flexibase_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }

    // Import data from backup
    async importData(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            // Validate data structure
            if (!data.tables || !data.meta) {
                throw new Error('Invalid data format');
            }
            
            // Save imported data
            this.saveDataToLocal(data);
            
            // If filen.io is configured, sync there too
            if (this.storageType === 'filen') {
                await this.saveDataToFilen(data);
            }
            
            return true;
        } catch (error) {
            console.error('Import error:', error);
            return false;
        }
    }

    // Get storage status
    getStatus() {
        return {
            type: this.storageType,
            syncing: this.syncInProgress,
            connected: this.storageType === 'filen' ? !!this.filenConfig : true
        };
    }
}

// Create singleton instance
const storage = new StorageAdapter();
