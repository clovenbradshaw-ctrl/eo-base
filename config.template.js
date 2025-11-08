// Configuration template for filen.io integration
// Copy this file to config.js and fill in your credentials
// DO NOT commit config.js to public repositories!

const CONFIG = {
    // filen.io API Configuration
    filen: {
        // Your filen.io API key
        // Get this from your filen.io account settings
        apiKey: '', // Example: 'your-api-key-here'
        
        // Folder ID where FlexiBase data will be stored
        // You can get this from the filen.io web interface
        folderId: '', // Example: 'folder-uuid-here'
        
        // Optional: Specific file UUID if you want to always use the same file
        // Leave empty to create a new file on first sync
        fileUuid: '', // Example: 'file-uuid-here'
        
        // Auto-sync interval in milliseconds (0 = disabled)
        autoSyncInterval: 0, // Example: 300000 for 5 minutes
        
        // Enable debug logging
        debug: false
    },
    
    // Application settings
    app: {
        // Default view when opening a table
        defaultView: 'table', // Options: 'table', 'kanban', 'calendar', 'cards'
        
        // Enable auto-save (saves after each change)
        autoSave: true,
        
        // Records per page in table view (0 = no pagination)
        recordsPerPage: 0
    }
};

// Initialize storage with config
async function initializeWithConfig() {
    if (CONFIG.filen.apiKey) {
        const success = await storage.init(CONFIG.filen);
        
        if (success) {
            console.log('✓ Connected to filen.io');
            
            // Setup auto-sync if enabled
            if (CONFIG.filen.autoSyncInterval > 0) {
                setInterval(async () => {
                    if (!storage.syncInProgress) {
                        console.log('Auto-syncing...');
                        await storage.sync();
                    }
                }, CONFIG.filen.autoSyncInterval);
            }
        } else {
            console.warn('✗ Failed to connect to filen.io, using local storage');
        }
    } else {
        console.log('ℹ Using local storage (no filen.io credentials provided)');
    }
}

// Call this from app.js init method
// await initializeWithConfig();
