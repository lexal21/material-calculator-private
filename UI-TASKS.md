# UI Improvement Tasks

**Status:** Not Started  
**Priority:** Next phase after bug fixes  
**Last Updated:** February 4, 2026

---

## Overview

After fixing critical bugs (steep charge calculation, labor precision, material prices), the next phase focuses on improving the user interface to match the polish of the materials tab across all tabs.

---

## Task List

### 1. Labor Tab - Dropdown Selectors & Add Items Button
**Current:** Labor items are shown in a table, but can't easily add new items  
**Goal:** Match the materials tab functionality

**Requirements:**
- Add dropdown selector for labor items (similar to materials dropdown)
- Add "Add Item" button above the labor results table
- Should be able to add custom labor items dynamically
- Dropdown should show all available labor types

**Files to modify:**
- `public/app.js` - `displayLaborResults()` function (line ~1198)
- `public/index.html` - Labor tab section
- `public/style.css` - Styling for new controls

---

### 2. Labor Tab - Functional Checkboxes
**Current:** Checkboxes exist but don't do anything  
**Goal:** Full selection management like materials tab

**Requirements:**
- "Select All" checkbox functionality
- Individual row selection
- "Delete Selected" button
- Undo functionality for deletions
- Selection state management

**Files to modify:**
- `public/app.js` - Add event listeners and state management
- May need to create labor-specific undo stack

---

### 3. Material Tab - Template Dropdown
**Current:** Template management exists in Pricing tab, but not easily accessible  
**Goal:** Quick template selection at top of material tab

**Requirements:**
- Dropdown at top of material results showing saved templates
- "Apply Template" button
- Should update all material prices when selected
- Link to Pricing tab for template management

**Files to modify:**
- `public/app.js` - Template loading logic
- `public/templates.js` - May need to expose template list
- `public/index.html` - Material tab section
- `public/style.css` - Dropdown styling

---

### 4. Labor PDF Generation
**Current:** Shows alert "Labor PDF export coming soon"  
**Goal:** Generate PDF invoice matching material invoice format

**Requirements:**
- Use same pdfmake setup as materials
- Same header/footer format
- Company logo
- Job number, customer info, date
- Labor line items table
- Total calculation
- Should match print preview exactly

**Files to modify:**
- `public/app.js` - Create `generateLaborPDF()` function (similar to `generatePDF()`)
- May need to extract shared PDF template logic

**Reference:**
- Material PDF generation: `app.js` lines ~800-1000 (approximate)

---

## Implementation Notes

### Key Functions for Reference
- `displayLaborResults()` at app.js:1198 - Labor table rendering
- `addMoreAdditionalItems()` at app.js:694 - Materials "add item" pattern
- `createLaborRow()` at app.js:1319 - Labor row creation
- `generatePDF()` - Material PDF generation (use as template)

### Design Consistency
- Match electric blue theme (#0891b2)
- Use same button styles as materials tab
- Consistent spacing and alignment
- Mobile-responsive

### Testing Checklist (per task)
- [ ] Desktop browser testing
- [ ] Mobile browser testing
- [ ] Test with real data
- [ ] Verify print/PDF output (for task 4)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)

---

## Priority Order

**Recommended sequence:**
1. **Labor PDF Generation** (Task 4) - Most requested by users
2. **Material Template Dropdown** (Task 3) - Quick win, high value
3. **Labor Tab Checkboxes** (Task 2) - Improves labor management
4. **Labor Tab Dropdown/Add Items** (Task 1) - Nice-to-have enhancement

Can be done in any order - tasks are independent.

---

## Future Enhancements (Backlog)

- Drag-and-drop PDF upload
- Bulk edit mode (edit multiple items at once)
- Keyboard shortcuts (Delete key for selected items, Ctrl+Z for undo)
- Auto-save drafts to localStorage
- Export to Excel/CSV
- Dark mode toggle

---

**Ready to start when bugs are stable and client approves next phase.**
