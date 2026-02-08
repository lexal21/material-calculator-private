// Project Management System
// Handles saving/loading calculator sessions to localStorage

const PROJECT_STORAGE_KEY = 'calculator-projects';
const CURRENT_SESSION_KEY = 'calculator-current-session';

// ============================================
// PROJECT DATA MANAGEMENT
// ============================================

// Get current calculator state
function getCurrentProjectData() {
  return {
    timestamp: Date.now(),
    // PDF Data
    pdfData: window.currentPDFData || null,
    materialsData: window.materialsData || [],
    laborData: window.laborData || null,
    measurements: window.currentMeasurements || null,
    rawMeasurements: window.currentRawMeasurements || null,
    
    // Customer Info
    customerName: document.getElementById('customerName')?.value || '',
    shingleColor: document.getElementById('shingleColorInput')?.value || '',
    jobNumber: document.getElementById('jobNumber')?.value || window.currentJobNumber || '',
    
    // Misc Items
    miscTotals: window.miscTotals || [],
    miscItemCount: window.miscItemCount || 3,
    miscItems: getMiscItemsData(),
    
    // Settings
    taxRate: window.taxRate || 9,
    currentTab: getCurrentActiveTab(),
    
    // Labor Location
    laborLocation: document.getElementById('laborLocation')?.value || 'Out of Area',
    
    // Photos (store in window.currentPhotos)
    photos: window.currentPhotos || {
      materials: [],
      labor: []
    }
  };
}

// Get misc items data
function getMiscItemsData() {
  const items = [];
  const count = window.miscItemCount || 3;
  
  for (let i = 1; i <= count; i++) {
    const itemSelect = document.getElementById(`miscItem${i}`);
    const qtyInput = document.getElementById(`miscQty${i}`);
    const priceInput = document.getElementById(`miscPrice${i}`);
    
    if (itemSelect && qtyInput && priceInput) {
      items.push({
        item: itemSelect.value,
        quantity: parseFloat(qtyInput.value) || 0,
        price: parseFloat(priceInput.value) || 0
      });
    }
  }
  
  return items;
}

// Get current active tab
function getCurrentActiveTab() {
  const tabs = document.querySelectorAll('.tab-btn');
  for (let tab of tabs) {
    if (tab.classList.contains('active')) {
      return tab.getAttribute('data-tab');
    }
  }
  return 'upload';
}

// ============================================
// AUTO-SAVE CURRENT SESSION
// ============================================

// Save current session (auto-save)
function saveCurrentSession() {
  try {
    const data = getCurrentProjectData();
    
    // Only save if we have actual data
    if (!data.pdfData && (!data.materialsData || data.materialsData.length === 0)) {
      console.log('No data to save yet');
      return;
    }
    
    localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(data));
    console.log('âœ“ Session auto-saved:', {
      materials: data.materialsData?.length || 0,
      customer: data.customerName || 'None',
      hasLabor: !!data.laborData
    });
  } catch (e) {
    console.error('Failed to save session:', e);
  }
}

// Load current session on page load
function loadCurrentSession() {
  try {
    const stored = localStorage.getItem(CURRENT_SESSION_KEY);
    if (!stored) {
      console.log('No previous session to restore');
      return false;
    }
    
    console.log('Found saved session, attempting to restore...');
    const data = JSON.parse(stored);
    
    // Wait a moment for DOM to be fully ready
    setTimeout(() => {
      restoreProjectData(data);
      console.log('Session restored successfully!');
    }, 100);
    
    return true;
  } catch (e) {
    console.error('Failed to load session:', e);
    return false;
  }
}

// Restore project data to UI
function restoreProjectData(data) {
  // Restore global data
  window.currentPDFData = data.pdfData;
  window.materialsData = data.materialsData || [];
  window.laborData = data.laborData;
  window.currentMeasurements = data.measurements;
  window.currentRawMeasurements = data.rawMeasurements;
  window.miscTotals = data.miscTotals || [];
  window.miscItemCount = data.miscItemCount || 3;
  window.taxRate = data.taxRate || 9;
  window.currentJobNumber = data.jobNumber;
  
  // Restore photos
  window.currentPhotos = data.photos || { materials: [], labor: [] };
  
  // Show results if we have data
  if (data.pdfData && data.materialsData.length > 0) {
    // Restore materials tab
    if (typeof displayResults === 'function') {
      displayResults(data.pdfData);
    }
    
    // Switch to calculator tab to show results
    if (typeof switchTab === 'function') {
      switchTab('calculator');
    }
    
    // Make sure results are visible
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) {
      resultsDiv.style.display = 'block';
    }
    
    // Restore customer info
    if (document.getElementById('customerName')) {
      document.getElementById('customerName').value = data.customerName || '';
    }
    if (document.getElementById('shingleColorInput')) {
      document.getElementById('shingleColorInput').value = data.shingleColor || '';
    }
    if (document.getElementById('jobNumber')) {
      document.getElementById('jobNumber').value = data.jobNumber || '';
    }
    
    // Restore tax rate
    if (document.getElementById('taxRateInput')) {
      document.getElementById('taxRateInput').value = data.taxRate || 9;
    }
    
    // Restore misc items
    if (data.miscItems) {
      data.miscItems.forEach((item, index) => {
        const i = index + 1;
        const itemSelect = document.getElementById(`miscItem${i}`);
        const qtyInput = document.getElementById(`miscQty${i}`);
        const priceInput = document.getElementById(`miscPrice${i}`);
        
        if (itemSelect && qtyInput && priceInput) {
          itemSelect.value = item.item;
          qtyInput.value = item.quantity;
          priceInput.value = item.price.toFixed(2);
          if (typeof updateMiscRow === 'function') {
            updateMiscRow(i);
          }
        }
      });
    }
    
    // Restore labor data
    if (data.laborData && typeof displayLaborResults === 'function') {
      displayLaborResults(data.pdfData);
      if (document.getElementById('laborLocation')) {
        document.getElementById('laborLocation').value = data.laborLocation || 'Out of Area';
      }
    }
    
    // Switch to saved tab
    if (data.currentTab && typeof switchTab === 'function') {
      switchTab(data.currentTab);
    }
    
    // Recalculate totals
    if (typeof recalculateTotals === 'function') {
      recalculateTotals();
    }
    
    // Display photos
    setTimeout(() => {
      if (typeof displayMaterialsPhotos === 'function') {
        displayMaterialsPhotos();
      }
      if (typeof displayLaborPhotos === 'function') {
        displayLaborPhotos();
      }
    }, 200);
  }
}

// ============================================
// SAVED PROJECTS MANAGEMENT
// ============================================

// Get all saved projects
function getSavedProjects() {
  try {
    const stored = localStorage.getItem(PROJECT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Failed to load projects:', e);
    return [];
  }
}

// Save projects list
function saveProjectsList(projects) {
  try {
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save projects list:', e);
  }
}

// Save current project with a name
function saveProjectAs(projectName) {
  if (!projectName || !projectName.trim()) {
    alert('Please enter a project name');
    return false;
  }
  
  const data = getCurrentProjectData();
  const projects = getSavedProjects();
  
  const newProject = {
    id: 'project-' + Date.now(),
    name: projectName.trim(),
    savedAt: Date.now(),
    customerName: data.customerName || 'Unknown',
    data: data
  };
  
  projects.unshift(newProject); // Add to beginning
  
  // Keep only last 20 projects
  if (projects.length > 20) {
    projects.length = 20;
  }
  
  saveProjectsList(projects);
  populateProjectDropdown();
  
  return true;
}

// Load a saved project
function loadProject(projectId) {
  if (projectId === 'current') {
    // Reload current session
    loadCurrentSession();
    return;
  }
  
  const projects = getSavedProjects();
  const project = projects.find(p => p.id === projectId);
  
  if (!project) {
    alert('Project not found');
    return;
  }
  
  // Confirm if there's unsaved work
  if (window.materialsData && window.materialsData.length > 0) {
    if (!confirm(`Load "${project.name}"? Current work will be saved as "Current Session".`)) {
      return;
    }
  }
  
  // Save current as session before switching
  saveCurrentSession();
  
  // Load project data
  restoreProjectData(project.data);
  
  // Update dropdown selection
  const dropdown = document.getElementById('projectDropdown');
  if (dropdown) {
    dropdown.value = projectId;
  }
}

// Delete a saved project
function deleteProject(projectId) {
  const projects = getSavedProjects();
  const project = projects.find(p => p.id === projectId);
  
  if (!project) return;
  
  if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) {
    return;
  }
  
  const filtered = projects.filter(p => p.id !== projectId);
  saveProjectsList(filtered);
  populateProjectDropdown();
}

// Start new project (clear everything)
function startNewProject() {
  if (window.materialsData && window.materialsData.length > 0) {
    if (!confirm('Start new project? Current work will be saved to "Current Session".')) {
      return;
    }
    
    // Save current session
    saveCurrentSession();
  }
  
  // Clear all data
  window.currentPDFData = null;
  window.materialsData = [];
  window.laborData = null;
  window.currentMeasurements = null;
  window.currentRawMeasurements = null;
  window.miscTotals = [];
  window.miscItemCount = 3;
  window.taxRate = 9;
  window.currentJobNumber = '';
  
  // Hide results
  const resultsDiv = document.getElementById('results');
  if (resultsDiv) {
    resultsDiv.style.display = 'none';
  }
  
  const laborResultsDiv = document.getElementById('laborResults');
  if (laborResultsDiv) {
    laborResultsDiv.style.display = 'none';
  }
  
  const laborNotReadyDiv = document.getElementById('laborNotReady');
  if (laborNotReadyDiv) {
    laborNotReadyDiv.style.display = 'block';
  }
  
  // Clear file input
  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.value = '';
  }
  
  // Clear form inputs
  const customerNameInput = document.getElementById('customerName');
  if (customerNameInput) customerNameInput.value = '';
  
  const shingleColorInput = document.getElementById('shingleColorInput');
  if (shingleColorInput) shingleColorInput.value = '';
  
  const jobNumberInput = document.getElementById('jobNumber');
  if (jobNumberInput) jobNumberInput.value = '';
  
  const taxRateInput = document.getElementById('taxRateInput');
  if (taxRateInput) taxRateInput.value = '9';
  
  // Switch to home tab (upload screen)
  if (typeof switchTab === 'function') {
    switchTab('home');
  }
  
  // Update dropdown
  const dropdown = document.getElementById('projectDropdown');
  if (dropdown) {
    dropdown.value = '';
  }
  
  console.log('âœ“ Started new project - ready for upload');
}

// ============================================
// UI FUNCTIONS
// ============================================

// Populate project dropdown
function populateProjectDropdown() {
  const dropdown = document.getElementById('projectDropdown');
  if (!dropdown) return;
  
  const projects = getSavedProjects();
  
  // Clear and rebuild
  dropdown.innerHTML = '<option value="">Select Project...</option>';
  
  // Add current session option if exists
  const currentSession = localStorage.getItem(CURRENT_SESSION_KEY);
  if (currentSession) {
    const option = document.createElement('option');
    option.value = 'current';
    option.textContent = '>> Current Session (auto-saved)';
    dropdown.appendChild(option);
  }
  
  // Add saved projects
  projects.forEach(project => {
    const option = document.createElement('option');
    option.value = project.id;
    const date = new Date(project.savedAt).toLocaleDateString();
    option.textContent = `${project.name} - ${project.customerName} (${date})`;
    dropdown.appendChild(option);
  });
}

// Show save project dialog
function showSaveProjectDialog() {
  const projectName = prompt('Enter project name:', window.currentRawMeasurements?.address || 'New Project');
  if (projectName && projectName.trim()) {
    if (saveProjectAs(projectName)) {
      alert('Project saved successfully!');
    }
  }
}


// Show delete project dialog
function showDeleteProjectDialog() {
  const dropdown = document.getElementById('projectDropdown');
  if (!dropdown || !dropdown.value) {
    alert('Please select a project to delete from the dropdown.');
    return;
  }
  
  const projectId = dropdown.value;
  
  if (projectId === 'current') {
    if (!confirm('Delete current auto-saved session? This cannot be undone.')) {
      return;
    }
    localStorage.removeItem(CURRENT_SESSION_KEY);
    populateProjectDropdown();
    alert('Current session deleted.');
    return;
  }
  
  deleteProject(projectId);
}

// Handle project dropdown change
function onProjectDropdownChange() {
  const dropdown = document.getElementById('projectDropdown');
  if (!dropdown || !dropdown.value) return;
  
  loadProject(dropdown.value);
}

// Make it globally accessible
window.onProjectDropdownChange = onProjectDropdownChange;

// ============================================
// AUTO-SAVE SETUP
// ============================================

// Set up auto-save on changes
function setupAutoSave() {
  // Save on material changes
  if (typeof updateMaterialRow !== 'undefined') {
    const originalUpdateMaterialRow = window.updateMaterialRow;
    window.updateMaterialRow = function(...args) {
      originalUpdateMaterialRow.apply(this, args);
      saveCurrentSession();
    };
  }
  
  // Save on misc changes
  if (typeof updateMiscRow !== 'undefined') {
    const originalUpdateMiscRow = window.updateMiscRow;
    window.updateMiscRow = function(...args) {
      originalUpdateMiscRow.apply(this, args);
      saveCurrentSession();
    };
  }
  
  // Save on labor changes
  if (typeof updateLaborRow !== 'undefined') {
    const originalUpdateLaborRow = window.updateLaborRow;
    window.updateLaborRow = function(...args) {
      originalUpdateLaborRow.apply(this, args);
      saveCurrentSession();
    };
  }
  
  // Save on customer info changes
  ['customerName', 'shingleColorInput', 'jobNumber', 'taxRateInput'].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', saveCurrentSession);
      element.addEventListener('blur', saveCurrentSession);
    }
  });
  
  // Save when PDF is uploaded
  const originalDisplayResults = window.displayResults;
  if (originalDisplayResults) {
    window.displayResults = function(...args) {
      originalDisplayResults.apply(this, args);
      setTimeout(saveCurrentSession, 500); // Give time for data to populate
    };
  }
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  // Try to restore previous session
  const restored = loadCurrentSession();
  
  // Populate dropdown
  populateProjectDropdown();
  
  // Setup auto-save
  setupAutoSave();
  
  console.log('Project Manager initialized', restored ? '(session restored)' : '(no previous session)');
});

// Helper methods for photo functions
function getCurrentProject() {
  // Initialize window.currentPhotos if it doesn't exist
  if (!window.currentPhotos) {
    window.currentPhotos = { materials: [], labor: [] };
  }
  
  // Return an object that references window.currentPhotos
  // This way modifications to photos persist
  return {
    photos: window.currentPhotos
  };
}

function saveCurrentProject() {
  saveCurrentSession();
}

// Expose functions globally
window.projectManager = {
  saveCurrentSession,
  loadCurrentSession,
  saveProjectAs,
  loadProject,
  deleteProject,
  startNewProject,
  showSaveProjectDialog,
  showDeleteProjectDialog,
  populateProjectDropdown,
  onProjectDropdownChange,
  getSavedProjects,
  getCurrentProject,
  saveCurrentProject
};
