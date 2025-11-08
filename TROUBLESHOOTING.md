# Troubleshooting Guide - FlexiBase V3

## Quick Checks

### 1. Test if it loads
Open `index.html` in your browser. You should see:
- ✅ "FlexiBase" header at top
- ✅ Sidebar with view buttons
- ✅ "Create Your First Table" button if no tables exist

**If nothing appears:**
- Check browser console (F12) for errors
- Make sure all files are in the same folder
- Try a different browser (Chrome recommended)

### 2. Test table creation
1. Click "Create Your First Table"
2. Enter a name
3. Add at least one field
4. Click "Create Table"

**If button doesn't work:**
- Open browser console (F12)
- Look for JavaScript errors
- Make sure `app.js` loaded correctly

### 3. Test inline editing
1. Create a table with some records
2. Switch to Table view
3. Click any cell (not the Actions column)
4. You should see an input field

**If cells don't become editable:**
- Check console for errors
- Make sure `views.js` loaded
- Try refreshing the page

### 4. Test activity log
1. Make some changes (create/edit records)
2. Click "📜 View Activity Log" in sidebar
3. You should see a modal with activities

**If modal doesn't open:**
- Check console for errors
- Verify the button exists in HTML
- Make sure `database.js` has `getActivities()` method

### 5. Test drag and drop
1. Create a table with a Select field (e.g., Status)
2. Add some records
3. Switch to Kanban view
4. Try dragging a card

**If dragging doesn't work:**
- Make sure you have a Select field
- Check if `setupKanbanDragDrop()` is being called
- Browser must support drag-drop API

## Common Issues

### Issue: "Nothing happens when I click buttons"

**Solution:**
1. Open browser console (F12 → Console tab)
2. Look for red error messages
3. Most common: File paths wrong or JavaScript syntax error

### Issue: "Activity log is empty"

**Solution:**
- Activities only start tracking AFTER you create/edit things
- Create a table and add records to test
- Check console: `db.getActivities()` should return array

### Issue: "Inline editing doesn't save"

**Solution:**
- Make sure you press Enter or click away to save
- Check console for errors during save
- Verify `database.js` has updated `updateRecord()` method

### Issue: "Drag and drop doesn't work"

**Solution:**
- Kanban view requires a Select field type
- Cards must be in different columns
- Check if `draggable="true"` attribute is on cards

### Issue: "Modal appears but is blank"

**Solution:**
- Check if modal HTML is complete in `index.html`
- Verify CSS loaded correctly
- Look for JavaScript errors in console

## Testing Each Feature

### Test Activity Tracking

```javascript
// Open browser console and run:

// 1. Check if activities exist
console.log('Activities:', db.data.activities);

// 2. Create a test activity manually
db.logActivity({
    type: 'test',
    message: 'Testing activity system'
});

// 3. Check if it was added
console.log('After test:', db.data.activities);

// 4. Get all activities
console.log('Get activities:', db.getActivities());
```

### Test Inline Editing

```javascript
// Open console and run:

// 1. Check if views.startInlineEdit exists
console.log('Has startInlineEdit:', typeof views.startInlineEdit);

// 2. Test manually
const cell = document.querySelector('.editable-cell');
if (cell) {
    views.startInlineEdit(cell);
} else {
    console.log('No editable cells found - switch to Table view first');
}
```

### Test Drag and Drop

```javascript
// Open console and run:

// 1. Check if setupKanbanDragDrop exists
console.log('Has setupKanbanDragDrop:', typeof views.setupKanbanDragDrop);

// 2. Check if cards are draggable
const cards = document.querySelectorAll('.kanban-card');
console.log('Draggable cards:', Array.from(cards).map(c => c.draggable));
```

## Browser Console Commands

### View all data
```javascript
console.log('All data:', db.data);
```

### View activities
```javascript
console.log('Activities:', db.getActivities());
```

### View current table
```javascript
console.log('Current table:', db.getTable(views.currentTableId));
```

### Manually trigger activity log
```javascript
app.showActivityLog();
```

### Check if features loaded
```javascript
console.log('Features loaded:', {
    activities: !!db.getActivities,
    inlineEdit: !!views.startInlineEdit,
    dragDrop: !!views.setupKanbanDragDrop,
    activityLog: !!app.showActivityLog
});
```

## File Checklist

Make sure you have all these files:

```
your-folder/
├── index.html          ✓ Main app HTML
├── styles.css          ✓ All styling
├── app.js              ✓ Application logic
├── database.js         ✓ Data operations
├── views.js            ✓ View rendering
├── storage.js          ✓ Storage layer
└── ...other files
```

**Test file loading:**
1. Open index.html
2. Open Developer Tools (F12)
3. Go to Network tab
4. Refresh page
5. Check if all .js and .css files loaded (status 200)

## Manual Feature Test

### Activity Log Test
1. Open `index.html`
2. Create a table
3. Add a record
4. Click "📜 View Activity Log"
5. You should see "Created new record" activity

### Inline Edit Test
1. Create table with records
2. Switch to Table view
3. Click a cell (should show edit pencil on hover)
4. Type new value
5. Press Enter
6. Check activity log - should show "Cell edited"

### Drag Drop Test
1. Create table with Select field
2. Add records
3. Switch to Kanban view
4. Drag card to different column
5. Check activity log - should show "Record moved"

## Still Not Working?

### Reset Everything
```javascript
// In browser console:
localStorage.clear();
location.reload();
```

### Check Browser Compatibility
- Chrome/Edge: Should work perfectly
- Firefox: Should work perfectly
- Safari: Should work (might have drag-drop quirks)
- IE11: Not supported

### Verify JavaScript Version
The app requires ES6+ features:
- Async/await
- Arrow functions
- Template literals
- Spread operator

**Test in console:**
```javascript
// Should work without errors:
const test = async () => {
    const data = { ...{a: 1}, b: 2 };
    return `Result: ${data.b}`;
};
test().then(console.log);
```

## Getting Help

If still having issues:

1. **Check console errors**
   - Press F12
   - Look at Console tab
   - Copy any red error messages

2. **Export your data first**
   - Click "Export Data"
   - Save the JSON file
   - This preserves your work

3. **Test with fresh start**
   - Clear localStorage
   - Reload page
   - Try basic operations

4. **Minimal test**
   - Just open index.html
   - Create one table
   - Add one record
   - If this works, features are working

## Debug Mode

Add this to top of app.js for more logging:

```javascript
// After class Application {
    constructor() {
        this.debug = true; // Enable debug mode
        // ... rest of constructor
    }
```

Then check console for detailed logs during operations.

## Success Indicators

You know it's working when:
- ✅ Can create tables
- ✅ Can add records
- ✅ Can click cells to edit
- ✅ Activity log shows changes
- ✅ Can drag Kanban cards
- ✅ No console errors

If all these work, FlexiBase V3 is fully operational! 🎉
