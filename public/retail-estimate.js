// ============================================
// RETAIL ESTIMATE MODULE
// Version: 2026-02-12 v2
// Fully customizable with customer/internal views
// ============================================

console.log('[RETAIL] Module loaded v2');

function pluralizeUnit(unit, quantity) {
  if (quantity <= 1) return unit;
  const plurals = {
    'Bundle': 'Bundles',
    'Piece': 'Pieces',
    'Roll': 'Rolls',
    'Sheet': 'Sheets',
    'Box': 'Boxes',
    'Tube': 'Tubes',
    'SQ': 'SQ',
    'EA': 'EA',
    'LF': 'LF',
    'BD': 'BD'
  };
  return plurals[unit] || unit;
}

window.retailData = null;
window.retailViewMode = 'internal'; // 'internal' or 'customer'

// Initialize from materials data
function initializeRetailEstimate() {
  if (!window.materialsData || !window.currentMeasurements) {
    console.log('[RETAIL] No materials data');
    return null;
  }

  const measurements = window.currentMeasurements;
  const raw = window.currentRawMeasurements || {};
  const squares = parseFloat(raw.roof_sq) || parseFloat(measurements.roofSquares) || 0;

  // Build line items from materials (fully editable)
  const lineItems = [];

  // Add materials as individual line items
  window.materialsData.forEach((mat, idx) => {
    if (mat.quantity > 0) {
      lineItems.push({
        id: 'mat-' + idx,
        category: 'Materials',
        description: mat.name,
        quantity: mat.quantity,
        unit: mat.unit,
        unitCost: mat.unitPrice,
        markup: 0
      });
    }
  });

  // Add labor items from labor tab if available
  if (window.laborData && window.laborData.items) {
    window.laborData.items.forEach((labor, idx) => {
      if (labor.quantity > 0) {
        lineItems.push({
          id: 'labor-' + idx,
          category: 'Labor',
          description: labor.name,
          quantity: labor.quantity,
          unit: labor.unit,
          unitCost: labor.unitPrice,
          markup: 0
        });
      }
    });
  } else {
    lineItems.push({
      id: 'labor-default',
      category: 'Labor',
      description: 'Roof Installation Labor',
      quantity: squares,
      unit: 'SQ',
      unitCost: 80,
      markup: 0
    });
  }

  const estimate = {
    customerName: document.getElementById('customerName')?.value || '',
    jobAddress: document.getElementById('jobAddress')?.value || '',
    jobNumber: document.getElementById('jobNumber')?.value || '',
    shingleColor: document.getElementById('shingleColorInput')?.value || '',
    measurements: { squares },
    lineItems: lineItems,
    fees: [
      { id: 'overhead', description: 'Overhead', type: 'percent', value: 10, enabled: true, calculated: 0 },
      { id: 'profit', description: 'Profit', type: 'percent', value: 10, enabled: true, calculated: 0 },
      { id: 'permit', description: 'Permit Fee', type: 'flat', value: 0, enabled: false, calculated: 0 },
      { id: 'dumpster', description: 'Dumpster/Disposal', type: 'flat', value: 0, enabled: false, calculated: 0 }
    ],
    tax: {
      rate: 9,
      applyTo: 'materials'
    },
    createdAt: new Date().toISOString()
  };

  window.retailData = estimate;
  return estimate;
}

function calculateRetailTotals() {
  if (!window.retailData) return {
    subtotal: 0,
    materialsSubtotal: 0,
    laborSubtotal: 0,
    feesTotal: 0,
    taxAmount: 0,
    grandTotal: 0
  };
  
  // Separate line items
  const materials = window.retailData.lineItems.filter(item => item.category === 'Materials');
  const labor = window.retailData.lineItems.filter(item => item.category === 'Labor');
  
  // Calculate subtotals
  const materialsSubtotal = materials.reduce((sum, item) => sum + calculateRetailItemTotal(item), 0);
  const laborSubtotal = labor.reduce((sum, item) => sum + calculateRetailItemTotal(item), 0);
  const subtotal = materialsSubtotal + laborSubtotal;
  
  // Update subtotal displays
  const materialsSubtotalEl = document.getElementById('retailMaterialsSubtotal');
  const laborSubtotalEl = document.getElementById('retailLaborSubtotal');
  const subtotalEl = document.getElementById('retailSubtotal');
  
  if (materialsSubtotalEl) materialsSubtotalEl.textContent = '$' + materialsSubtotal.toFixed(2);
  if (laborSubtotalEl) laborSubtotalEl.textContent = '$' + laborSubtotal.toFixed(2);
  if (subtotalEl) subtotalEl.innerHTML = '<strong>$' + subtotal.toFixed(2) + '</strong>';
  
  // Calculate fees
  let feesTotal = 0;
  if (window.retailData.fees) {
    window.retailData.fees.forEach(fee => {
      if (fee.enabled) {
        if (fee.type === 'percent') {
          fee.calculated = subtotal * (fee.value / 100);
        } else {
          fee.calculated = fee.value;
        }
        feesTotal += fee.calculated;
      }
    });
  }
  
  const feesTotalEl = document.getElementById('retailFeesTotal');
  if (feesTotalEl) feesTotalEl.textContent = '$' + feesTotal.toFixed(2);
  
  // Calculate tax
  let taxableAmount = 0;
  const taxSettings = window.retailData.tax || { rate: 9, applyTo: 'materials' };
  
  if (taxSettings.applyTo === 'materials') {
    taxableAmount = materialsSubtotal;
  } else if (taxSettings.applyTo === 'all') {
    taxableAmount = subtotal + feesTotal;
  }
  
  const taxAmount = taxableAmount * (taxSettings.rate / 100);
  const taxAmountEl = document.getElementById('retailTaxAmount');
  if (taxAmountEl) taxAmountEl.textContent = '$' + taxAmount.toFixed(2);
  
  // Calculate grand total
  const grandTotal = subtotal + feesTotal + taxAmount;
  const grandTotalEl = document.getElementById('retailGrandTotal');
  if (grandTotalEl) grandTotalEl.innerHTML = '<strong>$' + grandTotal.toFixed(2) + '</strong>';
  
  // Save to storage
  if (typeof saveRetailToStorage === 'function') {
    saveRetailToStorage();
  }
  
  // RETURN the totals object for PDF generation
  return {
    subtotal: subtotal,
    materialsSubtotal: materialsSubtotal,
    laborSubtotal: laborSubtotal,
    feesTotal: feesTotal,
    taxAmount: taxAmount,
    grandTotal: grandTotal
  };
}

function toggleRetailView(mode) {
  window.retailViewMode = mode || (window.retailViewMode === 'internal' ? 'customer' : 'internal');
  const toggle = document.getElementById('retailViewToggle');
  if (toggle) toggle.checked = window.retailViewMode === 'customer';
  const toggleBtn = document.getElementById('retailToggleBtn');
  if (toggleBtn) toggleBtn.textContent = window.retailViewMode === 'customer' ? 'Switch to Internal View' : 'Switch to Customer View';
  displayRetailEstimate();
}

function displayRetailEstimate() {
  if (!window.retailData) return;
  
  const materialsTable = document.getElementById('retailMaterialsTable');
  const laborTable = document.getElementById('retailLaborTable');
  
  // Separate line items by category
  const materials = window.retailData.lineItems.filter(item => item.category === 'Materials');
  const labor = window.retailData.lineItems.filter(item => item.category === 'Labor');
  
  // Render materials
  if (materialsTable) {
    materialsTable.innerHTML = materials.map((item, idx) => `
      <tr data-item-id="${item.id}">
        <td style="padding: 8px; width: 40px;" class="retail-internal-only">
          <input type="checkbox" class="retail-material-checkbox" data-item-id="${item.id}" onchange="toggleRetailItemSelection('${item.id}', this.checked)">
        </td>
        <td style="padding: 12px 16px;">${item.description}</td>
        <td style="padding: 12px 16px; text-align: right;">
          <input type="number" class="editable-input" value="${item.quantity}" min="0" step="0.01" onchange="updateRetailLineItem('${item.id}', 'quantity', this.value)" style="width: 70px; text-align: right; padding: 4px 8px; border: 1px solid #cbd5e0; border-radius: 4px;">
        </td>
        <td style="padding: 12px 16px; text-align: center;">${pluralizeUnit(item.unit || 'EA', item.quantity)}</td>
        <td style="padding: 12px 16px; text-align: right;" class="retail-internal-only">
          <div style="display: flex; align-items: center; justify-content: flex-end; gap: 2px;">
            <span>$</span>
            <input type="number" class="editable-input" value="${item.unitCost.toFixed(2)}" min="0" step="0.01" onchange="updateRetailLineItem('${item.id}', 'unitCost', this.value)" style="width: 70px; text-align: right; padding: 4px 8px; border: 1px solid #cbd5e0; border-radius: 4px;">
          </div>
        </td>
        <td style="padding: 12px 16px; text-align: right;" class="retail-internal-only">
          <div style="display: flex; align-items: center; justify-content: flex-end; gap: 2px;">
            <input type="number" class="editable-input" value="${item.markup || 0}" min="0" step="1" onchange="updateRetailLineItem('${item.id}', 'markup', this.value)" style="width: 50px; text-align: right; padding: 4px 8px; border: 1px solid #cbd5e0; border-radius: 4px;">
            <span>%</span>
          </div>
        </td>
        <td style="padding: 12px 16px; text-align: right; font-weight: 600;">$${calculateRetailItemTotal(item).toFixed(2)}</td>
        <td style="padding: 12px 16px;" class="retail-internal-only">
          <button onclick="deleteRetailLineItem('${item.id}')" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 18px;">×</button>
        </td>
      </tr>
    `).join('');
  }
  
  // Render labor
  if (laborTable) {
    laborTable.innerHTML = labor.map((item, idx) => `
      <tr data-item-id="${item.id}">
        <td style="padding: 8px; width: 40px;" class="retail-internal-only">
          <input type="checkbox" class="retail-labor-checkbox" data-item-id="${item.id}" onchange="toggleRetailItemSelection('${item.id}', this.checked)">
        </td>
        <td style="padding: 12px 16px;">${item.description}</td>
        <td style="padding: 12px 16px; text-align: right;">
          <input type="number" class="editable-input" value="${item.quantity}" min="0" step="0.01" onchange="updateRetailLineItem('${item.id}', 'quantity', this.value)" style="width: 70px; text-align: right; padding: 4px 8px; border: 1px solid #cbd5e0; border-radius: 4px;">
        </td>
        <td style="padding: 12px 16px; text-align: center;">${pluralizeUnit(item.unit || 'EA', item.quantity)}</td>
        <td style="padding: 12px 16px; text-align: right;" class="retail-internal-only">
          <div style="display: flex; align-items: center; justify-content: flex-end; gap: 2px;">
            <span>$</span>
            <input type="number" class="editable-input" value="${item.unitCost.toFixed(2)}" min="0" step="0.01" onchange="updateRetailLineItem('${item.id}', 'unitCost', this.value)" style="width: 70px; text-align: right; padding: 4px 8px; border: 1px solid #cbd5e0; border-radius: 4px;">
          </div>
        </td>
        <td style="padding: 12px 16px; text-align: right;" class="retail-internal-only">
          <div style="display: flex; align-items: center; justify-content: flex-end; gap: 2px;">
            <input type="number" class="editable-input" value="${item.markup || 0}" min="0" step="1" onchange="updateRetailLineItem('${item.id}', 'markup', this.value)" style="width: 50px; text-align: right; padding: 4px 8px; border: 1px solid #cbd5e0; border-radius: 4px;">
            <span>%</span>
          </div>
        </td>
        <td style="padding: 12px 16px; text-align: right; font-weight: 600;">$${calculateRetailItemTotal(item).toFixed(2)}</td>
        <td style="padding: 12px 16px;" class="retail-internal-only">
          <button onclick="deleteRetailLineItem('${item.id}')" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 18px;">×</button>
        </td>
      </tr>
    `).join('');
  }
  
  // Calculate and display subtotals
  const materialsSubtotal = materials.reduce((sum, item) => sum + calculateRetailItemTotal(item), 0);
  const laborSubtotal = labor.reduce((sum, item) => sum + calculateRetailItemTotal(item), 0);
  
  const materialsSubtotalEl = document.getElementById('retailMaterialsSubtotal');
  const laborSubtotalEl = document.getElementById('retailLaborSubtotal');
  
  if (materialsSubtotalEl) materialsSubtotalEl.textContent = '$' + materialsSubtotal.toFixed(2);
  if (laborSubtotalEl) laborSubtotalEl.textContent = '$' + laborSubtotal.toFixed(2);
  
  // Update customer info fields
  document.getElementById('retailCustomerName').value = window.retailData.customerName || '';
  document.getElementById('retailJobAddress').value = window.retailData.jobAddress || '';
  document.getElementById('retailJobNumber').value = window.retailData.jobNumber || '';
  document.getElementById('retailSquares').value = window.retailData.measurements?.squares || '';
  document.getElementById('retailShingleColor').value = window.retailData.shingleColor || '';
  
  // Calculate totals
  calculateRetailTotals();
}

function calculateRetailItemTotal(item) {
  const base = (item.quantity || 0) * (item.unitCost || 0);
  const markup = item.markup || 0;
  return base * (1 + markup / 100);
}

function updateRetailLineItem(itemId, field, value) {
  if (!window.retailData || !window.retailData.lineItems) return;
  
  const item = window.retailData.lineItems.find(i => i.id === itemId);
  if (!item) {
    console.error('[RETAIL] Item not found:', itemId);
    return;
  }
  
  // Update the field
  if (field === 'quantity' || field === 'unitCost' || field === 'markup') {
    item[field] = parseFloat(value) || 0;
  } else {
    item[field] = value;
  }
  
  // Update the row total display
  const row = document.querySelector(`tr[data-item-id="${itemId}"]`);
  if (row) {
    const totalCell = row.querySelector('td:nth-last-child(2)'); // Total is second to last column
    if (totalCell) {
      const itemTotal = calculateRetailItemTotal(item);
      totalCell.innerHTML = '$' + itemTotal.toFixed(2);
    }
  }
  
  // Recalculate all totals
  calculateRetailTotals();
  
  // Save to storage
  if (typeof saveRetailToStorage === 'function') {
    saveRetailToStorage();
  }
  
  console.log('[RETAIL] Updated', itemId, field, '=', value);
}

function updateRetailItem(idx, field, value) {
  if (!window.retailData) return;
  const item = window.retailData.lineItems[idx];
  if (!item) return;

  item[field] = (field === 'quantity' || field === 'unitCost' || field === 'markup') ?
    parseFloat(value) || 0 : value;

  displayRetailEstimate();
}

function addRetailLineItem() {
  if (!window.retailData) return;

  // Check if pricing data exists
  const pricingItems = window.ALL_MATERIALS || [];
  
  if (pricingItems.length === 0) {
    // No pricing data, just add blank item
    window.retailData.lineItems.push({
      id: 'custom-' + Date.now(),
      category: 'Other',
      description: 'New Item',
      quantity: 1,
      unit: 'EA',
      unitCost: 0,
      markup: 0
    });
    displayRetailEstimate();
    return;
  }

  // Show modal with dropdown
  showAddItemModal(pricingItems);
}

function showAddItemModal(pricingItems) {
  // Remove existing modal if any
  const existingModal = document.getElementById('addItemModal');
  if (existingModal) existingModal.remove();

  // Build options HTML (filter out "Custom Item..." placeholder)
  const optionsHtml = pricingItems
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => item.name !== 'Custom Item...')
    .map(({ item, idx }) =>
      `<option value="${idx}">${item.name} - $${(item.price || item.unitPrice || 0).toFixed(2)}/${item.unit || 'EA'}</option>`
    ).join('');

  const modalHtml = `
    <div id="addItemModal" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;">
      <div style="background:white;padding:24px;border-radius:8px;width:400px;max-width:90%;box-shadow:0 4px 20px rgba(0,0,0,0.3);">
        <h3 style="margin:0 0 16px 0;color:#1a1a1a;">Add Line Item</h3>
        <div style="margin-bottom:16px;">
          <label style="display:block;font-size:12px;color:#64748b;margin-bottom:4px;">Select from Pricing List</label>
          <select id="addItemSelect" style="width:100%;padding:10px;border:1px solid #cbd5e0;border-radius:4px;font-size:14px;">
            <option value="">-- Select an item --</option>
            ${optionsHtml}
            <option value="custom">+ Add Custom Item</option>
          </select>
        </div>
        <div id="customItemFields" style="display:none;">
          <div style="margin-bottom:12px;">
            <label style="display:block;font-size:12px;color:#64748b;margin-bottom:4px;">Description</label>
            <input type="text" id="customItemName" placeholder="Item name" style="width:100%;padding:8px;border:1px solid #cbd5e0;border-radius:4px;box-sizing:border-box;">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label style="display:block;font-size:12px;color:#64748b;margin-bottom:4px;">Unit Cost</label>
              <input type="number" id="customItemPrice" value="0" step="0.01" style="width:100%;padding:8px;border:1px solid #cbd5e0;border-radius:4px;box-sizing:border-box;">
            </div>
            <div>
              <label style="display:block;font-size:12px;color:#64748b;margin-bottom:4px;">Unit</label>
              <select id="customItemUnit" style="width:100%;padding:8px;border:1px solid #cbd5e0;border-radius:4px;">
                <option value="EA">EA</option>
                <option value="Bundle">Bundle</option>
                <option value="Box">Box</option>
                <option value="Roll">Roll</option>
                <option value="Sheet">Sheet</option>
                <option value="Piece">Piece</option>
                <option value="Tube">Tube</option>
                <option value="SQ">SQ</option>
                <option value="LF">LF</option>
              </select>
            </div>
          </div>
        </div>
        <div style="margin-bottom:16px;margin-top:16px;">
          <label style="display:block;font-size:12px;color:#64748b;margin-bottom:4px;">Category</label>
          <select id="addItemCategory" style="width:100%;padding:10px;border:1px solid #cbd5e0;border-radius:4px;font-size:14px;">
            <option value="Materials">Materials</option>
            <option value="Labor">Labor</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div style="margin-bottom:16px;">
          <label style="display:block;font-size:12px;color:#64748b;margin-bottom:4px;">Quantity</label>
          <input type="number" id="addItemQty" value="1" step="0.01" min="0" style="width:100%;padding:10px;border:1px solid #cbd5e0;border-radius:4px;font-size:14px;box-sizing:border-box;">
        </div>
        <div style="display:flex;gap:12px;justify-content:flex-end;">
          <button onclick="closeAddItemModal()" style="padding:10px 20px;border:1px solid #cbd5e0;background:white;border-radius:4px;cursor:pointer;">Cancel</button>
          <button onclick="confirmAddItem()" style="padding:10px 20px;border:none;background:#0891b2;color:white;border-radius:4px;cursor:pointer;">Add Item</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Add event listener for dropdown change
  document.getElementById('addItemSelect').addEventListener('change', function() {
    const customFields = document.getElementById('customItemFields');
    if (this.value === 'custom') {
      customFields.style.display = 'block';
    } else {
      customFields.style.display = 'none';
    }
  });
}

function closeAddItemModal() {
  const modal = document.getElementById('addItemModal');
  if (modal) modal.remove();
}

function confirmAddItem() {
  const select = document.getElementById('addItemSelect');
  const category = document.getElementById('addItemCategory').value;
  const quantity = parseFloat(document.getElementById('addItemQty').value) || 1;
  const pricingItems = window.ALL_MATERIALS || [];

  let newItem;

  if (select.value === 'custom') {
    // Custom item
    const name = document.getElementById('customItemName').value || 'Custom Item';
    const price = parseFloat(document.getElementById('customItemPrice').value) || 0;
    const unit = document.getElementById('customItemUnit').value;

    newItem = {
      id: 'custom-' + Date.now(),
      category: category,
      description: name,
      quantity: quantity,
      unit: unit,
      unitCost: price,
      markup: 0
    };
  } else if (select.value !== '') {
    // Selected from pricing list
    const idx = parseInt(select.value);
    const item = pricingItems[idx];

    newItem = {
      id: 'pricing-' + Date.now(),
      category: category,
      description: item.name,
      quantity: quantity,
      unit: item.unit || 'EA',
      unitCost: item.price || item.unitPrice || 0,
      markup: 0
    };
  } else {
    alert('Please select an item or choose "Add Custom Item"');
    return;
  }

  window.retailData.lineItems.push(newItem);
  closeAddItemModal();
  displayRetailEstimate();
}

function deleteRetailItem(idx) {
  if (!window.retailData || !confirm('Delete this line item?')) return;
  window.retailData.lineItems.splice(idx, 1);
  displayRetailEstimate();
}

function deleteRetailLineItem(itemId) {
  if (!confirm('Delete this item?')) {
    return;
  }
  
  if (window.retailData && window.retailData.lineItems) {
    window.retailData.lineItems = window.retailData.lineItems.filter(item => item.id !== itemId);
  }
  
  if (typeof displayRetailEstimate === 'function') {
    displayRetailEstimate();
  }
  
  if (typeof saveRetailToStorage === 'function') {
    saveRetailToStorage();
  }
  
  console.log('[RETAIL] Deleted item:', itemId);
}

function updateRetailFee(idx, field, value) {
  if (!window.retailData) return;
  const fee = window.retailData.fees[idx];
  fee[field] = field === 'value' ? parseFloat(value) || 0 : value;
  displayRetailEstimate();
}

function toggleRetailFee(idx, enabled) {
  if (!window.retailData) return;
  window.retailData.fees[idx].enabled = enabled;
  displayRetailEstimate();
}

function addRetailFee() {
  if (!window.retailData) return;
  window.retailData.fees.push({
    id: 'custom-' + Date.now(),
    description: 'Custom Fee',
    type: 'flat',
    value: 0,
    enabled: true,
    calculated: 0
  });
  displayRetailEstimate();
}

function updateRetailTax(field, value) {
  if (!window.retailData) return;
  if (field === 'rate') window.retailData.tax.rate = parseFloat(value) || 0;
  else if (field === 'applyTo') window.retailData.tax.applyTo = value;
  displayRetailEstimate();
}

function printRetailEstimate() {
  if (!window.retailData) {
    alert('No estimate data. Upload a PDF first.');
    return;
  }
  pdfMake.createPdf(buildRetailPDF()).open();
}

function saveRetailEstimate() {
  if (!window.retailData) {
    alert('No estimate data. Upload a PDF first.');
    return;
  }
  const name = (window.retailData.customerName || 'Customer').replace(/[^a-z0-9]/gi, '_');
  pdfMake.createPdf(buildRetailPDF()).download(name + '_Estimate.pdf');
}

function buildRetailPDF() {
  const est = window.retailData;
  const totals = calculateRetailTotals();
  const isCustomer = window.retailViewMode === 'customer';

  // Check for cover photo
  const coverPhoto = window.currentPhotos?.retail?.find(p => p.isCover);

  // Separate items by category
  const materialItems = est.lineItems.filter(item => item.category === 'Materials');
  const laborItems = est.lineItems.filter(item => item.category === 'Labor');
  const otherItems = est.lineItems.filter(item => item.category !== 'Materials' && item.category !== 'Labor');

  // Build tables for each section
  function buildSectionTable(items, isCustomerView) {
    const body = [];
    if (isCustomerView) {
      body.push([
        { text: 'Description', style: 'tableHeader' },
        { text: 'Quantity', style: 'tableHeader', alignment: 'right' }
      ]);
      items.forEach(item => {
        body.push([
          item.description,
          { text: item.quantity + ' ' + pluralizeUnit(item.unit, item.quantity), alignment: 'right' }
        ]);
      });
    } else {
      body.push([
        { text: 'Description', style: 'tableHeader' },
        { text: 'Qty', style: 'tableHeader', alignment: 'center' },
        { text: 'Unit', style: 'tableHeader', alignment: 'center' },
        { text: 'Cost', style: 'tableHeader', alignment: 'right' },
        { text: 'Markup', style: 'tableHeader', alignment: 'center' },
        { text: 'Total', style: 'tableHeader', alignment: 'right' }
      ]);
      items.forEach(item => {
        const t = item.quantity * item.unitCost * (1 + item.markup / 100);
        body.push([
          item.description,
          { text: String(item.quantity), alignment: 'center' },
          { text: pluralizeUnit(item.unit, item.quantity), alignment: 'center' },
          { text: '$' + item.unitCost.toFixed(2), alignment: 'right' },
          { text: item.markup + '%', alignment: 'center' },
          { text: '$' + t.toFixed(2), alignment: 'right' }
        ]);
      });
    }
    return body;
  }

  const tableLayout = {
    hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
    vLineWidth: () => 0,
    hLineColor: () => '#E5E7EB',
    paddingLeft: () => 8,
    paddingRight: () => 8,
    paddingTop: () => 6,
    paddingBottom: () => 6
  };

  const tableWidths = isCustomer ? ['*', 70] : ['*', 35, 45, 55, 45, 60];

  // Build content sections
  const scopeContent = [];

  // Materials section
  if (materialItems.length > 0) {
    scopeContent.push({ text: 'MATERIALS', style: 'categoryHeader', margin: [0, 0, 0, 8] });
    scopeContent.push({
      table: {
        headerRows: 1,
        widths: tableWidths,
        body: buildSectionTable(materialItems, isCustomer)
      },
      layout: tableLayout,
      margin: [0, 0, 0, 20]
    });
  }

  // Labor section
  if (laborItems.length > 0) {
    scopeContent.push({ text: 'LABOR', style: 'categoryHeader', margin: [0, 10, 0, 8] });
    scopeContent.push({
      table: {
        headerRows: 1,
        widths: tableWidths,
        body: buildSectionTable(laborItems, isCustomer)
      },
      layout: tableLayout,
      margin: [0, 0, 0, 20]
    });
  }

  // Other section (if any)
  if (otherItems.length > 0) {
    scopeContent.push({ text: 'OTHER', style: 'categoryHeader', margin: [0, 10, 0, 8] });
    scopeContent.push({
      table: {
        headerRows: 1,
        widths: tableWidths,
        body: buildSectionTable(otherItems, isCustomer)
      },
      layout: tableLayout,
      margin: [0, 0, 0, 20]
    });
  }

  const customerSubtotal = totals.subtotal + totals.feesTotal;
  const totalsStack = [
    { columns: [{ text: 'Subtotal:', width: '*', alignment: 'right' }, { text: '$' + (isCustomer ? customerSubtotal : totals.subtotal).toFixed(2), width: 100, alignment: 'right' }], margin: [0, 4, 0, 4] }
  ];

  if (!isCustomer) {
    est.fees.filter(f => f.enabled).forEach(fee => {
      totalsStack.push({ columns: [{ text: fee.description + (fee.type === 'percent' ? ' (' + fee.value + '%)' : '') + ':', width: '*', alignment: 'right' }, { text: '$' + fee.calculated.toFixed(2), width: 100, alignment: 'right' }], margin: [0, 2, 0, 2] });
    });
  }

  totalsStack.push({ columns: [{ text: 'Tax (' + est.tax.rate + '%):', width: '*', alignment: 'right' }, { text: '$' + totals.taxAmount.toFixed(2), width: 100, alignment: 'right' }], margin: [0, 4, 0, 4] });

  totalsStack.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 2, lineColor: '#0891b2' }], margin: [0, 8, 0, 8] });

  totalsStack.push({ columns: [{ text: 'TOTAL:', width: '*', alignment: 'right', bold: true, fontSize: 14 }, { text: '$' + totals.grandTotal.toFixed(2), width: 100, alignment: 'right', bold: true, fontSize: 14, color: '#0891b2' }] });

  // Build main content
  const content = [
    { text: isCustomer ? 'ROOFING ESTIMATE' : 'INTERNAL ESTIMATE', style: 'header' },
    { text: 'Date: ' + new Date().toLocaleDateString(), margin: [0, 8, 0, 20] },
    { columns: [
      { width: '50%', stack: [{ text: 'PREPARED FOR:', style: 'label' }, { text: est.customerName || 'Customer', style: 'customerName', margin: [0, 4, 0, 0] }, { text: est.jobAddress || '', margin: [0, 4, 0, 0] }, { text: 'Job #: ' + (est.jobNumber || 'N/A'), margin: [0, 4, 0, 0] }] },
      { width: '50%', stack: [{ text: 'PROJECT DETAILS:', style: 'label' }, { text: 'Roof Size: ' + est.measurements.squares.toFixed(1) + ' squares', margin: [0, 4, 0, 0] }, { text: 'Shingle: ' + (est.shingleColor || 'TBD'), margin: [0, 4, 0, 0] }] }
    ], margin: [0, 0, 0, 30] },
    { text: 'SCOPE OF WORK', style: 'sectionHeader', margin: [0, 0, 0, 16] },
    ...scopeContent,
    { columns: [{ width: '*', text: '' }, { width: 250, stack: totalsStack }] },
    { text: ' This estimate is valid for 30 days.', style: 'terms' },
    { columns: [{ width: '45%', stack: [{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 1 }], margin: [0, 50, 0, 4] }, { text: 'Customer Signature / Date', fontSize: 9, color: '#64748b' }] }, { width: '10%', text: '' }, { width: '45%', stack: [{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 1 }], margin: [0, 50, 0, 4] }, { text: 'Contractor Signature / Date', fontSize: 9, color: '#64748b' }] }] }
  ];

  // Add cover photo if exists
  if (coverPhoto && coverPhoto.data) {
    content.unshift({ text: '', pageBreak: 'after' });
    content.unshift({ image: coverPhoto.data, width: 350, alignment: 'center', margin: [0, 0, 0, 0] });
    content.unshift({ text: 'Job #: ' + (est.jobNumber || 'N/A'), style: 'coverJob', alignment: 'center', margin: [0, 0, 0, 30] });
    content.unshift({ text: est.jobAddress || '', style: 'coverAddress', alignment: 'center', margin: [0, 0, 0, 8] });
    content.unshift({ text: est.customerName || '', style: 'coverCustomer', alignment: 'center', margin: [0, 0, 0, 8] });
    content.unshift({ text: isCustomer ? 'ROOFING ESTIMATE' : 'INTERNAL ESTIMATE', style: 'coverTitle', alignment: 'center', margin: [0, 0, 0, 20] });
  }

  // Add photos section
  const otherPhotos = window.currentPhotos?.retail?.filter(p => !p.isCover) || [];
  if (otherPhotos.length > 0) {
    content.push({ text: 'PHOTOS', style: 'sectionHeader', margin: [0, 30, 0, 12], pageBreak: 'before' });
    for (let i = 0; i < otherPhotos.length; i += 2) {
      const row = [];
      row.push({ image: otherPhotos[i].data, width: 240, margin: [0, 0, 10, 10] });
      if (otherPhotos[i + 1]) {
        row.push({ image: otherPhotos[i + 1].data, width: 240, margin: [0, 0, 0, 10] });
      }
      content.push({ columns: row });
    }
  }

  return {
    pageSize: 'LETTER',
    pageMargins: [72, 72, 72, 72],
    content: content,
    styles: {
      header: { fontSize: 24, bold: true, color: '#0891b2' },
      label: { fontSize: 10, bold: true, color: '#64748b' },
      customerName: { fontSize: 14, bold: true },
      sectionHeader: { fontSize: 12, bold: true },
      categoryHeader: { fontSize: 11, bold: true, color: '#0891b2' },
      tableHeader: { bold: true, fontSize: 9, fillColor: '#f8fafc' },
      terms: { fontSize: 9, color: '#64748b' },
      coverTitle: { fontSize: 32, bold: true, color: '#0891b2' },
      coverCustomer: { fontSize: 18, bold: true },
      coverAddress: { fontSize: 14 },
      coverJob: { fontSize: 12, color: '#64748b' }
    }
  };
}

function refreshRetailFromSource() {
  if (!confirm('Reload all items from Materials/Labor tabs? Custom items will be lost.')) return;
  window.retailData = null;
  initializeRetailEstimate();
  displayRetailEstimate();
}

function resetRetailEstimate() {
  window.retailData = null;
  window.retailViewMode = 'internal';
  const toggle = document.getElementById('retailViewToggle');
  if (toggle) toggle.checked = false;
  const toggleBtn = document.getElementById('retailToggleBtn');
  if (toggleBtn) toggleBtn.textContent = 'Switch to Customer View';
  const notReady = document.getElementById('retailNotReady');
  const results = document.getElementById('retailResults');
  if (notReady) notReady.style.display = 'block';
  if (results) results.style.display = 'none';
}

function toggleRetailItemSelection(itemId, isChecked) {
  const row = document.querySelector(`tr[data-item-id="${itemId}"]`);
  if (row) {
    if (isChecked) {
      row.classList.add('row-selected');
    } else {
      row.classList.remove('row-selected');
    }
  }
}

function saveRetailNotes() {
  const materialsNotes = document.getElementById('retailMaterialsNotes')?.value || '';
  const laborNotes = document.getElementById('retailLaborNotes')?.value || '';
  
  if (window.retailData) {
    window.retailData.materialsNotes = materialsNotes;
    window.retailData.laborNotes = laborNotes;
  }
  
  console.log('[RETAIL] Saved notes');
}
