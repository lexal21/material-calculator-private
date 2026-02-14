// Version: 2026-02-07-00:53 - Labor debug logging
console.log('[APP.JS] Loaded version: 2026-02-07-00:53');

const fileInput = document.getElementById('fileInput');
const uploadBox = document.getElementById('uploadBox');
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const error = document.getElementById('error');

// Tab switching
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  // If called programmatically (no event), find and activate the button
  if (event && event.target) {
    event.target.classList.add('active');
  } else {
    // Find button that triggers this tab
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
      if (btn.getAttribute('onclick').includes(`'${tabName}'`)) {
        btn.classList.add('active');
      }
    });
  }
  
  document.getElementById(tabName + 'Tab').classList.add('active');
  
  // If switching to home tab, ensure upload section is visible
  if (tabName === 'home') {
    const uploadSection = document.querySelector('.upload-section');
    if (uploadSection) {
      uploadSection.style.display = 'block';
    }
  }
  
  // Initialize pricing tab when switched to
  if (tabName === 'pricing') {
    if (typeof initPricingTab === 'function') {
      initPricingTab();
    }
  }
}

// Load current user on page load
async function loadCurrentUser() {
  try {
    const response = await fetch('/api/user');
    const data = await response.json();
    if (data.success && data.user) {
      document.getElementById('userName').textContent = data.user.name || data.user.email;
    } else {
      window.location.href = '/login.html';
    }
  } catch (err) {
    console.error('Failed to load user:', err);
    window.location.href = '/login.html';
  }
}

// Logout function
async function logout() {
  try {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login.html';
  } catch (err) {
    console.error('Logout failed:', err);
    window.location.href = '/login.html';
  }
}

// Load user info on page load
loadCurrentUser();

// File input change handler
fileInput.addEventListener('change', handleFileSelect);

// Select PDF button handler (works on mobile)
const selectPDFBtn = document.getElementById('selectPDFBtn');
if (selectPDFBtn) {
  selectPDFBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInput.click();
  });
  
  // Also add touch handler for iOS
  selectPDFBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInput.click();
  });
}

// Upload box click handler (desktop)
uploadBox.addEventListener('click', (e) => {
  // Only trigger if not clicking the button directly
  if (e.target.id !== 'selectPDFBtn' && !e.target.closest('.btn-primary')) {
    fileInput.click();
  }
});

// Drag and drop handlers
uploadBox.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadBox.classList.add('dragover');
});

uploadBox.addEventListener('dragleave', () => {
  uploadBox.classList.remove('dragover');
});

uploadBox.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadBox.classList.remove('dragover');
  
  const files = e.dataTransfer.files;
  if (files.length > 0 && files[0].type === 'application/pdf') {
    handleFile(files[0]);
  } else {
    showError('Please drop a PDF file');
  }
});

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    handleFile(file);
  }
}

async function handleFile(file) {
  hideError();
  showLoading();
  
  // Clear photos when uploading new PDF
  window.currentPhotos = { materials: [], labor: [] };
  if (typeof displayMaterialsPhotos === 'function') {
    displayMaterialsPhotos();
  }
  if (typeof displayLaborPhotos === 'function') {
    displayLaborPhotos();
  }
  
  const locationName = document.getElementById('location').value;
  const locationType = window.getLocationType(locationName);
  const customPricing = getCurrentPricing();
  
  const formData = new FormData();
  formData.append('pdf', file);
  formData.append('location', locationType);
  formData.append('pricing', JSON.stringify(customPricing));
  
  try {
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success) {
      displayResults(data);
    } else {
      showError(data.message || 'Failed to process PDF');
    }
  } catch (err) {
    showError('Network error: ' + err.message);
  } finally {
    hideLoading();
  }
}

function showLoading() {
  document.querySelector('.upload-section').style.display = 'none';
  loading.style.display = 'block';
  results.style.display = 'none';
}

function hideLoading() {
  loading.style.display = 'none';
}

function showError(message) {
  error.textContent = message;
  error.style.display = 'block';
  document.querySelector('.upload-section').style.display = 'block';
}

function hideError() {
  error.style.display = 'none';
}

// Build additional item options from ALL_MATERIALS + current pricing
function buildAdditionalItemOptions() {
  const options = [
    { name: 'Select Item...', price: 0 }
  ];
  
  // Get current pricing
  const currentPricing = window.getCurrentPricing ? window.getCurrentPricing() : {};
  
  // Add ALL_MATERIALS items (includes Custom Item...)
  if (window.ALL_MATERIALS) {
    window.ALL_MATERIALS.forEach(item => {
      // Update price from current pricing if available
      const price = currentPricing[item.name] ? currentPricing[item.name].price : item.price;
      options.push({
        name: item.name,
        price: price
      });
    });
  }
  
  // Add any custom items from pricing that aren't in ALL_MATERIALS
  Object.keys(currentPricing).forEach(itemName => {
    const existsInOptions = options.some(opt => opt.name === itemName);
    if (!existsInOptions) {
      options.push({
        name: itemName,
        price: currentPricing[itemName].price
      });
    }
  });
  
  return options;
}

// Create HTML for an additional item row
function createAdditionalItemRow(rowNumber) {
  const additionalItemOptions = buildAdditionalItemOptions();
  const optionsHTML = additionalItemOptions.map(item => 
    `<option value="${item.name}" data-price="${item.price}">${item.name}</option>`
  ).join('');
  
  return `
    <tr class="misc-row no-print-repeat zero-quantity" data-misc="${rowNumber}">
      <td class="checkbox-cell no-print">
        <input type="checkbox" class="material-checkbox" data-misc="${rowNumber}" onchange="toggleMiscSelection(${rowNumber})">
      </td>
      <td data-label="Item">
        <select 
          class="editable-input misc-name-input" 
          id="miscItem${rowNumber}"
          onchange="updateMiscItemSelect(${rowNumber})"
          style="width: 100%; max-width: 300px;"
        >
          ${optionsHTML}
        </select>
      </td>
      <td data-label="Quantity" class="editable-cell">
        <div class="quantity-cell">
          <input 
            type="number" 
            class="editable-input quantity-input" 
            id="miscQty${rowNumber}"
            value="0"
            min="0"
            step="1"
            onchange="updateMiscRow(${rowNumber})"
            aria-label="Quantity for additional item ${rowNumber}"
          />
        </div>
      </td>
      <td data-label="Unit Price" class="editable-cell">
        $<input 
          type="number" 
          step="0.01"
          min="0"
          class="editable-input price-input" 
          id="miscPrice${rowNumber}"
          value="0.00" 
          onchange="updateMiscRow(${rowNumber})"
          aria-label="Unit price for additional item ${rowNumber}"
        />
      </td>
      <td data-label="Total" class="row-total" id="miscTotal${rowNumber}">$0.00</td>
      <td class="delete-cell no-print">
        <button class="delete-btn" onclick="deleteMiscRow(${rowNumber})" aria-label="Delete additional item ${rowNumber}">
          �
        </button>
      </td>
    </tr>
  `;
}

function displayResults(data) {
  // Store data for restoration after print
  window.currentPDFData = data;
  
  if (!data.raw) data.raw = {};
  
  // Store customer name and job number for PDF
  window.currentCustomerName = data.raw.customer_name || '';
  window.currentJobNumber = data.raw.order_number || '';
  
  // Display measurements - Split into customer info and measurements
  const measurementsDiv = document.getElementById('measurements');
  measurementsDiv.innerHTML = `
    <div class="customer-info">
      <div class="info-item">
        <div class="info-label">Customer</div>
        <div class="info-value">
          <input 
            type="text" 
            id="customerName"
            value="${data.raw.customer_name || ''}" 
            placeholder="Enter customer name"
            onchange="updateCustomerName(this.value)"
          />
        </div>
      </div>
      <div class="info-item">
        <div class="info-label">Shingle Color</div>
        <div class="info-value">
          <input 
            type="text" 
            id="shingleColorInput"
            list="shingleColors"
            placeholder="Select or type color"
          />
          <datalist id="shingleColors">
            ${(window.SHINGLE_COLORS || []).map(color => `<option value="${color}">`).join('')}
          </datalist>
        </div>
      </div>
      <div class="info-item">
        <div class="info-label">Job Address</div>
        <div class="info-value">
          <input 
            type="text" 
            id="jobAddress"
            value="${(data.raw.address || '').replace(/\n/g, ' ')}" 
            placeholder="Enter job address"
          />
        </div>
      </div>
      <div class="info-item">
        <div class="info-label">Job Number</div>
        <div class="info-value">
          <input 
            type="text" 
            id="jobNumber"
            value="${data.raw.order_number}" 
            placeholder="Enter job number"
            onchange="updateJobNumber(this.value)"
          />
        </div>
      </div>
    </div>
    <div class="measurements-grid">
      <div class="measurement-item no-print">
        <div class="measurement-label">Roof Squares</div>
        <div class="measurement-value">${data.measurements.roofSquares} sq</div>
      </div>
      <div class="measurement-item no-print">
        <div class="measurement-label">Hip Length</div>
        <div class="measurement-value">${data.measurements.hipLength} ft</div>
      </div>
      <div class="measurement-item no-print">
        <div class="measurement-label">Ridge Length</div>
        <div class="measurement-value">${data.measurements.ridgeLength} ft</div>
      </div>
      <div class="measurement-item no-print">
        <div class="measurement-label">
          Ridge Count
          <span class="tooltip-icon" tabindex="0" style="margin-left: 6px;">?
            <span class="tooltip-text">Number of separate roof peaks. Auto-estimated based on ridge length: &lt;50ft = 1, 50-80ft = length÷30, &gt;80ft = length÷25</span>
          </span>
        </div>
        <div class="measurement-value">${data.measurements.ridgeCount} (est.)</div>
      </div>
    </div>
  `;
  
  // Display materials with editable quantities and prices
  const tableBody = document.getElementById('materialsTable');
  
  // Build dropdown options from all materials
  const materialOptions = (window.ALL_MATERIALS || []).map(mat => 
    `<option value="${mat.name}" data-unit="${mat.unit}" data-price="${mat.price}">${mat.name}</option>`
  ).join('');
  
  tableBody.innerHTML = data.materials.map((item, index) => {
    const pluralUnit = pluralizeUnit(item.quantity, item.unit);
    // Format quantity: whole numbers if no decimal, otherwise 2 decimals
    const qtyDisplay = item.quantity % 1 === 0 ? item.quantity.toString() : item.quantity.toFixed(2);
    const qtyForPrint = item.quantity % 1 === 0 ? item.quantity.toString() : item.quantity.toFixed(2);
    
    return `
    <tr data-row="${index}" data-unit="${item.unit}" class="${item.quantity === 0 ? 'zero-quantity' : ''}">
      <td class="checkbox-cell no-print">
        <input type="checkbox" class="material-checkbox" data-row="${index}" onchange="toggleMaterialSelection(${index})">
      </td>
      <td data-label="Item">
        <select class="editable-input material-name-select" id="materialName${index}" data-row="${index}" onchange="updateMaterialSelect(${index})" style="width: 100%; max-width: 300px;">
          <option value="${item.name}" data-unit="${item.unit}" data-price="${item.unitPrice}" selected>${item.name}</option>
          ${materialOptions}
          <option value="__CUSTOM__" data-unit="Piece" data-price="0">Custom Item...</option>
        </select>
      </td>
      <td data-label="Quantity" class="editable-cell" data-print-value="${qtyForPrint} ${pluralUnit}">
        <input 
          type="number" 
          class="editable-input quantity-input" 
          value="${qtyDisplay}" 
          min="0"
          step="0.01"
          data-row="${index}"
          data-field="quantity"
          onchange="updateMaterialRow(${index})"
          aria-label="Quantity for ${item.name}"
        />
      </td>
      <td data-label="Unit">${item.unit || ''}</td>
      <td data-label="Unit Price" class="editable-cell">
        $<input 
          type="number" 
          step="0.01"
          min="0.01"
          class="editable-input price-input" 
          value="${item.unitPrice.toFixed(2)}" 
          data-row="${index}"
          data-field="unitPrice"
          onchange="updateMaterialRow(${index})"
          aria-label="Unit price for ${item.name}"
        />
      </td>
      <td data-label="Total" class="row-total">$${item.total.toFixed(2)}</td>
      <td class="delete-cell no-print">
        <button class="delete-btn" onclick="deleteMaterialRow(${index})" aria-label="Delete ${item.name}">
          �
        </button>
      </td>
    </tr>
  `;
  }).join('');
  
  // Additional items dropdown options - dynamically built from ALL_MATERIALS + current pricing
  const additionalItemOptions = buildAdditionalItemOptions();
  
  window.additionalItemOptions = additionalItemOptions;
  
  // Add 3 additional items to the materials table - COMMENTED OUT (use + Add Item button instead)
  /*
  for (let i = 1; i <= 3; i++) {
    const optionsHTML = additionalItemOptions.map(item => 
      `<option value="${item.name}" data-price="${item.price}">${item.name}</option>`
    ).join('');
    
    tableBody.innerHTML += `
      <tr class="misc-row no-print-repeat zero-quantity" data-misc="${i}">
        <td class="checkbox-cell no-print">
          <input type="checkbox" class="material-checkbox" data-misc="${i}" onchange="toggleMiscSelection(${i})">
        </td>
        <td data-label="Item">
          <select 
            class="editable-input misc-name-input" 
            id="miscItem${i}"
            onchange="updateMiscItemSelect(${i})"
            style="width: 100%; max-width: 300px;"
          >
            ${optionsHTML}
          </select>
        </td>
        <td data-label="Quantity" class="editable-cell">
          <div class="quantity-cell">
            <input 
              type="number" 
              class="editable-input quantity-input" 
              id="miscQty${i}"
              value="0"
              min="0"
              step="1"
              onchange="updateMiscRow(${i})"
              aria-label="Quantity for additional item ${i}"
            />
          </div>
        </td>
        <td data-label="Unit Price" class="editable-cell">
          $<input 
            type="number" 
            step="0.01"
            min="0"
            class="editable-input price-input" 
            id="miscPrice${i}"
            value="0.00" 
            onchange="updateMiscRow(${i})"
            aria-label="Unit price for additional item ${i}"
          />
        </td>
        <td data-label="Total" class="row-total" id="miscTotal${i}">$0.00</td>
        <td class="delete-cell no-print">
          <button class="delete-btn" onclick="deleteMiscRow(${i})" aria-label="Delete additional item ${i}">
            �
          </button>
        </td>
      </tr>
    `;
  }
  */
  
  // Store original data for recalculation
  window.materialsData = data.materials;
  window.taxRate = 9; // Default 9%
  window.miscTotals = new Array(3).fill(0);
  window.miscItemCount = 3; // Track number of misc items
  
  // Add totals in separate section (won't repeat on print)
  const totalsTable = document.getElementById('totalsTable');
  totalsTable.innerHTML = `
    <tr class="subtotal-row">
      <td colspan="2"><strong>SUBTOTAL</strong></td>
      <td id="subtotalCell" style="text-align: right;"><strong>$${data.subtotal.toFixed(2)}</strong></td>
    </tr>
    <tr class="tax-row">
      <td>
        <div class="tooltip-container">
          <strong>Tax</strong>
          <span class="tooltip-icon" tabindex="0">?
            <span class="tooltip-text">SC sales tax varies by county. Default is 9% but you can adjust based on job location.</span>
          </span>
        </div>
      </td>
      <td class="editable-cell">
        <input 
          type="number" 
          step="0.1"
          min="0"
          max="100"
          class="editable-input" 
          id="taxRateInput"
          value="9" 
          onchange="updateTaxRate(this.value)"
          style="width: 60px;"
          aria-label="Tax rate percentage"
        /><!--
        --><span style="margin-left: 2px;">%</span>
      </td>
      <td id="taxCell" style="text-align: right;">$${data.tax.toFixed(2)}</td>
    </tr>
    <tr class="grand-total-row">
      <td colspan="2"><strong style="font-size: 1.2em;">GRAND TOTAL</strong></td>
      <td id="grandTotal" style="text-align: right; font-size: 1.2em; color: #2B7BA3;"><strong>$${data.grandTotal.toFixed(2)}</strong></td>
    </tr>
  `;
  
  results.style.display = 'block';
  
  // Show manufacturer selector
  showMaterialsManufacturerSelector();
  
  // Switch to Materials (calculator) tab after processing
  switchTab('calculator');
  
  // Show "Add More Items" button and material actions
  const addMoreBtn = document.getElementById('addMoreItemsBtn');
  if (addMoreBtn) {
    addMoreBtn.style.display = 'inline-block';
  }
  const materialActions = document.getElementById('materialActions');
  if (materialActions) {
    materialActions.style.display = 'block';
  }
  
  // Initialize and show material template selector
  populateMaterialTemplateSelector();
  
  // Store measurements globally for labor tab
  console.log('[DISPLAY] Storing measurements for labor tab...');
  window.currentMeasurements = data.measurements;
  window.currentRawMeasurements = data.raw;
  
  // Populate labor tab
  console.log('[DISPLAY] About to call displayLaborResults with data:', data);
  try {
    displayLaborResults(data);
    console.log('[DISPLAY] displayLaborResults call completed');
  } catch (err) {
    console.error('[DISPLAY] ERROR calling displayLaborResults:', err);
    console.error('[DISPLAY] Stack trace:', err.stack);
  }
  
  // Initialize retail estimate
  if (typeof displayRetailEstimate === 'function') {
    displayRetailEstimate();
  }
  
  // Ensure all zero-quantity rows have the class applied (for print preview)
  setTimeout(() => {
    applyZeroQuantityClasses();
  }, 100);
}

function updateMiscItemSelect(miscNum) {
  const select = document.getElementById(`miscItem${miscNum}`);
  const priceInput = document.getElementById(`miscPrice${miscNum}`);
  const selectedOption = select.options[select.selectedIndex];
  const price = parseFloat(selectedOption.getAttribute('data-price')) || 0;
  
  // If "Custom Item..." is selected, convert to text input
  if (select.value === 'Custom Item...') {
    const customName = prompt('Enter custom item name:');
    if (customName) {
      // Replace select with text input
      const input = document.createElement('input');
      input.type = 'text';
      input.value = customName;
      input.className = 'editable-input misc-name-input';
      input.style.width = '100%';
      input.style.maxWidth = '300px';
      select.parentNode.replaceChild(input, select);
    }
    return;
  }
  
  // Auto-populate price when item is selected
  if (select.value !== 'Select Item...' && select.value !== 'Custom Item...') {
    priceInput.value = price.toFixed(2);
  }
  
  // Update row
  updateMiscRow(miscNum);
}

function deleteMaterialRow(rowIndex) {
  if (!confirm('Delete this item from the material list?')) {
    return;
  }
  
  // Save state for undo
  saveUndoState();
  
  // Remove from DOM
  const row = document.querySelector(`tr[data-row="${rowIndex}"]`);
  if (row) {
    row.remove();
  }
  
  // Update stored data - set quantity to 0 to exclude from calculations
  window.materialsData[rowIndex].quantity = 0;
  window.materialsData[rowIndex].total = 0;
  
  // Recalculate totals
  recalculateTotals();
}

function deleteMiscRow(miscNum) {
  if (!confirm('Delete this additional item?')) {
    return;
  }
  
  // Save state for undo
  saveUndoState();
  
  // Remove from DOM
  const row = document.querySelector(`tr[data-misc="${miscNum}"]`);
  if (row) {
    row.remove();
  }
  
  // Update stored data
  window.miscTotals[miscNum - 1] = 0;
  
  // Recalculate totals
  recalculateTotals();
}

function updateMiscRow(miscNum) {
  const qtyInput = document.getElementById(`miscQty${miscNum}`);
  const priceInput = document.getElementById(`miscPrice${miscNum}`);
  
  const qty = parseFloat(qtyInput.value) || 0;
  const price = parseFloat(priceInput.value) || 0;
  
  // Validate if values are entered
  let valid = true;
  if (qty > 0) {
    valid = validateQuantity(qtyInput, qty) && valid;
  } else {
    qtyInput.classList.remove('error', 'success');
    removeErrorMessage(qtyInput);
  }
  
  if (price > 0) {
    valid = validatePrice(priceInput, price) && valid;
  } else {
    priceInput.classList.remove('error', 'success');
    removeErrorMessage(priceInput);
  }
  
  if (!valid) {
    return;
  }
  
  const total = qty * price;
  
  window.miscTotals[miscNum - 1] = total;
  
  // Update the visible total cell
  const totalCell = document.getElementById(`miscTotal${miscNum}`);
  if (totalCell) {
    totalCell.textContent = '$' + total.toFixed(2);
  }
  
  // Toggle zero-quantity class for print hiding
  const row = document.querySelector(`tr[data-misc="${miscNum}"]`);
  if (row) {
    if (qty === 0) {
      row.classList.add('zero-quantity');
    } else {
      row.classList.remove('zero-quantity');
    }
  }
  
  recalculateTotals();
}

function updateMaterialRow(rowIndex) {
  const row = document.querySelector(`tr[data-row="${rowIndex}"]`);
  const qtyInput = row.querySelector('[data-field="quantity"]');
  const priceInput = row.querySelector('[data-field="unitPrice"]');
  const totalCell = row.querySelector('.row-total');
  const unitLabels = row.querySelectorAll('.unit-label');
  
  const quantity = parseFloat(qtyInput.value) || 0;
  const unitPrice = parseFloat(priceInput.value) || 0;
  
  // Validate inputs (allow 0 quantity)
  let qtyValid = true;
  let priceValid = true;
  
  if (quantity > 0) {
    qtyValid = validateQuantity(qtyInput, quantity);
  } else {
    qtyInput.classList.remove('error', 'success');
    removeErrorMessage(qtyInput);
  }
  
  if (unitPrice > 0) {
    priceValid = validatePrice(priceInput, unitPrice);
  } else {
    priceInput.classList.remove('error', 'success');
    removeErrorMessage(priceInput);
  }
  
  // If invalid, don't update calculations
  if (!qtyValid || !priceValid) {
    return;
  }
  
  const total = quantity * unitPrice;
  
  // Update row total
  totalCell.textContent = '$' + total.toFixed(2);
  
  // Update unit labels with pluralization
  const baseUnit = row.getAttribute('data-unit') || window.materialsData[rowIndex].unit;
  const pluralUnit = pluralizeUnit(quantity, baseUnit);
  unitLabels.forEach(label => {
    label.textContent = pluralUnit;
  });
  
  // Update data-print-value for print rendering
  const quantityCell = row.querySelector('td:nth-child(2)');
  if (quantityCell) {
    quantityCell.setAttribute('data-print-value', `${quantity} ${pluralUnit}`);
  }
  
  // Toggle zero-quantity class for print hiding
  if (quantity === 0) {
    row.classList.add('zero-quantity');
  } else {
    row.classList.remove('zero-quantity');
  }
  
  // Update stored data (round quantity to 2 decimals)
  window.materialsData[rowIndex].quantity = parseFloat(quantity.toFixed(2));
  window.materialsData[rowIndex].unitPrice = unitPrice;
  window.materialsData[rowIndex].total = total;
  
  // Recalculate subtotal, tax, and grand total
  recalculateTotals();
}

function recalculateTotals() {
  const materialsTotal = window.materialsData.reduce((sum, item) => sum + item.total, 0);
  const miscTotal = (window.miscTotals || []).reduce((sum, val) => sum + val, 0);
  const subtotal = materialsTotal + miscTotal;
  const taxRate = (window.taxRate || 9) / 100;
  const tax = subtotal * taxRate;
  const grandTotal = subtotal + tax;
  
  document.getElementById('subtotalCell').innerHTML = '<strong>$' + subtotal.toFixed(2) + '</strong>';
  document.getElementById('taxCell').textContent = '$' + tax.toFixed(2);
  document.getElementById('grandTotal').innerHTML = '<strong>$' + grandTotal.toFixed(2) + '</strong>';
}

function updateTaxRate(newRate) {
  const taxInput = document.getElementById('taxRateInput');
  const rate = parseFloat(newRate);
  
  // Validate tax rate
  if (!validateTaxRate(taxInput, rate)) {
    return;
  }
  
  window.taxRate = rate;
  recalculateTotals();
}

function updateCustomerName(newName) {
  window.currentCustomerName = newName;
}

function updateJobNumber(newJobNumber) {
  window.currentJobNumber = newJobNumber;
}

function addMoreAdditionalItems() {
  const tableBody = document.getElementById('materialsTable');
  const currentCount = window.miscItemCount || 10;
  const newCount = currentCount + 3; // Add 3 more items at a time
  
  // Rebuild options to get latest pricing
  const additionalItemOptions = buildAdditionalItemOptions();
  const optionsHTML = additionalItemOptions.map(item => 
    `<option value="${item.name}" data-price="${item.price}">${item.name}</option>`
  ).join('');
  
  for (let i = currentCount + 1; i <= newCount; i++) {
    const newRow = document.createElement('tr');
    newRow.className = 'misc-row no-print-repeat zero-quantity';
    newRow.setAttribute('data-misc', i);
    newRow.innerHTML = `
      <td class="checkbox-cell no-print">
        <input type="checkbox" class="material-checkbox" data-misc="${i}" onchange="toggleMiscSelection(${i})">
      </td>
      <td data-label="Item">
        <select 
          class="editable-input misc-name-input" 
          id="miscItem${i}"
          onchange="updateMiscItemSelect(${i})"
          style="width: 100%; max-width: 300px;"
        >
          ${optionsHTML}
        </select>
      </td>
      <td data-label="Quantity" class="editable-cell">
        <div class="quantity-cell">
          <input 
            type="number" 
            class="editable-input quantity-input" 
            id="miscQty${i}"
            value="0"
            min="0"
            step="1"
            onchange="updateMiscRow(${i})"
            aria-label="Quantity for additional item ${i}"
          />
        </div>
      </td>
      <td data-label="Unit Price" class="editable-cell">
        $<input 
          type="number" 
          step="0.01"
          min="0"
          class="editable-input price-input" 
          id="miscPrice${i}"
          value="0.00" 
          onchange="updateMiscRow(${i})"
          aria-label="Unit price for additional item ${i}"
        />
      </td>
      <td data-label="Total" class="row-total" id="miscTotal${i}">$0.00</td>
      <td class="delete-cell no-print">
        <button class="delete-btn" onclick="deleteMiscRow(${i})" aria-label="Delete additional item ${i}">
          �
        </button>
      </td>
    `;
    tableBody.appendChild(newRow);
    window.miscTotals.push(0);
  }
  
  window.miscItemCount = newCount;
}

// Pluralize unit names based on quantity
function pluralizeUnit(quantity, unit) {
  const qty = parseFloat(quantity);
  if (qty === 1) return unit;
  
  // Handle special cases
  const lowerUnit = unit.toLowerCase();
  if (lowerUnit.endsWith('piece')) return unit.replace(/piece$/i, 'pieces');
  if (lowerUnit.endsWith('box')) return unit.replace(/box$/i, 'boxes');
  if (lowerUnit.endsWith('sh')) return unit.replace(/sh$/i, 'shes'); // for "ash" -> "ashes"
  
  // Default: just add 's'
  return unit + 's';
}

// ============================================
// FORM VALIDATION


// ==========================================
// DEFAULT SYSTEM FUNCTIONS
// ==========================================

const DEFAULT_SYSTEM_KEY = 'quikbitz-default-system';

function getDefaultSystem() {
  try {
    const saved = localStorage.getItem(DEFAULT_SYSTEM_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
}

function setAsDefaultSystem() {
  const manufacturerId = document.getElementById('pricingManufacturerSelect').value;
  const shingleLineId = document.getElementById('pricingShingleLineSelect').value;
  
  if (!manufacturerId || !shingleLineId) {
    alert('Please select a manufacturer and shingle model first');
    return;
  }
  
  // Get manufacturer and model names
  let manufacturerName = manufacturerId;
  let shingleLineName = shingleLineId;
  
  if (typeof getManufacturers === 'function') {
    const manufacturers = getManufacturers();
    const mfg = manufacturers.find(m => m.id === manufacturerId);
    if (mfg) manufacturerName = mfg.name;
  }
  
  if (typeof getShingleData === 'function') {
    const shingleData = getShingleData(manufacturerId, shingleLineId);
    if (shingleData) shingleLineName = shingleData.name;
  }
  
  const defaultSystem = {
    manufacturerId,
    shingleLineId,
    manufacturerName,
    shingleLineName,
    timestamp: Date.now()
  };
  
  localStorage.setItem(DEFAULT_SYSTEM_KEY, JSON.stringify(defaultSystem));
  alert(`✅ Default system set to: ${manufacturerName} ${shingleLineName}`);
  
  // Update banner
  updateDefaultSystemBanner();
}

function clearDefaultSystem() {
  if (confirm('Clear the default system?')) {
    localStorage.removeItem(DEFAULT_SYSTEM_KEY);
    updateDefaultSystemBanner();
  }
}

function updateDefaultSystemBanner() {
  const banner = document.getElementById('defaultSystemBanner');
  const nameDiv = document.getElementById('defaultSystemName');
  const defaultSystem = getDefaultSystem();
  
  if (banner && nameDiv) {
    if (defaultSystem) {
      nameDiv.textContent = `${defaultSystem.manufacturerName} ${defaultSystem.shingleLineName}`;
      banner.style.display = 'block';
    } else {
      banner.style.display = 'none';
    }
  }
}

// Auto-load default system on page load
if (typeof initDefaultSystem === 'undefined') {
  window.initDefaultSystem = function() {
    const defaultSystem = getDefaultSystem();
    if (defaultSystem) {
      // Auto-select default system in Materials/Labor tab
      const materialsManufacturerSelect = document.getElementById('materialsManufacturerSelect');
      const materialsShingleLineSelect = document.getElementById('materialsShingleLineSelect');
      
      if (materialsManufacturerSelect && materialsShingleLineSelect) {
        materialsManufacturerSelect.value = defaultSystem.manufacturerId;
        handleMaterialsManufacturerChange();
        
        setTimeout(() => {
          materialsShingleLineSelect.value = defaultSystem.shingleLineId;
        }, 100);
      }
    }
    
    // Update banner
    updateDefaultSystemBanner();
  };
  
  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDefaultSystem);
  } else {
    initDefaultSystem();
  }
}

// Missing displayLaborResults function
function displayLaborResults(data) {
  console.log('[LABOR] displayLaborResults called with data:', data);
  
  // Store labor data globally
  if (data.labor && data.labor.items) {
    window.laborData = data.labor;
    console.log('[LABOR] Stored labor data:', window.laborData);
  } else {
    console.warn('[LABOR] No labor data in response');
    return;
  }
  
  // Get labor table
  const laborTable = document.getElementById('laborTable');
  if (!laborTable) {
    console.error('[LABOR] Labor table element not found');
    return;
  }
  
  // Clear existing rows
  laborTable.innerHTML = '';
  
  // Render each labor item
  window.laborData.items.forEach((item, index) => {
    const row = createLaborRow(item, index);
    laborTable.innerHTML += row;
  });
  
  // Update totals
  updateLaborTotals();
  
  console.log('[LABOR] Rendered', window.laborData.items.length, 'labor items');
}

// Helper function to create labor row HTML
function createLaborRow(item, index) {
  const quantity = parseFloat(item.quantity) || 0;
  const unitPrice = parseFloat(item.unitPrice) || 0;
  const total = quantity * unitPrice;
  
  // Pluralize unit
  const unit = item.unit || '';
  let pluralUnit = unit;
  if (quantity !== 1 && unit && typeof pluralizeUnit === 'function') {
    pluralUnit = pluralizeUnit(quantity, unit);
  }
  
  return `
    <tr data-labor-row="${index}" ${quantity === 0 ? 'class="zero-quantity"' : ''}>
      <td class="checkbox-cell no-print">
        <input type="checkbox" class="labor-checkbox" data-labor-row="${index}" onchange="toggleLaborSelection(${index})">
      </td>
      <td data-label="Item">${item.name}</td>
      <td data-label="Quantity" class="editable-cell" data-print-value="${quantity.toFixed(2)} ${pluralUnit}">
        <input 
          type="number" 
          class="editable-input quantity-input" 
          value="${quantity.toFixed(2)}" 
          min="0"
          step="0.01"
          data-labor-row="${index}"
          data-field="quantity"
          onchange="updateLaborRow(${index})"
          aria-label="Quantity for ${item.name}"
        />
      </td>
      <td data-label="Unit">${item.unit || ''}</td>
      <td data-label="Unit Price" class="editable-cell">
        $<input 
          type="number" 
          step="0.01"
          min="0"
          class="editable-input price-input" 
          value="${unitPrice.toFixed(2)}" 
          data-labor-row="${index}"
          data-field="unitPrice"
          onchange="updateLaborRow(${index})"
          aria-label="Unit price for ${item.name}"
        />
      </td>
      <td data-label="Total" class="row-total">$${total.toFixed(2)}</td>
      <td class="delete-cell no-print">
        <button class="delete-btn" onclick="deleteLaborItem(${index})" aria-label="Delete ${item.name}">
          ×
        </button>
      </td>
    </tr>
  `;
}

// Update labor totals
function updateLaborTotals() {
  if (!window.laborData || !window.laborData.items) return;
  
  let subtotal = 0;
  window.laborData.items.forEach(item => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    subtotal += qty * price;
  });
  
  // Update labor subtotal display if it exists
  const laborSubtotalEl = document.getElementById('laborSubtotal');
  if (laborSubtotalEl) {
    laborSubtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  }
  
  window.laborData.subtotal = subtotal;
  console.log('[LABOR] Updated subtotal:', subtotal);
}

// ==========================================
// PRICING TAB FUNCTIONS
// ==========================================

function initPricingTab() {
  console.log('[PRICING] initPricingTab called');
  console.log('[PRICING] getManufacturers exists:', typeof getManufacturers);
  populatePricingManufacturerDropdown();
  updateDefaultSystemBanner();
}

function populatePricingManufacturerDropdown() {
  const select = document.getElementById('pricingManufacturerSelect');
  if (!select) {
    console.error('[PRICING] Manufacturer select not found');
    return;
  }

  if (typeof getManufacturers !== 'function') {
    console.error('[PRICING] getManufacturers function not available. Retrying in 500ms...');
    setTimeout(populatePricingManufacturerDropdown, 500);
    return;
  }

  const manufacturers = getManufacturers();
  console.log('[PRICING] Populating manufacturers:', manufacturers);

  select.innerHTML = '<option value="">Select Manufacturer</option>';
  manufacturers.forEach(m => {
    select.innerHTML += `<option value="${m.id}">${m.name}</option>`;
  });
}

// DOMContentLoaded fallback initialization
document.addEventListener('DOMContentLoaded', function() {
  console.log('[PRICING] DOMContentLoaded - initializing pricing dropdown');
  // Initialize pricing dropdown after page loads
  setTimeout(() => {
    if (typeof populatePricingManufacturerDropdown === 'function') {
      populatePricingManufacturerDropdown();
    }
  }, 500);
});
