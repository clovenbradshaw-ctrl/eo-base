# FlexiBase - Flexible Relational Database

A powerful, Airtable-like database application that runs entirely in the browser and can sync with filen.io for cloud storage.

## Features

- **Multiple View Types**
  - Table View - Traditional spreadsheet-like view
  - Kanban Board - Organize records by status/category
  - Calendar View - Display records by date
  - Cards View - Gallery of record cards

- **Flexible Data Model**
  - Create multiple tables with custom fields
  - Supported field types: text, long text, number, select, date, checkbox, email, URL
  - Required fields and validation
  - Easy field management

- **Full CRUD Operations**
  - Create, read, update, and delete records
  - Search and filter records
  - Export/import data as JSON

- **Storage Options**
  - Local storage (default)
  - filen.io cloud sync (requires API credentials)

## Getting Started

### 1. Deployment to GitHub Pages

1. Create a new GitHub repository
2. Upload all the files to the repository:
   - `index.html`
   - `styles.css`
   - `storage.js`
   - `database.js`
   - `views.js`
   - `app.js`

3. Enable GitHub Pages:
   - Go to repository Settings
   - Navigate to Pages section
   - Select "main" branch as source
   - Save

4. Your app will be available at: `https://yourusername.github.io/your-repo-name/`

### 2. Basic Usage

1. **Create Your First Table**
   - Click "Create Your First Table" or the "+" button next to the table selector
   - Enter a table name
   - Add fields with names and types
   - Click "Create Table"

2. **Add Records**
   - Click "+ New Record" in the sidebar
   - Fill in the form fields
   - Click "Save"

3. **Switch Views**
   - Use the view buttons in the sidebar to switch between Table, Kanban, Calendar, and Cards views
   - Each view provides a different perspective on your data

4. **Manage Fields**
   - Click "Manage Fields" to add, edit, or remove fields
   - Changes apply to all records in the table

5. **Export/Import**
   - Use "Export Data" to download a backup as JSON
   - Use "Import Data" to restore from a backup file

## Integrating with filen.io

### Step 1: Get filen.io API Credentials

1. Sign up for a filen.io account at https://filen.io
2. Navigate to your account settings
3. Generate an API key
4. Note your account details

### Step 2: Configure Storage Adapter

Edit `storage.js` and update the filen.io integration:

```javascript
// In the init method, add your configuration
async init(config = null) {
    // Example configuration
    if (!config) {
        config = {
            filenApiKey: 'YOUR_API_KEY_HERE',
            folderId: 'YOUR_FOLDER_ID_HERE',
            fileUuid: 'YOUR_FILE_UUID_HERE' // Optional: specific file to sync
        };
    }
    
    if (config && config.filenApiKey) {
        this.filenConfig = config;
        this.storageType = 'filen';
        return await this.testFilenConnection();
    }
    return true;
}
```

### Step 3: Implement filen.io API Calls

The storage adapter has placeholder methods for filen.io integration. You'll need to implement:

#### A. File Upload (in `saveDataToFilen` method):

```javascript
async saveDataToFilen(data) {
    try {
        // Convert data to JSON blob
        const jsonData = JSON.stringify(data);
        const blob = new Blob([jsonData], { type: 'application/json' });
        
        // Create FormData
        const formData = new FormData();
        formData.append('file', blob, 'flexibase.json');
        formData.append('parent', this.filenConfig.folderId);
        
        // Upload to filen.io
        const response = await fetch('https://api.filen.io/v3/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.filenConfig.apiKey}`
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Store the file UUID for future operations
        this.filenConfig.fileUuid = result.uuid;
        
        return true;
    } catch (error) {
        console.error('Error saving to filen.io:', error);
        return false;
    }
}
```

#### B. File Download (in `getDataFromFilen` method):

```javascript
async getDataFromFilen() {
    try {
        // Download file from filen.io
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
        
        if (!response.ok) {
            throw new Error(`Download failed: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching from filen.io:', error);
        // Fall back to local storage
        return this.getDataFromLocal();
    }
}
```

#### C. Connection Test (in `testFilenConnection` method):

```javascript
async testFilenConnection() {
    try {
        const response = await fetch('https://api.filen.io/v3/user/info', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.filenConfig.apiKey}`
            }
        });
        
        return response.ok;
    } catch (error) {
        console.error('Failed to connect to filen.io:', error);
        return false;
    }
}
```

### Step 4: API Documentation

Refer to the official filen.io API documentation for:
- Authentication methods
- Endpoint URLs
- Request/response formats
- Rate limits and quotas

API Documentation: https://filen.io/docs (check filen.io website for actual docs)

## Architecture

### File Structure

- **index.html** - Main HTML structure and layout
- **styles.css** - All styling and responsive design
- **storage.js** - Storage abstraction layer (local/cloud)
- **database.js** - Data model and business logic
- **views.js** - View rendering (table, kanban, calendar, cards)
- **app.js** - Application controller and UI coordination

### Storage Architecture

The storage layer is designed with abstraction in mind:

```
┌─────────────────────────────────────┐
│        Application Layer            │
│         (app.js)                    │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│        Database Layer               │
│       (database.js)                 │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│       Storage Adapter               │
│       (storage.js)                  │
└─────┬──────────────────────┬────────┘
      │                      │
┌─────▼─────────┐    ┌──────▼────────┐
│ Local Storage │    │  filen.io API │
└───────────────┘    └───────────────┘
```

### Data Model

```javascript
{
  tables: {
    "table_id_1": {
      meta: {
        name: "My Table",
        created: "2025-01-01T00:00:00.000Z",
        modified: "2025-01-01T00:00:00.000Z"
      },
      fields: [
        {
          name: "Name",
          type: "text",
          required: true
        },
        {
          name: "Status",
          type: "select",
          required: true,
          options: ["Todo", "In Progress", "Done"]
        }
      ],
      records: [
        {
          id: "rec_123",
          Name: "Task 1",
          Status: "Todo"
        }
      ]
    }
  },
  meta: {
    version: "1.0.0",
    lastModified: "2025-01-01T00:00:00.000Z"
  }
}
```

## Field Types

- **text** - Single line text input
- **textarea** - Multi-line text input
- **number** - Numeric input with validation
- **select** - Dropdown with predefined options
- **date** - Date picker
- **checkbox** - Boolean true/false
- **email** - Email with validation
- **url** - URL with validation

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

Requires modern browser with ES6+ support and localStorage.

## Local Development

Simply open `index.html` in a web browser. No build process required!

For a local server:
```bash
python -m http.server 8000
# or
npx serve
```

Then navigate to `http://localhost:8000`

## Data Backup

Always maintain backups of your data:

1. Use the "Export Data" button regularly
2. Keep exported JSON files in a safe location
3. Test imports periodically to ensure backups work

## Security Notes

- API keys should never be committed to public repositories
- Use environment variables or secure configuration management
- Consider implementing encryption for sensitive data
- The filen.io connection uses HTTPS for secure transmission

## Future Enhancements

Potential features to add:
- Collaborative editing
- Record history/versioning
- Advanced filtering and sorting
- Custom formulas/calculations
- File attachments
- Relational links between tables
- User authentication and permissions
- Real-time sync with WebSockets
- Mobile app version
- Offline-first PWA capabilities

## Contributing

This is a starting template. Feel free to:
- Add new field types
- Implement additional views
- Enhance the UI/UX
- Improve the sync logic
- Add more robust error handling

## License

MIT License - Feel free to use and modify for your needs.

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify your filen.io API credentials
3. Test with local storage first
4. Export your data before making major changes

## Acknowledgments

Built with vanilla JavaScript, HTML, and CSS - no frameworks required!
