//Version: 2026-02-07-00:53 - Labor debug logging
console.log('[APP.JS] Loaded version: 2026-02-07-00:53');

const fileInput = document.getElementById('fileInput'); // Legacy - may not exist if using lc-dropzone
const uploadBox = document.getElementById('uploadBox'); // Legacy - may not exist if using lc-dropzone
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const error = document.getElementById('error');

//Helper functions
function validateQuantity(value) {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0;
}

function validatePrice(value) {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0;
}

function applyZeroQuantityClasses(row, quantity) {
  if (!row) return;
  if (quantity === 0) {
    row.classList.add('zero-quantity');
  } else {
    row.classList.remove('zero-quantity');
  }
}

function removeErrorMessage(element) {
  if (element && element.classList) {
    element.classList.remove('error');
  }
  const errorMsg = element?.parentElement?.querySelector('.error-message');
  if (errorMsg) {
    errorMsg.remove();
  }
}

//Get current pricing based on default system
function getCurrentPricing() {
//Try to get custom pricing from localStorage based on default system
  try {
    const defaultSystemStr = localStorage.getItem('quikbitz-default-system');
    if (defaultSystemStr) {
      const system = JSON.parse(defaultSystemStr);
      const pricingKey = `${system.manufacturerId}_${system.shingleLineId}`;
      
      const allPricingStr = localStorage.getItem('quikbitz-custom-pricing');
      if (allPricingStr) {
        const allPricing = JSON.parse(allPricingStr);
        if (allPricing[pricingKey]) {
          console.log('[PRICING] Using custom pricing for:', pricingKey);
          return allPricing[pricingKey];
        }
      }
    }
  } catch (e) {
    console.error('[PRICING] Error loading custom pricing:', e);
  }
  
//Return empty object if no custom pricing found
  return {};
}

//Tab switching
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
//If called programmatically (no event), find and activate the button
  if (typeof event !== 'undefined' && event && event.target) {
    event.target.classList.add('active');
  } else {
//Find button that triggers this tab
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
      if (btn.getAttribute('onclick').includes(`'${tabName}'`)) {
        btn.classList.add('active');
      }
    });
  }
  
  document.getElementById(tabName + 'Tab').classList.add('active');
  
//If switching to home tab, ensure upload section is visible
  if (tabName === 'home') {
    const uploadSection = document.querySelector('.upload-section');
    if (uploadSection) {
      uploadSection.style.display = 'block';
    }
  }
  
//Initialize pricing tab when switched to
  if (tabName === 'pricing') {
    if (typeof initPricingTab === 'function') {
      initPricingTab();
    }
  }
}

//Load current user on page load
async function loadCurrentUser() {
  try {
    const response = await fetch('/api/user');
    const data = await response.json();
    if (data.success && data.user) {
      const userNameEl = document.getElementById('userName');
      if (userNameEl) {
        userNameEl.textContent = data.user.name || data.user.email;
      }
    } else {
      window.location.href = '/login.html';
    }
  } catch (err) {
    console.error('Failed to load user:', err);
    window.location.href = '/login.html';
  }
}

//Logout function
async function logout() {
  try {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login.html';
  } catch (err) {
    console.error('Logout failed:', err);
    window.location.href = '/login.html';
  }
}

//Load user info on page load
loadCurrentUser();

//Legacy upload handlers (only if elements exist - otherwise using lc-dropzone)
if (fileInput) {
  fileInput.addEventListener('change', handleFileSelect);
}

const selectPDFBtn = document.getElementById('selectPDFBtn');
if (selectPDFBtn && fileInput) {
  selectPDFBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInput.click();
  });
  
//Also add touch handler for iOS
  selectPDFBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInput.click();
  });
}

//Upload box handlers (only if element exists)
if (uploadBox && fileInput) {
//Upload box click handler (desktop)
  uploadBox.addEventListener('click', (e) => {
//Only trigger if not clicking the button directly
    if (e.target.id !== 'selectPDFBtn' && !e.target.closest('.btn-primary')) {
      fileInput.click();
    }
  });

//Drag and drop handlers
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
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    handleFile(file);
  }
}

async function handleFile(file) {
  hideError();
  showLoading();
  
//Clear photos when uploading new PDF
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
      // Special handling for loss sheets uploaded to wrong tab
      if (data.isLossSheet) {
        showError(data.message + ' Click the "Home" tab at the top to upload loss sheets.');
      } else {
        showError(data.message || 'Failed to process PDF');
      }
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

//Build additional item options from ALL_MATERIALS + current pricing
function buildAdditionalItemOptions() {
  const options = [
    { name: 'Select Item...', price: 0 }
  ];
  
//Get current pricing
  const currentPricing = window.getCurrentPricing ? window.getCurrentPricing() : {};
  
//Add ALL_MATERIALS items (includes Custom Item...)
  if (window.ALL_MATERIALS) {
    window.ALL_MATERIALS.forEach(item => {
//Update price from current pricing if available
      const price = currentPricing[item.name] ? currentPricing[item.name].price : item.price;
      options.push({
        name: item.name,
        price: price
      });
    });
  }
  
//Add any custom items from pricing that aren't in ALL_MATERIALS
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

//Create HTML for an additional item row
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
          &#215;
        </button>
      </td>
    </tr>
  `;
}

function displayResults(data) {
  console.log('[DISPLAY] Full data received:', data);
  
//Only store ORIGINAL PDF measurements (when roof_sq exists)
//Don't overwrite if this is just a materials refresh
  if (data.raw && data.raw.roof_sq) {
    window.originalPdfData = {
      raw: data.raw,
      measurements: data.measurements,
      materials: data.materials
    };
    window.currentRawMeasurements = data.raw;
    window.currentMeasurements = data.measurements;
    window.lastServerResponse = data;
    console.log('[DISPLAY] Stored ORIGINAL PDF data:', data.raw.roof_sq, 'squares');
  } else {
//This is a refresh (e.g., after applying system), use stored original data
    if (window.originalPdfData) {
      data.raw = window.originalPdfData.raw;
      data.measurements = window.originalPdfData.measurements;
      console.log('[DISPLAY] Using stored original PDF data');
    }
  }
  
//Ensure raw exists
  if (!data.raw) data.raw = {};
  
//Store data for restoration after print
  window.currentPDFData = data;
  
//Store customer name and job number for PDF
  window.currentCustomerName = data.raw.customer_name || '';
  window.currentJobNumber = data.raw.order_number || '';
  
//Display measurements - Split into customer info and measurements
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
        <div class="measurement-value">${parseFloat(data.measurements.roofSquares || 0).toFixed(2)} sq</div>
      </div>
      <div class="measurement-item no-print">
        <div class="measurement-label">Ridge Length</div>
        <div class="measurement-value">${parseFloat(data.measurements.ridgeLength || 0).toFixed(2)} ft</div>
      </div>
      <div class="measurement-item no-print">
        <div class="measurement-label">Hip Length</div>
        <div class="measurement-value">${parseFloat(data.measurements.hipLength || 0).toFixed(2)} ft</div>
      </div>
      <div class="measurement-item no-print">
        <div class="measurement-label">Valley Length</div>
        <div class="measurement-value">${parseFloat(data.measurements.valleyLength || 0).toFixed(2)} ft</div>
      </div>
      <div class="measurement-item no-print">
        <div class="measurement-label">Eave Length</div>
        <div class="measurement-value">${parseFloat(data.measurements.eaveLength || 0).toFixed(2)} ft</div>
      </div>
      <div class="measurement-item no-print">
        <div class="measurement-label">Rake Length</div>
        <div class="measurement-value">${parseFloat(data.measurements.rakeLength || 0).toFixed(2)} ft</div>
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
  
//Display materials with editable quantities and prices
  const tableBody = document.getElementById('materialsTable');
  
//Build dropdown options from all materials
  const materialOptions = (window.ALL_MATERIALS || []).map(mat => 
    `<option value="${mat.name}" data-unit="${mat.unit}" data-price="${mat.price}">${mat.name}</option>`
  ).join('');
  
  tableBody.innerHTML = data.materials.map((item, index) => {
    const pluralUnit = pluralizeUnit(item.unit, item.quantity);
//Format quantity: whole numbers if no decimal, otherwise 2 decimals
    const qtyDisplay = item.quantity % 1 === 0 ? item.quantity.toString() : item.quantity.toFixed(2);
    const qtyForPrint = item.quantity % 1 === 0 ? item.quantity.toString() : item.quantity.toFixed(2);
    const rowClasses = [];
    if (item.quantity === 0) rowClasses.push('zero-quantity');
    if (item.missingData) rowClasses.push('missing-data-row');
    const rowClass = rowClasses.join(' ');
    const missingLabel = item.missingData ? '<span class="missing-data-label">Verify manually</span>' : '';
    
    return `
    <tr data-row="${index}" data-unit="${item.unit}" class="${rowClass}">
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
          oninput="updateMaterialRow(${index})"
          onchange="updateMaterialRow(${index})"
          aria-label="Quantity for ${item.name}"
        />
        ${missingLabel}
      </td>
      <td data-label="Unit">${pluralUnit}</td>
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
          &#215;
        </button>
      </td>
    </tr>
  `;
  }).join('');
  
//Additional items dropdown options - dynamically built from ALL_MATERIALS + current pricing
  const additionalItemOptions = buildAdditionalItemOptions();
  
  window.additionalItemOptions = additionalItemOptions;
  
//Add 3 additional items to the materials table - COMMENTED OUT (use + Add Item button instead)
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
            &#215;
          </button>
        </td>
      </tr>
    `;
  }
  */
  
//Store original data for recalculation
  window.materialsData = data.materials;
  
  // ==========================================
  // APPEND SUPPLEMENT ITEMS (cross-referenced field-measured items from loss sheet)
  // ==========================================
  if (data.supplementItems && data.supplementItems.length > 0) {
    console.log('[SUPPLEMENT] Appending', data.supplementItems.length, 'supplement items to materials table');
    
    // Use tableBody already declared above
    const startIndex = data.materials.length; // Start numbering after regular materials
    
    data.supplementItems.forEach((item, idx) => {
      const rowIndex = startIndex + idx;
      const row = document.createElement('tr');
      row.dataset.row = rowIndex;
      row.dataset.source = 'loss';
      row.classList.add('loss-item-row');
      
      const total = (item.quantity || 0) * (item.unitPrice || 0);
      
      row.innerHTML = `
        <td class="checkbox-cell no-print">
          <input type="checkbox" class="material-checkbox" data-row="${rowIndex}" onchange="toggleMaterialSelection(${rowIndex})">
        </td>
        <td data-label="Item">
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="flex: 1;">${item.name}</span>
              <span style="background: #fbbf24; color: #78350f; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; white-space: nowrap;">FROM LOSS</span>
            </div>
            <input 
              type="text" 
              class="editable-input" 
              placeholder="Enter color..." 
              value="${item.color || ''}"
              data-row="${rowIndex}"
              data-field="color"
              onchange="updateLossItemColor(${rowIndex}, this.value)"
              style="max-width: 200px; font-size: 13px;"
            />
          </div>
        </td>
        <td data-label="Quantity" class="editable-cell">
          <input 
            type="number" 
            class="editable-input quantity-input" 
            value="${item.quantity}" 
            min="0"
            step="0.01"
            data-row="${rowIndex}"
            data-field="quantity"
            onchange="updateLossItemAndRecalc(${rowIndex})"
          />
        </td>
        <td data-label="Unit">${item.unit}</td>
        <td data-label="Unit Price" class="editable-cell">
          $<input 
            type="number" 
            class="editable-input price-input" 
            value="${(item.unitPrice || 0).toFixed(2)}" 
            min="0"
            step="0.01"
            data-row="${rowIndex}"
            data-field="unitPrice"
            onchange="updateLossItemAndRecalc(${rowIndex})"
          />
        </td>
        <td data-label="Total" class="row-total">$${total.toFixed(2)}</td>
        <td class="delete-cell no-print">
          <button class="delete-btn" onclick="deleteLossItem(${rowIndex})">
            &#215;
          </button>
        </td>
      `;
      
      tableBody.appendChild(row);
    });
    
//Store supplement items globally
    window.supplementItems = data.supplementItems;
  }
  
//Store labor data
  if (data.labor) {
    window.laborData = data.labor;
    console.log('[LABOR] Stored labor data:', window.laborData);
    
//Display labor results
    if (typeof displayLaborResults === 'function') {
      displayLaborResults(data.labor);
    }
  }
  
  window.taxRate = 9; // Default 9%
  window.miscTotals = new Array(3).fill(0);
  window.miscItemCount = 3; // Track number of misc items
  
//Add totals in separate section (won't repeat on print)
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
  
//Show manufacturer selector
  showMaterialsManufacturerSelector();
  
//Switch to Materials (calculator) tab after processing
  switchTab('calculator');
  
//Show "Add More Items" button and material actions
  const addMoreBtn = document.getElementById('addMoreItemsBtn');
  if (addMoreBtn) {
    addMoreBtn.style.display = 'inline-block';
  }
  const materialActions = document.getElementById('materialActions');
  if (materialActions) {
    materialActions.style.display = 'block';
  }
  
//Initialize and show material template selector
  populateMaterialTemplateSelector();
  
//Store measurements globally for labor tab
  console.log('[DISPLAY] Storing measurements for labor tab...');
  window.currentMeasurements = data.measurements;
  window.currentRawMeasurements = data.raw;
  
//Populate labor tab
  console.log('[DISPLAY] About to call displayLaborResults with data:', data);
  try {
    displayLaborResults(data);
    console.log('[DISPLAY] displayLaborResults call completed');
  } catch (err) {
    console.error('[DISPLAY] ERROR calling displayLaborResults:', err);
    console.error('[DISPLAY] Stack trace:', err.stack);
  }
  
//Initialize retail estimate
  if (typeof displayRetailEstimate === 'function') {
    displayRetailEstimate();
  }
  
//Ensure all zero-quantity rows have the class applied (for print preview)
  setTimeout(() => {
    applyZeroQuantityClasses();
  }, 100);
  
//Show manufacturer selector
  if (typeof showMaterialsManufacturerSelector === 'function') {
    showMaterialsManufacturerSelector();
  }
}

function updateMiscItemSelect(miscNum) {
  const select = document.getElementById(`miscItem${miscNum}`);
  const priceInput = document.getElementById(`miscPrice${miscNum}`);
  const selectedOption = select.options[select.selectedIndex];
  const price = parseFloat(selectedOption.getAttribute('data-price')) || 0;
  
//If "Custom Item..." is selected, convert to text input
  if (select.value === 'Custom Item...') {
    const customName = prompt('Enter custom item name:');
    if (customName) {
//Replace select with text input
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
  
//Auto-populate price when item is selected
  if (select.value !== 'Select Item...' && select.value !== 'Custom Item...') {
    priceInput.value = price.toFixed(2);
  }
  
//Update row
  updateMiscRow(miscNum);
}

function deleteMaterialRow(rowIndex) {
  if (!confirm('Delete this item from the material list?')) {
    return;
  }
  
//Remove from data array
  if (window.materialsData && window.materialsData[rowIndex]) {
    window.materialsData.splice(rowIndex, 1);
  }
  
//Re-render the materials table
  if (typeof displayResults === 'function') {
    displayResults({
      materials: window.materialsData,
      measurements: window.currentMeasurements || {},
      raw: window.currentRawMeasurements || {},
      labor: window.laborData,
      success: true
    });
  }
  
  console.log('[MATERIALS] Deleted item at index', rowIndex);
}

function toggleMaterialSelection(rowIndex) {
  const checkbox = document.querySelector(`.material-checkbox[data-row="${rowIndex}"]`);
  const row = document.querySelector(`tr[data-row="${rowIndex}"]`);
  
  if (row && checkbox) {
    if (checkbox.checked) {
      row.classList.add('row-selected');
    } else {
      row.classList.remove('row-selected');
    }
  }
  
//Update delete button visibility
  const anyChecked = document.querySelectorAll('.material-checkbox:checked').length > 0;
  const deleteBtn = document.getElementById('deleteSelectedMaterialsBtn');
  if (deleteBtn) {
    deleteBtn.style.display = anyChecked ? 'inline-block' : 'none';
  }
}

function deleteSelectedMaterials() {
  const checkboxes = document.querySelectorAll('.material-checkbox:checked');
  if (checkboxes.length === 0) {
    alert('No materials selected.');
    return;
  }
  
  if (!confirm('Delete ' + checkboxes.length + ' selected material(s)?')) {
    return;
  }
  
  const indices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.row)).sort((a, b) => b - a);
  indices.forEach(index => {
    if (window.materialsData && window.materialsData[index]) {
      window.materialsData.splice(index, 1);
    }
  });
  
  if (typeof displayResults === 'function') {
    displayResults({
      materials: window.materialsData,
      measurements: window.currentMeasurements || {},
      raw: window.currentRawMeasurements || {},
      labor: window.laborData,
      success: true
    });
  }
  
  console.log('[MATERIALS] Deleted', indices.length, 'items');
}

function deleteMiscRow(miscNum) {
  if (!confirm('Delete this additional item?')) {
    return;
  }
  
//Save state for undo
  saveUndoState();
  
//Remove from DOM
  const row = document.querySelector(`tr[data-misc="${miscNum}"]`);
  if (row) {
    row.remove();
  }
  
//Update stored data
  window.miscTotals[miscNum - 1] = 0;
  
//Recalculate totals
  recalculateTotals();
}

function updateMiscRow(miscNum) {
  const qtyInput = document.getElementById(`miscQty${miscNum}`);
  const priceInput = document.getElementById(`miscPrice${miscNum}`);
  
  const qty = parseFloat(qtyInput.value) || 0;
  const price = parseFloat(priceInput.value) || 0;
  
//Validate if values are entered
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
  
//Update the visible total cell
  const totalCell = document.getElementById(`miscTotal${miscNum}`);
  if (totalCell) {
    totalCell.textContent = '$' + total.toFixed(2);
  }
  
//Toggle zero-quantity class for print hiding
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
  if (!row) {
    console.error('[MATERIALS] Row not found:', rowIndex);
    return;
  }
  
  const qtyInput = row.querySelector('[data-field="quantity"]');
  const priceInput = row.querySelector('[data-field="unitPrice"]');
  const totalCell = row.querySelector('.row-total');
  const unitCell = row.querySelector('td[data-label="Unit"]');
  
  if (!qtyInput || !priceInput || !totalCell) {
    console.error('[MATERIALS] Missing elements in row:', rowIndex);
    return;
  }
  
  const quantity = parseFloat(qtyInput.value) || 0;
  const unitPrice = parseFloat(priceInput.value) || 0;
  const total = quantity * unitPrice;
  
//Update row total
  totalCell.textContent = '$' + total.toFixed(2);
  
//Update unit with pluralization if unitCell exists
  if (unitCell && typeof pluralizeUnit === 'function') {
    const baseUnit = row.getAttribute('data-unit') || window.materialsData[rowIndex]?.unit || 'Piece';
    unitCell.textContent = pluralizeUnit(baseUnit, quantity);
  }
  
//Update data-print-value for print rendering
  const quantityCell = row.querySelector('td[data-label="Quantity"]');
  if (quantityCell) {
    const unit = unitCell?.textContent || window.materialsData[rowIndex]?.unit || '';
    quantityCell.setAttribute('data-print-value', `${quantity} ${unit}`);
  }
  
//Toggle zero-quantity class for print hiding
  if (quantity === 0) {
    row.classList.add('zero-quantity');
  } else {
    row.classList.remove('zero-quantity');
  }
  
  // Remove missing-data highlight and label when user edits quantity
  if (row.classList.contains('missing-data-row')) {
    row.classList.remove('missing-data-row');
    const missingLabel = quantityCell?.querySelector('.missing-data-label');
    if (missingLabel) {
      missingLabel.remove();
    }
  }
  
//Update stored data
  if (window.materialsData && window.materialsData[rowIndex]) {
    window.materialsData[rowIndex].quantity = parseFloat(quantity.toFixed(2));
    window.materialsData[rowIndex].unitPrice = unitPrice;
    window.materialsData[rowIndex].total = total;
  }
  
//Recalculate subtotal, tax, and grand total
  if (typeof recalculateTotals === 'function') {
    recalculateTotals();
  }
  
  console.log('[MATERIALS] Updated row', rowIndex, ':', window.materialsData[rowIndex]?.name, '= $' + total.toFixed(2));
}

function updateMaterialsTotals() {
  if (!window.materialsData) return;
  
  const subtotal = window.materialsData.reduce((sum, item) => sum + (item.total || 0), 0);
  
  const subtotalEl = document.getElementById('materialsSubtotal');
  if (subtotalEl) {
    subtotalEl.textContent = '$' + subtotal.toFixed(2);
  }
  
//Update grand total
  const taxRate = 0.09; // 9% tax
  const tax = subtotal * taxRate;
  const grandTotal = subtotal + tax;
  
  const taxEl = document.getElementById('materialsTax');
  const grandTotalEl = document.getElementById('materialsGrandTotal');
  
  if (taxEl) taxEl.textContent = '$' + tax.toFixed(2);
  if (grandTotalEl) grandTotalEl.textContent = '$' + grandTotal.toFixed(2);
}

function recalculateTotals() {
  const materialsTotal = window.materialsData.reduce((sum, item) => sum + item.total, 0);
  const lossTotal = (window.lossItems || []).reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
  const miscTotal = (window.miscTotals || []).reduce((sum, val) => sum + val, 0);
  const subtotal = materialsTotal + lossTotal + miscTotal;
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
  
//Validate tax rate
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
  
//Rebuild options to get latest pricing
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
          &#215;
        </button>
      </td>
    `;
    tableBody.appendChild(newRow);
    window.miscTotals.push(0);
  }
  
  window.miscItemCount = newCount;
}

//Pluralize unit names based on quantity
function pluralizeUnit(unit, quantity) {
  if (!unit) return '';
  const qty = parseFloat(quantity) || 0;
  
//Don't pluralize abbreviations
  if (['SQ', 'EA', 'LF', 'BD'].includes(unit.toUpperCase())) {
    return unit;
  }
  
//Pluralize if quantity is not 1
  if (qty === 1) {
    return unit;
  }
  
//Handle special cases
  const pluralMap = {
    'Bundle': 'Bundles',
    'Piece': 'Pieces',
    'Roll': 'Rolls',
    'Sheet': 'Sheets',
    'Box': 'Boxes',
    'Tube': 'Tubes',
    'Gallon': 'Gallons',
    'Bag': 'Bags'
  };
  
  return pluralMap[unit] || unit + 's';
}

// ----------------------------------------
//FORM VALIDATION


// ----------------------------------------
//DEFAULT SYSTEM FUNCTIONS
// ----------------------------------------
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
  
//Get manufacturer and model names
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
  
//Update banner
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

//Auto-load default system on page load
if (typeof initDefaultSystem === 'undefined') {
  window.initDefaultSystem = function() {
    const defaultSystem = getDefaultSystem();
    if (defaultSystem) {
//Auto-select default system in Materials/Labor tab
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
    
//Update banner
    updateDefaultSystemBanner();
  };
  
//Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDefaultSystem);
  } else {
    initDefaultSystem();
  }
}

//Missing displayLaborResults function
function displayLaborResults(data) {
  console.log('[LABOR] displayLaborResults called with data:', data);
  
//Handle both formats: data.labor.items OR data.items directly
  let laborData;
  if (data.labor && data.labor.items) {
    laborData = data.labor;
  } else if (data.items) {
    laborData = data;
  } else {
    console.warn('[LABOR] No labor data in response');
    return;
  }
  
//Store labor data globally
  window.laborData = laborData;
  console.log('[LABOR] Stored labor data:', window.laborData);
  
//Get labor table
  const laborTable = document.getElementById('laborTable');
  if (!laborTable) {
    console.error('[LABOR] Labor table element not found');
    return;
  }
  
//Clear existing rows
  laborTable.innerHTML = '';
  
//Render each labor item
  laborData.items.forEach((item, index) => {
    const row = createLaborRow(item, index);
    laborTable.innerHTML += row;
  });
  
//Update totals
  updateLaborTotals();
  
//Show the labor results container
  const laborResultsDiv = document.getElementById('laborResults');
  if (laborResultsDiv) {
    laborResultsDiv.style.display = 'block';
  }
  
//Also hide the "not ready" message if it exists
  const laborNotReady = document.getElementById('laborNotReady');
  if (laborNotReady) {
    laborNotReady.style.display = 'none';
  }
  
  console.log('[LABOR] Rendered', laborData.items.length, 'labor items');
}

//Helper function to create labor row HTML
function createLaborRow(item, index) {
  const quantity = parseFloat(item.quantity) || 0;
  const unitPrice = parseFloat(item.unitPrice) || 0;
  const total = quantity * unitPrice;
  
//Pluralize unit
  const unit = item.unit || '';
  let pluralUnit = unit;
  if (quantity !== 1 && unit && typeof pluralizeUnit === 'function') {
    pluralUnit = pluralizeUnit(unit, quantity);
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
      <td data-label="Unit">${pluralUnit}</td>
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
          &#215;
        </button>
      </td>
    </tr>
  `;
}

//Update labor row
function updateLaborRow(rowIndex) {
  if (!window.laborData || !window.laborData.items) return;
  
  const item = window.laborData.items[rowIndex];
  if (!item) return;
  
//Get input values from the row
  const qtyInput = document.querySelector(`[data-labor-row="${rowIndex}"][data-field="quantity"]`);
  const priceInput = document.querySelector(`[data-labor-row="${rowIndex}"][data-field="unitPrice"]`);
  
  if (qtyInput) {
    item.quantity = parseFloat(qtyInput.value) || 0;
  }
  if (priceInput) {
    item.unitPrice = parseFloat(priceInput.value) || 0;
  }
  
//Recalculate total
  item.total = item.quantity * item.unitPrice;
  
//Update the total cell in the row
  const row = document.querySelector(`tr[data-labor-row="${rowIndex}"]`);
  if (row) {
    const totalCell = row.querySelector('.row-total');
    if (totalCell) {
      totalCell.textContent = '$' + item.total.toFixed(2);
    }
  }
  
//Update labor totals
  updateLaborTotals();
  
  console.log('[LABOR] Updated row', rowIndex, ':', item.name, '=', item.total);
}

//Update labor totals
function updateLaborTotals() {
  if (!window.laborData || !window.laborData.items) return;
  
  let subtotal = 0;
  window.laborData.items.forEach(item => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    subtotal += qty * price;
  });
  
//Update labor subtotal display if it exists
  const laborSubtotalEl = document.getElementById('laborSubtotal');
  if (laborSubtotalEl) {
    laborSubtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  }
  
  window.laborData.subtotal = subtotal;
  console.log('[LABOR] Updated subtotal:', subtotal);
}

function toggleLaborSelection(rowIndex) {
  const checkbox = document.querySelector(`.labor-checkbox[data-labor-row="${rowIndex}"]`);
  const row = document.querySelector(`tr[data-labor-row="${rowIndex}"]`);
  
  if (row && checkbox) {
    if (checkbox.checked) {
      row.classList.add('row-selected');
    } else {
      row.classList.remove('row-selected');
    }
  }
  
//Update delete button visibility
  const anyChecked = document.querySelectorAll('.labor-checkbox:checked').length > 0;
  const deleteBtn = document.getElementById('deleteSelectedLaborBtn');
  if (deleteBtn) {
    deleteBtn.style.display = anyChecked ? 'inline-block' : 'none';
  }
}

function deleteSelectedLabor() {
  const checkboxes = document.querySelectorAll('.labor-checkbox:checked');
  if (checkboxes.length === 0) {
    alert('No labor items selected.');
    return;
  }
  
  if (!confirm('Delete ' + checkboxes.length + ' selected labor item(s)?')) {
    return;
  }
  
  const indices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.laborRow)).sort((a, b) => b - a);
  indices.forEach(index => {
    if (window.laborData && window.laborData.items && window.laborData.items[index]) {
      window.laborData.items.splice(index, 1);
    }
  });
  
  if (typeof displayLaborResults === 'function') {
    displayLaborResults(window.laborData);
  }
  
  console.log('[LABOR] Deleted', indices.length, 'items');
}

function deleteLaborItem(rowIndex) {
  if (!confirm('Delete this labor item?')) {
    return;
  }
  
  if (window.laborData && window.laborData.items && window.laborData.items[rowIndex]) {
    window.laborData.items.splice(rowIndex, 1);
  }
  
  if (typeof displayLaborResults === 'function') {
    displayLaborResults(window.laborData);
  }
  
  console.log('[LABOR] Deleted item at index', rowIndex);
}

// ----------------------------------------
//PRICING TAB FUNCTIONS
// ----------------------------------------
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

//DOMContentLoaded fallback initialization
document.addEventListener('DOMContentLoaded', function() {
  console.log('[PRICING] DOMContentLoaded - initializing pricing dropdown');
//Initialize pricing dropdown after page loads
  setTimeout(() => {
    if (typeof populatePricingManufacturerDropdown === 'function') {
      populatePricingManufacturerDropdown();
    }
  }, 500);
});

// ----------------------------------------
//PRICING TAB CHANGE HANDLERS
// ----------------------------------------
function handlePricingManufacturerChange() {
  const manufacturerSelect = document.getElementById('pricingManufacturerSelect');
  const shingleLineSelect = document.getElementById('pricingShingleLineSelect');
  const editorContainer = document.getElementById('pricingEditorContainer');
  const placeholder = document.getElementById('pricingPlaceholder');
  
  const manufacturerId = manufacturerSelect.value;
  console.log('[PRICING] Manufacturer changed to:', manufacturerId);
  
//Reset shingle line dropdown
  shingleLineSelect.innerHTML = '<option value="">Select Model</option>';
  
//Hide editor, show placeholder
  if (editorContainer) editorContainer.style.display = 'none';
  if (placeholder) placeholder.style.display = 'block';
  
  if (!manufacturerId) {
    shingleLineSelect.disabled = true;
    shingleLineSelect.style.background = '#f1f5f9';
    return;
  }
  
//Get shingle lines for selected manufacturer
  const shingleLines = getShingleLines(manufacturerId);
  console.log('[PRICING] Shingle lines for', manufacturerId, ':', shingleLines);
  
  if (shingleLines.length === 0) {
    console.error('[PRICING] No shingle lines found for manufacturer:', manufacturerId);
    return;
  }
  
//Populate shingle lines
  shingleLines.forEach(line => {
    shingleLineSelect.innerHTML += `<option value="${line.id}">${line.name}</option>`;
  });
  
//Enable dropdown
  shingleLineSelect.disabled = false;
  shingleLineSelect.style.background = 'white';
  
//Store selection
  window._pricingManufacturer = manufacturerId;
  window._pricingShingleLine = null;
}

function handlePricingShingleLineChange() {
  const manufacturerSelect = document.getElementById('pricingManufacturerSelect');
  const shingleLineSelect = document.getElementById('pricingShingleLineSelect');
  const editorContainer = document.getElementById('pricingEditorContainer');
  const placeholder = document.getElementById('pricingPlaceholder');
  const titleEl = document.getElementById('pricingSystemTitle');
  
  const manufacturerId = manufacturerSelect.value;
  const shingleLineId = shingleLineSelect.value;
  
  console.log('[PRICING] Shingle line changed to:', shingleLineId);
  
  if (!shingleLineId) {
    if (editorContainer) editorContainer.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
    return;
  }
  
  window._pricingShingleLine = shingleLineId;
  
  const shingleData = getShingleData(manufacturerId, shingleLineId);
  if (!shingleData) {
    console.error('[PRICING] Could not get shingle data for:', manufacturerId, shingleLineId);
    return;
  }
  
  console.log('[PRICING] Shingle data:', shingleData);
  
//Update title
  if (titleEl) {
    titleEl.textContent = `${shingleData.manufacturer} ${shingleData.name} Pricing`;
  }
  
//Load custom pricing if exists
  const customPricing = typeof loadCustomPricing === 'function' ? loadCustomPricing() : {};
  const pricingKey = `${manufacturerId}_${shingleLineId}`;
  const savedPricing = customPricing[pricingKey] || {};
  
  console.log('[PRICING] Saved pricing for', pricingKey, ':', savedPricing);
  
//Populate materials pricing table
  const tbody = document.getElementById('pricingEditorBody');
  if (tbody) {
    let html = '';
    
//Shingles
    const shinglesPrice = savedPricing.shingles || shingleData.pricePerBundle;
    html += `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${shingleData.name} Shingles</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">Bundle</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b;">$${shingleData.pricePerBundle.toFixed(2)}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; align-items: center;">
            <span style="color: #64748b; margin-right: 4px;">$</span>
            <input type="number" id="price_shingles" data-default="${shingleData.pricePerBundle}" value="${shinglesPrice}" step="0.01" style="width: 100px; padding: 8px 10px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 14px;">
          </div>
        </td>
      </tr>
    `;
    
//System components
    const components = shingleData.systemComponents;
    const componentKeys = ['starter', 'hipRidge', 'underlayment', 'iceWater', 'ridgeVent', 'dripEdge', 'nails', 'sealant'];
    
    componentKeys.forEach(key => {
      const comp = components[key];
      if (comp) {
        const savedPrice = savedPricing[key] || comp.pricePerUnit;
        html += `
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">${comp.name}</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">${comp.unit}</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b;">$${comp.pricePerUnit.toFixed(2)}</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
              <div style="display: flex; align-items: center;">
                <span style="color: #64748b; margin-right: 4px;">$</span>
                <input type="number" id="price_${key}" data-default="${comp.pricePerUnit}" value="${savedPrice}" step="0.01" style="width: 100px; padding: 8px 10px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 14px;">
              </div>
            </td>
          </tr>
        `;
      }
    });
    
    tbody.innerHTML = html;
  }
  
//Load saved labor rates
  const laborRates = savedPricing.labor || {};
  const laborDefaults = {
    'laborRate_squares': 90,
    'laborRate_starter': 25,
    'laborRate_hipRidge': 25,
    'laborRate_steep8': 5,
    'laborRate_steep10': 10,
    'laborRate_steep12': 20,
    'laborRate_plywood': 30
  };
  
  Object.keys(laborDefaults).forEach(id => {
    const key = id.replace('laborRate_', '');
    const input = document.getElementById(id);
    if (input) {
      input.value = laborRates[key] ?? laborDefaults[id];
    }
  });
  
//Show editor, hide placeholder
  if (editorContainer) editorContainer.style.display = 'block';
  if (placeholder) placeholder.style.display = 'none';
  
  console.log('[PRICING] Editor populated and visible');
}

function savePricingTemplate() {
  if (!window._pricingManufacturer || !window._pricingShingleLine) {
    alert('Please select a manufacturer and model first.');
    return;
  }
  
  const pricingKey = `${window._pricingManufacturer}_${window._pricingShingleLine}`;
  
  const pricing = {
//Materials
    shingles: parseFloat(document.getElementById('price_shingles')?.value) || 0,
    starter: parseFloat(document.getElementById('price_starter')?.value) || 0,
    hipRidge: parseFloat(document.getElementById('price_hipRidge')?.value) || 0,
    underlayment: parseFloat(document.getElementById('price_underlayment')?.value) || 0,
    iceWater: parseFloat(document.getElementById('price_iceWater')?.value) || 0,
    ridgeVent: parseFloat(document.getElementById('price_ridgeVent')?.value) || 0,
    dripEdge: parseFloat(document.getElementById('price_dripEdge')?.value) || 0,
    nails: parseFloat(document.getElementById('price_nails')?.value) || 0,
    sealant: parseFloat(document.getElementById('price_sealant')?.value) || 0,
//Labor
    labor: {
      squares: parseFloat(document.getElementById('laborRate_squares')?.value) || 90,
      starter: parseFloat(document.getElementById('laborRate_starter')?.value) || 25,
      hipRidge: parseFloat(document.getElementById('laborRate_hipRidge')?.value) || 25,
      steep8: parseFloat(document.getElementById('laborRate_steep8')?.value) || 5,
      steep10: parseFloat(document.getElementById('laborRate_steep10')?.value) || 10,
      steep12: parseFloat(document.getElementById('laborRate_steep12')?.value) || 20,
      plywood: parseFloat(document.getElementById('laborRate_plywood')?.value) || 30
    }
  };
  
  const allPricing = loadCustomPricing();
  allPricing[pricingKey] = pricing;
  saveCustomPricing(allPricing);
  
  alert('✅ Pricing saved successfully!');
  console.log('[PRICING] Saved pricing for', pricingKey, pricing);
}

function resetToDefaultPricing() {
  if (!confirm('Reset all prices to default values?')) return;
  
//Reset material prices
  document.querySelectorAll('#pricingEditorBody input[data-default]').forEach(input => {
    input.value = input.dataset.default;
  });
  
//Reset labor rates
  document.querySelectorAll('#laborPricingBody input[data-default]').forEach(input => {
    input.value = input.dataset.default;
  });
  
  console.log('[PRICING] Reset to defaults');
}

// ----------------------------------------
//MATERIALS MANUFACTURER SELECTOR FUNCTIONS
// ----------------------------------------
function showMaterialsManufacturerSelector() {
  const selector = document.getElementById('materialsManufacturerSelector');
  if (selector) {
    selector.style.display = 'block';
    populateMaterialsManufacturerDropdown();
  }
}

function populateMaterialsManufacturerDropdown() {
  const select = document.getElementById('materialsManufacturerSelect');
  if (!select || typeof getManufacturers !== 'function') {
    console.error('[MATERIALS] Cannot populate manufacturer dropdown');
    return;
  }
  
  const manufacturers = getManufacturers();
  select.innerHTML = '<option value="">Select Manufacturer</option>';
  manufacturers.forEach(m => {
    select.innerHTML += `<option value="${m.id}">${m.name}</option>`;
  });
}

function handleMaterialsManufacturerChange() {
  const manufacturerSelect = document.getElementById('materialsManufacturerSelect');
  const shingleLineSelect = document.getElementById('materialsShingleLineSelect');
  const colorSelect = document.getElementById('materialsShingleColorSelect');
  const systemInfo = document.getElementById('materialsSystemInfo');
  const applyBtn = document.getElementById('materialsApplySystemBtn');
  
  const manufacturerId = manufacturerSelect.value;
  
  shingleLineSelect.innerHTML = '<option value="">Select Model</option>';
  if (colorSelect) {
    colorSelect.innerHTML = '<option value="">Select Color</option>';
    colorSelect.disabled = true;
    colorSelect.style.background = '#f1f5f9';
  }
  if (systemInfo) systemInfo.style.display = 'none';
  if (applyBtn) {
    applyBtn.disabled = true;
    applyBtn.style.background = '#cbd5e0';
    applyBtn.style.color = '#64748b';
    applyBtn.style.cursor = 'not-allowed';
  }
  
  if (!manufacturerId) {
    shingleLineSelect.disabled = true;
    shingleLineSelect.style.background = '#f1f5f9';
    return;
  }
  
  const shingleLines = getShingleLines(manufacturerId);
  shingleLines.forEach(line => {
    shingleLineSelect.innerHTML += `<option value="${line.id}">${line.name}</option>`;
  });
  
  shingleLineSelect.disabled = false;
  shingleLineSelect.style.background = 'white';
  window._materialsManufacturer = manufacturerId;
  window._materialsShingleLine = null;
  window._materialsColor = null;
}

function handleMaterialsShingleLineChange() {
  const manufacturerSelect = document.getElementById('materialsManufacturerSelect');
  const shingleLineSelect = document.getElementById('materialsShingleLineSelect');
  const colorSelect = document.getElementById('materialsShingleColorSelect');
  const systemInfo = document.getElementById('materialsSystemInfo');
  const applyBtn = document.getElementById('materialsApplySystemBtn');
  
  const manufacturerId = manufacturerSelect.value;
  const shingleLineId = shingleLineSelect.value;
  
  if (colorSelect) {
    colorSelect.innerHTML = '<option value="">Select Color</option>';
  }
  
  if (!shingleLineId) {
    if (colorSelect) {
      colorSelect.disabled = true;
      colorSelect.style.background = '#f1f5f9';
    }
    if (systemInfo) systemInfo.style.display = 'none';
    if (applyBtn) {
      applyBtn.disabled = true;
      applyBtn.style.background = '#cbd5e0';
      applyBtn.style.color = '#64748b';
      applyBtn.style.cursor = 'not-allowed';
    }
    return;
  }
  
  const colors = getShingleColors(manufacturerId, shingleLineId);
  if (colorSelect) {
    colors.forEach(color => {
      colorSelect.innerHTML += `<option value="${color}">${color}</option>`;
    });
    colorSelect.disabled = false;
    colorSelect.style.background = 'white';
  }
  
  const shingleData = getShingleData(manufacturerId, shingleLineId);
  if (shingleData && systemInfo) {
    const nameEl = document.getElementById('materialsSystemName');
    const windEl = document.getElementById('materialsWindRating');
    const warrantyEl = document.getElementById('materialsWarranty');
    
    if (nameEl) nameEl.textContent = `${shingleData.manufacturer} ${shingleData.name}`;
    if (windEl) windEl.textContent = shingleData.windRating;
    if (warrantyEl) warrantyEl.textContent = shingleData.warranty;
    systemInfo.style.display = 'block';
  }
  
  if (applyBtn) {
    applyBtn.disabled = false;
    applyBtn.style.background = '#0891b2';
    applyBtn.style.color = 'white';
    applyBtn.style.cursor = 'pointer';
  }
  
  window._materialsShingleLine = shingleLineId;
  window._materialsColor = null;
}

function handleMaterialsColorChange() {
  const colorSelect = document.getElementById('materialsShingleColorSelect');
  window._materialsColor = colorSelect?.value || null;
}

function applyMaterialsManufacturerSystem() {
  if (!window._materialsManufacturer || !window._materialsShingleLine) {
    alert('Please select a manufacturer and shingle model first.');
    return;
  }
  
//Use ORIGINAL PDF measurements
  const originalData = window.originalPdfData || {};
  const raw = originalData.raw || window.currentRawMeasurements || {};
  const measurements = originalData.measurements || window.currentMeasurements || {};
  
  const measurementData = {
    squares: parseFloat(raw.roof_sq) || measurements.roofSquares || 0,
    ridgeLength: parseFloat(raw.ridge_length) || measurements.ridgeLength || 0,
    hipLength: parseFloat(raw.hip_length) || measurements.hipLength || 0,
    eaveLength: parseFloat(raw.eave_edge_length) || measurements.eaveLength || 0,
    rakeLength: parseFloat(raw.rake_edge_length) || measurements.rakeLength || 0,
    valleyLength: parseFloat(raw.valley_length) || measurements.valleyLength || 0
  };
  
  console.log('[MATERIALS] Using ORIGINAL measurements:', measurementData);
  
//Calculate materials from manufacturer system
  const systemMaterials = calculateSystemMaterials(window._materialsManufacturer, window._materialsShingleLine, measurementData);
  
//Add color to shingle name if selected
  if (window._materialsColor && systemMaterials.length > 0) {
    systemMaterials[0].name = `${systemMaterials[0].name} - ${window._materialsColor}`;
  }
  
//Items to preserve from original materials (not part of shingle system)
  const preserveItems = [
    'step flashing',
    'l flashing',
    'trim coil',
    'button caps',
    'button cap',
    'plywood',
    'osb',
    'pipe boot',
    'skylight',
    'chimney',
    'vent boot',
    'joint sealant',
    'caulk',
    'collar'
  ];
  
//Get original materials from first PDF upload
  const originalMaterials = window.originalPdfData?.materials || window.lastServerResponse?.materials || [];
  
//Find items to preserve
  const preservedMaterials = originalMaterials.filter(mat => {
    const nameLower = (mat.name || '').toLowerCase();
    return preserveItems.some(item => nameLower.includes(item));
  });
  
//Get names of system materials (lowercase)
  const systemMaterialNames = systemMaterials.map(m => (m.name || '').toLowerCase());
  
//Keep preserved items that aren't already in the system materials
  const uniquePreserved = preservedMaterials.filter(mat => {
    const nameLower = (mat.name || '').toLowerCase();
    
//Check if this exact item (or very similar) is already in system materials
    const isDuplicate = systemMaterialNames.some(sysName => {
//Check for key word overlap
      if (nameLower.includes('shingle') && sysName.includes('shingle')) return true;
      if (nameLower.includes('starter') && sysName.includes('starter')) return true;
      if (nameLower.includes('ridge cap') && sysName.includes('ridge')) return true;
      if (nameLower.includes('hip') && sysName.includes('hip')) return true;
      if (nameLower.includes('underlayment') && sysName.includes('underlayment')) return true;
      if (nameLower.includes('ice & water') && sysName.includes('ice')) return true;
      if (nameLower.includes('ice and water') && sysName.includes('ice')) return true;
      if (nameLower.includes('drip edge') && sysName.includes('drip')) return true;
      if (nameLower.includes('roofing nail') && sysName.includes('nail')) return true;
      if (nameLower.includes('ridge vent') && sysName.includes('ridge vent')) return true;
      if (nameLower.includes('roof sealant') && sysName.includes('sealant')) return true;
      return false;
    });
    
    return !isDuplicate;
  });
  
  console.log('[MATERIALS] Preserved items:', uniquePreserved.map(m => m.name));
  
  const materials = [...systemMaterials, ...uniquePreserved];
  
  console.log('[MATERIALS] System materials:', systemMaterials.length);
  console.log('[MATERIALS] Preserved materials:', uniquePreserved.map(m => m.name));
  console.log('[MATERIALS] Total materials:', materials.length);
  
//Update global materialsData
  window.materialsData = materials;
  
//Refresh display
  if (typeof displayResults === 'function') {
    displayResults({
      materials: materials,
      labor: window.laborData,
      success: true
    });
  }
  
  console.log('[MATERIALS] Applied', materials.length, 'materials');
}

function populateMaterialTemplateSelector() {
  console.log('[MATERIALS] populateMaterialTemplateSelector called');
//Placeholder - no action needed for now
}

// ----------------------------------------
//ADD MATERIAL MODAL FUNCTIONS
// ----------------------------------------
function openAddMaterialModal() {
  const modal = document.getElementById('addMaterialModal');
  if (modal) {
    modal.style.display = 'flex';
    populateManufacturerMaterialOptions();
  }
}

function closeAddMaterialModal() {
  const modal = document.getElementById('addMaterialModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function populateManufacturerMaterialOptions() {
  const select = document.getElementById('addMaterialItem');
  if (!select) return;
  
  select.innerHTML = '<option value="">Select Item...</option>';
  
  const manufacturerId = window._materialsManufacturer;
  const shingleLineId = window._materialsShingleLine;
  
  if (manufacturerId && shingleLineId && typeof getShingleData === 'function') {
    const shingleData = getShingleData(manufacturerId, shingleLineId);
    
    if (shingleData) {
      select.innerHTML += `<option value="${shingleData.name} Shingles" data-unit="Bundle" data-price="${shingleData.pricePerBundle}">${shingleData.name} Shingles</option>`;
      
      const components = shingleData.systemComponents;
      if (components) {
        Object.keys(components).forEach(key => {
          const comp = components[key];
          if (comp && comp.name) {
            select.innerHTML += `<option value="${comp.name}" data-unit="${comp.unit}" data-price="${comp.pricePerUnit}">${comp.name}</option>`;
          }
        });
      }
      
      select.innerHTML += `<option disabled>──────────────</option>`;
    }
  }
  
  select.innerHTML += `<option value="7/16 OSB Plywood" data-unit="Sheet" data-price="15.99">7/16 OSB Plywood</option>`;
  select.innerHTML += `<option value="Step Flashing" data-unit="Bundle" data-price="38.00">Step Flashing</option>`;
  select.innerHTML += `<option value="Pipe Boot 2&quot;" data-unit="Piece" data-price="12.00">Pipe Boot 2"</option>`;
  select.innerHTML += `<option value="Pipe Boot 3&quot;" data-unit="Piece" data-price="14.00">Pipe Boot 3"</option>`;
  select.innerHTML += `<option value="Pipe Boot 4&quot;" data-unit="Piece" data-price="16.00">Pipe Boot 4"</option>`;
  select.innerHTML += `<option disabled>──────────────</option>`;
  select.innerHTML += `<option value="custom">-- Custom Item --</option>`;
}

function populateMaterialDefaults() {
  const select = document.getElementById('addMaterialItem');
  const selectedOption = select.options[select.selectedIndex];
  const customNameDiv = document.getElementById('customMaterialName');
  
  if (select.value === 'custom') {
    if (customNameDiv) customNameDiv.style.display = 'block';
    document.getElementById('addMaterialUnit').value = 'Piece';
    document.getElementById('addMaterialPrice').value = '0.00';
  } else if (select.value) {
    if (customNameDiv) customNameDiv.style.display = 'none';
    document.getElementById('addMaterialUnit').value = selectedOption.dataset.unit || 'Piece';
    document.getElementById('addMaterialPrice').value = parseFloat(selectedOption.dataset.price || 0).toFixed(2);
  } else {
    if (customNameDiv) customNameDiv.style.display = 'none';
  }
}

function addMaterialFromModal() {
  const itemSelect = document.getElementById('addMaterialItem');
  let itemName = itemSelect.value;
  
  if (itemName === 'custom') {
    itemName = document.getElementById('addMaterialCustomName')?.value?.trim();
    if (!itemName) {
      alert('Please enter a custom item name');
      return;
    }
  }
  
  if (!itemName) {
    alert('Please select an item');
    return;
  }
  
  const quantity = parseFloat(document.getElementById('addMaterialQty').value) || 0;
  const unit = document.getElementById('addMaterialUnit').value;
  const unitPrice = parseFloat(document.getElementById('addMaterialPrice').value) || 0;
  
  const newMaterial = {
    name: itemName,
    quantity: quantity,
    unit: unit,
    unitPrice: unitPrice,
    total: quantity * unitPrice
  };
  
  if (!window.materialsData) window.materialsData = [];
  window.materialsData.push(newMaterial);
  
  if (typeof displayResults === 'function') {
    displayResults({
      materials: window.materialsData,
      measurements: window.currentMeasurements || {},
      raw: window.currentRawMeasurements || {},
      labor: window.laborData,
      success: true
    });
  }
  
  closeAddMaterialModal();
}

// ----------------------------------------
//ADD LABOR MODAL FUNCTIONS
// ----------------------------------------
function openAddLaborModal() {
  const modal = document.getElementById('addLaborModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function closeAddLaborModal() {
  const modal = document.getElementById('addLaborModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function populateLaborDefaults() {
  const select = document.getElementById('addLaborItem');
  const selectedOption = select.options[select.selectedIndex];
  const customNameDiv = document.getElementById('customLaborName');
  
  if (select.value === 'custom') {
    if (customNameDiv) customNameDiv.style.display = 'block';
    document.getElementById('addLaborUnit').value = 'EA';
    document.getElementById('addLaborPrice').value = '0.00';
  } else if (select.value) {
    if (customNameDiv) customNameDiv.style.display = 'none';
    document.getElementById('addLaborUnit').value = selectedOption.dataset.unit || 'EA';
    document.getElementById('addLaborPrice').value = parseFloat(selectedOption.dataset.price || 0).toFixed(2);
  } else {
    if (customNameDiv) customNameDiv.style.display = 'none';
  }
}

function addLaborFromModal() {
  const itemSelect = document.getElementById('addLaborItem');
  let itemName = itemSelect.value;
  
  if (itemName === 'custom') {
    itemName = document.getElementById('addLaborCustomName')?.value?.trim();
    if (!itemName) {
      alert('Please enter a custom item name');
      return;
    }
  }
  
  if (!itemName) {
    alert('Please select a labor item');
    return;
  }
  
  const quantity = parseFloat(document.getElementById('addLaborQty').value) || 0;
  const unit = document.getElementById('addLaborUnit').value;
  const unitPrice = parseFloat(document.getElementById('addLaborPrice').value) || 0;
  
  const newLabor = {
    name: itemName,
    quantity: quantity,
    unit: unit,
    unitPrice: unitPrice,
    total: quantity * unitPrice
  };
  
  if (!window.laborData) window.laborData = { items: [] };
  if (!window.laborData.items) window.laborData.items = [];
  window.laborData.items.push(newLabor);
  
  if (typeof displayLaborResults === 'function') {
    displayLaborResults(window.laborData);
  }
  
  closeAddLaborModal();
}

// ----------------------------------------
//PRINT/PDF FUNCTIONS - MATERIALS/LABOR
// ----------------------------------------
function printResults() {
  const pdfDoc = buildMaterialsPDF();
  pdfMake.createPdf(pdfDoc).print();
}

function saveAsPDF() {
  const pdfDoc = buildMaterialsPDF();
  const filename = 'Materials_' + (window.currentRawMeasurements?.address || 'Quote').replace(/[^a-zA-Z0-9]/g, '_') + '.pdf';
  pdfMake.createPdf(pdfDoc).download(filename);
}

function printLabor() {
  const pdfDoc = buildLaborPDF();
  pdfMake.createPdf(pdfDoc).print();
}

function saveLaborPDF() {
  const pdfDoc = buildLaborPDF();
  const filename = 'Labor_' + (window.currentRawMeasurements?.address || 'Invoice').replace(/[^a-zA-Z0-9]/g, '_') + '.pdf';
  pdfMake.createPdf(pdfDoc).download(filename);
}

function buildMaterialsPDF() {
  const raw = window.currentRawMeasurements || {};
  const materials = window.materialsData || [];
  
//Calculate totals
  const subtotal = materials.reduce((sum, item) => sum + (item.total || 0), 0);
  const taxRate = 0.09;
  const tax = subtotal * taxRate;
  const grandTotal = subtotal + tax;
  
//Check for cover photo
  const coverPhoto = window.currentPhotos?.materials?.find(p => p.isCover);
  
//Build materials table
  const tableBody = [
    [
      { text: 'Item', style: 'tableHeader' },
      { text: 'Qty', style: 'tableHeader', alignment: 'center' },
      { text: 'Unit', style: 'tableHeader', alignment: 'center' },
      { text: 'Unit Price', style: 'tableHeader', alignment: 'right' },
      { text: 'Total', style: 'tableHeader', alignment: 'right' }
    ]
  ];
  
  materials.forEach(item => {
    if (item.quantity > 0) {
      tableBody.push([
        item.name,
        { text: String(item.quantity), alignment: 'center' },
        { text: pluralizeUnit(item.unit, item.quantity), alignment: 'center' },
        { text: '$' + (item.unitPrice || 0).toFixed(2), alignment: 'right' },
        { text: '$' + (item.total || 0).toFixed(2), alignment: 'right' }
      ]);
    }
  });
  
  const tableLayout = {
    hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
    vLineWidth: () => 0,
    hLineColor: () => '#E5E7EB',
    paddingLeft: () => 8,
    paddingRight: () => 8,
    paddingTop: () => 6,
    paddingBottom: () => 6
  };
  
//Build totals section
  const totalsStack = [
    {
      columns: [
        { text: 'Subtotal:', width: '*', alignment: 'right' },
        { text: '$' + subtotal.toFixed(2), width: 100, alignment: 'right' }
      ],
      margin: [0, 4, 0, 4]
    },
    {
      columns: [
        { text: 'Tax (9%):', width: '*', alignment: 'right' },
        { text: '$' + tax.toFixed(2), width: 100, alignment: 'right' }
      ],
      margin: [0, 4, 0, 4]
    },
    {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 2, lineColor: '#0891b2' }],
      margin: [0, 8, 0, 8]
    },
    {
      columns: [
        { text: 'TOTAL:', width: '*', alignment: 'right', bold: true, fontSize: 14 },
        { text: '$' + grandTotal.toFixed(2), width: 100, alignment: 'right', bold: true, fontSize: 14, color: '#0891b2' }
      ]
    }
  ];
  
//Build content array
  const content = [];
  
//Add cover page if cover photo exists
  if (coverPhoto && coverPhoto.data) {
    content.push(
      { text: 'MATERIAL LIST', style: 'coverTitle', alignment: 'center', margin: [0, 0, 0, 20] },
      { text: raw.customer_name || raw.customerName || '', style: 'coverCustomer', alignment: 'center', margin: [0, 0, 0, 8] },
      { text: raw.address || '', style: 'coverAddress', alignment: 'center', margin: [0, 0, 0, 8] },
      { text: 'Job #: ' + (raw.order_number || 'N/A'), style: 'coverJob', alignment: 'center', margin: [0, 0, 0, 30] },
      { image: coverPhoto.data, width: 350, alignment: 'center', margin: [0, 0, 0, 0] },
      { text: '', pageBreak: 'after' }
    );
  }
  
//Add main content
  content.push(
    { text: 'MATERIAL LIST', style: 'header' },
    { text: 'Date: ' + new Date().toLocaleDateString(), margin: [0, 8, 0, 20] },
    {
      columns: [
        {
          width: '50%',
          stack: [
            { text: 'JOB INFORMATION:', style: 'label' },
            { text: raw.address || 'Address N/A', style: 'customerName', margin: [0, 4, 0, 0] },
            { text: 'Order #: ' + (raw.order_number || 'N/A'), margin: [0, 4, 0, 0] }
          ]
        },
        {
          width: '50%',
          stack: [
            { text: 'ROOF DETAILS:', style: 'label' },
            { text: 'Size: ' + parseFloat(raw.roof_sq || 0).toFixed(2) + ' squares', margin: [0, 4, 0, 0] },
            { text: 'Ridge: ' + parseFloat(raw.ridge_length || 0).toFixed(2) + ' LF', margin: [0, 4, 0, 0] },
            { text: 'Hip: ' + parseFloat(raw.hip_length || 0).toFixed(2) + ' LF', margin: [0, 4, 0, 0] },
            { text: 'Valley: ' + parseFloat(raw.valley_length || 0).toFixed(2) + ' LF', margin: [0, 4, 0, 0] },
            { text: 'Eave: ' + parseFloat(raw.eave_edge_length || 0).toFixed(2) + ' LF', margin: [0, 4, 0, 0] },
            { text: 'Rake: ' + parseFloat(raw.rake_edge_length || 0).toFixed(2) + ' LF', margin: [0, 4, 0, 0] }
          ]
        }
      ],
      margin: [0, 0, 0, 30]
    },
    { text: 'MATERIALS', style: 'sectionHeader', margin: [0, 0, 0, 12] },
    {
      table: {
        headerRows: 1,
        widths: ['*', 50, 60, 70, 70],
        body: tableBody
      },
      layout: tableLayout,
      margin: [0, 0, 0, 20]
    },
    {
      columns: [
        { width: '*', text: '' },
        { width: 250, stack: totalsStack }
      ]
    }
  );
  
//Add delivery notes if present
  const materialsNotes = document.getElementById('materialsDeliveryNotes')?.value || window.currentJobData?.materialsNotes;
  if (materialsNotes) {
    content.push({ text: 'DELIVERY NOTES', style: 'sectionHeader', margin: [0, 20, 0, 8] });
    content.push({ text: materialsNotes, margin: [0, 0, 0, 20], fontSize: 11 });
  }
  
//Add photos section if there are photos (excluding cover photo from grid)
  const otherPhotos = window.currentPhotos?.materials?.filter(p => !p.isCover) || [];
  if (otherPhotos.length > 0) {
    content.push({
      text: 'PHOTOS',
      style: 'sectionHeader',
      margin: [0, 30, 0, 16],
      pageBreak: 'before'
    });
    
    otherPhotos.forEach((photo, index) => {
//Determine if portrait or landscape based on aspect ratio
//Default to landscape sizing, but use fit to constrain both dimensions
      const photoBlock = {
        stack: [
          {
            image: photo.data,
            fit: [200, 150], // Max width 200, max height 150 - will maintain aspect ratio
            margin: [0, 0, 0, 6]
          }
        ],
        margin: [0, 0, 0, 16]
      };
      
//Add caption if exists
      if (photo.label) {
        photoBlock.stack.push({
          text: photo.label,
          fontSize: 10,
          color: '#334155',
          margin: [0, 0, 0, 0]
        });
      }
      
      content.push(photoBlock);
    });
  }
  
  return {
    pageSize: 'LETTER',
    pageMargins: [72, 72, 72, 72],
    content: content,
    styles: {
      header: { fontSize: 24, bold: true, color: '#0891b2' },
      coverTitle: { fontSize: 32, bold: true, color: '#0891b2' },
      coverCustomer: { fontSize: 18, bold: true },
      coverAddress: { fontSize: 14 },
      coverJob: { fontSize: 12, color: '#64748b' },
      label: { fontSize: 10, bold: true, color: '#64748b' },
      customerName: { fontSize: 14, bold: true },
      sectionHeader: { fontSize: 12, bold: true, color: '#0891b2' },
      tableHeader: { bold: true, fontSize: 9, fillColor: '#f8fafc' },
      terms: { fontSize: 9, color: '#64748b' }
    }
  };
}

function buildLaborPDF() {
  const raw = window.currentRawMeasurements || {};
  const laborData = window.laborData || { items: [] };
  const laborItems = laborData.items || [];
  
//Calculate totals
  const subtotal = laborItems.reduce((sum, item) => sum + (item.total || 0), 0);
  
//Check for cover photo
  const coverPhoto = window.currentPhotos?.labor?.find(p => p.isCover);
  
//Build labor table
  const tableBody = [
    [
      { text: 'Description', style: 'tableHeader' },
      { text: 'Qty', style: 'tableHeader', alignment: 'center' },
      { text: 'Unit', style: 'tableHeader', alignment: 'center' },
      { text: 'Rate', style: 'tableHeader', alignment: 'right' },
      { text: 'Total', style: 'tableHeader', alignment: 'right' }
    ]
  ];
  
  laborItems.forEach(item => {
    if (item.quantity > 0) {
      tableBody.push([
        item.name,
        { text: String(item.quantity), alignment: 'center' },
        { text: item.unit || 'EA', alignment: 'center' },
        { text: '$' + (item.unitPrice || 0).toFixed(2), alignment: 'right' },
        { text: '$' + (item.total || 0).toFixed(2), alignment: 'right' }
      ]);
    }
  });
  
  const tableLayout = {
    hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
    vLineWidth: () => 0,
    hLineColor: () => '#E5E7EB',
    paddingLeft: () => 8,
    paddingRight: () => 8,
    paddingTop: () => 6,
    paddingBottom: () => 6
  };
  
//Build totals section
  const totalsStack = [
    {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 2, lineColor: '#7c3aed' }],
      margin: [0, 8, 0, 8]
    },
    {
      columns: [
        { text: 'LABOR TOTAL:', width: '*', alignment: 'right', bold: true, fontSize: 14 },
        { text: '$' + subtotal.toFixed(2), width: 100, alignment: 'right', bold: true, fontSize: 14, color: '#7c3aed' }
      ]
    }
  ];
  
//Build content array
  const content = [];
  
//Add cover page if cover photo exists
  if (coverPhoto && coverPhoto.data) {
    content.push(
      { text: 'LABOR INVOICE', style: 'coverTitle', alignment: 'center', margin: [0, 0, 0, 20] },
      { text: raw.customer_name || raw.customerName || '', style: 'coverCustomer', alignment: 'center', margin: [0, 0, 0, 8] },
      { text: raw.address || '', style: 'coverAddress', alignment: 'center', margin: [0, 0, 0, 8] },
      { text: 'Job #: ' + (raw.order_number || 'N/A'), style: 'coverJob', alignment: 'center', margin: [0, 0, 0, 30] },
      { image: coverPhoto.data, width: 350, alignment: 'center', margin: [0, 0, 0, 0] },
      { text: '', pageBreak: 'after' }
    );
  }
  
//Add main content
  content.push(
    { text: 'LABOR INVOICE', style: 'header' },
    { text: 'Date: ' + new Date().toLocaleDateString(), margin: [0, 8, 0, 20] },
    {
      columns: [
        {
          width: '50%',
          stack: [
            { text: 'JOB INFORMATION:', style: 'label' },
            { text: raw.address || 'Address N/A', style: 'customerName', margin: [0, 4, 0, 0] },
            { text: 'Order #: ' + (raw.order_number || 'N/A'), margin: [0, 4, 0, 0] }
          ]
        },
        {
          width: '50%',
          stack: [
            { text: 'ROOF DETAILS:', style: 'label' },
            { text: 'Size: ' + parseFloat(raw.roof_sq || 0).toFixed(2) + ' squares', margin: [0, 4, 0, 0] },
            { text: 'Ridge: ' + parseFloat(raw.ridge_length || 0).toFixed(2) + ' LF', margin: [0, 4, 0, 0] },
            { text: 'Hip: ' + parseFloat(raw.hip_length || 0).toFixed(2) + ' LF', margin: [0, 4, 0, 0] },
            { text: 'Valley: ' + parseFloat(raw.valley_length || 0).toFixed(2) + ' LF', margin: [0, 4, 0, 0] },
            { text: 'Eave: ' + parseFloat(raw.eave_edge_length || 0).toFixed(2) + ' LF', margin: [0, 4, 0, 0] },
            { text: 'Rake: ' + parseFloat(raw.rake_edge_length || 0).toFixed(2) + ' LF', margin: [0, 4, 0, 0] }
          ]
        }
      ],
      margin: [0, 0, 0, 30]
    },
    { text: 'LABOR BREAKDOWN', style: 'sectionHeader', margin: [0, 0, 0, 12] },
    {
      table: {
        headerRows: 1,
        widths: ['*', 50, 50, 70, 70],
        body: tableBody
      },
      layout: tableLayout,
      margin: [0, 0, 0, 20]
    },
    {
      columns: [
        { width: '*', text: '' },
        { width: 250, stack: totalsStack }
      ]
    }
  );
  
//Add labor notes if present
  const laborNotes = document.getElementById('laborDeliveryNotes')?.value || window.currentJobData?.laborNotes;
  if (laborNotes) {
    content.push({ text: 'LABOR NOTES', style: 'sectionHeader', margin: [0, 20, 0, 8] });
    content.push({ text: laborNotes, margin: [0, 0, 0, 20], fontSize: 11 });
  }
  
//Add photos section if there are photos (excluding cover photo from grid)
  const otherPhotos = window.currentPhotos?.labor?.filter(p => !p.isCover) || [];
  if (otherPhotos.length > 0) {
    content.push({
      text: 'PHOTOS',
      style: 'sectionHeader',
      margin: [0, 30, 0, 16],
      pageBreak: 'before'
    });
    
    otherPhotos.forEach((photo, index) => {
      const photoBlock = {
        stack: [
          {
            image: photo.data,
            fit: [200, 150],
            margin: [0, 0, 0, 6]
          }
        ],
        margin: [0, 0, 0, 16]
      };
      
      if (photo.label) {
        photoBlock.stack.push({
          text: photo.label,
          fontSize: 10,
          color: '#334155',
          margin: [0, 0, 0, 0]
        });
      }
      
      content.push(photoBlock);
    });
  }
  
  return {
    pageSize: 'LETTER',
    pageMargins: [72, 72, 72, 72],
    content: content,
    styles: {
      header: { fontSize: 24, bold: true, color: '#7c3aed' },
      coverTitle: { fontSize: 32, bold: true, color: '#7c3aed' },
      coverCustomer: { fontSize: 18, bold: true },
      coverAddress: { fontSize: 14 },
      coverJob: { fontSize: 12, color: '#64748b' },
      label: { fontSize: 10, bold: true, color: '#64748b' },
      customerName: { fontSize: 14, bold: true },
      sectionHeader: { fontSize: 12, bold: true, color: '#7c3aed' },
      tableHeader: { bold: true, fontSize: 9, fillColor: '#f8fafc' },
      terms: { fontSize: 9, color: '#64748b' }
    }
  };
}

// ==========================================
// NOTES SAVE FUNCTIONS
// ==========================================

function saveMaterialsNotes() {
  const notes = document.getElementById('materialsDeliveryNotes')?.value || '';
  if (!window.currentJobData) window.currentJobData = {};
  window.currentJobData.materialsNotes = notes;
  console.log('[NOTES] Materials notes saved');
}

function saveLaborNotes() {
  const notes = document.getElementById('laborDeliveryNotes')?.value || '';
  if (!window.currentJobData) window.currentJobData = {};
  window.currentJobData.laborNotes = notes;
  console.log('[NOTES] Labor notes saved');
}


// ========================================== 

// LOSS ITEM HANDLERS 

// ========================================== 


function updateLossItemAndRecalc(rowIndex) {
  if (!window.lossItems) return;
  
  const lossIndex = rowIndex - window.materialsData.length;
  if (!window.lossItems[lossIndex]) return;
  
  // Get current values from inputs
  const row = document.querySelector(`tr[data-row="${rowIndex}"]`);
  if (!row) return;
  
  const qtyInput = row.querySelector('input[data-field="quantity"]');
  const priceInput = row.querySelector('input[data-field="unitPrice"]');
  const totalCell = row.querySelector('.row-total');
  
  const quantity = parseFloat(qtyInput.value) || 0;
  const unitPrice = parseFloat(priceInput.value) || 0;
  const total = quantity * unitPrice;
  
  // Update stored data
  window.lossItems[lossIndex].quantity = quantity;
  window.lossItems[lossIndex].unitPrice = unitPrice;
  window.lossItems[lossIndex].total = total;
  
  // Update display
  if (totalCell) {
    totalCell.textContent = '$' + total.toFixed(2);
  }
  
  // Recalculate grand totals (includes loss items)
  if (typeof recalculateTotals === 'function') {
    recalculateTotals();
  }
  
  console.log('[LOSS] Updated', window.lossItems[lossIndex].name, '→ qty:', quantity, 'price:', unitPrice, 'total:', total);
}

function updateLossItemColor(rowIndex, color) {
  if (window.lossItems) {
    const lossIndex = rowIndex - window.materialsData.length;
    if (window.lossItems[lossIndex]) {
      window.lossItems[lossIndex].color = color;
      console.log('[LOSS] Updated color for', window.lossItems[lossIndex].name, 'to', color);
    }
  }
}

function deleteLossItem(rowIndex) {
  if (!confirm('Delete this loss item?')) return;
  
  const lossIndex = rowIndex - window.materialsData.length;
  if (window.lossItems && window.lossItems[lossIndex]) {
    window.lossItems.splice(lossIndex, 1);
  }
  
//Re-render materials table
  if (window.currentPDFData) {
    window.currentPDFData.supplementItems = window.supplementItems || [];
    displayResults(window.currentPDFData);
  }
}

