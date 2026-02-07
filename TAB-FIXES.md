# Tab Fixes - Pricing and Labor

## Summary of Changes Needed

### Materials Tab (WORKING ✅)
- Has dropdown selector + "Add More Items" button
- Has bulk actions: Select All, Delete Selected, Undo
- Has template dropdown at top
- All functions working properly

### Labor Tab (MOSTLY WORKING ⚠️)
- Already has all UI elements in place
- All functions exist in app.js
- Just needs verification and testing

### Pricing Tab (NEEDS FIXES ❌)
- Missing bulk action buttons
- Missing checkbox column in table
- Missing selection management functions
- Has item selector dropdown + "Add Item" button (working)

## Files to Update

1. **index.html** - Add bulk action buttons and checkbox column to pricing table
2. **pricing.js** - Add selection management and bulk action functions

## Detailed Changes

### 1. index.html - Pricing Tab Section

**Current:**
```html
<div class="search-box">
  <input 
    type="text" 
    id="pricingSearch" 
    placeholder="Search materials..." 
    onkeyup="filterPricingTable()"
  />
</div>
```

**Add After Search Box:**
```html
<div class="material-actions no-print" style="margin-top: 16px; display: flex; gap: 8px;" id="pricingActions">
  <button class="btn-secondary btn-sm" onclick="selectAllPricing()" title="Select all items">
    Select All
  </button>
  <button class="btn-danger btn-sm" onclick="deleteSelectedPricing()" title="Delete selected items">
    Delete Selected
  </button>
  <button class="btn-secondary btn-sm" onclick="undoPricingAction()" title="Undo last action" style="font-size: 18px; padding: 4px 12px;">
    ↺
  </button>
</div>
```

**Update Pricing Table Header:**
```html
<thead>
  <tr>
    <th class="no-print" style="width: 40px;"></th>
    <th>Material</th>
    <th>Unit</th>
    <th>Price</th>
    <th class="no-print">Actions</th>
  </tr>
</thead>
```

### 2. pricing.js - Add Selection Management

**Add at the top of file (after constants):**
```javascript
// Selection and undo management
window.selectedPricing = new Set();
window.pricingUndoStack = [];
```

**Add selection functions (after filterPricingTable):**
```javascript
// Toggle single item selection
function togglePricingSelection(materialName) {
  const checkbox = document.querySelector(`.pricing-checkbox[data-material="${materialName}"]`);
  if (checkbox.checked) {
    window.selectedPricing.add(materialName);
  } else {
    window.selectedPricing.delete(materialName);
  }
}

// Select/deselect all items
function selectAllPricing() {
  const checkboxes = document.querySelectorAll('.pricing-checkbox');
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  
  if (allChecked) {
    // Deselect all
    checkboxes.forEach(cb => {
      cb.checked = false;
    });
    window.selectedPricing.clear();
  } else {
    // Select all visible items
    checkboxes.forEach(cb => {
      const row = cb.closest('tr');
      if (row.style.display !== 'none') {
        cb.checked = true;
        const materialName = cb.getAttribute('data-material');
        window.selectedPricing.add(materialName);
      }
    });
  }
}

// Delete selected items
function deleteSelectedPricing() {
  if (window.selectedPricing.size === 0) {
    alert('No items selected');
    return;
  }
  
  if (!confirm(`Delete ${window.selectedPricing.size} selected item(s)?`)) {
    return;
  }
  
  // Save current state for undo
  const pricing = loadPricing();
  window.pricingUndoStack.push(JSON.parse(JSON.stringify(pricing)));
  
  // Delete selected items
  const newPricing = loadPricing();
  window.selectedPricing.forEach(materialName => {
    delete newPricing[materialName];
  });
  
  savePricing(newPricing);
  window.selectedPricing.clear();
  populatePricingTable();
  
  alert('Selected items deleted');
}

// Undo last action
function undoPricingAction() {
  if (window.pricingUndoStack.length === 0) {
    alert('Nothing to undo');
    return;
  }
  
  // Restore previous state
  const previousPricing = window.pricingUndoStack.pop();
  savePricing(previousPricing);
  window.selectedPricing.clear();
  populatePricingTable();
  
  alert('Action undone');
}
```

**Update populatePricingTable function:**
```javascript
// Populate pricing table (REPLACE EXISTING FUNCTION)
function populatePricingTable() {
  const pricing = loadPricing();
  const tbody = document.getElementById('pricingTableBody');
  
  const materialRows = Object.entries(pricing).map(([name, data]) => {
    // Escape quotes in material name for safe attribute usage
    const escapedName = name.replace(/"/g, '&quot;');
    
    return `
    <tr>
      <td class="checkbox-cell no-print">
        <input type="checkbox" 
               class="pricing-checkbox" 
               data-material="${escapedName}" 
               onchange="togglePricingSelection('${escapedName.replace(/'/g, "\\'")}')">
      </td>
      <td>${name}</td>
      <td>${data.unit}</td>
      <td>
        $<input 
          type="number" 
          step="0.01" 
          value="${data.price.toFixed(2)}" 
          class="price-input"
          data-material="${name}"
          onchange="updatePrice('${escapedName.replace(/'/g, "\\'")}', this.value)"
          style="width: 100px; padding: 4px;"
        />
      </td>
      <td class="no-print">
        <button class="delete-btn" 
                onclick="deletePricingItem('${escapedName.replace(/'/g, "\\'")}'})" 
                title="Delete this item">×</button>
      </td>
    </tr>
  `;
  }).join('');
  
  tbody.innerHTML = materialRows;
  
  // Clear selection after repopulating
  window.selectedPricing.clear();
}
```

**Update deletePricingItem to use undo stack:**
```javascript
// Delete a pricing item (REPLACE EXISTING FUNCTION)
function deletePricingItem(materialName) {
  if (confirm(`Delete "${materialName}" from pricing list?`)) {
    // Save current state for undo
    const pricing = loadPricing();
    window.pricingUndoStack.push(JSON.parse(JSON.stringify(pricing)));
    
    delete pricing[materialName];
    savePricing(pricing);
    populatePricingTable();
  }
}
```

## Implementation Order

1. Update index.html (add bulk action buttons and checkbox column)
2. Update pricing.js (add all selection management functions)
3. Test all three tabs to verify functionality

## Testing Checklist

### Materials Tab (Already Working)
- [x] Item selector dropdown works
- [x] "Add More Items" button works
- [x] Select All toggles all checkboxes
- [x] Delete Selected removes checked items
- [x] Undo restores deleted items
- [x] Template dropdown at top works

### Pricing Tab (After Fixes)
- [ ] Item selector dropdown works
- [ ] "+ Add Item" button works
- [ ] Select All toggles all checkboxes
- [ ] Delete Selected removes checked items
- [ ] Undo restores deleted items
- [ ] Search filter works with selection
- [ ] Template management works

### Labor Tab (Verify Existing)
- [ ] Item selector dropdown works
- [ ] "+ Add Item" button works
- [ ] Select All toggles all checkboxes
- [ ] Delete Selected removes checked items
- [ ] Undo restores deleted items
- [ ] Labor calculation is accurate

## Notes

- Materials tab is the reference implementation (fully working)
- Labor tab has all UI and functions in place (just needs testing)
- Pricing tab needs the most work (add checkboxes and bulk actions)
- All three tabs should have identical UX for bulk actions
