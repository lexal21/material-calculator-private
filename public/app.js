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
          ×
        </button>
      </td>
    </tr>
  `;
}

function displayResults(data) {
  // Store data for restoration after print
  window.currentPDFData = data;
  
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
            <span class="tooltip-text">Number of separate roof peaks. Auto-estimated based on ridge length: &lt;50ft = 1, 50-80ft = lengthÃ·30, &gt;80ft = lengthÃ·25</span>
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
        <div class="quantity-cell">
          <span class="unit-label unit-before">${pluralUnit}</span>
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
          <span class="unit-label unit-after">${pluralUnit}</span>
        </div>
      </td>
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
          ×
        </button>
      </td>
    </tr>
  `;
  }).join('');
  
  // Additional items dropdown options - dynamically built from ALL_MATERIALS + current pricing
  const additionalItemOptions = buildAdditionalItemOptions();
  
  window.additionalItemOptions = additionalItemOptions;
  
  // Add 3 additional items to the materials table
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
            ×
          </button>
        </td>
      </tr>
    `;
  }
  
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
          ×
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
// ============================================

// Validate quantity input
function validateQuantity(input, value) {
  const qty = parseFloat(value);
  
  // Remove previous error states
  input.classList.remove('error', 'success');
  removeErrorMessage(input);
  
  // Check for invalid values
  if (isNaN(qty)) {
    showFieldError(input, 'Please enter a valid number');
    return false;
  }
  
  if (qty < 0) {
    showFieldError(input, 'Quantity cannot be negative');
    return false;
  }
  
  // Allow 0 quantity (will hide item from print/PDF)
  
  if (qty > 10000) {
    showFieldError(input, 'Quantity seems unusually high - please verify');
    return false;
  }
  
  // Valid - show success
  input.classList.add('success');
  return true;
}

// Validate price input
function validatePrice(input, value) {
  const price = parseFloat(value);
  
  // Remove previous error states
  input.classList.remove('error', 'success');
  removeErrorMessage(input);
  
  // Check for invalid values
  if (isNaN(price)) {
    showFieldError(input, 'Please enter a valid price');
    return false;
  }
  
  if (price < 0) {
    showFieldError(input, 'Price cannot be negative');
    return false;
  }
  
  if (price === 0) {
    showFieldError(input, 'Price must be greater than $0');
    return false;
  }
  
  if (price > 10000) {
    showFieldError(input, 'Price seems unusually high - please verify');
    return false;
  }
  
  // Valid - show success
  input.classList.add('success');
  return true;
}

// Validate tax rate
function validateTaxRate(input, value) {
  const rate = parseFloat(value);
  
  // Remove previous error states
  input.classList.remove('error', 'success');
  removeErrorMessage(input);
  
  // Check for invalid values
  if (isNaN(rate)) {
    showFieldError(input, 'Please enter a valid tax rate');
    return false;
  }
  
  if (rate < 0) {
    showFieldError(input, 'Tax rate cannot be negative');
    return false;
  }
  
  if (rate > 100) {
    showFieldError(input, 'Tax rate cannot exceed 100%');
    return false;
  }
  
  // Valid
  input.classList.add('success');
  return true;
}

// Show field validation error message
function showFieldError(input, message) {
  input.classList.add('error');
  
  // Create error message element
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  errorDiv.setAttribute('role', 'alert');
  errorDiv.setAttribute('aria-live', 'polite');
  
  // Insert after input's parent
  const parent = input.closest('.editable-cell') || input.parentElement;
  parent.appendChild(errorDiv);
}

// Remove error message
function removeErrorMessage(input) {
  const parent = input.closest('.editable-cell') || input.parentElement;
  const errorMsg = parent?.querySelector('.error-message');
  if (errorMsg) {
    errorMsg.remove();
  }
}

function printResults() {
  if (!window.materialsData || window.materialsData.length === 0) {
    alert('No materials data to print. Please upload a PDF first.');
    return;
  }
  
  // Generate PDF definition
  const docDefinition = buildPDFDocDefinition();
  
  // Open PDF in new window for printing
  try {
    pdfMake.createPdf(docDefinition).open();
  } catch (error) {
    console.error('PDF generation error:', error);
    alert('Error generating print preview. Please try again.');
  }
}

// Helper function to apply zero-quantity classes (no longer needed for print, but kept for potential future use)
function applyZeroQuantityClasses() {
  // Check all material rows
  if (window.materialsData) {
    window.materialsData.forEach((item, index) => {
      const row = document.querySelector(`tr[data-row="${index}"]`);
      if (row) {
        if (item.quantity === 0 || parseFloat(row.querySelector('[data-field="quantity"]')?.value) === 0) {
          row.classList.add('zero-quantity');
        } else {
          row.classList.remove('zero-quantity');
        }
      }
    });
  }
  
  // Check all misc rows (additional items)
  for (let i = 1; i <= 3; i++) {
    const qtyInput = document.getElementById(`miscQty${i}`);
    const row = document.querySelector(`tr[data-misc="${i}"]`);
    if (row && qtyInput) {
      const qty = parseFloat(qtyInput.value) || 0;
      if (qty === 0) {
        row.classList.add('zero-quantity');
      } else {
        row.classList.remove('zero-quantity');
      }
    }
  }
}

async function saveResults() {
  if (!window.materialsData || window.materialsData.length === 0) {
    alert('No materials data to export. Please upload a PDF first.');
    return;
  }
  
  await generatePDF();
}

// Build PDF document definition (shared by print and save)
function buildPDFDocDefinition() {
  // Get customer info
  const customerName = document.getElementById('customerName')?.value || 'Customer';
  const shingleColor = document.getElementById('shingleColorInput')?.value || '';
  const jobAddress = document.getElementById('jobAddress')?.value || '';
  const orderNum = document.getElementById('jobNumber')?.value || window.currentJobNumber || window.currentRawMeasurements?.order_number || '';
  
  // Build materials table body
  const materialsTableBody = [
    [
      { text: 'Item', style: 'tableHeader' },
      { text: 'Quantity', style: 'tableHeader', alignment: 'right' },
      { text: 'Unit Price', style: 'tableHeader', alignment: 'right' },
      { text: 'Total', style: 'tableHeader', alignment: 'right' }
    ]
  ];
  
  // Add materials (skip zero-quantity items)
  const filteredMaterials = window.materialsData.filter(item => item.quantity > 0);
  filteredMaterials.forEach(item => {
    const pluralUnit = pluralizeUnit(item.quantity, item.unit);
    materialsTableBody.push([
      item.name,
      { text: `${item.quantity} ${pluralUnit}`, alignment: 'right' },
      { text: `$${item.unitPrice.toFixed(2)}`, alignment: 'right' },
      { text: `$${item.total.toFixed(2)}`, alignment: 'right' }
    ]);
  });
  
  // Add additional items if they have values
  for (let i = 1; i <= 3; i++) {
    const itemName = document.getElementById(`miscItem${i}`)?.value;
    const qty = parseFloat(document.getElementById(`miscQty${i}`)?.value) || 0;
    const price = parseFloat(document.getElementById(`miscPrice${i}`)?.value) || 0;
    const total = qty * price;
    
    if (itemName && itemName.trim() && total > 0) {
      materialsTableBody.push([
        itemName,
        { text: qty.toString(), alignment: 'right' },
        { text: `$${price.toFixed(2)}`, alignment: 'right' },
        { text: `$${total.toFixed(2)}`, alignment: 'right' }
      ]);
    }
  }
  
  // Calculate totals
  const materialsTotal = window.materialsData.reduce((sum, item) => sum + item.total, 0);
  const miscTotal = (window.miscTotals || [0, 0, 0]).reduce((sum, val) => sum + val, 0);
  const subtotal = materialsTotal + miscTotal;
  const taxRate = (window.taxRate || 9) / 100;
  const tax = subtotal * taxRate;
  const grandTotal = subtotal + tax;
  
  // Build PDF document definition
  const docDefinition = {
    content: [
      // Cover page (if cover photo designated)
      (function() {
        const coverPhoto = window.currentPhotos?.materials?.find(p => p.isCover);
        if (!coverPhoto) return null;
        
        const customerName = document.getElementById('customerName')?.value || '';
        const jobNumber = document.getElementById('jobNumber')?.value || '';
        
        return {
          stack: [
            { image: coverPhoto.data, width: 350, alignment: 'center', margin: [0, 60, 0, 40] },
            { text: customerName, fontSize: 28, bold: true, color: '#1e293b', alignment: 'center', margin: [0, 20, 0, 12] },
            { text: 'Job #: ' + jobNumber, fontSize: 16, color: '#475569', alignment: 'center', margin: [0, 0, 0, 8] }
          ],
          pageBreak: 'after'
        };
      })(),
      
      // Header with logo
      {
        columns: [
          {
            width: '*',
            text: 'MATERIAL ORDER',
            style: 'header',
            alignment: 'left',
            margin: [0, 0, 0, 0]
          },
          {
            width: 180,
            image: 'logo',
            fit: [180, 75],
            alignment: 'right',
            margin: [0, 0, 0, 0]
          }
        ],
        margin: [0, 0, 0, 20]
      },
      
      // Customer Information
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'CUSTOMER INFORMATION', style: 'sectionHeader', margin: [0, 0, 0, 10] },
              { text: `Customer: ${customerName}`, margin: [0, 0, 0, 5] },
              { text: `Address: ${jobAddress}`, margin: [0, 0, 0, 5] },
              { text: `Job Number: ${orderNum}`, margin: [0, 0, 0, 5] },
              { text: `Shingle Color: ${shingleColor || 'Not specified'}`, margin: [0, 0, 0, 5] }
            ]
          },
          {
            width: '50%',
            stack: []
          }
        ],
        margin: [0, 0, 0, 20]
      },
      
      // Materials Table
      {
        text: 'MATERIAL LIST',
        style: 'sectionHeader',
        margin: [0, 0, 0, 10]
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto'],
          body: materialsTableBody
        },
        layout: {
          hLineWidth: function(i, node) {
            return (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5;
          },
          vLineWidth: function(i, node) {
            return 0;
          },
          hLineColor: function(i, node) {
            return '#E5E7EB';
          },
          paddingLeft: function(i) { return 8; },
          paddingRight: function(i) { return 8; },
          paddingTop: function(i) { return 8; },
          paddingBottom: function(i) { return 8; }
        },
        margin: [0, 0, 0, 20]
      },
      
      // Totals
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 200,
            stack: [
              {
                columns: [
                  { width: '*', text: 'SUBTOTAL:', alignment: 'right', bold: true },
                  { width: 80, text: `$${subtotal.toFixed(2)}`, alignment: 'right' }
                ],
                margin: [0, 0, 0, 5]
              },
              {
                columns: [
                  { width: '*', text: `Tax (${window.taxRate}%):`, alignment: 'right', bold: true },
                  { width: 80, text: `$${tax.toFixed(2)}`, alignment: 'right' }
                ],
                margin: [0, 0, 0, 10]
              },
              {
                columns: [
                  { width: '*', text: 'GRAND TOTAL:', alignment: 'right', bold: true, fontSize: 14 },
                  { width: 80, text: `$${grandTotal.toFixed(2)}`, alignment: 'right', bold: true, fontSize: 14, color: '#2B7BA3' }
                ],
                margin: [0, 10, 0, 0]
              }
            ]
          }
        ]
      },
      
      // Footer note
      {
        text: `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
        style: 'footer',
        margin: [0, 40, 0, 0]
      }
    ].concat(
      // Materials photos section (non-cover photos only)
      (function() {
        if (!window.currentPhotos?.materials?.length) return [];
        
        const otherPhotos = window.currentPhotos.materials.filter(p => !p.isCover);
        if (otherPhotos.length === 0) return [];
        
        const photoContent = [
          { text: '', pageBreak: 'before' },
          { text: 'PHOTOS', style: 'sectionHeader', margin: [0, 0, 0, 20] }
        ];
        
        for (let i = 0; i < otherPhotos.length; i += 2) {
          const photo1 = otherPhotos[i];
          const photo2 = otherPhotos[i + 1];
          const row = { columns: [], margin: [0, 0, 0, 15] };
          
          const photo1Stack = [{ image: photo1.data, width: 240 }];
          if (photo1.label) {
            photo1Stack.push({ text: photo1.label, fontSize: 11, color: '#475569', alignment: 'center', margin: [0, 5, 0, 0] });
          }
          row.columns.push({ stack: photo1Stack, width: 250 });
          
          if (photo2) {
            const photo2Stack = [{ image: photo2.data, width: 240 }];
            if (photo2.label) {
              photo2Stack.push({ text: photo2.label, fontSize: 11, color: '#475569', alignment: 'center', margin: [0, 5, 0, 0] });
            }
            row.columns.push({ stack: photo2Stack, width: 250 });
          }
          
          photoContent.push(row);
        }
        
        return photoContent;
      })()
    ),
    
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        color: '#2B7BA3'
      },
      sectionHeader: {
        fontSize: 12,
        bold: true,
        color: '#1a1a1a'
      },
      tableHeader: {
        bold: true,
        fontSize: 10,
        color: '#1a1a1a',
        fillColor: '#F9FAFB'
      },
      footer: {
        fontSize: 8,
        color: '#718096',
        alignment: 'center',
        italics: true
      }
    },
    
    defaultStyle: {
      fontSize: 10,
      color: '#1a1a1a'
    },
    
    images: {
      logo: 'data:image/jpeg;base64,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'
    }
  };
  
  return docDefinition;
}

// Generate and download PDF
function generatePDF() {
  const docDefinition = buildPDFDocDefinition();
  
  // Generate filename
  const customerName = document.getElementById('customerName')?.value || 'Customer';
  const filename = customerName 
    ? `${customerName.replace(/[^a-z0-9]/gi, '_')}_MaterialList.pdf`
    : 'MaterialList.pdf';
  
  // Create and download PDF
  try {
    pdfMake.createPdf(docDefinition).download(filename);
  } catch (error) {
    console.error('PDF generation error:', error);
    alert('Error generating PDF. Please try again.');
  }
}


// ============================================
// LABOR TAB FUNCTIONS
// ============================================

// Store labor data globally
window.laborData = null;

function displayLaborResults(data) {
  console.log('[LABOR] displayLaborResults called with data:', data);
  
  if (!data || !data.materials) {
    console.log('[LABOR] No data or materials, returning early');
    return;
  }
  
  console.log('[LABOR] Data validation passed, proceeding...');
  
  // Auto-detect labor location from address
  const address = data.raw?.address || '';
  let detectedCity = null;
  
  // Try to find a matching city in the address
  const cityList = [
    'Charleston', 'James Island', 'Johns Island', 'Mount Pleasant', 'North Charleston', 
    'Hanahan', 'Goose Creek', 'Summerville', 'Ladson', 'Walterboro', 'Sumter', 
    'Columbia', 'Lexington', 'Irmo', 'Blythewood', 'Beaufort', 'Bluffton', 
    'Myrtle Beach', 'Georgetown', 'Pawleys Island'
  ];
  
  for (const city of cityList) {
    if (address.toUpperCase().includes(city.toUpperCase())) {
      detectedCity = city;
      break;
    }
  }
  
  // Set the labor location dropdown
  const laborLocation = window.getLaborLocation ? window.getLaborLocation(detectedCity) : 'Out of Area';
  const locationDropdown = document.getElementById('laborLocation');
  if (locationDropdown) {
    locationDropdown.value = laborLocation;
  }
  
  // Calculate labor from measurements and materials
  console.log('[LABOR] Calling calculateLaborFromData...');
  const laborCalc = calculateLaborFromData(data);
  console.log('[LABOR] Labor calculation result:', laborCalc);
  window.laborData = laborCalc;
  
  // Show labor results section
  console.log('[LABOR] Showing labor results section...');
  const laborNotReady = document.getElementById('laborNotReady');
  const laborResults = document.getElementById('laborResults');
  console.log('[LABOR] laborNotReady element:', laborNotReady);
  console.log('[LABOR] laborResults element:', laborResults);
  
  if (laborNotReady) laborNotReady.style.display = 'none';
  if (laborResults) laborResults.style.display = 'block';
  
  // Initialize labor item selector dropdown
  console.log('[LABOR] Initializing labor item selector...');
  initializeLaborItemSelector();
  
  // Populate labor table
  console.log('[LABOR] Populating labor table...');
  const laborTable = document.getElementById('laborTable');
  console.log('[LABOR] laborTable element:', laborTable);
  if (laborTable) {
    laborTable.innerHTML = laborCalc.items.map((item, index) => createLaborRow(item, index)).join('');
    console.log('[LABOR] Labor table populated with', laborCalc.items.length, 'items');
  }
  
  // Update totals
  console.log('[LABOR] Updating labor totals...');
  updateLaborTotals();
  console.log('[LABOR] displayLaborResults complete!');
}


function calculateLaborFromData(data) {
  console.log('[LABOR CALC] Starting with data:', data);
  
  const measurements = data.measurements;
  const raw = data.raw || {}; // Raw measurements from PDF parser
  const materials = data.materials;
  const location = document.getElementById('laborLocation')?.value || 'Out of Area';
  
  console.log('[LABOR CALC] raw.pitch_data:', raw.pitch_data);
  
  // Use measurements for calculated values, raw for PDF extracted values
  const squares = parseFloat(raw.roof_sq) || parseFloat(measurements.roofSquares) || 0;
  const hipLength = parseFloat(raw.hip_length) || parseFloat(measurements.hipLength) || 0;
  
  console.log('[LABOR CALC] Extracted values - squares:', squares, 'hipLength:', hipLength);
  
  // Extract pitch tier totals (PDF parser now provides these)
  let pitchData = { tier_8_9: 0, tier_10_11: 0, tier_12_plus: 0 };
  
  if (raw.pitch_data && typeof raw.pitch_data === 'object') {
    // PDF parser returns object with tier totals already calculated
    pitchData = {
      tier_8_9: parseFloat(raw.pitch_data.tier_8_9) || 0,
      tier_10_11: parseFloat(raw.pitch_data.tier_10_11) || 0,
      tier_12_plus: parseFloat(raw.pitch_data.tier_12_plus) || 0
    };
    console.log('[LABOR CALC] Using pitch tier data from parser:', pitchData);
  }
  
  console.log('[LABOR CALC] Final pitch data:', pitchData);
  
  // Base rate
  const baseRate = location === 'Greater Charleston' ? 80 : 90;
  
  // Waste factor
  const wasteMultiplier = hipLength > 100 ? 1.15 : 1.10;
  const squaresWithWaste = (squares || 0) * wasteMultiplier;
  
  // Find material quantities (ensure they're numbers, not undefined)
  const starterBundles = parseFloat(materials.find(m => m.name.includes('Starter'))?.quantity) || 0;
  const hipRidgeBundles = parseFloat(materials.find(m => m.name.includes('Hip'))?.quantity) || 0;
  const plywoodSheets = parseFloat(materials.find(m => m.name.includes('Plywood'))?.quantity) || 0;
  const flashingLength = parseFloat(raw.flashing_length) || 0;
  const stepFlashingLength = parseFloat(raw.step_flashing) || 0;
  
  // Plywood pricing rule: >10 sheets = $10/sheet
  const plywoodPrice = plywoodSheets > 10 ? 10.00 : 30.00;
  
  // Helper to safely round quantities (avoid .toFixed on NaN/undefined)
  const safeRound = (val) => {
    const num = parseFloat(val) || 0;
    return Math.round(num * 100) / 100;
  };
  
  const items = [
    { name: 'Labor - Squares', quantity: safeRound(squaresWithWaste), unit: 'SQ', unitPrice: baseRate, total: safeRound(squaresWithWaste * baseRate), editable: false },
    { name: 'Starter per Bundle', quantity: safeRound(starterBundles), unit: 'BD', unitPrice: 25.00, total: safeRound(starterBundles * 25.00), editable: false },
    { name: 'Hip and Ridge Cap per Bundle', quantity: safeRound(hipRidgeBundles), unit: 'BD', unitPrice: 25.00, total: safeRound(hipRidgeBundles * 25.00), editable: false },
    { name: 'Steep Charge for 8-9/12 pitch', quantity: safeRound(pitchData.tier_8_9), unit: 'SQ', unitPrice: 5.00, total: safeRound(pitchData.tier_8_9 * 5.00), editable: true },
    { name: 'Steep Charge for 10-11/12 pitch', quantity: safeRound(pitchData.tier_10_11), unit: 'SQ', unitPrice: 10.00, total: safeRound(pitchData.tier_10_11 * 10.00), editable: true },
    { name: 'Steep Charge for 12/12 pitch or Greater', quantity: safeRound(pitchData.tier_12_plus), unit: 'SQ', unitPrice: 20.00, total: safeRound(pitchData.tier_12_plus * 20.00), editable: true },
    { name: 'Plywood Replacement', quantity: safeRound(plywoodSheets), unit: 'SH', unitPrice: plywoodPrice, total: safeRound(plywoodSheets * plywoodPrice), editable: true },
    { name: 'Install Step Flashing per LF', quantity: safeRound(stepFlashingLength), unit: 'LF', unitPrice: 2.00, total: safeRound(stepFlashingLength * 2.00), editable: true },
    { name: 'Install L-Flashing per LF', quantity: safeRound(flashingLength), unit: 'LF', unitPrice: 2.00, total: safeRound(flashingLength * 2.00), editable: true },
    { name: 'Flash Chimney', quantity: 0, unit: 'EA', unitPrice: 75.00, total: 0, editable: true, manualEntry: true },
    { name: 'Flash Brick Chimney', quantity: 0, unit: 'EA', unitPrice: 150.00, total: 0, editable: true, manualEntry: true },
    { name: 'Install Pan for Dead Valley (Brick)', quantity: 0, unit: 'EA', unitPrice: 150.00, total: 0, editable: true, manualEntry: true },
    { name: 'Install Pan for Dead Valley (Vinyl)', quantity: 0, unit: 'EA', unitPrice: 75.00, total: 0, editable: true, manualEntry: true },
    { name: 'Load roof by hand', quantity: 0, unit: 'SQ', unitPrice: 10.00, total: 0, editable: true, manualEntry: true },
    { name: 'Load roof greater than two storys', quantity: 0, unit: 'SQ', unitPrice: 20.00, total: 0, editable: true, manualEntry: true },
    { name: 'Tear Off Extra Layer', quantity: 0, unit: 'SQ', unitPrice: 5.00, total: 0, editable: true, manualEntry: true },
    { name: 'Reattach Vinyl Soffit (per 100 SF)', quantity: 0, unit: 'EA', unitPrice: 100.00, total: 0, editable: true, manualEntry: true },
    { name: 'Flat Roof Installation (Bitumen)', quantity: 0, unit: 'SQ', unitPrice: 100.00, total: 0, editable: true, manualEntry: true },
    { name: 'Metal Roof Installation (tear-off + install)', quantity: 0, unit: 'SQ', unitPrice: 300.00, total: 0, editable: true, manualEntry: true }
  ];
  
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  
  return { location, baseRate, items, subtotal, tax: 0, grandTotal: subtotal };
}

function createLaborRow(item, index) {
  // Safely handle potentially invalid numbers
  const quantity = parseFloat(item.quantity) || 0;
  const unitPrice = parseFloat(item.unitPrice) || 0;
  const total = parseFloat(item.total) || 0;
  
  const pluralUnit = pluralizeUnit(quantity, item.unit);
  
  return `
    <tr data-labor-row="${index}" class="${quantity === 0 ? 'zero-quantity' : ''}">
      <td class="checkbox-cell no-print">
        <input type="checkbox" class="labor-checkbox" data-labor-row="${index}" 
onchange="toggleLaborSelection(${index})">
      </td>
      <td data-label="Item">${item.name}</td>
      <td data-label="Quantity" class="editable-cell" data-print-value="${quantity.toFixed(2)} ${pluralUnit}">
        <div class="quantity-cell">
          <span class="unit-label unit-before">${pluralUnit}</span>
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
          <span class="unit-label unit-after">${pluralUnit}</span>
        </div>
      </td>
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
          x
        </button>
      </td>
    </tr>
  `;
}

function updateLaborRow(rowIndex) {
  const row = document.querySelector(`tr[data-labor-row="${rowIndex}"]`);
  const qtyInput = row.querySelector('[data-field="quantity"]');
  const priceInput = row.querySelector('[data-field="unitPrice"]');
  const totalCell = row.querySelector('.row-total');
  const unitLabels = row.querySelectorAll('.unit-label');
  
  const quantity = parseFloat(qtyInput.value) || 0;
  const unitPrice = parseFloat(priceInput.value) || 0;
  
  const total = quantity * unitPrice;
  
  // Update row total
  totalCell.textContent = '$' + total.toFixed(2);
  
  // Update unit labels with pluralization
  const baseUnit = window.laborData.items[rowIndex].unit;
  const pluralUnit = pluralizeUnit(quantity, baseUnit);
  unitLabels.forEach(label => {
    label.textContent = pluralUnit;
  });
  
  // Update data-print-value
  const quantityCell = row.querySelector('td:nth-child(2)');
  if (quantityCell) {
    quantityCell.setAttribute('data-print-value', `${quantity} ${pluralUnit}`);
  }
  
  // Toggle zero-quantity class
  if (quantity === 0) {
    row.classList.add('zero-quantity');
  } else {
    row.classList.remove('zero-quantity');
  }
  
  // Update stored data (round quantity to 2 decimals)
  window.laborData.items[rowIndex].quantity = parseFloat(quantity.toFixed(2));
  window.laborData.items[rowIndex].unitPrice = unitPrice;
  window.laborData.items[rowIndex].total = total;
  
  // Recalculate totals
  updateLaborTotals();
}

function updateLaborTotals() {
  if (!window.laborData) return;
  
  const subtotal = window.laborData.items.reduce((sum, item) => sum + item.total, 0);
  
  window.laborData.subtotal = subtotal;
  window.laborData.grandTotal = subtotal;
  
  document.getElementById('laborSubtotal').innerHTML = '<strong>$' + subtotal.toFixed(2) + '</strong>';
  document.getElementById('laborGrandTotal').innerHTML = '<strong>$' + subtotal.toFixed(2) + '</strong>';
}

function updateLaborLocation(location) {
  if (!window.laborData) return;
  
  // Recalculate with new location
  const currentData = {
    measurements: window.currentMeasurements,
    raw: window.currentRawMeasurements,
    materials: window.materialsData
  };
  
  const laborCalc = calculateLaborFromData(currentData);
  window.laborData = laborCalc;
  
  // Re-render table
  const laborTable = document.getElementById('laborTable');
  laborTable.innerHTML = laborCalc.items.map((item, index) => createLaborRow(item, index)).join('');
  
  updateLaborTotals();
}

function printLabor() {
  if (!window.laborData || !window.laborData.items || window.laborData.items.length === 0) {
    alert('No labor data to print. Please upload a PDF first.');
    return;
  }
  
  // Generate PDF definition
  const docDefinition = buildLaborPDFDocDefinition();
  
  // Open PDF in new window for printing
  try {
    pdfMake.createPdf(docDefinition).open();
  } catch (error) {
    console.error('Labor PDF generation error:', error);
    alert('Error generating labor print preview. Please try again.');
  }
}

function saveLaborPDF() {
  if (!window.laborData || !window.laborData.items || window.laborData.items.length === 0) {
    alert('No labor data to export. Please upload a PDF first.');
    return;
  }
  
  // Generate PDF definition
  const docDefinition = buildLaborPDFDocDefinition();
  
  // Generate filename
  const customerName = document.getElementById('customerName')?.value || 'Customer';
  const filename = customerName 
    ? `${customerName.replace(/[^a-z0-9]/gi, '_')}_LaborInvoice.pdf`
    : 'LaborInvoice.pdf';
  
  // Create and download PDF
  try {
    pdfMake.createPdf(docDefinition).download(filename);
  } catch (error) {
    console.error('Labor PDF generation error:', error);
    alert('Error generating labor PDF. Please try again.');
  }
}

// ============================================
// LABOR SELECTION & UNDO FUNCTIONALITY
// ============================================

// Labor undo stack
window.laborUndoStack = [];
window.selectedLabor = new Set();
window.laborItemCounter = 0; // Track custom labor items added

// Labor-specific items that can be added manually
const laborItemOptions = [
  { name: 'Select Item...', unit: 'EA', unitPrice: 0 },
  { name: 'Flash Chimney', unit: 'EA', unitPrice: 75.00 },
  { name: 'Flash Brick Chimney', unit: 'EA', unitPrice: 150.00 },
  { name: 'Install Pan for Dead Valley (Brick)', unit: 'EA', unitPrice: 150.00 },
  { name: 'Install Pan for Dead Valley (Vinyl)', unit: 'EA', unitPrice: 75.00 },
  { name: 'Load roof by hand', unit: 'SQ', unitPrice: 10.00 },
  { name: 'Load roof greater than two storys', unit: 'SQ', unitPrice: 20.00 },
  { name: 'Tear Off Extra Layer', unit: 'SQ', unitPrice: 5.00 },
  { name: 'Reattach Vinyl Soffit (per 100 SF)', unit: 'EA', unitPrice: 100.00 },
  { name: 'Flat Roof Installation (Bitumen)', unit: 'SQ', unitPrice: 100.00 },
  { name: 'Metal Roof Installation (tear-off + install)', unit: 'SQ', unitPrice: 300.00 },
  { name: 'Custom Item...', unit: 'EA', unitPrice: 0 }
];

// Populate labor item selector on page load
function initializeLaborItemSelector() {
  const selector = document.getElementById('laborItemSelector');
  if (selector) {
    selector.innerHTML = laborItemOptions.map(item => 
      `<option value="${item.name}" data-unit="${item.unit}" data-price="${item.unitPrice}">${item.name}</option>`
    ).join('');
  }
}

// Add selected labor item to the table
function addMoreLaborItems() {
  if (!window.laborData) {
    alert('Please upload a PDF first');
    return;
  }
  
  const selector = document.getElementById('laborItemSelector');
  const selectedOption = selector.options[selector.selectedIndex];
  let itemName = selectedOption.value;
  
  if (itemName === 'Select Item...') {
    alert('Please select an item to add');
    return;
  }
  
  let unit = selectedOption.getAttribute('data-unit');
  let unitPrice = parseFloat(selectedOption.getAttribute('data-price'));
  
  // Handle custom item
  if (itemName === 'Custom Item...') {
    const customName = prompt('Enter custom labor item name:');
    if (!customName || !customName.trim()) {
      return;
    }
    
    const customUnit = prompt('Enter unit (e.g., EA, SQ, SF):', 'EA');
    if (!customUnit || !customUnit.trim()) {
      return;
    }
    
    const customPriceStr = prompt('Enter unit price:', '0');
    const customPrice = parseFloat(customPriceStr);
    
    if (isNaN(customPrice)) {
      alert('Invalid price');
      return;
    }
    
    itemName = customName.trim();
    unit = customUnit.trim();
    unitPrice = customPrice;
  }
  
  // Create new labor item
  const newItem = {
    name: itemName,
    quantity: 0,
    unit: unit,
    unitPrice: unitPrice,
    total: 0,
    editable: true,
    manualEntry: true
  };
  
  // Add to labor data
  window.laborData.items.push(newItem);
  window.laborItemCounter++;
  
  // Re-render table
  const laborTable = document.getElementById('laborTable');
  laborTable.innerHTML = window.laborData.items.map((item, index) => createLaborRow(item, index)).join('');
  
  // Reset selector
  selector.selectedIndex = 0;
  
  updateLaborTotals();
}

function toggleLaborSelection(index) {
  const checkbox = document.querySelector(`.labor-checkbox[data-labor-row="${index}"]`);
  if (checkbox.checked) {
    selectedLabor.add(index);
  } else {
    selectedLabor.delete(index);
  }
}

function selectAllLabor() {
  const checkboxes = document.querySelectorAll('.labor-checkbox');
  
  // Check if all are already selected
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  
  if (allChecked) {
    // Deselect all
    checkboxes.forEach(cb => {
      cb.checked = false;
    });
    selectedLabor.clear();
  } else {
    // Select all
    checkboxes.forEach(cb => {
      cb.checked = true;
      const rowIndex = parseInt(cb.getAttribute('data-labor-row'));
      selectedLabor.add(rowIndex);
    });
  }
}

function deleteSelectedLabor() {
  if (selectedLabor.size === 0) {
    alert('No items selected');
    return;
  }
  
  if (!confirm(`Delete ${selectedLabor.size} selected item(s)?`)) {
    return;
  }
  
  if (!window.laborData) {
    alert('No labor data available');
    return;
  }
  
  // Save current state to undo stack
  laborUndoStack.push(JSON.parse(JSON.stringify(window.laborData.items)));
  
  // Delete selected items (in reverse to maintain indices)
  const indicesToDelete = Array.from(selectedLabor).sort((a, b) => b - a);
  indicesToDelete.forEach(index => {
    window.laborData.items.splice(index, 1);
  });
  
  // Clear selection
  selectedLabor.clear();
  
  // Re-render table
  const laborTable = document.getElementById('laborTable');
  laborTable.innerHTML = window.laborData.items.map((item, index) => createLaborRow(item, index)).join('');
  
  updateLaborTotals();
}

function deleteLaborItem(index) {
  if (!window.laborData || index < 0 || index >= window.laborData.items.length) {
    return;
  }
  
  if (!confirm('Delete this labor item?')) {
    return;
  }
  
  // Save current state to undo stack
  laborUndoStack.push(JSON.parse(JSON.stringify(window.laborData.items)));
  
  // Remove the item
  window.laborData.items.splice(index, 1);
  
  // Clear from selection if it was selected
  selectedLabor.delete(index);
  
  // Re-render table
  const laborTable = document.getElementById('laborTable');
  laborTable.innerHTML = window.laborData.items.map((item, index) => createLaborRow(item, index)).join('');
  
  updateLaborTotals();
}

function undoLastLaborAction() {
  if (laborUndoStack.length === 0) {
    alert('Nothing to undo');
    return;
  }
  
  if (!window.laborData) {
    alert('No labor data available');
    return;
  }
  
  // Restore previous state
  window.laborData.items = laborUndoStack.pop();
  
  // Clear selection
  selectedLabor.clear();
  
  // Re-render table
  const laborTable = document.getElementById('laborTable');
  laborTable.innerHTML = window.laborData.items.map((item, index) => createLaborRow(item, index)).join('');
  
  updateLaborTotals();
}

// ============================================
// MATERIAL SELECTION & UNDO FUNCTIONALITY
// ============================================

// Undo stack
window.undoStack = [];
window.selectedMaterials = new Set();

function updateMaterialSelect(rowIndex) {
  const select = document.getElementById(`materialName${rowIndex}`);
  const selectedOption = select.options[select.selectedIndex];
  const unit = selectedOption.getAttribute('data-unit');
  const price = parseFloat(selectedOption.getAttribute('data-price')) || 0;
  
  // If "Custom Item..." is selected, convert to text input
  if (select.value === 'Custom Item...') {
    const customName = prompt('Enter custom item name:');
    if (customName) {
      // Replace select with text input
      const input = document.createElement('input');
      input.type = 'text';
      input.value = customName;
      input.className = 'editable-input material-name-input';
      input.style.width = '100%';
      input.style.maxWidth = '300px';
      select.parentNode.replaceChild(input, select);
      
      window.materialsData[rowIndex].name = customName;
      window.materialsData[rowIndex].unit = unit;
    }
    return;
  }
  
  // Update row unit
  const row = document.querySelector(`tr[data-row="${rowIndex}"]`);
  if (row) {
    row.setAttribute('data-unit', unit);
  }
  
  // Update price input
  const priceInput = row.querySelector('[data-field="unitPrice"]');
  if (priceInput && price > 0) {
    priceInput.value = price.toFixed(2);
  }
  
  // Update material data
  window.materialsData[rowIndex].name = select.value;
  window.materialsData[rowIndex].unit = unit;
  
  // Recalculate row
  updateMaterialRow(rowIndex);
}

function toggleMaterialSelection(rowIndex) {
  const checkbox = document.querySelector(`input[type=checkbox][data-row="${rowIndex}"]`);
  if (checkbox.checked) {
    window.selectedMaterials.add(`material-${rowIndex}`);
  } else {
    window.selectedMaterials.delete(`material-${rowIndex}`);
  }
}

function toggleMiscSelection(miscNum) {
  const checkbox = document.querySelector(`input[type=checkbox][data-misc="${miscNum}"]`);
  if (checkbox.checked) {
    window.selectedMaterials.add(`misc-${miscNum}`);
  } else {
    window.selectedMaterials.delete(`misc-${miscNum}`);
  }
}

function selectAllMaterials() {
  const checkboxes = document.querySelectorAll('.material-checkbox');
  
  // Check if all are already selected
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  
  if (allChecked) {
    // Deselect all
    checkboxes.forEach(cb => {
      cb.checked = false;
    });
    window.selectedMaterials.clear();
  } else {
    // Select all
    checkboxes.forEach(cb => {
      cb.checked = true;
      const row = cb.getAttribute('data-row');
      const misc = cb.getAttribute('data-misc');
      if (row) {
        window.selectedMaterials.add(`material-${row}`);
      } else if (misc) {
        window.selectedMaterials.add(`misc-${misc}`);
      }
    });
  }
}

function deleteSelectedMaterials() {
  if (window.selectedMaterials.size === 0) {
    alert('No items selected');
    return;
  }
  
  if (!confirm(`Delete ${window.selectedMaterials.size} selected item(s)?`)) {
    return;
  }
  
  // Save state for undo
  saveUndoState();
  
  // Delete selected items
  window.selectedMaterials.forEach(id => {
    if (id.startsWith('material-')) {
      const rowIndex = parseInt(id.split('-')[1]);
      const row = document.querySelector(`tr[data-row="${rowIndex}"]`);
      if (row) {
        row.remove();
      }
      window.materialsData[rowIndex].quantity = 0;
      window.materialsData[rowIndex].total = 0;
    } else if (id.startsWith('misc-')) {
      const miscNum = parseInt(id.split('-')[1]);
      const row = document.querySelector(`tr[data-misc="${miscNum}"]`);
      if (row) {
        row.remove();
      }
      window.miscTotals[miscNum - 1] = 0;
    }
  });
  
  window.selectedMaterials.clear();
  recalculateTotals();
}

function saveUndoState() {
  const state = {
    materialsData: JSON.parse(JSON.stringify(window.materialsData)),
    miscTotals: [...window.miscTotals],
    tableHTML: document.getElementById('materialsTable').innerHTML
  };
  window.undoStack.push(state);
  if (window.undoStack.length > 10) {
    window.undoStack.shift(); // Keep only last 10 actions
  }
}

function undoLastAction() {
  if (window.undoStack.length === 0) {
    alert('Nothing to undo');
    return;
  }
  
  const previousState = window.undoStack.pop();
  window.materialsData = previousState.materialsData;
  window.miscTotals = previousState.miscTotals;
  document.getElementById('materialsTable').innerHTML = previousState.tableHTML;
  
  window.selectedMaterials.clear();
  recalculateTotals();
}

// ============================================
// MATERIALS TEMPLATE SELECTOR FUNCTIONALITY
// ============================================

// Populate material template selector dropdown
function populateMaterialTemplateSelector() {
  if (!window.priceTemplates) return;
  
  const selector = document.getElementById('materialTemplateSelect');
  const selectorContainer = document.getElementById('materialTemplateSelector');
  
  if (!selector || !selectorContainer) return;
  
  const templates = window.priceTemplates.getNames();
  
  // Clear and rebuild options
  selector.innerHTML = '<option value="">Current Pricing</option>';
  
  templates.forEach(template => {
    const option = document.createElement('option');
    option.value = template.id;
    option.textContent = template.name;
    selector.appendChild(option);
  });
  
  // Show the selector if we have data loaded
  if (window.materialsData && window.materialsData.length > 0) {
    selectorContainer.style.display = 'block';
  }
}

// Apply selected template to materials table
function applyTemplateToMaterials() {
  const selector = document.getElementById('materialTemplateSelect');
  const templateId = selector.value;
  
  if (!templateId || !window.priceTemplates || !window.materialsData) {
    return;
  }
  
  if (!confirm('Apply this price template? This will update prices in the materials table.')) {
    selector.value = ''; // Reset to "Current Pricing"
    return;
  }
  
  // Apply template globally (updates pricing.js localStorage)
  window.priceTemplates.applyTemplate(templateId);
  
  // Get the applied pricing
  const pricing = window.getCurrentPricing ? window.getCurrentPricing() : null;
  
  if (!pricing) {
    alert('Could not load template pricing');
    return;
  }
  
  // Update material prices from applied template
  window.materialsData.forEach(material => {
    if (pricing[material.name]) {
      material.unitPrice = pricing[material.name].price;
      material.total = material.quantity * material.unitPrice;
    }
  });
  
  // Rebuild global additional item options with new pricing
  window.additionalItemOptions = buildAdditionalItemOptions();
  
  // Refresh the materials table display
  const tableBody = document.getElementById('materialsTable');
  tableBody.innerHTML = window.materialsData.map((item, index) => createMaterialRow(item, index)).join('');
  
  // Add misc items back (will use updated additionalItemOptions)
  for (let i = 1; i <= window.miscItemCount || 3; i++) {
    tableBody.innerHTML += createAdditionalItemRow(i);
  }
  
  // Force update pricing tab if it exists
  if (typeof populatePricingTable === 'function') {
    setTimeout(() => populatePricingTable(), 100);
  }
  
  recalculateTotals();
  alert('Template prices applied successfully!');
}

// ============================================
// LABOR PDF GENERATION
// ============================================

// Build Labor PDF document definition
function buildLaborPDFDocDefinition() {
  // Get customer info (same as materials)
  const customerName = document.getElementById('customerName')?.value || 'Customer';
  const shingleColor = document.getElementById('shingleColorInput')?.value || '';
  const address = document.getElementById('jobAddress')?.value || '';
  const orderNum = document.getElementById('jobNumber')?.value || window.currentJobNumber || window.currentRawMeasurements?.order_number || '';
  const laborLocation = document.getElementById('laborLocation')?.value || 'Charleston Area';
  
  // Build labor table body
  const laborTableBody = [
    [
      { text: 'Item', style: 'tableHeader' },
      { text: 'Quantity', style: 'tableHeader', alignment: 'right' },
      { text: 'Unit Price', style: 'tableHeader', alignment: 'right' },
      { text: 'Total', style: 'tableHeader', alignment: 'right' }
    ]
  ];
  
  // Add labor items from table (only non-zero quantities)
  if (window.laborData && window.laborData.items) {
    const filteredLabor = window.laborData.items.filter(item => item.quantity > 0);
    filteredLabor.forEach(item => {
      const pluralUnit = pluralizeUnit(item.quantity, item.unit);
      laborTableBody.push([
        item.name,
        { text: `${item.quantity} ${pluralUnit}`, alignment: 'right' },
        { text: `$${item.unitPrice.toFixed(2)}`, alignment: 'right' },
        { text: `$${item.total.toFixed(2)}`, alignment: 'right' }
      ]);
    });
  }
  
  // Calculate total
  const laborTotal = window.laborData?.items?.reduce((sum, item) => {
    return sum + (item.total || 0);
  }, 0) || 0;
  
  // PDF document definition
  const docDefinition = {
    pageSize: 'LETTER',
    pageMargins: [72, 54, 72, 72],
    
    content: [
      // Header with logo
      {
        columns: [
          {
            width: '*',
            text: 'LABOR INVOICE',
            style: 'header',
            alignment: 'left',
            margin: [0, 0, 0, 0]
          },
          {
            width: 180,
            image: 'logo',
            fit: [180, 75],
            alignment: 'right',
            margin: [0, 0, 0, 0]
          }
        ],
        margin: [0, 0, 0, 20]
      },
      
      // Customer Information
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'CUSTOMER INFORMATION', style: 'sectionHeader', margin: [0, 0, 0, 10] },
              { text: `Customer: ${customerName}`, margin: [0, 0, 0, 5] },
              { text: `Address: ${address}`, margin: [0, 0, 0, 5] },
              { text: `Job Number: ${orderNum}`, margin: [0, 0, 0, 5] },
              { text: `Shingle Color: ${shingleColor || 'Not specified'}`, margin: [0, 0, 0, 5] },
              { text: `Labor Location: ${laborLocation}`, margin: [0, 0, 0, 5] }
            ]
          },
          {
            width: '50%',
            stack: []
          }
        ],
        margin: [0, 0, 0, 20]
      },
      
      // Labor Items Table
      {
        text: 'LABOR ITEMS',
        style: 'sectionHeader',
        margin: [0, 0, 0, 10]
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto'],
          body: laborTableBody
        },
        layout: {
          hLineWidth: function(i, node) {
            return (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5;
          },
          vLineWidth: function(i, node) {
            return 0;
          },
          hLineColor: function(i, node) {
            return '#E5E7EB';
          },
          paddingLeft: function(i) { return 8; },
          paddingRight: function(i) { return 8; },
          paddingTop: function(i) { return 8; },
          paddingBottom: function(i) { return 8; }
        },
        margin: [0, 0, 0, 20]
      },
      
      // Total
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 200,
            stack: [
              {
                columns: [
                  { width: '*', text: 'TOTAL LABOR:', alignment: 'right', bold: true, fontSize: 14 },
                  { width: 80, text: `$${laborTotal.toFixed(2)}`, alignment: 'right', bold: true, fontSize: 14, color: '#2B7BA3' }
                ],
                margin: [0, 0, 0, 0]
              }
            ]
          }
        ]
      },
      
      // Footer note
      {
        text: `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
        style: 'footer',
        margin: [0, 40, 0, 0]
      }
    ].concat(
      // Labor photos section - vertical stack
      (function() {
        if (!window.currentPhotos?.labor?.length) return [];
        
        const photoContent = [
          { text: '', pageBreak: 'before' },
          { text: 'JOB SITE PHOTO REPORT', fontSize: 22, bold: true, color: '#1e293b', alignment: 'center', margin: [0, 0, 0, 40] }
        ];
        
        // Add photos vertically stacked with even spacing
        window.currentPhotos.labor.forEach((photo, idx) => {
          const photoStack = [
            { image: photo.data, width: 400, alignment: 'center' }
          ];
          
          if (photo.label) {
            photoStack.push({
              text: photo.label,
              fontSize: 12,
              color: '#475569',
              alignment: 'center',
              margin: [0, 10, 0, 0]
            });
          }
          
          photoContent.push({
            stack: photoStack,
            margin: [0, 0, 0, 30],
            alignment: 'center'
          });
        });
        
        return photoContent;
      })()
    ),
    
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        color: '#2B7BA3'
      },
      sectionHeader: {
        fontSize: 12,
        bold: true,
        color: '#1a1a1a'
      },
      tableHeader: {
        bold: true,
        fontSize: 10,
        color: '#1a1a1a',
        fillColor: '#F9FAFB'
      },
      footer: {
        fontSize: 8,
        color: '#718096',
        alignment: 'center',
        italics: true
      }
    },
    
    defaultStyle: {
      fontSize: 10,
      color: '#1a1a1a'
    },
    
    images: {
      logo: 'data:image/jpeg;base64,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'
    }
  };
  
  return docDefinition;
}

// Generate and open Labor PDF for printing (like materials tab)
function generateLaborPDF() {
  const docDefinition = buildLaborPDFDocDefinition();
  
  // Open PDF in new window for printing
  try {
    pdfMake.createPdf(docDefinition).open();
  } catch (error) {
    console.error('Labor PDF generation error:', error);
    alert('Error generating labor PDF. Please try again.');
  }
}

