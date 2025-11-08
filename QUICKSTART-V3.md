# FlexiBase V3 - Quick Start Guide

## 🚀 New Features Overview

### Activity Stream Tracking
Every change you make is now recorded in a complete audit trail.

### Inline Editing
Click any cell in table view to edit it directly - no more modals!

### Draggable Kanban
Drag and drop cards between columns in Kanban view.

### Activity Log Viewer
See the complete history of all changes in your database.

---

## 📖 How to Use Each Feature

### 1. Activity Log Viewer

**Access:**
- Click "📜 View Activity Log" in the sidebar

**What you'll see:**
- Timeline of all activities (newest first)
- Each activity shows:
  - What changed
  - When it changed
  - Who changed it (currently "user")
  - Before/after values

**Filtering:**
- **By Table** - Select specific table
- **By Type** - Filter to specific activity types
  - Record Created
  - Cell Edited
  - Record Moved
  - Record Deleted
  - Field Added/Updated/Deleted
- **By Date** - See activities from specific day

**Views:**
- **Table View** (default) - Human-readable timeline with icons
- **JSON View** - Raw data for analysis

**Actions:**
- **Export Activities** - Download filtered activities as JSON
- **Copy JSON** - Copy to clipboard
- **Download JSON** - Save as file

**Example Use Cases:**
```
1. Investigation Timeline
   - Open activity log
   - Filter by your investigation table
   - See chronological order of all changes
   - Export as JSON for reporting

2. Find Who Changed What
   - Filter by date range
   - Look for specific record changes
   - See actor attribution

3. Track Budget Modifications
   - Filter by table "Budget"
   - Filter by type "Cell Edited"
   - See all budget changes over time
```

---

### 2. Inline Editing

**How to Use:**
1. Switch to Table view
2. Click any cell (except Actions column)
3. Cell enters edit mode
4. Make your changes
5. Press Enter or click away to save
6. Press ESC to cancel

**What Happens:**
- Value saves immediately
- Creates `cell.edited` activity
- Activity shows old → new value
- Timeline updated automatically

**Supported Fields:**
- **Text** - Inline text input
- **Long Text** - Expandable textarea
- **Number** - Number input with validation
- **Select** - Dropdown menu
- **Date** - Date picker
- **Checkbox** - Toggle on/off
- **Email** - Email input
- **URL** - URL input

**Visual Feedback:**
- Hover over any cell → See edit indicator (✎)
- Cell highlights blue when editable
- Input shows with blue border while editing

**Tips:**
- Tab to move between cells (coming soon!)
- Double-click for quick edit
- Changes save automatically
- Check activity log to see what changed

---

### 3. Draggable Kanban

**How to Use:**
1. Switch to Kanban view
2. Click and hold any card
3. Drag to a different column
4. Release to drop
5. Card moves and activity is logged

**What Happens:**
- Record's status field updates
- Creates `record.moved` activity
- Activity shows: "From Column → To Column"
- Card appears in new column

**Visual Feedback:**
- Card tilts slightly when dragging
- Drop zone highlights when dragging over
- Smooth animation on drop

**Requirements:**
- Table must have at least one Select field
- Select field options become columns
- Only works between different columns

**Use Cases:**
```
1. Project Management
   - Create Status field: Todo, In Progress, Done
   - Drag tasks between columns as they progress
   - Activity log shows all movements

2. Investigation Tracking
   - Status: Lead, Active, Researching, Complete
   - Move investigations through stages
   - See timeline of progress in activity log

3. Content Pipeline
   - Status: Idea, Draft, Review, Published
   - Drag articles through workflow
   - Track who moved what when
```

---

### 4. Activity Stream Architecture

**How It Works:**
FlexiBase now uses **hybrid event sourcing**:

```
Current State (fast reads)
       +
Activity Log (complete history)
       =
Best of both worlds!
```

**What's Stored:**

**1. Materialized State** (your records)
```json
{
  "id": "rec_1",
  "Name": "Nashville OHS Investigation",
  "Status": "Active",
  "Amount": "$500,000"
}
```

**2. Activity Stream** (complete history)
```json
{
  "id": "act_1",
  "type": "record.created",
  "timestamp": "2025-01-15T10:00:00Z",
  "data": { ... }
}
{
  "id": "act_2",
  "type": "cell.edited",
  "timestamp": "2025-01-15T15:30:00Z",
  "field": "Status",
  "previousValue": "Researching",
  "newValue": "Active"
}
```

**Benefits:**
- ✅ Fast queries (use current state)
- ✅ Complete history (activity log)
- ✅ Audit trail (who changed what when)
- ✅ Can rebuild state from activities
- ✅ Future: Time travel capabilities

---

## 🎯 Workflows for Journalists

### Workflow 1: Track Investigation Progress

```
1. Create Investigation Table
   - Fields: Name, Status, Source, Date, Notes
   - Status options: Lead, Active, Researching, Verified, Published

2. Add Investigations (records)
   - Enter initial information
   - Activity: record.created

3. Update as You Research (inline edit)
   - Click Status cell → Change from Lead to Active
   - Activity: cell.edited (Lead → Active)
   - Click Notes cell → Add research findings
   - Activity: cell.edited (updated notes)

4. Move Through Pipeline (Kanban drag)
   - Switch to Kanban view
   - Drag investigation from Active to Verified
   - Activity: record.moved

5. Review Timeline (activity log)
   - Open activity log
   - Filter by investigation record
   - See complete chronology
   - Export for documentation
```

### Workflow 2: Document Budget Changes

```
1. Create Budget Tracking Table
   - Fields: Line Item, Amount, Department, Date, Status

2. Enter Initial Budget
   - Add all line items with amounts
   - Activities: Multiple record.created

3. Track Changes Over Time (inline edit)
   - Click Amount cell when budget changes
   - Old: $500,000 → New: $450,000
   - Activity: cell.edited with before/after

4. Generate Audit Report
   - Open activity log
   - Filter by Budget table
   - Filter by type: Cell Edited
   - Filter by field: Amount
   - Export as JSON
   - Create visualizations from data

5. Answer Questions
   - "When did this change?" → Check timestamp
   - "Who changed it?" → Check actor
   - "What was it before?" → Check previousValue
   - "How many times changed?" → Count activities
```

### Workflow 3: Collaborative Investigation

```
1. Setup Investigation Board
   - Create shared table
   - Add Status field for Kanban
   - Add Assignment field

2. Assign Tasks
   - Create records for each task
   - Set initial status
   - Activities: record.created

3. Track Progress
   - Team members edit inline
   - Team members drag cards in Kanban
   - All changes create activities

4. Monitor Activity
   - Open activity log
   - See what teammates changed
   - Filter by date to see daily progress
   - Export timeline for meetings
```

---

## 💡 Pro Tips

### Activity Log Tips
1. **Export Regularly** - Download activity logs as backup
2. **Filter Strategically** - Use table + date filters for focused view
3. **JSON for Analysis** - Use JSON view with data tools
4. **Check Before Deleting** - Review activity log first

### Inline Editing Tips
1. **Quick Edits** - Click, type, Enter = fast updates
2. **Visual Scan** - Hover to see edit indicators
3. **Bulk Updates** - Use import for many changes
4. **Verify Changes** - Check activity log after

### Kanban Tips
1. **Status Fields** - Create meaningful status options
2. **Consistent Columns** - Keep same statuses across tables
3. **Activity Review** - Check moves in activity log
4. **Workflow Design** - Match your actual process

---

## 🔍 Finding Information

### "What changed on this record?"
```
1. Note the record (hover to see ID in URL)
2. Open activity log
3. (Future: Filter by record ID)
4. See all changes to that record
```

### "Who's been working on this?"
```
1. Open activity log
2. Filter by table
3. Look at actor field
4. See all contributors
```

### "When did the budget change?"
```
1. Open activity log
2. Filter by table: "Budget"
3. Filter by type: "Cell Edited"
4. Filter by date range
5. See timeline of changes
```

### "Export for reporting"
```
1. Open activity log
2. Apply desired filters
3. Click "Export Activities"
4. Get JSON file
5. Import to analysis tools
```

---

## 🎨 Visual Guide

### Activity Log Colors
- 🟢 **Green** - Created (new records, fields)
- 🔵 **Blue** - Updated (edits, changes)
- 🔴 **Red** - Deleted (removed records, fields)
- 🟡 **Yellow** - Moved (Kanban drag-drop)

### Activity Icons
- ➕ Record Created
- ✏️ Record Updated
- ✎ Cell Edited
- ↔️ Record Moved
- 🗑️ Record Deleted
- 🆕 Field Added
- 🔄 Field Updated
- ❌ Field Deleted
- 📋 Table Created

---

## 🚨 Important Notes

### Data Integrity
- Activities are **append-only** (can't be modified)
- This ensures tamper-evident audit trail
- Perfect for accountability journalism

### Storage Impact
- ~500 bytes per activity
- 10,000 activities ≈ 5MB
- Minimal performance impact
- Activities stored with main data

### Browser Compatibility
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Requires ES6+ and drag-drop API

---

## 🎓 Learn More

### Documentation
- `README.md` - Technical details
- `CHANGELOG-V3.md` - Complete feature list
- `PROJECT-SUMMARY.md` - Project overview

### Examples
- `example-data.json` - Sample data with activities
- Import to see activities in action

### Support
- Check browser console for errors
- Export data before major changes
- Activity log preserves all history

---

## 🎉 You're Ready!

Start using FlexiBase V3 with:
1. ✅ Complete activity tracking
2. ✅ Inline editing
3. ✅ Draggable Kanban
4. ✅ Activity log viewer

Perfect for investigative journalism, accountability tracking, and any work requiring a complete audit trail!

**Open `index.html` and start tracking!** 🚀
