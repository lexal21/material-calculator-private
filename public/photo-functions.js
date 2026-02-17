// ===================================
// PHOTO UPLOAD FUNCTIONALITY
// ===================================

// Global state for photo selection
let selectedMaterialsPhotos = new Set();
let selectedLaborPhotos = new Set();
let selectedRetailPhotos = new Set();

// Compress and convert image to base64
async function compressAndStoreImage(file, maxWidth = 1200, maxHeight = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate aspect ratio
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        
        resolve(compressed);
      };
      
      img.onerror = reject;
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Check localStorage usage
function getStorageUsage() {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return {
    used: total,
    usedMB: (total / (1024 * 1024)).toFixed(2),
    percentUsed: ((total / (5 * 1024 * 1024)) * 100).toFixed(1)
  };
}

// Check storage before upload
function checkStorageBeforeUpload(estimatedSize) {
  const usage = getStorageUsage();
  const availableBytes = (5 * 1024 * 1024) - usage.used;
  
  if (estimatedSize > availableBytes) {
    alert(`Storage almost full (${usage.percentUsed}% used). Please delete old photos or projects.`);
    return false;
  }
  
  if (usage.percentUsed > 80) {
    const confirm = window.confirm(
      `Storage ${usage.percentUsed}% full. Continue uploading?\n\n` +
      `Tip: Delete old projects or photos to free space.`
    );
    return confirm;
  }
  
  return true;
}

// Handle materials photo upload
async function handleMaterialsPhotos(event) {
  const files = Array.from(event.target.files);
  
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      alert(`${file.name} is not an image file.`);
      continue;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      alert(`${file.name} is too large. Max 10MB.`);
      continue;
    }
    
    try {
      const base64 = await compressAndStoreImage(file);
      
      // Check storage
      if (!checkStorageBeforeUpload(base64.length)) {
        break;
      }
      
      // Add to project
      const project = projectManager.getCurrentProject();
      if (!project.photos) project.photos = {};
      if (!project.photos.materials) project.photos.materials = [];
      
      project.photos.materials.push({
        data: base64,
        name: file.name,
        timestamp: Date.now(),
        label: ''
      });
      
      console.log('Photo added. Total materials photos:', project.photos.materials.length);
      projectManager.saveCurrentProject();
      console.log('Project saved');
    } catch (err) {
      console.error('Photo upload error:', err);
      alert(`Failed to upload ${file.name}`);
    }
  }
  
  // Reset input and refresh display
  event.target.value = '';
  displayMaterialsPhotos();
}

// Handle labor photo upload
async function handleLaborPhotos(event) {
  const files = Array.from(event.target.files);
  
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      alert(`${file.name} is not an image file.`);
      continue;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      alert(`${file.name} is too large. Max 10MB.`);
      continue;
    }
    
    try {
      const base64 = await compressAndStoreImage(file);
      
      // Check storage
      if (!checkStorageBeforeUpload(base64.length)) {
        break;
      }
      
      // Add to project
      const project = projectManager.getCurrentProject();
      if (!project.photos) project.photos = {};
      if (!project.photos.labor) project.photos.labor = [];
      
      project.photos.labor.push({
        data: base64,
        name: file.name,
        timestamp: Date.now(),
        label: ''
      });
      
      console.log('Photo added. Total labor photos:', project.photos.labor.length);
      projectManager.saveCurrentProject();
      console.log('Project saved');
    } catch (err) {
      console.error('Photo upload error:', err);
      alert(`Failed to upload ${file.name}`);
    }
  }
  
  // Reset input and refresh display
  event.target.value = '';
  displayLaborPhotos();
}

// Display materials photos
function displayMaterialsPhotos() {
  const project = projectManager.getCurrentProject();
  const photos = project.photos?.materials || [];
  console.log('displayMaterialsPhotos called. Materials photo count:', photos.length);
  console.log('window.currentPhotos:', window.currentPhotos);
  const grid = document.getElementById('materialsPhotoGrid');
  const printGrid = document.getElementById('materialsPrintPhotos');
  const photoSection = document.getElementById('materialsPhotoSection');
  const photoCount = document.getElementById('materialsPhotoCount');
  
  // Always show photo section (don't hide it)
  if (photoSection) {
    photoSection.style.display = 'block';
  }
  
  if (photos.length === 0) {
    grid.innerHTML = '<p style="color: #718096; padding: 16px;">No photos uploaded yet.</p>';
    printGrid.innerHTML = '';
    return;
  }
  
  // Update photo count
  photoCount.textContent = `${photos.length} photo${photos.length !== 1 ? 's' : ''}`;
  
  // Web view (with controls)
  grid.innerHTML = photos.map((photo, idx) => `
    <div class="photo-item">
      <input type="checkbox" 
             class="photo-checkbox" 
             id="materials-photo-${idx}"
             data-photo-index="${idx}"
             data-photo-type="materials"
             onchange="togglePhotoSelection('materials', ${idx}, this.checked)">
      <img src="${photo.data}" alt="${photo.name}">
      <div class="photo-item-name" title="${photo.name}">
        ${photo.name}
      </div>
      <input type="text" 
             class="photo-label-input" 
             placeholder="Add label..."
             value="${photo.label || ''}"
             onchange="updatePhotoLabel('materials', ${idx}, this.value)">
      <button class="btn-cover-photo ${photo.isCover ? 'is-cover' : ''}" 
              onclick="setCoverPhoto('materials', ${idx})">
        ${photo.isCover ? '★ Cover Photo' : 'Set as Cover'}
      </button>
    </div>
  `).join('');
  
  // Print view (no controls, clean layout)
  printGrid.innerHTML = photos.map(photo => `
    <div class="print-photo-item">
      <img src="${photo.data}" alt="${photo.name}">
      <div class="print-photo-name">${photo.name}</div>
      ${photo.label ? `<div class="print-photo-label">${photo.label}</div>` : ''}
    </div>
  `).join('');
  
  // Update delete button state
  document.getElementById('deleteMaterialsPhotosBtn').disabled = 
    selectedMaterialsPhotos.size === 0;
}

// Display labor photos
function displayLaborPhotos() {
  const project = projectManager.getCurrentProject();
  const photos = project.photos?.labor || [];
  const grid = document.getElementById('laborPhotoGrid');
  const printGrid = document.getElementById('laborPrintPhotos');
  const photoCount = document.getElementById('laborPhotoCount');
  
  if (photos.length === 0) {
    grid.innerHTML = '<p style="color: #718096; padding: 16px;">No photos uploaded yet.</p>';
    printGrid.innerHTML = '';
    return;
  }
  
  // Update photo count
  photoCount.textContent = `${photos.length} photo${photos.length !== 1 ? 's' : ''}`;
  
  // Web view (with controls)
  grid.innerHTML = photos.map((photo, idx) => `
    <div class="photo-item">
      <input type="checkbox" 
             class="photo-checkbox" 
             id="labor-photo-${idx}"
             data-photo-index="${idx}"
             data-photo-type="labor"
             onchange="togglePhotoSelection('labor', ${idx}, this.checked)">
      <img src="${photo.data}" alt="${photo.name}">
      <div class="photo-item-name" title="${photo.name}">
        ${photo.name}
      </div>
      <input type="text" 
             class="photo-label-input" 
             placeholder="Add label..."
             value="${photo.label || ''}"
             onchange="updatePhotoLabel('labor', ${idx}, this.value)">
      <button class="btn-cover-photo ${photo.isCover ? 'is-cover' : ''}" 
              onclick="setCoverPhoto('labor', ${idx})">
        ${photo.isCover ? '★ Cover Photo' : 'Set as Cover'}
      </button>
    </div>
  `).join('');
  
  // Print view (no controls, clean layout)
  printGrid.innerHTML = photos.map(photo => `
    <div class="print-photo-item">
      <img src="${photo.data}" alt="${photo.name}">
      <div class="print-photo-name">${photo.name}</div>
      ${photo.label ? `<div class="print-photo-label">${photo.label}</div>` : ''}
    </div>
  `).join('');
  
  // Update delete button state
  document.getElementById('deleteLaborPhotosBtn').disabled = 
    selectedLaborPhotos.size === 0;
}

// Toggle photo selection
function togglePhotoSelection(type, index, isChecked) {
  let deleteBtnId;
  let checkboxSelector;
  
  if (type === 'materials') {
    deleteBtnId = 'deleteMaterialsPhotosBtn';
    checkboxSelector = '#materialsPhotoGrid .photo-checkbox:checked';
  } else if (type === 'labor') {
    deleteBtnId = 'deleteLaborPhotosBtn';
    checkboxSelector = '#laborPhotoGrid .photo-checkbox:checked';
  } else if (type === 'retail') {
    deleteBtnId = 'deleteRetailPhotosBtn';
    checkboxSelector = '#retailPhotoGrid .photo-checkbox:checked';
  }
  
  const deleteBtn = document.getElementById(deleteBtnId);
  const checkedCount = document.querySelectorAll(checkboxSelector).length;
  
  if (deleteBtn) {
    deleteBtn.disabled = checkedCount === 0;
    deleteBtn.style.opacity = checkedCount === 0 ? '0.5' : '1';
    deleteBtn.style.cursor = checkedCount === 0 ? 'not-allowed' : 'pointer';
  }
  
  // Update Select All button text
  let allCheckboxSelector;
  let selectAllBtnId;
  
  if (type === 'materials') {
    allCheckboxSelector = '#materialsPhotoGrid .photo-checkbox';
    selectAllBtnId = 'selectAllMaterialsPhotosBtn';
  } else if (type === 'labor') {
    allCheckboxSelector = '#laborPhotoGrid .photo-checkbox';
    selectAllBtnId = 'selectAllLaborPhotosBtn';
  } else if (type === 'retail') {
    allCheckboxSelector = '#retailPhotoGrid .photo-checkbox';
    selectAllBtnId = 'selectAllRetailPhotosBtn';
  }
  
  if (allCheckboxSelector && selectAllBtnId) {
    const allCheckboxes = document.querySelectorAll(allCheckboxSelector);
    const allChecked = allCheckboxes.length > 0 && Array.from(allCheckboxes).every(cb => cb.checked);
    const selectAllBtn = document.getElementById(selectAllBtnId);
    
    if (selectAllBtn) {
      selectAllBtn.textContent = allChecked ? 'Deselect All' : 'Select All';
    }
  }
}

// Delete selected photos
function deleteSelectedPhotos(type) {
  const checkboxes = document.querySelectorAll('.photo-checkbox[data-photo-type="' + type + '"]:checked');
  
  if (checkboxes.length === 0) {
    alert('No photos selected.');
    return;
  }
  
  if (!confirm('Delete ' + checkboxes.length + ' selected photo(s)?')) {
    return;
  }
  
  // Get indices in reverse order to avoid index shifting
  const indices = Array.from(checkboxes)
    .map(cb => parseInt(cb.dataset.photoIndex))
    .sort((a, b) => b - a);
  
  // Remove from array
  if (type === 'retail') {
    if (window.currentPhotos && window.currentPhotos[type]) {
      indices.forEach(index => {
        window.currentPhotos[type].splice(index, 1);
      });
    }
    // Clear selection set
    selectedRetailPhotos.clear();
    // Re-render
    displayRetailPhotos();
  } else {
    // Materials and Labor use projectManager
    const project = projectManager.getCurrentProject();
    const key = type === 'materials' ? 'materials' : 'labor';
    
    if (project.photos && project.photos[key]) {
      indices.forEach(index => {
        project.photos[key].splice(index, 1);
      });
    }
    
    projectManager.saveCurrentProject();
    
    // Clear selection sets
    if (type === 'materials') {
      selectedMaterialsPhotos.clear();
      displayMaterialsPhotos();
    } else if (type === 'labor') {
      selectedLaborPhotos.clear();
      displayLaborPhotos();
    }
  }
  
  console.log('[PHOTOS] Deleted', indices.length, 'photos from', type);
}

// Update photo label
function updatePhotoLabel(tab, idx, label) {
  const project = projectManager.getCurrentProject();
  if (!project.photos) return;
  
  if (tab === 'materials' && project.photos.materials && project.photos.materials[idx]) {
    project.photos.materials[idx].label = label;
  } else if (tab === 'labor' && project.photos.labor && project.photos.labor[idx]) {
    project.photos.labor[idx].label = label;
  }
  
  projectManager.saveCurrentProject();
  console.log(`Updated ${tab} photo ${idx} label:`, label);
}

// Set cover photo
function setCoverPhoto(tab, idx) {
  if (!window.currentPhotos || !window.currentPhotos[tab]) return;
  
  // Check if clicking the current cover (toggle off)
  const isCurrentCover = window.currentPhotos[tab][idx]?.isCover;
  
  // Clear existing cover for this tab
  window.currentPhotos[tab].forEach(p => p.isCover = false);
  
  // Set new cover only if it wasn't already the cover
  if (!isCurrentCover) {
    window.currentPhotos[tab][idx].isCover = true;
  }
  
  // Refresh display
  if (tab === 'materials') {
    displayMaterialsPhotos();
  } else if (tab === 'labor') {
    displayLaborPhotos();
  } else if (tab === 'retail') {
    displayRetailPhotos();
  }
  
  console.log('Set cover photo:', tab, idx, window.currentPhotos[tab][idx]?.isCover);
}

// Select all photos in a section
function selectAllPhotos(type) {
  let checkboxSelector;
  let deleteBtnId;
  
  if (type === 'materials') {
    checkboxSelector = '#materialsPhotoGrid .photo-checkbox';
    deleteBtnId = 'deleteMaterialsPhotosBtn';
  } else if (type === 'labor') {
    checkboxSelector = '#laborPhotoGrid .photo-checkbox';
    deleteBtnId = 'deleteLaborPhotosBtn';
  } else if (type === 'retail') {
    checkboxSelector = '#retailPhotoGrid .photo-checkbox';
    deleteBtnId = 'deleteRetailPhotosBtn';
  } else {
    return;
  }
  
  const checkboxes = document.querySelectorAll(checkboxSelector);
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  
  // Toggle: if all are checked, uncheck all; otherwise check all
  checkboxes.forEach(cb => {
    cb.checked = !allChecked;
  });
  
  // Update delete button
  const deleteBtn = document.getElementById(deleteBtnId);
  const anyChecked = document.querySelectorAll(checkboxSelector + ':checked').length > 0;
  
  if (deleteBtn) {
    deleteBtn.disabled = !anyChecked;
    deleteBtn.style.opacity = anyChecked ? '1' : '0.5';
    deleteBtn.style.cursor = anyChecked ? 'pointer' : 'not-allowed';
  }
  
  // Update button text
  const selectAllBtn = document.getElementById('selectAll' + type.charAt(0).toUpperCase() + type.slice(1) + 'PhotosBtn');
  if (selectAllBtn) {
    selectAllBtn.textContent = anyChecked ? 'Deselect All' : 'Select All';
  }
  
  console.log('[PHOTOS] ' + (anyChecked ? 'Selected' : 'Deselected') + ' all photos in', type);
}

// Expose functions globally
if (typeof window !== 'undefined') {
  window.updatePhotoLabel = updatePhotoLabel;
  window.setCoverPhoto = setCoverPhoto;
  window.selectAllPhotos = selectAllPhotos;
}

// Initialize photo displays on page load
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      if (typeof displayMaterialsPhotos === 'function') {
        displayMaterialsPhotos();
      }
      if (typeof displayLaborPhotos === 'function') {
        displayLaborPhotos();
      }
    }, 500);
  });
}
