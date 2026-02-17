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

  // Restore last active module
  const savedModule = localStorage.getItem('quikbitz-current-module');
  if (savedModule && savedModule !== 'materials-labor') {
    setTimeout(() => {
      // If retail module, try to restore saved estimate
      if (savedModule === 'retail' && loadRetailFromStorage()) {
        const uploadSection = document.getElementById('retailUploadSection');
        const resultsSection = document.getElementById('retailResultsSection');
        if (uploadSection) uploadSection.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'block';

        // Update project bar
        document.getElementById('retailProjectName').textContent = window.retailData.customerName || 'Project';
        document.getElementById('retailProjectAddress').textContent = window.retailData.jobAddress || '';

        // Display the estimate
        if (typeof displayRetailEstimate === 'function') {
          displayRetailEstimate();
        }
      }
      switchModule(savedModule);
    }, 100);
  }
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
            <div style="text-align: center; margin-top: 20px;">
              <p style="color: #64748b; margin-bottom: 12px;">— OR —</p>
              <button onclick="startBlankEstimate()" style="background: #0891b2; color: white; border: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; cursor: pointer; transition: background 0.2s;">
                Start Blank Estimate
              </button>
              <p style="color: #94a3b8; font-size: 13px; margin-top: 8px;">For repairs and custom jobs without a roof report</p>
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

            <!-- Retail Tab Navigation -->
            <div class="retail-tabs" style="display: flex; gap: 0; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0;">
              <button class="retail-tab-btn active" data-retail-tab="retailEstimate" onclick="switchRetailTab('retailEstimate')" style="padding: 12px 24px; background: none; border: none; border-bottom: 3px solid #0891b2; color: #0891b2; font-weight: 600; cursor: pointer; font-size: 15px;">Estimate</button>
              <button class="retail-tab-btn" data-retail-tab="retailPricing" onclick="switchRetailTab('retailPricing')" style="padding: 12px 24px; background: none; border: none; border-bottom: 3px solid transparent; color: #64748b; font-weight: 500; cursor: pointer; font-size: 15px;">Pricing</button>
            </div>

            <!-- Estimate Tab Content -->
            <div id="retailEstimateTab" class="retail-tab-content" style="display: block;">
              
            <!-- Manufacturer Selection -->
            <div id="retailManufacturerSelector" style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #334155;">Select Roofing System</h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
                <div>
                  <label style="display: block; font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 4px; text-transform: uppercase;">Manufacturer</label>
                  <select id="retailManufacturerSelect" onchange="handleRetailManufacturerChange()" style="width: 100%; padding: 8px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 14px;">
                    <option value="">Select Manufacturer</option>
                  </select>
                </div>
                <div>
                  <label style="display: block; font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 4px; text-transform: uppercase;">Shingle Model</label>
                  <select id="retailShingleLineSelect" onchange="handleRetailShingleLineChange()" disabled style="width: 100%; padding: 8px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 14px; background: #f1f5f9;">
                    <option value="">Select Model</option>
                  </select>
                </div>
                <div>
                  <label style="display: block; font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 4px; text-transform: uppercase;">Shingle Color</label>
                  <select id="retailShingleColorSelect" onchange="handleRetailColorChange()" disabled style="width: 100%; padding: 8px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 14px; background: #f1f5f9;">
                    <option value="">Select Color</option>
                  </select>
                </div>
              </div>
              <div id="retailSystemInfo" style="display: none; margin-top: 12px; padding: 12px; background: linear-gradient(135deg, #0891b2, #0e7490); color: white; border-radius: 6px;">
                <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                  <span id="retailSystemName" style="font-weight: 600;"></span>
                  <span><span id="retailWindRating"></span> mph | <span id="retailWarranty"></span></span>
                </div>
              </div>
              <button id="retailApplySystemBtn" onclick="applyRetailManufacturerSystem()" disabled style="margin-top: 12px; padding: 10px 20px; background: #cbd5e0; color: #64748b; border: none; border-radius: 6px; cursor: not-allowed; font-weight: 600;">
                Apply System to Materials
              </button>
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

            <!-- Customer Info Summary - Editable -->
            <div class="customer-info" style="margin-bottom: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
              <div class="info-item">
                <label class="info-label" style="display: block; font-size: 12px; color: #64748b; margin-bottom: 4px;">Customer</label>
                <input type="text" id="retailCustomerName" class="editable-input" style="width: 100%; padding: 8px; border: 1px solid #cbd5e0; border-radius: 4px;" onchange="updateRetailCustomerInfo('customerName', this.value)">
              </div>
              <div class="info-item">
                <label class="info-label" style="display: block; font-size: 12px; color: #64748b; margin-bottom: 4px;">Job Address</label>
                <input type="text" id="retailJobAddress" class="editable-input" style="width: 100%; padding: 8px; border: 1px solid #cbd5e0; border-radius: 4px;" onchange="updateRetailCustomerInfo('jobAddress', this.value)">
              </div>
              <div class="info-item">
                <label class="info-label" style="display: block; font-size: 12px; color: #64748b; margin-bottom: 4px;">Job Number</label>
                <input type="text" id="retailJobNumber" class="editable-input" style="width: 100%; padding: 8px; border: 1px solid #cbd5e0; border-radius: 4px;" onchange="updateRetailCustomerInfo('jobNumber', this.value)">
              </div>
              <div class="info-item">
                <label class="info-label" style="display: block; font-size: 12px; color: #64748b; margin-bottom: 4px;">Roof Size (SQ)</label>
                <input type="number" id="retailSquares" class="editable-input" style="width: 100%; padding: 8px; border: 1px solid #cbd5e0; border-radius: 4px;" step="0.1" onchange="updateRetailCustomerInfo('squares', this.value)">
              </div>
              <div class="info-item">
                <label class="info-label" style="display: block; font-size: 12px; color: #64748b; margin-bottom: 4px;">Shingle Color</label>
                <select id="retailShingleColor" class="editable-input" style="width: 100%; padding: 8px; border: 1px solid #cbd5e0; border-radius: 4px;" onchange="updateRetailCustomerInfo('shingleColor', this.value)">
                  <option value="">Select Color</option>
                  <option value="Burnt Sienna">Burnt Sienna</option>
                  <option value="Charcoal Black">Charcoal Black</option>
                  <option value="Coastal Blue">Coastal Blue</option>
                  <option value="Cobblestone Gray">Cobblestone Gray</option>
                  <option value="Colonial Slate">Colonial Slate</option>
                  <option value="Driftwood">Driftwood</option>
                  <option value="Espresso">Espresso</option>
                  <option value="Georgetown Gray">Georgetown Gray</option>
                  <option value="Heather Blend">Heather Blend</option>
                  <option value="Moire Black">Moire Black</option>
                  <option value="Mojave Tan">Mojave Tan</option>
                  <option value="Pewter">Pewter</option>
                  <option value="Red Oak">Red Oak</option>
                  <option value="Resawn Shake">Resawn Shake</option>
                  <option value="Shenandoah">Shenandoah</option>
                  <option value="Silver Birch">Silver Birch</option>
                  <option value="Weathered Wood">Weathered Wood</option>
                </select>
              </div>
            </div>

            <!-- Materials Section -->
            <div style="background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 24px; overflow: hidden;">
              <div style="background: linear-gradient(135deg, #0891b2, #0e7490); color: white; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Materials</h3>
                  <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Roofing materials and supplies</p>
                </div>
                <div class="retail-internal-only">
                  <button class="btn-secondary btn-sm" onclick="addRetailLineItem('Materials')" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer;">+ Add Material</button>
                </div>
              </div>
              <table class="materials-table" style="width: 100%; table-layout: fixed; margin: 0;">
                <thead>
                  <tr class="retail-internal-only">
                    <th style="width: 5%;"></th>
                    <th style="width: 30%;">Description</th>
                    <th style="text-align: right; width: 10%;">Qty</th>
                    <th style="text-align: center; width: 10%;">Unit</th>
                    <th style="text-align: right; width: 15%;" class="retail-internal-only">Unit Cost</th>
                    <th style="text-align: center; width: 10%;" class="retail-internal-only">Markup</th>
                    <th style="text-align: right; width: 15%;">Total</th>
                    <th style="width: 5%;" class="retail-internal-only"></th>
                  </tr>
                  <tr class="retail-customer-header" style="display: none;">
                    <th>Description</th>
                    <th style="text-align: center;">Quantity</th>
                  </tr>
                </thead>
                <tbody id="retailMaterialsTable"></tbody>
                <tfoot>
                  <tr style="background: #f8fafc; font-weight: 600;">
                    <td colspan="6" style="padding: 12px 16px; text-align: right;">Materials Subtotal:</td>
                    <td id="retailMaterialsSubtotal" style="padding: 12px 16px; text-align: right;">$0.00</td>
                    <td class="retail-internal-only"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Materials Notes Section -->
            <div id="retailMaterialsNotesSection" style="margin: 16px 0; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
              <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #334155;">Materials Notes</h4>
              <textarea id="retailMaterialsNotes" placeholder="Enter notes about materials..." style="width: 100%; min-height: 80px; padding: 12px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px; resize: vertical; box-sizing: border-box;" onchange="saveRetailNotes()"></textarea>
            </div>

            <!-- Labor Section -->
            <div style="background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 24px; overflow: hidden;">
              <div style="background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Labor</h3>
                  <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Installation and labor charges</p>
                </div>
                <div class="retail-internal-only">
                  <button class="btn-secondary btn-sm" onclick="addRetailLineItem('Labor')" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer;">+ Add Labor</button>
                </div>
              </div>
              <table class="materials-table" style="width: 100%; table-layout: fixed; margin: 0;">
                <thead>
                  <tr class="retail-internal-only">
                    <th style="width: 5%;"></th>
                    <th style="width: 30%;">Description</th>
                    <th style="text-align: right; width: 10%;">Qty</th>
                    <th style="text-align: center; width: 10%;">Unit</th>
                    <th style="text-align: right; width: 15%;" class="retail-internal-only">Unit Cost</th>
                    <th style="text-align: center; width: 10%;" class="retail-internal-only">Markup</th>
                    <th style="text-align: right; width: 15%;">Total</th>
                    <th style="width: 5%;" class="retail-internal-only"></th>
                  </tr>
                  <tr class="retail-customer-header" style="display: none;">
                    <th>Description</th>
                    <th style="text-align: center;">Quantity</th>
                  </tr>
                </thead>
                <tbody id="retailLaborTable"></tbody>
                <tfoot>
                  <tr style="background: #f8fafc; font-weight: 600;">
                    <td colspan="6" style="padding: 12px 16px; text-align: right;">Labor Subtotal:</td>
                    <td id="retailLaborSubtotal" style="padding: 12px 16px; text-align: right;">$0.00</td>
                    <td class="retail-internal-only"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Labor Notes Section -->
            <div id="retailLaborNotesSection" style="margin: 16px 0; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
              <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #334155;">Labor Notes</h4>
              <textarea id="retailLaborNotes" placeholder="Enter notes about labor..." style="width: 100%; min-height: 80px; padding: 12px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px; resize: vertical; box-sizing: border-box;" onchange="saveRetailNotes()"></textarea>
            </div>

            <!-- Reload Button -->
            <div class="retail-internal-only" style="margin-bottom: 24px;">
              <button class="btn-secondary btn-sm" onclick="refreshRetailFromSource()" style="margin-right: 8px;">↻ Reload from PDF</button>
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

            <!-- Retail Photo Section -->
            <div id="retailPhotoSection" class="photo-section no-print" style="margin-top: 24px; display: none;">
              <h3 style="margin-bottom: 12px;">Photos (<span id="retailPhotoCount">0</span>)</h3>
              <div style="margin-bottom: 12px;">
                <input type="file" id="retailPhotoInput" accept="image/*" multiple onchange="handleRetailPhotos(event)" style="display: none;">
                <button class="btn-secondary btn-sm" onclick="document.getElementById('retailPhotoInput').click()">
                  + Upload Photos
                </button>
                <button class="btn-primary btn-sm" onclick="openCompanyCamModal('retail')" style="background: #0891b2;">
                  &#128247; Import from CompanyCam
                </button>
                <button class="btn-danger btn-sm" id="deleteRetailPhotosBtn" onclick="deleteSelectedPhotos('retail')" disabled>
                  Delete Selected
                </button>
              </div>
              <div id="retailPhotoGrid" class="photo-grid"></div>
            </div>
            </div>
            
            <!-- Pricing Tab Content -->
            <div id="retailPricingTab" class="retail-tab-content" style="display: none; padding: 0;">
              <h2 style="margin: 0 0 8px 0; color: #1e293b;">Custom Pricing</h2>
              <p style="color: #64748b; margin-bottom: 20px;">Set your company's pricing for each manufacturer's roofing system.</p>
              
              <!-- Current Default System Banner -->
              <div id="retailDefaultSystemBanner" style="display: none; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <span style="font-size: 12px; opacity: 0.9;">DEFAULT SYSTEM</span>
                    <div id="retailDefaultSystemName" style="font-weight: 600; font-size: 16px;"></div>
                  </div>
                  <button onclick="clearDefaultSystem(); updateRetailDefaultBanner();" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">Clear Default</button>
                </div>
              </div>
              
              <!-- Manufacturer Selection -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <div>
                  <label style="display: block; font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 6px; text-transform: uppercase;">Manufacturer</label>
                  <select id="retailPricingManufacturerSelect" onchange="handleRetailPricingManufacturerChange()" style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;">
                    <option value="">Select Manufacturer</option>
                  </select>
                </div>
                <div>
                  <label style="display: block; font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 6px; text-transform: uppercase;">Shingle Model</label>
                  <select id="retailPricingShingleLineSelect" onchange="handleRetailPricingShingleLineChange()" disabled style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px; background: #f1f5f9;">
                    <option value="">Select Model</option>
                  </select>
                </div>
              </div>
              
              <!-- Pricing Editor Container -->
              <div id="retailPricingEditorContainer" style="display: none;">
                <!-- Action Buttons -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
                  <h3 id="retailPricingSystemTitle" style="margin: 0; color: #334155;"></h3>
                  <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button onclick="setAsDefaultSystemFromRetail()" style="padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">&#11088; Set as Default</button>
                    <button onclick="resetRetailPricing()" style="padding: 8px 16px; background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e0; border-radius: 6px; cursor: pointer;">Reset Prices</button>
                    <button onclick="saveRetailPricingTemplate()" style="padding: 8px 16px; background: #0891b2; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Save Pricing</button>
                  </div>
                </div>
                
                <!-- MATERIALS SECTION -->
                <div style="background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 24px; overflow: hidden;">
                  <div style="background: linear-gradient(135deg, #0891b2, #0e7490); color: white; padding: 16px 20px;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Materials Pricing</h3>
                    <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Set unit prices for roofing materials</p>
                  </div>
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                      <tr style="background: #f8fafc;">
                        <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 40%;">Component</th>
                        <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 15%;">Unit</th>
                        <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 20%;">Default Price</th>
                        <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 25%;">Your Price</th>
                      </tr>
                    </thead>
                    <tbody id="retailPricingMaterialsBody">
                      <!-- Populated by JavaScript -->
                    </tbody>
                  </table>
                </div>
                
                <!-- ADDITIONAL MATERIALS SECTION -->
                <div style="background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 24px; overflow: hidden;">
                  <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Additional Materials</h3>
                      <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Common items not tied to shingle manufacturer</p>
                    </div>
                    <button onclick="openAddAdditionalMaterialModal()" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600;">+ Add Item</button>
                  </div>
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                      <tr style="background: #f8fafc;">
                        <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 35%;">Item</th>
                        <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 15%;">Unit</th>
                        <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 18%;">Default Price</th>
                        <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 22%;">Your Price</th>
                        <th style="padding: 12px 16px; text-align: center; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 10%;"></th>
                      </tr>
                    </thead>
                    <tbody id="retailAdditionalMaterialsBody">
                      <!-- Populated by JavaScript -->
                    </tbody>
                  </table>
                  <div style="padding: 12px 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: right;">
                    <button onclick="resetAdditionalMaterialsToDefault()" style="padding: 6px 12px; background: none; border: 1px solid #cbd5e0; color: #64748b; border-radius: 4px; cursor: pointer; font-size: 13px;">Reset to Default Items</button>
                  </div>
                </div>
                
                <!-- LABOR SECTION -->
                <div style="background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
                  <div style="background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; padding: 16px 20px;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Labor Pricing</h3>
                    <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Set rates for labor and installation</p>
                  </div>
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                      <tr style="background: #f8fafc;">
                        <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 40%;">Labor Item</th>
                        <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 15%;">Unit</th>
                        <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 20%;">Default Rate</th>
                        <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 25%;">Your Rate</th>
                      </tr>
                    </thead>
                    <tbody id="retailPricingLaborBody">
                      <!-- Populated by JavaScript -->
                    </tbody>
                  </table>
                </div>
                
                <!-- MISCELLANEOUS FEES SECTION -->
                <div style="background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-top: 24px; overflow: hidden;">
                  <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Miscellaneous Fees</h3>
                      <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Optional fees to add to estimates</p>
                    </div>
                    <button onclick="openAddCustomFeeModal()" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600;">+ Add Custom Fee</button>
                  </div>
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                      <tr style="background: #f8fafc;">
                        <th style="padding: 12px 16px; text-align: center; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 10%;">Enabled</th>
                        <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 40%;">Fee Description</th>
                        <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 20%;">Default Price</th>
                        <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 25%;">Your Price</th>
                        <th style="padding: 12px 16px; text-align: center; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 5%;"></th>
                      </tr>
                    </thead>
                    <tbody id="retailPricingFeesBody">
                      <!-- Populated by JavaScript -->
                    </tbody>
                  </table>
                  <div style="padding: 12px 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: right;">
                    <button onclick="resetFeesToDefault()" style="padding: 6px 12px; background: none; border: 1px solid #cbd5e0; color: #64748b; border-radius: 4px; cursor: pointer; font-size: 13px;">Reset to Default Fees</button>
                  </div>
                </div>
              </div>
              
              <!-- Placeholder -->
              <div id="retailPricingPlaceholder" style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                <div style="font-size: 48px; margin-bottom: 16px;">&#128176;</div>
                <p style="font-size: 16px;">Select a manufacturer and shingle model to customize pricing</p>
              </div>
              
              <!-- Add Additional Material Modal -->
              <div id="addAdditionalMaterialModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; justify-content: center; align-items: center;">
                <div style="background: white; padding: 24px; border-radius: 12px; width: 90%; max-width: 450px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: #1e293b;">Add Additional Material</h3>
                    <button onclick="closeAddAdditionalMaterialModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b;">&times;</button>
                  </div>
                  <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 6px; text-transform: uppercase;">Item Name</label>
                    <input type="text" id="addlMatName" placeholder="e.g., Chimney Flashing Kit" style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                    <div>
                      <label style="display: block; font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 6px; text-transform: uppercase;">Unit</label>
                      <select id="addlMatUnit" style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;">
                        <option value="Piece">Piece</option>
                        <option value="Bundle">Bundle</option>
                        <option value="Roll">Roll</option>
                        <option value="Box">Box</option>
                        <option value="Sheet">Sheet</option>
                        <option value="Tube">Tube</option>
                        <option value="LF">LF</option>
                        <option value="SQ">SQ</option>
                        <option value="EA">EA</option>
                        <option value="Gallon">Gallon</option>
                        <option value="Bag">Bag</option>
                      </select>
                    </div>
                    <div>
                      <label style="display: block; font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 6px; text-transform: uppercase;">Default Price</label>
                      <div style="display: flex; align-items: center;">
                        <span style="color: #64748b; margin-right: 4px;">$</span>
                        <input type="number" id="addlMatPrice" value="0.00" min="0" step="0.01" style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;">
                      </div>
                    </div>
                  </div>
                  <button onclick="addAdditionalMaterialItem()" style="width: 100%; padding: 12px; background: #f59e0b; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer;">
                    Add Item
                  </button>
                </div>
              </div>
              
              <!-- Add Custom Fee Modal -->
              <div id="addCustomFeeModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; justify-content: center; align-items: center;">
                <div style="background: white; padding: 24px; border-radius: 12px; width: 90%; max-width: 450px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: #1e293b;">Add Custom Fee</h3>
                    <button onclick="closeAddCustomFeeModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b;">&times;</button>
                  </div>
                  <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 6px; text-transform: uppercase;">Fee Description</label>
                    <input type="text" id="customFeeName" placeholder="e.g., Crane Rental" style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
                  </div>
                  <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 6px; text-transform: uppercase;">Default Price</label>
                    <div style="display: flex; align-items: center;">
                      <span style="color: #64748b; margin-right: 4px;">$</span>
                      <input type="number" id="customFeePrice" value="0.00" min="0" step="0.01" style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;">
                    </div>
                  </div>
                  <button onclick="addCustomFeeItem()" style="width: 100%; padding: 12px; background: #f59e0b; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer;">
                    Add Fee
                  </button>
                </div>
              </div>
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
  localStorage.setItem('quikbitz-current-module', moduleName);

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
    // Use the same server endpoint as Materials/Labor
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('location', 'charleston'); // Default location
    formData.append('pricing', JSON.stringify(window.customPricing || {}));

    const response = await fetch('/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Server error: ' + response.status);

    const data = await response.json();
    console.log('[RETAIL] Server response:', data);

    // Store data separately for retail module
    window.retailModuleData.pdfUploaded = true;
    window.retailModuleData.parsedData = data;
    window.retailModuleData.rawMeasurements = data.rawMeasurements || data.measurements || {};

    // Initialize retail estimate from parsed data
    initializeRetailFromParsedData(data);

    // Show results
    uploadSection.style.display = 'none';
    resultsSection.style.display = 'block';

    // Update project bar
    const projectName = data.customerName || data.customer_name || '';
    const projectAddress = data.jobAddress || data.job_address || '';
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

function initializeRetailFromParsedData(data) {
  console.log('[RETAIL] Initializing from data:', data);

  const lineItems = [];

  // Add materials from parsed data
  if (data.materials && Array.isArray(data.materials)) {
    data.materials.forEach((mat, idx) => {
      const qty = mat.quantity || 0;
      if (qty > 0) {
        lineItems.push({
          id: 'mat-' + idx,
          category: 'Materials',
          description: mat.name,
          quantity: qty,
          unit: mat.unit,
          unitCost: mat.unitPrice,
          markup: 0
        });
      }
    });
  }

  // Get measurements
  const measurements = data.measurements || {};
  const raw = data.raw || {};
  const squares = parseFloat(raw.roof_sq) || parseFloat(measurements.roofSquares) || 0;

  // Get pitch data for steep charges
  const pitchData = raw.pitch_data || {};
  const tier_8_9 = parseFloat(pitchData.tier_8_9) || 0;
  const tier_10_11 = parseFloat(pitchData.tier_10_11) || 0;
  const tier_12_plus = parseFloat(pitchData.tier_12_plus) || 0;

  // Get material quantities for labor calculations
  const starterBundles = data.materials?.find(m => m.name?.toLowerCase().includes('starter'))?.quantity || 0;
  const hipRidgeBundles = data.materials?.find(m => m.name?.toLowerCase().includes('hip') || m.name?.toLowerCase().includes('ridge cap'))?.quantity || 0;
  const plywoodSheets = data.materials?.find(m => m.name?.toLowerCase().includes('plywood'))?.quantity || 0;

  // Labor - Squares (base labor rate)
  if (squares > 0) {
    lineItems.push({
      id: 'labor-squares',
      category: 'Labor',
      description: 'Labor - Squares',
      quantity: parseFloat(squares.toFixed(2)),
      unit: 'SQ',
      unitCost: 90,
      markup: 0
    });
  }

  // Labor - Starter per Bundle
  if (starterBundles > 0) {
    lineItems.push({
      id: 'labor-starter',
      category: 'Labor',
      description: 'Starter per Bundle',
      quantity: starterBundles,
      unit: 'BD',
      unitCost: 25,
      markup: 0
    });
  }

  // Labor - Hip and Ridge Cap per Bundle
  if (hipRidgeBundles > 0) {
    lineItems.push({
      id: 'labor-hipridge',
      category: 'Labor',
      description: 'Hip and Ridge Cap per Bundle',
      quantity: hipRidgeBundles,
      unit: 'BD',
      unitCost: 25,
      markup: 0
    });
  }

  // Labor - Steep Charges by tier
  if (tier_8_9 > 0) {
    lineItems.push({
      id: 'labor-steep-8-9',
      category: 'Labor',
      description: 'Steep Charge for 8-9/12 pitch',
      quantity: parseFloat(tier_8_9.toFixed(2)),
      unit: 'SQ',
      unitCost: 5,
      markup: 0
    });
  }

  if (tier_10_11 > 0) {
    lineItems.push({
      id: 'labor-steep-10-11',
      category: 'Labor',
      description: 'Steep Charge for 10-11/12 pitch',
      quantity: parseFloat(tier_10_11.toFixed(2)),
      unit: 'SQ',
      unitCost: 10,
      markup: 0
    });
  }

  if (tier_12_plus > 0) {
    lineItems.push({
      id: 'labor-steep-12',
      category: 'Labor',
      description: 'Steep Charge for 12+/12 pitch',
      quantity: parseFloat(tier_12_plus.toFixed(2)),
      unit: 'SQ',
      unitCost: 20,
      markup: 0
    });
  }

  // Labor - Plywood Replacement
  if (plywoodSheets > 0) {
    const plywoodRate = plywoodSheets > 10 ? 10 : 30;
    lineItems.push({
      id: 'labor-plywood',
      category: 'Labor',
      description: 'Plywood Replacement',
      quantity: plywoodSheets,
      unit: 'SH',
      unitCost: plywoodRate,
      markup: 0
    });
  }
  
  // Step Flashing Install Labor
  const stepFlashingLength = parseFloat(raw.step_flashing) || 0;
  if (stepFlashingLength > 0) {
    lineItems.push({
      id: 'labor-step-flashing',
      category: 'Labor',
      description: 'Step Flashing Install',
      quantity: parseFloat(stepFlashingLength.toFixed(2)),
      unit: 'LF',
      unitCost: 2,
      markup: 0
    });
  }
  
  // L Flashing (Trim Coil) Install Labor
  const wallFlashingLength = parseFloat(raw.flashing_length) || 0;
  if (wallFlashingLength > 0) {
    lineItems.push({
      id: 'labor-wall-flashing',
      category: 'Labor',
      description: 'L Flashing (Trim Coil) Install',
      quantity: parseFloat(wallFlashingLength.toFixed(2)),
      unit: 'LF',
      unitCost: 2,
      markup: 0
    });
  }

  // Extract customer info from raw - check multiple possible field names
  const customerName = raw.customer_name || raw.customerName || raw.name || '';
  const jobAddress = raw.job_address || raw.jobAddress || raw.address || raw.property_address || '';
  const jobNumber = raw.job_number || raw.jobNumber || raw.claim_number || '';
  const shingleColor = raw.shingle_color || raw.shingleColor || raw.shingle || 'TBD';

  // Create retail data object
  window.retailData = {
    customerName: customerName,
    jobAddress: jobAddress,
    jobNumber: jobNumber,
    shingleColor: shingleColor,
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

  window.retailViewMode = 'internal';

  console.log('[RETAIL] Created', lineItems.length, 'line items');
  console.log('[RETAIL] Pitch tiers - 8-9:', tier_8_9, '10-11:', tier_10_11, '12+:', tier_12_plus);

  if (typeof displayRetailEstimate === 'function') {
    displayRetailEstimate();
  }

  // Save to storage
  saveRetailToStorage();

  // Initialize manufacturer selector
  initRetailManufacturerSelector();

  // Show photo section
  const photoSection = document.getElementById('retailPhotoSection');
  if (photoSection) {
    photoSection.style.display = 'block';
  }

  // Initialize retail photos array
  if (!window.currentPhotos) window.currentPhotos = {};
  if (!window.currentPhotos.retail) window.currentPhotos.retail = [];
}

function updateRetailCustomerInfo(field, value) {
  if (!window.retailData) return;

  if (field === 'squares') {
    window.retailData.measurements.squares = parseFloat(value) || 0;
  } else {
    window.retailData[field] = value;
  }
}

function clearRetailProject() {
  if (!confirm('Start a new retail project? Current data will be cleared.')) return;

  // Clear retail-specific data
  window.retailModuleData = { pdfUploaded: false, rawMeasurements: null, parsedData: null, isBlankEstimate: false };
  window.retailData = null;
  window.retailViewMode = 'internal';
  clearRetailStorage();

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
    <div style="text-align: center; margin-top: 20px;">
      <p style="color: #64748b; margin-bottom: 12px;">— OR —</p>
      <button onclick="startBlankEstimate()" style="background: #0891b2; color: white; border: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; cursor: pointer; transition: background 0.2s;">
        Start Blank Estimate
      </button>
      <p style="color: #94a3b8; font-size: 13px; margin-top: 8px;">For repairs and custom jobs without a roof report</p>
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

function startBlankEstimate() {
  console.log('[RETAIL] Starting blank estimate');

  // Create empty retail data
  window.retailData = {
    customerName: '',
    jobAddress: '',
    jobNumber: '',
    shingleColor: '',
    measurements: {
      squares: 0
    },
    lineItems: [],
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

  window.retailModuleData = {
    pdfUploaded: false,
    parsedData: null,
    rawMeasurements: null,
    isBlankEstimate: true
  };

  window.retailViewMode = 'internal';

  // Hide upload, show results
  const uploadSection = document.getElementById('retailUploadSection');
  const resultsSection = document.getElementById('retailResultsSection');

  uploadSection.style.display = 'none';
  resultsSection.style.display = 'block';

  // Update project bar
  document.getElementById('retailProjectName').textContent = 'New Estimate';
  document.getElementById('retailProjectAddress').textContent = '';

  // Display the empty estimate
  if (typeof displayRetailEstimate === 'function') {
    displayRetailEstimate();
  }

  // Save to storage
  saveRetailToStorage();

  // Initialize manufacturer selector
  initRetailManufacturerSelector();
}

function saveRetailToStorage() {
  if (window.retailData) {
    localStorage.setItem('quikbitz-retail-data', JSON.stringify(window.retailData));
    localStorage.setItem('quikbitz-retail-module-data', JSON.stringify(window.retailModuleData));
    localStorage.setItem('quikbitz-retail-view-mode', window.retailViewMode || 'internal');
  }
}

function loadRetailFromStorage() {
  const savedData = localStorage.getItem('quikbitz-retail-data');
  const savedModuleData = localStorage.getItem('quikbitz-retail-module-data');
  const savedViewMode = localStorage.getItem('quikbitz-retail-view-mode');

  if (savedData) {
    try {
      window.retailData = JSON.parse(savedData);
      window.retailModuleData = savedModuleData ? JSON.parse(savedModuleData) : { pdfUploaded: true };
      window.retailViewMode = savedViewMode || 'internal';
      return true;
    } catch (e) {
      console.error('[RETAIL] Error loading saved data:', e);
      return false;
    }
  }
  return false;
}

function clearRetailStorage() {
  localStorage.removeItem('quikbitz-retail-data');
  localStorage.removeItem('quikbitz-retail-module-data');
  localStorage.removeItem('quikbitz-retail-view-mode');
}

// ==========================================
// MANUFACTURER SELECTOR FUNCTIONS FOR RETAIL
// ==========================================

function populateRetailManufacturerDropdown() {
  const select = document.getElementById('retailManufacturerSelect');
  if (!select || typeof getManufacturers !== 'function') return;
  
  const manufacturers = getManufacturers();
  select.innerHTML = '<option value="">Select Manufacturer</option>';
  manufacturers.forEach(m => {
    select.innerHTML += `<option value="${m.id}">${m.name}</option>`;
  });
}

function handleRetailManufacturerChange() {
  const manufacturerSelect = document.getElementById('retailManufacturerSelect');
  const shingleLineSelect = document.getElementById('retailShingleLineSelect');
  const colorSelect = document.getElementById('retailShingleColorSelect');
  const systemInfo = document.getElementById('retailSystemInfo');
  const applyBtn = document.getElementById('retailApplySystemBtn');
  
  const manufacturerId = manufacturerSelect.value;
  
  // Reset dropdowns
  shingleLineSelect.innerHTML = '<option value="">Select Model</option>';
  colorSelect.innerHTML = '<option value="">Select Color</option>';
  colorSelect.disabled = true;
  colorSelect.style.background = '#f1f5f9';
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
  
  // Populate shingle lines
  const shingleLines = getShingleLines(manufacturerId);
  shingleLines.forEach(line => {
    shingleLineSelect.innerHTML += `<option value="${line.id}">${line.name}</option>`;
  });
  
  shingleLineSelect.disabled = false;
  shingleLineSelect.style.background = 'white';
  
  window._retailManufacturer = manufacturerId;
  window._retailShingleLine = null;
  window._retailColor = null;
}

function handleRetailShingleLineChange() {
  const manufacturerSelect = document.getElementById('retailManufacturerSelect');
  const shingleLineSelect = document.getElementById('retailShingleLineSelect');
  const colorSelect = document.getElementById('retailShingleColorSelect');
  const systemInfo = document.getElementById('retailSystemInfo');
  const applyBtn = document.getElementById('retailApplySystemBtn');
  
  const manufacturerId = manufacturerSelect.value;
  const shingleLineId = shingleLineSelect.value;
  
  colorSelect.innerHTML = '<option value="">Select Color</option>';
  
  if (!shingleLineId) {
    colorSelect.disabled = true;
    colorSelect.style.background = '#f1f5f9';
    if (systemInfo) systemInfo.style.display = 'none';
    if (applyBtn) {
      applyBtn.disabled = true;
      applyBtn.style.background = '#cbd5e0';
      applyBtn.style.color = '#64748b';
      applyBtn.style.cursor = 'not-allowed';
    }
    return;
  }
  
  // Populate colors
  const colors = getShingleColors(manufacturerId, shingleLineId);
  colors.forEach(color => {
    colorSelect.innerHTML += `<option value="${color}">${color}</option>`;
  });
  
  colorSelect.disabled = false;
  colorSelect.style.background = 'white';
  
  // Show system info
  const shingleData = getShingleData(manufacturerId, shingleLineId);
  if (shingleData && systemInfo) {
    document.getElementById('retailSystemName').textContent = `${shingleData.manufacturer} ${shingleData.name}`;
    document.getElementById('retailWindRating').textContent = shingleData.windRating;
    document.getElementById('retailWarranty').textContent = shingleData.warranty;
    systemInfo.style.display = 'block';
  }
  
  // Enable apply button
  if (applyBtn) {
    applyBtn.disabled = false;
    applyBtn.style.background = '#0891b2';
    applyBtn.style.color = 'white';
    applyBtn.style.cursor = 'pointer';
  }
  
  window._retailShingleLine = shingleLineId;
  window._retailColor = null;
}

function handleRetailColorChange() {
  const colorSelect = document.getElementById('retailShingleColorSelect');
  window._retailColor = colorSelect.value;
  
  // Update shingle color field
  const shingleColorInput = document.getElementById('retailShingleColor');
  if (shingleColorInput && window._retailColor) {
    shingleColorInput.value = window._retailColor;
    if (window.retailData) {
      window.retailData.shingleColor = window._retailColor;
    }
  }
}

function applyRetailManufacturerSystem() {
  if (!window._retailManufacturer || !window._retailShingleLine) {
    alert('Please select a manufacturer and shingle model first.');
    return;
  }
  
  // Get measurements from retailData or retailModuleData
  const parsedData = window.retailModuleData?.parsedData || {};
  const rawMeasurements = parsedData.raw || {};
  const measurements = parsedData.measurements || {};
  
  const measurementData = {
    squares: window.retailData?.measurements?.squares || parseFloat(rawMeasurements.roof_sq) || measurements.roofSquares || 0,
    ridgeLength: measurements.ridgeLength || parseFloat(rawMeasurements.ridge_length) || 0,
    hipLength: measurements.hipLength || parseFloat(rawMeasurements.hip_length) || 0,
    eaveLength: measurements.eaveLength || parseFloat(rawMeasurements.eave_length) || 0,
    rakeLength: measurements.rakeLength || parseFloat(rawMeasurements.rake_edge_length) || 0,
    valleyLength: measurements.valleyLength || parseFloat(rawMeasurements.valley_length) || 0
  };
  
  console.log('[RETAIL] Applying system with measurements:', measurementData);
  
  // Calculate materials from manufacturer system
  const materials = calculateSystemMaterials(window._retailManufacturer, window._retailShingleLine, measurementData);
  
  // Add color to shingle name if selected
  if (window._retailColor && materials.length > 0) {
    materials[0].name = `${materials[0].name} - ${window._retailColor}`;
  }
  
  console.log('[RETAIL] Calculated materials:', materials);
  
  // Convert to retail line items format - MATERIALS ONLY
  const lineItems = materials.map((mat, idx) => ({
    id: 'mat-' + idx,
    category: 'Materials',
    description: mat.name,
    quantity: mat.quantity,
    unit: mat.unit,
    unitCost: mat.unitPrice,
    markup: 0
  }));
  
  // ==========================================
  // ADD LABOR ITEMS (same logic as initializeRetailFromParsedData)
  // ==========================================
  
  const squares = measurementData.squares;
  
  // Get pitch data for steep charges
  const pitchData = rawMeasurements.pitch_data || {};
  const tier_8_9 = parseFloat(pitchData.tier_8_9) || 0;
  const tier_10_11 = parseFloat(pitchData.tier_10_11) || 0;
  const tier_12_plus = parseFloat(pitchData.tier_12_plus) || 0;
  
  // Get material quantities for labor calculations
  const starterBundles = materials.find(m => m.name?.toLowerCase().includes('starter'))?.quantity || 0;
  const hipRidgeBundles = materials.find(m => m.name?.toLowerCase().includes('hip') || m.name?.toLowerCase().includes('ridge cap'))?.quantity || 0;
  const plywoodSheets = parsedData.materials?.find(m => m.name?.toLowerCase().includes('plywood'))?.quantity || 0;
  
  // Labor - Squares (base labor rate)
  if (squares > 0) {
    lineItems.push({
      id: 'labor-squares',
      category: 'Labor',
      description: 'Labor - Squares',
      quantity: parseFloat(squares.toFixed(2)),
      unit: 'SQ',
      unitCost: 90,
      markup: 0
    });
  }
  
  // Labor - Starter per Bundle
  if (starterBundles > 0) {
    lineItems.push({
      id: 'labor-starter',
      category: 'Labor',
      description: 'Starter per Bundle',
      quantity: starterBundles,
      unit: 'BD',
      unitCost: 25,
      markup: 0
    });
  }
  
  // Labor - Hip and Ridge Cap per Bundle
  if (hipRidgeBundles > 0) {
    lineItems.push({
      id: 'labor-hipridge',
      category: 'Labor',
      description: 'Hip and Ridge Cap per Bundle',
      quantity: hipRidgeBundles,
      unit: 'BD',
      unitCost: 25,
      markup: 0
    });
  }
  
  // Labor - Steep Charges by tier
  if (tier_8_9 > 0) {
    lineItems.push({
      id: 'labor-steep-8-9',
      category: 'Labor',
      description: 'Steep Charge for 8-9/12 pitch',
      quantity: parseFloat(tier_8_9.toFixed(2)),
      unit: 'SQ',
      unitCost: 5,
      markup: 0
    });
  }
  
  if (tier_10_11 > 0) {
    lineItems.push({
      id: 'labor-steep-10-11',
      category: 'Labor',
      description: 'Steep Charge for 10-11/12 pitch',
      quantity: parseFloat(tier_10_11.toFixed(2)),
      unit: 'SQ',
      unitCost: 10,
      markup: 0
    });
  }
  
  if (tier_12_plus > 0) {
    lineItems.push({
      id: 'labor-steep-12',
      category: 'Labor',
      description: 'Steep Charge for 12+/12 pitch',
      quantity: parseFloat(tier_12_plus.toFixed(2)),
      unit: 'SQ',
      unitCost: 20,
      markup: 0
    });
  }
  
  // Labor - Plywood Replacement
  if (plywoodSheets > 0) {
    const plywoodRate = plywoodSheets > 10 ? 10 : 30;
    lineItems.push({
      id: 'labor-plywood',
      category: 'Labor',
      description: 'Plywood Replacement',
      quantity: plywoodSheets,
      unit: 'SH',
      unitCost: plywoodRate,
      markup: 0
    });
  }
  
  // Step Flashing Install Labor
  const stepFlashingLengthApply = parseFloat(rawMeasurements.step_flashing) || parseFloat(raw.step_flashing) || 0;
  if (stepFlashingLengthApply > 0) {
    lineItems.push({
      id: 'labor-step-flashing',
      category: 'Labor',
      description: 'Step Flashing Install',
      quantity: parseFloat(stepFlashingLengthApply.toFixed(2)),
      unit: 'LF',
      unitCost: 2,
      markup: 0
    });
  }
  
  // L Flashing (Trim Coil) Install Labor
  const wallFlashingLengthApply = parseFloat(rawMeasurements.flashing_length) || parseFloat(raw.flashing_length) || 0;
  if (wallFlashingLengthApply > 0) {
    lineItems.push({
      id: 'labor-wall-flashing',
      category: 'Labor',
      description: 'L Flashing (Trim Coil) Install',
      quantity: parseFloat(wallFlashingLengthApply.toFixed(2)),
      unit: 'LF',
      unitCost: 2,
      markup: 0
    });
  }
  
  // Update retailData
  if (window.retailData) {
    window.retailData.lineItems = lineItems;
    window.retailData.shingleColor = window._retailColor || window.retailData.shingleColor;
  }
  
  // Refresh display
  if (typeof displayRetailEstimate === 'function') {
    displayRetailEstimate();
  }
  
  // Save to storage
  if (typeof saveRetailToStorage === 'function') {
    saveRetailToStorage();
  }
  
  console.log('[RETAIL] Applied', lineItems.length, 'line items (materials + labor)');
}

// Initialize manufacturer dropdown when retail module loads
function initRetailManufacturerSelector() {
  setTimeout(() => {
    populateRetailManufacturerDropdown();
  }, 100);
}


function updateRetailDefaultBanner() {
  const banner = document.getElementById('retailDefaultSystemBanner');
  const nameEl = document.getElementById('retailDefaultSystemName');
  if (!banner) return;
  
  try {
    const saved = localStorage.getItem('quikbitz-default-system');
    const defaultSystem = saved ? JSON.parse(saved) : null;
    
    if (defaultSystem) {
      banner.style.display = 'block';
      if (nameEl) {
        nameEl.textContent = `${defaultSystem.manufacturerName} ${defaultSystem.shingleLineName}`;
      }
    } else {
      banner.style.display = 'none';
    }
  } catch (e) {
    banner.style.display = 'none';
  }
}

function switchRetailTab(tabName) {
  // Hide all retail tab contents
  document.querySelectorAll('.retail-tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  
  // Remove active class from all tab buttons
  document.querySelectorAll('.retail-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab
  const selectedTab = document.getElementById(tabName + 'Tab');
  if (selectedTab) {
    selectedTab.style.display = 'block';
  }
  
  // Add active class to clicked button
  const activeBtn = document.querySelector(`[data-retail-tab="${tabName}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
  
  // Initialize pricing tab if selected
  if (tabName === 'retailPricing') {
    initRetailPricingTab();
  }
}

function updateRetailDefaultBanner() {
  const banner = document.getElementById('retailDefaultSystemBanner');
  const nameEl = document.getElementById('retailDefaultSystemName');
  if (!banner) return;
  
  try {
    const saved = localStorage.getItem('quikbitz-default-system');
    const defaultSystem = saved ? JSON.parse(saved) : null;
    
    if (defaultSystem) {
      banner.style.display = 'block';
      if (nameEl) {
        nameEl.textContent = `${defaultSystem.manufacturerName} ${defaultSystem.shingleLineName}`;
      }
    } else {
      banner.style.display = 'none';
    }
  } catch (e) {
    banner.style.display = 'none';
  }
}

function switchRetailTab(tabName) {
  // Hide all retail tab contents
  document.querySelectorAll('.retail-tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  
  // Remove active class from all tab buttons
  document.querySelectorAll('.retail-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab
  const selectedTab = document.getElementById(tabName + 'Tab');
  if (selectedTab) {
    selectedTab.style.display = 'block';
  }
  
  // Add active class to clicked button
  const activeBtn = document.querySelector(`[data-retail-tab="${tabName}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
  
  // Initialize pricing tab if selected
  if (tabName === 'retailPricing') {
    initRetailPricingTab();
  }
}

// ==========================================

// ==========================================
// RETAIL PRICING TAB FUNCTIONS
// ==========================================

function initRetailPricingTab() {
  populateRetailPricingManufacturerDropdown();
  updateRetailDefaultBanner();
  populateRetailLaborPricingTable();
  renderAdditionalMaterialsTable();
  renderMiscFeesTable();
}

function populateRetailPricingManufacturerDropdown() {
  const select = document.getElementById('retailPricingManufacturerSelect');
  if (!select || typeof getManufacturers !== 'function') return;
  
  const manufacturers = getManufacturers();
  select.innerHTML = '<option value="">Select Manufacturer</option>';
  manufacturers.forEach(m => {
    select.innerHTML += `<option value="${m.id}">${m.name}</option>`;
  });
}

function populateRetailLaborPricingTable() {
  const tbody = document.getElementById('retailPricingLaborBody');
  if (!tbody) return;
  
  const laborItems = [
    { id: 'squares', name: 'Labor - Squares', unit: 'SQ', default: 90 },
    { id: 'starter', name: 'Starter per Bundle', unit: 'BD', default: 25 },
    { id: 'hipRidge', name: 'Hip & Ridge per Bundle', unit: 'BD', default: 25 },
    { id: 'steep8', name: 'Steep Charge 8-9/12', unit: 'SQ', default: 5 },
    { id: 'steep10', name: 'Steep Charge 10-11/12', unit: 'SQ', default: 10 },
    { id: 'steep12', name: 'Steep Charge 12+/12', unit: 'SQ', default: 20 },
    { id: 'plywood', name: 'Plywood Replacement', unit: 'SH', default: 30 },
    { id: 'tearoff1', name: 'Tear Off - 1 Layer', unit: 'SQ', default: 25 },
    { id: 'tearoff2', name: 'Tear Off - 2 Layers', unit: 'SQ', default: 40 },
    { id: 'stepFlashing', name: 'Step Flashing Install', unit: 'LF', default: 2 },
    { id: 'wallFlashing', name: 'L Flashing (Trim Coil) Install', unit: 'LF', default: 2 },
    { id: 'pipeBoot', name: 'Pipe Boot Install', unit: 'EA', default: 15 },
    { id: 'skylight', name: 'Skylight Flash/Reseal', unit: 'EA', default: 75 }
  ];
  
  tbody.innerHTML = laborItems.map(item => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">${item.name}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">${item.unit}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b;">$${item.default.toFixed(2)}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
        <div style="display: flex; align-items: center;">
          <span style="color: #64748b; margin-right: 4px;">$</span>
          <input type="number" id="retail_laborRate_${item.id}" value="${item.default}" data-default="${item.default}" step="0.01" style="width: 100px; padding: 8px 10px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 14px;">
        </div>
      </td>
    </tr>
  `).join('');
}

function handleRetailPricingManufacturerChange() {
  const manufacturerSelect = document.getElementById('retailPricingManufacturerSelect');
  const shingleLineSelect = document.getElementById('retailPricingShingleLineSelect');
  const editorContainer = document.getElementById('retailPricingEditorContainer');
  const placeholder = document.getElementById('retailPricingPlaceholder');
  const manufacturerId = manufacturerSelect.value;
  
  shingleLineSelect.innerHTML = '<option value="">Select Model</option>';
  if (editorContainer) editorContainer.style.display = 'none';
  if (placeholder) placeholder.style.display = 'block';
  
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
  window._retailPricingManufacturer = manufacturerId;
  window._retailPricingShingleLine = null;
}

function handleRetailPricingShingleLineChange() {
  const manufacturerSelect = document.getElementById('retailPricingManufacturerSelect');
  const shingleLineSelect = document.getElementById('retailPricingShingleLineSelect');
  const editorContainer = document.getElementById('retailPricingEditorContainer');
  const placeholder = document.getElementById('retailPricingPlaceholder');
  const titleEl = document.getElementById('retailPricingSystemTitle');
  
  const manufacturerId = manufacturerSelect.value;
  const shingleLineId = shingleLineSelect.value;
  
  if (!shingleLineId) {
    if (editorContainer) editorContainer.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
    return;
  }
  
  window._retailPricingShingleLine = shingleLineId;
  const shingleData = getShingleData(manufacturerId, shingleLineId);
  if (!shingleData) return;
  
  if (titleEl) {
    titleEl.textContent = `${shingleData.manufacturer} ${shingleData.name} Pricing`;
  }
  
  // Load custom pricing if exists
  const customPricing = typeof loadCustomPricing === 'function' ? loadCustomPricing() : {};
  const pricingKey = `${manufacturerId}_${shingleLineId}`;
  const savedPricing = customPricing[pricingKey] || {};
  
  // Populate materials pricing
  const tbody = document.getElementById('retailPricingMaterialsBody');
  if (tbody) {
    let html = '';
    
    // Shingles
    html += `<tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${shingleData.name} Shingles</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">Bundle</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b;">$${shingleData.pricePerBundle.toFixed(2)}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
        <div style="display: flex; align-items: center;">
          <span style="color: #64748b; margin-right: 4px;">$</span>
          <input type="number" id="retail_price_shingles" data-default="${shingleData.pricePerBundle}" value="${savedPricing.shingles || shingleData.pricePerBundle}" step="0.01" style="width: 100px; padding: 8px 10px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 14px;">
        </div>
      </td>
    </tr>`;
    
    // System components
    const components = shingleData.systemComponents;
    const componentKeys = ['starter', 'hipRidge', 'underlayment', 'iceWater', 'ridgeVent', 'dripEdge', 'nails', 'sealant'];
    
    componentKeys.forEach(key => {
      const comp = components[key];
      if (comp) {
        const savedPrice = savedPricing[key] || comp.pricePerUnit;
        html += `<tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">${comp.name}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">${comp.unit}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b;">$${comp.pricePerUnit.toFixed(2)}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
            <div style="display: flex; align-items: center;">
              <span style="color: #64748b; margin-right: 4px;">$</span>
              <input type="number" id="retail_price_${key}" data-default="${comp.pricePerUnit}" value="${savedPrice}" step="0.01" style="width: 100px; padding: 8px 10px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 14px;">
            </div>
          </td>
        </tr>`;
      }
    });
    
    tbody.innerHTML = html;
  }
  
  // Load saved labor rates
  const laborRates = savedPricing.labor || {};
  const laborFields = ['squares', 'starter', 'hipRidge', 'steep8', 'steep10', 'steep12', 'plywood', 'tearoff1', 'tearoff2', 'dripEdge', 'valley', 'pipeBoot', 'skylight'];
  
  laborFields.forEach(field => {
    const input = document.getElementById(`retail_laborRate_${field}`);
    if (input) {
      input.value = laborRates[field] ?? input.dataset.default;
    }
  });
  
  // Load saved additional materials prices
  const addlMat = savedPricing.additionalMaterials || {};
  const addlMatFields = ['lFlashing', 'stepFlashing', 'buttonCaps', 'plywood', 'sealant', 'pipeBoot2', 'pipeBoot3', 'pipeBoot4'];
  
  addlMatFields.forEach(field => {
    const input = document.getElementById(`addlMat_${field}`);
    if (input) {
      input.value = addlMat[field] ?? input.dataset.default;
    }
  });
  
  if (editorContainer) editorContainer.style.display = 'block';
  if (placeholder) placeholder.style.display = 'none';
  
  // Re-render additional materials with saved prices for this system
  renderAdditionalMaterialsTable();
  
  // Re-render miscellaneous fees with saved prices for this system
  renderMiscFeesTable();
}

function saveRetailPricingTemplate() {
  if (!window._retailPricingManufacturer || !window._retailPricingShingleLine) {
    alert('Please select a manufacturer and model first.');
    return;
  }
  
  const pricingKey = `${window._retailPricingManufacturer}_${window._retailPricingShingleLine}`;
  
  // Build additional materials pricing dynamically
  const additionalMaterials = {};
  const addlMatItems = getAdditionalMaterials();
  addlMatItems.forEach(item => {
    const input = document.getElementById(`addlMat_${item.id}`);
    if (input) {
      additionalMaterials[item.id] = parseFloat(input.value) || item.defaultPrice;
    }
  });
  
  // Build miscellaneous fees data
  const miscFees = {};
  const feeItems = getMiscFees();
  feeItems.forEach(fee => {
    const priceInput = document.getElementById(`feePrice_${fee.id}`);
    const enabledInput = document.getElementById(`feeEnabled_${fee.id}`);
    if (priceInput && enabledInput) {
      miscFees[fee.id] = {
        price: parseFloat(priceInput.value) || fee.defaultPrice,
        enabled: enabledInput.checked
      };
    }
  });
  
  const pricing = {
    shingles: parseFloat(document.getElementById('retail_price_shingles')?.value) || 0,
    starter: parseFloat(document.getElementById('retail_price_starter')?.value) || 0,
    hipRidge: parseFloat(document.getElementById('retail_price_hipRidge')?.value) || 0,
    underlayment: parseFloat(document.getElementById('retail_price_underlayment')?.value) || 0,
    iceWater: parseFloat(document.getElementById('retail_price_iceWater')?.value) || 0,
    ridgeVent: parseFloat(document.getElementById('retail_price_ridgeVent')?.value) || 0,
    dripEdge: parseFloat(document.getElementById('retail_price_dripEdge')?.value) || 0,
    nails: parseFloat(document.getElementById('retail_price_nails')?.value) || 0,
    sealant: parseFloat(document.getElementById('retail_price_sealant')?.value) || 0,
    additionalMaterials: additionalMaterials,
    labor: {
      squares: parseFloat(document.getElementById('retail_laborRate_squares')?.value) || 90,
      starter: parseFloat(document.getElementById('retail_laborRate_starter')?.value) || 25,
      hipRidge: parseFloat(document.getElementById('retail_laborRate_hipRidge')?.value) || 25,
      steep8: parseFloat(document.getElementById('retail_laborRate_steep8')?.value) || 5,
      steep10: parseFloat(document.getElementById('retail_laborRate_steep10')?.value) || 10,
      steep12: parseFloat(document.getElementById('retail_laborRate_steep12')?.value) || 20,
      plywood: parseFloat(document.getElementById('retail_laborRate_plywood')?.value) || 30,
      tearoff1: parseFloat(document.getElementById('retail_laborRate_tearoff1')?.value) || 25,
      tearoff2: parseFloat(document.getElementById('retail_laborRate_tearoff2')?.value) || 40,
      stepFlashing: parseFloat(document.getElementById('retail_laborRate_stepFlashing')?.value) || 2,
      wallFlashing: parseFloat(document.getElementById('retail_laborRate_wallFlashing')?.value) || 2,
      pipeBoot: parseFloat(document.getElementById('retail_laborRate_pipeBoot')?.value) || 15,
      skylight: parseFloat(document.getElementById('retail_laborRate_skylight')?.value) || 75
    },
    miscFees: miscFees
  };
  
  const allPricing = typeof loadCustomPricing === 'function' ? loadCustomPricing() : {};
  allPricing[pricingKey] = pricing;
  
  if (typeof saveCustomPricing === 'function') {
    saveCustomPricing(allPricing);
  }
  
  alert('Pricing saved successfully!');
  console.log('[RETAIL PRICING] Saved pricing for', pricingKey, pricing);
}

function resetRetailPricing() {
  if (!confirm('Reset all prices to default values?')) return;
  
  document.querySelectorAll('#retailPricingMaterialsBody input[data-default]').forEach(input => {
    input.value = input.dataset.default;
  });
  
  document.querySelectorAll('#retailPricingLaborBody input[data-default]').forEach(input => {
    input.value = input.dataset.default;
  });
  
  document.querySelectorAll('[id^="addlMat_"]').forEach(input => {
    if (input.dataset.default) input.value = input.dataset.default;
  });
  
  document.querySelectorAll('#retailPricingFeesBody input[data-default]').forEach(input => {
    input.value = input.dataset.default;
  });
  
  document.querySelectorAll('#retailPricingFeesBody input[type="checkbox"]').forEach(checkbox => {
    checkbox.checked = false;
  });
}

function setAsDefaultSystemFromRetail() {
  if (!window._retailPricingManufacturer || !window._retailPricingShingleLine) {
    alert('Please select a manufacturer and shingle model first.');
    return;
  }
  
  const shingleData = getShingleData(window._retailPricingManufacturer, window._retailPricingShingleLine);
  if (!shingleData) {
    alert('Could not get system data.');
    return;
  }
  
  const defaultSystem = {
    manufacturerId: window._retailPricingManufacturer,
    shingleLineId: window._retailPricingShingleLine,
    manufacturerName: shingleData.manufacturer,
    shingleLineName: shingleData.name,
    savedAt: new Date().toISOString()
  };
  
  localStorage.setItem('quikbitz-default-system', JSON.stringify(defaultSystem));
  alert(`${shingleData.manufacturer} ${shingleData.name} has been set as your default roofing system!`);
  updateRetailDefaultBanner();
}


// ==========================================
// ADDITIONAL MATERIALS MANAGEMENT
// ==========================================

const ADDITIONAL_MATERIALS_KEY = 'quikbitz-additional-materials';

// Default additional materials
const defaultAdditionalMaterials = [
  { id: 'lFlashing', name: 'L Flashing (Trim Coil)', unit: 'Roll', defaultPrice: 134.50, isDefault: true },
  { id: 'stepFlashing', name: 'Step Flashing', unit: 'Bundle', defaultPrice: 38.00, isDefault: true },
  { id: 'buttonCaps', name: 'Button Caps', unit: 'Box', defaultPrice: 19.50, isDefault: true },
  { id: 'plywood', name: '7/16 OSB Plywood', unit: 'Sheet', defaultPrice: 15.99, isDefault: true },
  { id: 'sealant', name: 'Joint Sealant 10oz', unit: 'Tube', defaultPrice: 7.29, isDefault: true },
  { id: 'pipeBoot2', name: 'Pipe Boot 2"', unit: 'Piece', defaultPrice: 12.00, isDefault: true },
  { id: 'pipeBoot3', name: 'Pipe Boot 3"', unit: 'Piece', defaultPrice: 14.00, isDefault: true },
  { id: 'pipeBoot4', name: 'Pipe Boot 4"', unit: 'Piece', defaultPrice: 16.00, isDefault: true }
];

function getAdditionalMaterials() {
  try {
    const saved = localStorage.getItem(ADDITIONAL_MATERIALS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('[ADDL MAT] Error loading:', e);
  }
  return [...defaultAdditionalMaterials];
}

function saveAdditionalMaterials(materials) {
  localStorage.setItem(ADDITIONAL_MATERIALS_KEY, JSON.stringify(materials));
}

function renderAdditionalMaterialsTable() {
  const tbody = document.getElementById('retailAdditionalMaterialsBody');
  if (!tbody) return;
  
  const materials = getAdditionalMaterials();
  
  // Get saved custom prices if a system is selected
  let savedPrices = {};
  if (window._retailPricingManufacturer && window._retailPricingShingleLine) {
    const pricingKey = `${window._retailPricingManufacturer}_${window._retailPricingShingleLine}`;
    const allPricing = typeof loadCustomPricing === 'function' ? loadCustomPricing() : {};
    savedPrices = allPricing[pricingKey]?.additionalMaterials || {};
  }
  
  tbody.innerHTML = materials.map((item, index) => {
    const savedPrice = savedPrices[item.id] ?? item.defaultPrice;
    return `
      <tr data-addl-mat-id="${item.id}">
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">${item.name}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">${item.unit}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b;">$${item.defaultPrice.toFixed(2)}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; align-items: center;">
            <span style="color: #64748b; margin-right: 4px;">$</span>
            <input type="number" id="addlMat_${item.id}" value="${savedPrice.toFixed(2)}" data-default="${item.defaultPrice}" step="0.01" style="width: 100px; padding: 8px 10px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 14px;">
          </div>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: center;">
          <button onclick="deleteAdditionalMaterial('${item.id}', '${item.name}')" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 18px; padding: 4px 8px;" title="Delete item">×</button>
        </td>
      </tr>
    `;
  }).join('');
}

function openAddAdditionalMaterialModal() {
  const modal = document.getElementById('addAdditionalMaterialModal');
  if (modal) {
    modal.style.display = 'flex';
    // Clear inputs
    document.getElementById('addlMatName').value = '';
    document.getElementById('addlMatUnit').value = 'Piece';
    document.getElementById('addlMatPrice').value = '0.00';
  }
}

function closeAddAdditionalMaterialModal() {
  const modal = document.getElementById('addAdditionalMaterialModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function addAdditionalMaterialItem() {
  const name = document.getElementById('addlMatName').value.trim();
  const unit = document.getElementById('addlMatUnit').value;
  const price = parseFloat(document.getElementById('addlMatPrice').value) || 0;
  
  if (!name) {
    alert('Please enter an item name.');
    return;
  }
  
  // Generate unique ID from name
  const id = 'custom_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
  
  const materials = getAdditionalMaterials();
  
  // Check for duplicate names
  if (materials.some(m => m.name.toLowerCase() === name.toLowerCase())) {
    alert('An item with this name already exists.');
    return;
  }
  
  materials.push({
    id: id,
    name: name,
    unit: unit,
    defaultPrice: price,
    isDefault: false
  });
  
  saveAdditionalMaterials(materials);
  renderAdditionalMaterialsTable();
  closeAddAdditionalMaterialModal();
  
  console.log('[ADDL MAT] Added:', name);
}

function deleteAdditionalMaterial(id, name) {
  if (!confirm(`Are you sure you want to delete "${name}" from the additional materials list?\n\nThis will remove it from pricing for all manufacturer systems.`)) {
    return;
  }
  
  let materials = getAdditionalMaterials();
  materials = materials.filter(m => m.id !== id);
  saveAdditionalMaterials(materials);
  renderAdditionalMaterialsTable();
  
  console.log('[ADDL MAT] Deleted:', name);
}

function resetAdditionalMaterialsToDefault() {
  if (!confirm('Reset additional materials to default list?\n\nThis will remove any custom items you have added.')) {
    return;
  }
  
  saveAdditionalMaterials([...defaultAdditionalMaterials]);
  renderAdditionalMaterialsTable();
  
  console.log('[ADDL MAT] Reset to defaults');
}

// ==========================================
// MISCELLANEOUS FEES MANAGEMENT
// ==========================================

const MISC_FEES_KEY = 'quikbitz-misc-fees';

// Default miscellaneous fees
const defaultMiscFees = [
  { id: 'permitFee', name: 'Permit Fee', defaultPrice: 0.00, enabled: false, isDefault: true },
  { id: 'dumpsterRental', name: 'Dumpster Rental', defaultPrice: 0.00, enabled: false, isDefault: true },
  { id: 'deliveryFee', name: 'Delivery Fee', defaultPrice: 0.00, enabled: false, isDefault: true },
  { id: 'wasteDisposal', name: 'Waste Disposal', defaultPrice: 0.00, enabled: false, isDefault: true }
];

function getMiscFees() {
  const saved = localStorage.getItem(MISC_FEES_KEY);
  return saved ? JSON.parse(saved) : [...defaultMiscFees];
}

function saveMiscFees(fees) {
  localStorage.setItem(MISC_FEES_KEY, JSON.stringify(fees));
}

function renderMiscFeesTable() {
  const tbody = document.getElementById('retailPricingFeesBody');
  if (!tbody) return;
  
  const fees = getMiscFees();
  
  // Get saved custom prices and enabled states if a system is selected
  let savedData = {};
  if (window._retailPricingManufacturer && window._retailPricingShingleLine) {
    const pricingKey = `${window._retailPricingManufacturer}_${window._retailPricingShingleLine}`;
    const allPricing = typeof loadCustomPricing === 'function' ? loadCustomPricing() : {};
    savedData = allPricing[pricingKey]?.miscFees || {};
  }
  
  tbody.innerHTML = fees.map((fee, index) => {
    const feeData = savedData[fee.id] || { price: fee.defaultPrice, enabled: fee.enabled || false };
    return `
      <tr data-fee-id="${fee.id}">
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: center;">
          <input type="checkbox" id="feeEnabled_${fee.id}" ${feeData.enabled ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">${fee.name}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b;">$${fee.defaultPrice.toFixed(2)}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; align-items: center;">
            <span style="color: #64748b; margin-right: 4px;">$</span>
            <input type="number" id="feePrice_${fee.id}" value="${feeData.price.toFixed(2)}" data-default="${fee.defaultPrice}" step="0.01" style="width: 100px; padding: 8px 10px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 14px;">
          </div>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: center;">
          ${!fee.isDefault ? '<button onclick="deleteMiscFee(\'' + fee.id + '\', \'' + fee.name + '\')" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 18px; padding: 4px 8px;" title="Delete fee">x</button>' : ''}
        </td>
      </tr>
    `;
  }).join('');
}

function openAddCustomFeeModal() {
  const modal = document.getElementById('addCustomFeeModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function closeAddCustomFeeModal() {
  const modal = document.getElementById('addCustomFeeModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function addCustomFeeItem() {
  const name = document.getElementById('customFeeName')?.value.trim();
  const price = parseFloat(document.getElementById('customFeePrice')?.value) || 0;
  
  if (!name) {
    alert('Please enter a fee description.');
    return;
  }
  
  // Generate ID from name
  const id = 'custom_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  
  // Check for duplicate
  let fees = getMiscFees();
  if (fees.some(f => f.id === id)) {
    alert('A fee with this name already exists.');
    return;
  }
  
  // Add new fee
  fees.push({
    id: id,
    name: name,
    defaultPrice: price,
    enabled: false,
    isDefault: false
  });
  
  saveMiscFees(fees);
  renderMiscFeesTable();
  closeAddCustomFeeModal();
  
  // Clear inputs
  document.getElementById('customFeeName').value = '';
  document.getElementById('customFeePrice').value = '0.00';
  
  console.log('[MISC FEES] Added:', name);
}

function deleteMiscFee(id, name) {
  if (!confirm(`Delete "${name}"?`)) return;
  
  let fees = getMiscFees();
  fees = fees.filter(f => f.id !== id);
  saveMiscFees(fees);
  renderMiscFeesTable();
  
  console.log('[MISC FEES] Deleted:', name);
}

function resetFeesToDefault() {
  if (!confirm('Reset all fees to default list?')) return;
  
  saveMiscFees([...defaultMiscFees]);
  renderMiscFeesTable();
  
  console.log('[MISC FEES] Reset to defaults');
}

// ==================== RETAIL PHOTO FUNCTIONS ====================

function handleRetailPhotos(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  // Initialize retail photos array if needed
  if (!window.currentPhotos) window.currentPhotos = {};
  if (!window.currentPhotos.retail) window.currentPhotos.retail = [];

  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = function(e) {
      window.currentPhotos.retail.push({
        data: e.target.result,
        name: file.name,
        timestamp: Date.now(),
        label: '',
        source: 'upload',
        isCover: window.currentPhotos.retail.length === 0 // First photo is cover by default
      });
      displayRetailPhotos();
    };
    reader.readAsDataURL(file);
  });

  // Clear input
  event.target.value = '';
}

function displayRetailPhotos() {
  const grid = document.getElementById('retailPhotoGrid');
  const countEl = document.getElementById('retailPhotoCount');
  const section = document.getElementById('retailPhotoSection');
  
  if (!grid) return;

  const photos = window.currentPhotos?.retail || [];

  // Update count
  if (countEl) {
    countEl.textContent = photos.length + (photos.length === 1 ? ' photo' : ' photos');
  }

  // Show/hide section
  if (section) {
    section.style.display = photos.length > 0 ? 'block' : 'none';
  }

  // Build grid - matching Materials/Labor structure
  grid.innerHTML = photos.map((photo, index) => `
    <div class="photo-item">
      <input type="checkbox" class="photo-checkbox" id="retail-photo-${index}" onchange="togglePhotoSelection('retail', ${index}, this.checked)">
      <img src="${photo.data}" alt="${photo.name || 'Photo ' + (index + 1)}">
      <div class="photo-filename">${photo.name || 'Photo ' + (index + 1)}</div>
      <div class="photo-label-input">
        <input type="text" placeholder="Add label..." value="${photo.label || ''}" onchange="updatePhotoLabel('retail', ${index}, this.value)">
      </div>
      <button class="set-cover-btn ${photo.isCover ? 'is-cover' : ''}" onclick="setCoverPhoto('retail', ${index})">
        ${photo.isCover ? '★ Cover' : 'Set as Cover'}
      </button>
    </div>
  `).join('');
}

function updatePhotoLabel(type, index, label) {
  if (window.currentPhotos && window.currentPhotos[type] && window.currentPhotos[type][index]) {
    window.currentPhotos[type][index].label = label;
  }
}
