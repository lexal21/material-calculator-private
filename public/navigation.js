// ============================================
// NAVIGATION MENU MODULE
// Version: 2026-02-12
// Hamburger menu for QuikBitz modules
// ============================================

console.log('[NAV] Navigation module loaded');

window.currentModule = 'materials-labor'; // Default module

// Initialize navigation when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeNavigation);
} else {
  initializeNavigation();
}

function initializeNavigation() {
  injectNavStyles();
  createNavMenu();
  createModuleContainers();
  hideRetailTabFromMainTabs();
}

function injectNavStyles() {
  if (document.getElementById('navStyles')) return;

  const styles = `
    <style id="navStyles">
      /* Hamburger Button */
      .hamburger-btn {
        position: fixed;
        top: 16px;
        left: 16px;
        z-index: 1000;
        background: #0891b2;
        border: none;
        border-radius: 8px;
        padding: 12px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 5px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        transition: background 0.2s;
      }

      .hamburger-btn:hover {
        background: #0e7490;
      }

      .hamburger-line {
        display: block;
        width: 24px;
        height: 3px;
        background: white;
        border-radius: 2px;
        transition: 0.3s;
      }

      /* Nav Overlay */
      .nav-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 1001;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s, visibility 0.3s;
      }

      .nav-overlay.open {
        opacity: 1;
        visibility: visible;
      }

      /* Nav Menu */
      .nav-menu {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: 280px;
        background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
        z-index: 1002;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        display: flex;
        flex-direction: column;
        box-shadow: 4px 0 20px rgba(0,0,0,0.3);
      }

      .nav-menu.open {
        transform: translateX(0);
      }

      /* Nav Header */
      .nav-header {
        padding: 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }

      .nav-title {
        color: #0891b2;
        font-size: 24px;
        font-weight: 700;
        margin: 0;
      }

      .nav-close-btn {
        background: none;
        border: none;
        color: #94a3b8;
        font-size: 28px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
        transition: color 0.2s;
      }

      .nav-close-btn:hover {
        color: white;
      }

      /* Nav Items */
      .nav-items {
        flex: 1;
        padding: 16px 0;
        overflow-y: auto;
      }

      .nav-item {
        display: flex;
        align-items: center;
        gap: 16px;
        width: 100%;
        padding: 16px 24px;
        background: none;
        border: none;
        color: #cbd5e1;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
      }

      .nav-item:hover {
        background: rgba(255,255,255,0.05);
        color: white;
      }

      .nav-item.active {
        background: rgba(8, 145, 178, 0.2);
        color: #0891b2;
        border-left: 3px solid #0891b2;
      }

      .nav-icon {
        font-size: 20px;
        width: 28px;
        text-align: center;
      }

      .nav-label {
        font-weight: 500;
      }

      /* Nav Footer */
      .nav-footer {
        padding: 16px;
        border-top: 1px solid rgba(255,255,255,0.1);
      }

      .nav-logout-btn {
        display: flex;
        align-items: center;
        gap: 16px;
        width: 100%;
        padding: 14px 24px;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 8px;
        color: #f87171;
        font-size: 15px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .nav-logout-btn:hover {
        background: rgba(239, 68, 68, 0.2);
        color: #fca5a5;
      }

      /* Module Containers */
      .module-container {
        display: none;
        min-height: 100vh;
        box-sizing: border-box;
      }

      .module-container.active {
        display: block;
      }

      /* Coming Soon Pages */
      .coming-soon-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 80vh;
        text-align: center;
        padding: 40px;
      }

      .coming-soon-icon {
        font-size: 72px;
        margin-bottom: 24px;
        opacity: 0.8;
      }

      .coming-soon-title {
        font-size: 32px;
        font-weight: 700;
        color: #1e293b;
        margin: 0 0 8px 0;
      }

      .coming-soon-text {
        font-size: 24px;
        color: #0891b2;
        font-weight: 600;
        margin: 0 0 16px 0;
      }

      .coming-soon-subtext {
        font-size: 16px;
        color: #64748b;
        max-width: 400px;
        margin: 0;
        line-height: 1.6;
      }

      /* Adjust main container for hamburger */
      .container {
        margin-left: 70px;
      }

      /* Hide retail tab from main tabs */
      .tab-btn[onclick="switchTab('retail')"] {
        display: none !important;
      }

      /* Retail Upload Area */
      .retail-upload-area {
        border: 2px dashed #cbd5e0;
        border-radius: 12px;
        padding: 60px 40px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
        background: #f8fafc;
        margin-bottom: 20px;
      }

      .retail-upload-area:hover {
        border-color: #0891b2;
        background: rgba(8, 145, 178, 0.05);
      }

      .retail-upload-area.dragover {
        border-color: #0891b2;
        background: rgba(8, 145, 178, 0.1);
      }

      .retail-upload-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .retail-upload-text {
        font-size: 18px;
        color: #1e293b;
        margin: 0 0 8px 0;
      }

      .retail-upload-subtext {
        font-size: 14px;
        color: #64748b;
        margin: 0;
      }
    </style>
  `;

  document.head.insertAdjacentHTML('beforeend', styles);
}

function createNavMenu() {
  if (document.getElementById('navMenu')) return;

  const navHtml = `
    <button id="hamburgerBtn" class="hamburger-btn" onclick="toggleNavMenu()">
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
    </button>

    <div id="navOverlay" class="nav-overlay" onclick="closeNavMenu()"></div>

    <nav id="navMenu" class="nav-menu">
      <div class="nav-header">
        <h2 class="nav-title">QuikBitz</h2>
        <button class="nav-close-btn" onclick="closeNavMenu()">×</button>
      </div>

      <div class="nav-items">
        <button class="nav-item" data-module="home" onclick="switchModule('home')">
          <span class="nav-icon">🏠</span>
          <span class="nav-label">Home</span>
        </button>
        <button class="nav-item active" data-module="materials-labor" onclick="switchModule('materials-labor')">
          <span class="nav-icon">📦</span>
          <span class="nav-label">Materials / Labor</span>
        </button>
        <button class="nav-item" data-module="retail" onclick="switchModule('retail')">
          <span class="nav-icon">💰</span>
          <span class="nav-label">Retail</span>
        </button>
        <button class="nav-item" data-module="supplement" onclick="switchModule('supplement')">
          <span class="nav-icon">📋</span>
          <span class="nav-label">Supplement</span>
        </button>
        <button class="nav-item" data-module="finance" onclick="switchModule('finance')">
          <span class="nav-icon">📊</span>
          <span class="nav-label">Finance</span>
        </button>
      </div>

      <div class="nav-footer">
        <button class="nav-logout-btn" onclick="handleLogout()">
          <span class="nav-icon">🚪</span>
          <span class="nav-label">Logout</span>
        </button>
      </div>
    </nav>
  `;

  document.body.insertAdjacentHTML('afterbegin', navHtml);
}

function createModuleContainers() {
  if (document.getElementById('moduleHome')) return;

  const modulesHtml = `
    <!-- Home Module - Coming Soon -->
    <div id="moduleHome" class="module-container">
      <div class="coming-soon-wrapper">
        <div class="coming-soon-icon">🏠</div>
        <h2 class="coming-soon-title">Home Dashboard</h2>
        <p class="coming-soon-text">Coming Soon</p>
        <p class="coming-soon-subtext">Your central hub for project overview, recent activity, and quick actions.</p>
      </div>
    </div>

    <!-- Retail Module - Independent -->
    <div id="moduleRetail" class="module-container">
      <div style="max-width: 1200px; margin: 0 auto; padding: 20px 20px 20px 70px;">
        <div class="section">
          <h2>💰 Retail Estimate Generator</h2>
          <p class="pricing-note">Upload a measurement PDF to generate customer-facing retail estimates.</p>

          <!-- Retail PDF Upload Section -->
          <div id="retailUploadSection">
            <div class="retail-upload-area" id="retailDropZone">
              <div class="retail-upload-icon">📄</div>
              <p class="retail-upload-text">Drag & drop your measurement PDF here</p>
              <p class="retail-upload-subtext">or click to browse</p>
              <input type="file" id="retailPdfInput" accept=".pdf" style="display:none;" onchange="handleRetailPdfUpload(event)">
            </div>
          </div>

          <!-- Retail Results Section (hidden until PDF uploaded) -->
          <div id="retailResultsSection" style="display:none;">
            <!-- Project Info Bar -->
            <div style="background:#0891b2;color:white;padding:12px 20px;border-radius:8px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <strong id="retailProjectName">Project</strong>
                <span style="opacity:0.8;margin-left:12px;" id="retailProjectAddress"></span>
              </div>
              <button onclick="clearRetailProject()" style="background:rgba(255,255,255,0.2);border:none;color:white;padding:8px 16px;border-radius:4px;cursor:pointer;">New Project</button>
            </div>

            <!-- View Toggle -->
            <div style="background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); color: white; padding: 16px 24px; border-radius: 8px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="font-size: 16px;">View Mode</strong>
                <p style="font-size: 13px; opacity: 0.9; margin: 4px 0 0 0;">Toggle to preview what the customer will see</p>
              </div>
              <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                <span style="font-size: 14px;">Internal</span>
                <div style="position: relative; width: 50px; height: 26px;">
                  <input type="checkbox" id="retailViewToggle" onchange="toggleRetailView(this.checked ? 'customer' : 'internal')" style="opacity: 0; width: 100%; height: 100%; position: absolute; cursor: pointer; z-index: 2;">
                  <div style="position: absolute; inset: 0; background: rgba(255,255,255,0.3); border-radius: 13px; transition: 0.3s;"></div>
                  <div id="retailToggleKnob" style="position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; background: white; border-radius: 50%; transition: 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
                </div>
                <span style="font-size: 14px;">Customer</span>
              </label>
            </div>

            <!-- Customer Info Summary -->
            <div class="customer-info" style="margin-bottom: 24px;">
              <div class="info-item">
                <div class="info-label">Customer</div>
                <div class="info-value" id="retailCustomerName">-</div>
              </div>
              <div class="info-item">
                <div class="info-label">Job Address</div>
                <div class="info-value" id="retailJobAddress">-</div>
              </div>
              <div class="info-item">
                <div class="info-label">Job Number</div>
                <div class="info-value" id="retailJobNumber">-</div>
              </div>
              <div class="info-item">
                <div class="info-label">Roof Size</div>
                <div class="info-value" id="retailSquares">-</div>
              </div>
              <div class="info-item">
                <div class="info-label">Shingle Color</div>
                <div class="info-value" id="retailShingleColor">-</div>
              </div>
            </div>

            <!-- Line Items Table -->
            <div style="margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="margin: 0; font-size: 14px; text-transform: uppercase; color: #64748b;">Line Items</h3>
                <div class="retail-internal-only">
                  <button class="btn-secondary btn-sm" onclick="addRetailLineItem()">+ Add Item</button>
                  <button class="btn-secondary btn-sm" onclick="refreshRetailFromSource()" style="margin-left: 8px;">↻ Reload from PDF</button>
                </div>
              </div>

              <table class="materials-table">
                <thead>
                  <tr class="retail-internal-only">
                    <th style="width:100px;">Category</th>
                    <th>Description</th>
                    <th style="text-align:right;width:140px;white-space:nowrap;">Qty</th>
                    <th style="text-align:right;width:110px;white-space:nowrap;">Unit Cost</th>
                    <th style="text-align:right;width:80px;white-space:nowrap;">Markup</th>
                    <th style="text-align:right;width:100px;">Total</th>
                    <th style="width:40px;"></th>
                  </tr>
                  <tr class="retail-customer-header" style="display: none;">
                    <th>Description</th>
                    <th style="text-align: center;">Quantity</th>
                  </tr>
                </thead>
                <tbody id="retailLineItemsTable"></tbody>
              </table>
            </div>

            <!-- Fees Section (Internal Only) -->
            <div class="retail-internal-only" style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="margin: 0; font-size: 14px; text-transform: uppercase; color: #64748b;">Additional Fees</h3>
                <button class="btn-secondary btn-sm" onclick="addRetailFee()">+ Add Fee</button>
              </div>
              <table class="materials-table" style="margin-bottom: 0;">
                <thead>
                  <tr>
                    <th>Fee Description</th>
                    <th style="width: 120px;">Type</th>
                    <th style="width: 100px;">Value</th>
                    <th style="text-align: right; width: 100px;">Amount</th>
                  </tr>
                </thead>
                <tbody id="retailFeesTable"></tbody>
              </table>
            </div>

            <!-- Tax Settings (Internal Only) -->
            <div class="retail-internal-only" style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; color: #64748b;">Tax Settings</h3>
              <div style="display: flex; gap: 24px; align-items: center;">
                <div>
                  <label style="display: block; font-size: 12px; color: #64748b; margin-bottom: 4px;">Tax Rate %</label>
                  <input type="number" id="retailTaxRate" value="9" min="0" max="15" step="0.1" onchange="updateRetailTax('rate', this.value)" style="width: 80px; padding: 8px; border: 1px solid #cbd5e0; border-radius: 4px;">
                </div>
                <div>
                  <label style="display: block; font-size: 12px; color: #64748b; margin-bottom: 4px;">Apply Tax To</label>
                  <select id="retailTaxApplyTo" onchange="updateRetailTax('applyTo', this.value)" style="padding: 8px; border: 1px solid #cbd5e0; border-radius: 4px;">
                    <option value="materials">Materials Only</option>
                    <option value="all">All (Materials + Labor + Fees)</option>
                    <option value="none">No Tax</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Totals -->
            <div class="totals-section">
              <table class="totals-table">
                <tbody>
                  <tr class="subtotal-row">
                    <td colspan="2"><strong>SUBTOTAL</strong></td>
                    <td id="retailSubtotal" style="text-align: right;"><strong>$0.00</strong></td>
                  </tr>
                  <tr class="retail-internal-only">
                    <td colspan="2">Fees</td>
                    <td id="retailFeesTotal" style="text-align: right;">$0.00</td>
                  </tr>
                  <tr>
                    <td colspan="2">Tax</td>
                    <td id="retailTaxAmount" style="text-align: right;">$0.00</td>
                  </tr>
                  <tr class="grand-total-row">
                    <td colspan="2"><strong style="font-size: 1.2em;">ESTIMATE TOTAL</strong></td>
                    <td id="retailGrandTotal" style="text-align: right; font-size: 1.2em; color: #2B7BA3;"><strong>$0.00</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Actions -->
            <div class="actions">
              <button class="btn-secondary" onclick="toggleRetailView()">
                <span id="retailToggleBtn">Switch to Customer View</span>
              </button>
              <button class="btn-primary" onclick="printRetailEstimate()">Print Estimate</button>
              <button class="btn-primary" onclick="saveRetailEstimate()">Save as PDF</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Supplement Module - Coming Soon -->
    <div id="moduleSupplement" class="module-container">
      <div class="coming-soon-wrapper">
        <div class="coming-soon-icon">📋</div>
        <h2 class="coming-soon-title">Supplements</h2>
        <p class="coming-soon-text">Coming Soon</p>
        <p class="coming-soon-subtext">Track insurance supplements, depreciation recovery, and claim documentation.</p>
      </div>
    </div>

    <!-- Finance Module - Coming Soon -->
    <div id="moduleFinance" class="module-container">
      <div class="coming-soon-wrapper">
        <div class="coming-soon-icon">📊</div>
        <h2 class="coming-soon-title">Finance</h2>
        <p class="coming-soon-text">Coming Soon</p>
        <p class="coming-soon-subtext">Job P&L tracking, margin analysis, and financial reporting.</p>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modulesHtml);

  // Set up retail drop zone
  setTimeout(setupRetailDropZone, 100);
}

function hideRetailTabFromMainTabs() {
  const retailTabBtn = document.querySelector('.tab-btn[onclick="switchTab(\'retail\')"]');
  if (retailTabBtn) {
    retailTabBtn.style.display = 'none';
  }
}

function toggleNavMenu() {
  const menu = document.getElementById('navMenu');
  const overlay = document.getElementById('navOverlay');
  menu.classList.toggle('open');
  overlay.classList.toggle('open');
}

function closeNavMenu() {
  const menu = document.getElementById('navMenu');
  const overlay = document.getElementById('navOverlay');
  menu.classList.remove('open');
  overlay.classList.remove('open');
}

function switchModule(moduleName) {
  window.currentModule = moduleName;

  // Update active state in nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.module === moduleName) {
      item.classList.add('active');
    }
  });

  // Hide all modules
  const mainContainer = document.querySelector('.container');
  document.querySelectorAll('.module-container').forEach(m => m.style.display = 'none');

  // Show selected module
  switch(moduleName) {
    case 'home':
      if (mainContainer) mainContainer.style.display = 'none';
      document.getElementById('moduleHome').style.display = 'block';
      break;
    case 'materials-labor':
      if (mainContainer) mainContainer.style.display = 'block';
      break;
    case 'retail':
      if (mainContainer) mainContainer.style.display = 'none';
      document.getElementById('moduleRetail').style.display = 'block';
      break;
    case 'supplement':
      if (mainContainer) mainContainer.style.display = 'none';
      document.getElementById('moduleSupplement').style.display = 'block';
      break;
    case 'finance':
      if (mainContainer) mainContainer.style.display = 'none';
      document.getElementById('moduleFinance').style.display = 'block';
      break;
  }

  closeNavMenu();
}

function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    if (typeof logout === 'function') {
      logout();
    } else {
      window.location.reload();
    }
  }
}

// ============================================
// RETAIL MODULE - Independent PDF Handling
// ============================================

window.retailModuleData = {
  pdfUploaded: false,
  rawMeasurements: null,
  parsedData: null
};

function setupRetailDropZone() {
  const dropZone = document.getElementById('retailDropZone');
  if (!dropZone) return;

  dropZone.addEventListener('click', () => {
    document.getElementById('retailPdfInput').click();
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      processRetailPdf(files[0]);
    }
  });
}

// Load PDF.js library dynamically
function loadPdfJs() {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof pdfjsLib !== 'undefined') {
      resolve();
      return;
    }

    // Check if script tag already exists
    if (document.querySelector('script[src*="pdf.min.js"]')) {
      // Wait for it to load
      const checkLoaded = setInterval(() => {
        if (typeof pdfjsLib !== 'undefined') {
          clearInterval(checkLoaded);
          resolve();
        }
      }, 100);
      return;
    }

    // Load the script
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(script);
  });
}

function handleRetailPdfUpload(event) {
  const file = event.target.files[0];
  if (file && file.type === 'application/pdf') {
    processRetailPdf(file);
  }
}

async function processRetailPdf(file) {
  console.log('[RETAIL] Processing PDF:', file.name);

  const uploadSection = document.getElementById('retailUploadSection');
  const resultsSection = document.getElementById('retailResultsSection');

  // Show loading
  uploadSection.innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <div style="border: 4px solid #f3f3f3; border-top: 4px solid #0891b2; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
      <p style="color: #64748b; font-size: 16px;">Processing PDF...</p>
    </div>
    <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
  `;

  try {
    // Check if pdfjsLib is available
    if (typeof pdfjsLib === 'undefined') {
      // Load PDF.js dynamically if not available
      await loadPdfJs();
    }

    // Use client-side PDF parsing
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + ' ';
    }

    console.log('[RETAIL] PDF text extracted, length:', fullText.length);

    // Parse the text using existing parseRoofData function if available, or custom parser
    let result;
    if (typeof parseRoofData === 'function') {
      result = parseRoofData(fullText);
    } else {
      result = parseRetailPdfText(fullText);
    }

    // Store data separately for retail module
    window.retailModuleData.pdfUploaded = true;
    window.retailModuleData.parsedData = result;
    window.retailModuleData.rawMeasurements = result.rawMeasurements || result.measurements;
    window.retailModuleData.fullText = fullText;

    // Initialize retail estimate from parsed data
    initializeRetailFromParsedData(result);

    // Show results
    uploadSection.style.display = 'none';
    resultsSection.style.display = 'block';

    // Update project bar
    const projectName = result.customerInfo?.name || result.customer_name || '';
    const projectAddress = result.customerInfo?.address || result.job_address || '';
    document.getElementById('retailProjectName').textContent = projectName || 'Project';
    document.getElementById('retailProjectAddress').textContent = projectAddress;

  } catch (error) {
    console.error('[RETAIL] Error:', error);

    // Reset upload area with error message
    uploadSection.innerHTML = `
      <div class="retail-upload-area" id="retailDropZone">
        <div class="retail-upload-icon">❌</div>
        <p class="retail-upload-text">Error processing PDF</p>
        <p class="retail-upload-subtext">${error.message || 'Please try again or use a different file'}</p>
        <input type="file" id="retailPdfInput" accept=".pdf" style="display:none;" onchange="handleRetailPdfUpload(event)">
      </div>
    `;
    setupRetailDropZone();
  }
}

// Fallback parser for retail PDF if parseRoofData is not available
function parseRetailPdfText(text) {
  const result = {
    measurements: {},
    materials: [],
    labor: [],
    customerInfo: {},
    rawMeasurements: {}
  };

  // Extract customer/address info
  const addressMatch = text.match(/(\d+\s+[A-Za-z0-9\s]+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Ct|Court|Way|Blvd|Circle|Cir)[^,]*,?\s*[A-Za-z\s]+,?\s*[A-Z]{2}\s*\d{5})/i);
  if (addressMatch) {
    result.customerInfo.address = addressMatch[1].trim();
    result.job_address = addressMatch[1].trim();
  }

  // Extract roof squares - look for common patterns
  const sqPatterns = [
    /Total\s*(?:Roof)?\s*Area[:\s]+(\d+\.?\d*)\s*sq/i,
    /Roof\s*Squares?[:\s]+(\d+\.?\d*)/i,
    /(\d+\.?\d*)\s*squares?\s*(?:total|roof)/i,
    /Total[:\s]+(\d+\.?\d*)\s*sq/i
  ];

  for (const pattern of sqPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.measurements.squares = parseFloat(match[1]);
      result.rawMeasurements.roof_sq = parseFloat(match[1]);
      break;
    }
  }

  // Extract pitch
  const pitchMatch = text.match(/(?:Pitch|Slope)[:\s]+(\d+)\/12/i);
  if (pitchMatch) {
    result.measurements.pitch = pitchMatch[1] + '/12';
    result.rawMeasurements.pitch = pitchMatch[1];
  }

  // Extract ridges
  const ridgeMatch = text.match(/Ridge[s]?[:\s]+(\d+\.?\d*)\s*(?:ft|feet|LF)?/i);
  if (ridgeMatch) {
    result.measurements.ridgeLength = parseFloat(ridgeMatch[1]);
    result.rawMeasurements.ridge_length = parseFloat(ridgeMatch[1]);
  }

  // Extract hips
  const hipMatch = text.match(/Hip[s]?[:\s]+(\d+\.?\d*)\s*(?:ft|feet|LF)?/i);
  if (hipMatch) {
    result.measurements.hipLength = parseFloat(hipMatch[1]);
    result.rawMeasurements.hip_length = parseFloat(hipMatch[1]);
  }

  // Extract valleys
  const valleyMatch = text.match(/Valley[s]?[:\s]+(\d+\.?\d*)\s*(?:ft|feet|LF)?/i);
  if (valleyMatch) {
    result.measurements.valleyLength = parseFloat(valleyMatch[1]);
    result.rawMeasurements.valley_length = parseFloat(valleyMatch[1]);
  }

  // Extract eaves/drip edge
  const eavesMatch = text.match(/(?:Eaves?|Drip\s*Edge)[:\s]+(\d+\.?\d*)\s*(?:ft|feet|LF)?/i);
  if (eavesMatch) {
    result.measurements.eavesLength = parseFloat(eavesMatch[1]);
    result.rawMeasurements.eaves_length = parseFloat(eavesMatch[1]);
  }

  console.log('[RETAIL] Parsed measurements:', result.measurements);
  return result;
}

function initializeRetailFromParsedData(data) {
  const lineItems = [];

  // Add materials from parsed data
  if (data.materials && Array.isArray(data.materials)) {
    data.materials.forEach((mat, idx) => {
      if (mat.quantity > 0) {
        lineItems.push({
          id: 'mat-' + idx,
          category: 'Materials',
          description: mat.name || mat.description,
          quantity: mat.quantity,
          unit: mat.unit || 'EA',
          unitCost: mat.unitPrice || mat.price || 0,
          markup: 0
        });
      }
    });
  }

  // Add labor from parsed data
  if (data.labor && Array.isArray(data.labor)) {
    data.labor.forEach((lab, idx) => {
      if (lab.quantity > 0) {
        lineItems.push({
          id: 'labor-' + idx,
          category: 'Labor',
          description: lab.name || lab.description,
          quantity: lab.quantity,
          unit: lab.unit || 'SQ',
          unitCost: lab.unitPrice || lab.price || 0,
          markup: 0
        });
      }
    });
  }

  // Get measurements
  const measurements = data.measurements || data.rawMeasurements || {};
  const squares = parseFloat(measurements.roof_sq || measurements.squares || measurements.roofSquares) || 0;

  // Create retail data object (separate from materials/labor module)
  window.retailData = {
    customerName: data.customerInfo?.name || data.customer_name || '',
    jobAddress: data.customerInfo?.address || data.job_address || '',
    jobNumber: data.customerInfo?.jobNumber || data.job_number || '',
    shingleColor: data.customerInfo?.shingleColor || data.shingle_color || 'TBD',
    measurements: { squares: squares },
    lineItems: lineItems,
    fees: [
      { id: 'overhead', description: 'Overhead', type: 'percent', value: 10, enabled: true, calculated: 0 },
      { id: 'profit', description: 'Profit', type: 'percent', value: 10, enabled: true, calculated: 0 },
      { id: 'permit', description: 'Permit Fee', type: 'flat', value: 0, enabled: false, calculated: 0 },
      { id: 'dumpster', description: 'Dumpster/Disposal', type: 'flat', value: 0, enabled: false, calculated: 0 }
    ],
    tax: { rate: 9, applyTo: 'materials' },
    createdAt: new Date().toISOString()
  };

  // Reset view mode
  window.retailViewMode = 'internal';

  // Display the estimate
  if (typeof displayRetailEstimate === 'function') {
    displayRetailEstimate();
  }
}

function clearRetailProject() {
  if (!confirm('Start a new retail project? Current data will be cleared.')) return;

  // Clear retail-specific data
  window.retailModuleData = { pdfUploaded: false, rawMeasurements: null, parsedData: null };
  window.retailData = null;
  window.retailViewMode = 'internal';

  // Reset UI
  const uploadSection = document.getElementById('retailUploadSection');
  const resultsSection = document.getElementById('retailResultsSection');

  uploadSection.innerHTML = `
    <div class="retail-upload-area" id="retailDropZone">
      <div class="retail-upload-icon">📄</div>
      <p class="retail-upload-text">Drag & drop your measurement PDF here</p>
      <p class="retail-upload-subtext">or click to browse</p>
      <input type="file" id="retailPdfInput" accept=".pdf" style="display:none;" onchange="handleRetailPdfUpload(event)">
    </div>
  `;

  uploadSection.style.display = 'block';
  resultsSection.style.display = 'none';

  // Reset toggle
  const toggle = document.getElementById('retailViewToggle');
  if (toggle) toggle.checked = false;
  const toggleBtn = document.getElementById('retailToggleBtn');
  if (toggleBtn) toggleBtn.textContent = 'Switch to Customer View';

  setupRetailDropZone();
}

// Override refreshRetailFromSource to use retail module's own data
function refreshRetailFromSource() {
  if (!window.retailModuleData.parsedData) {
    alert('No PDF data available. Please upload a PDF first.');
    return;
  }
  if (!confirm('Reload all items from PDF? Custom items will be lost.')) return;
  initializeRetailFromParsedData(window.retailModuleData.parsedData);
}
