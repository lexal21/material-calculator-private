// ===================================
// PHOTO UPLOAD FUNCTIONALITY
// ===================================

// Global state for photo selection
let selectedMaterialsPhotos = new Set();
let selectedLaborPhotos = new Set();

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
        timestamp: Date.now()
      });
      
      projectManager.saveCurrentProject();
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
        timestamp: Date.now()
      });
      
      projectManager.saveCurrentProject();
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
  const grid = document.getElementById('materialsPhotoGrid');
  const printGrid = document.getElementById('materialsPrintPhotos');
  const photoSection = document.getElementById('materialsPhotoSection');
  const photoCount = document.getElementById('materialsPhotoCount');
  
  if (photos.length === 0) {
    grid.innerHTML = '<p style="color: #718096; padding: 16px;">No photos uploaded yet.</p>';
    printGrid.innerHTML = '';
    photoSection.style.display = 'none';
    return;
  }
  
  // Show photo section
  photoSection.style.display = 'block';
  
  // Update photo count
  photoCount.textContent = `${photos.length} photo${photos.length !== 1 ? 's' : ''}`;
  
  // Web view (with controls)
  grid.innerHTML = photos.map((photo, idx) => `
    <div class="photo-item" data-photo-idx="${idx}">
      <input type="checkbox" 
             class="photo-checkbox" 
             data-photo-idx="${idx}"
             onchange="togglePhotoSelection('materials', ${idx}, this.checked)">
      <img src="${photo.data}" alt="${photo.name}">
      <div class="photo-item-name" title="${photo.name}">
        ${photo.name}
      </div>
    </div>
  `).join('');
  
  // Print view (no controls, clean layout)
  printGrid.innerHTML = photos.map(photo => `
    <div class="print-photo-item">
      <img src="${photo.data}" alt="${photo.name}">
      <div class="print-photo-name">${photo.name}</div>
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
    <div class="photo-item" data-photo-idx="${idx}">
      <input type="checkbox" 
             class="photo-checkbox" 
             data-photo-idx="${idx}"
             onchange="togglePhotoSelection('labor', ${idx}, this.checked)">
      <img src="${photo.data}" alt="${photo.name}">
      <div class="photo-item-name" title="${photo.name}">
        ${photo.name}
      </div>
    </div>
  `).join('');
  
  // Print view (no controls, clean layout)
  printGrid.innerHTML = photos.map(photo => `
    <div class="print-photo-item">
      <img src="${photo.data}" alt="${photo.name}">
      <div class="print-photo-name">${photo.name}</div>
    </div>
  `).join('');
  
  // Update delete button state
  document.getElementById('deleteLaborPhotosBtn').disabled = 
    selectedLaborPhotos.size === 0;
}

// Toggle photo selection
function togglePhotoSelection(tab, idx, selected) {
  const set = tab === 'materials' ? selectedMaterialsPhotos : selectedLaborPhotos;
  
  if (selected) {
    set.add(idx);
  } else {
    set.delete(idx);
  }
  
  // Update delete button
  const btnId = tab === 'materials' ? 'deleteMaterialsPhotosBtn' : 'deleteLaborPhotosBtn';
  document.getElementById(btnId).disabled = set.size === 0;
}

// Delete selected photos
function deleteSelectedPhotos(tab) {
  const set = tab === 'materials' ? selectedMaterialsPhotos : selectedLaborPhotos;
  
  if (set.size === 0) return;
  
  const confirm = window.confirm(
    `Delete ${set.size} selected photo${set.size > 1 ? 's' : ''}?`
  );
  
  if (!confirm) return;
  
  const project = projectManager.getCurrentProject();
  const key = tab === 'materials' ? 'materials' : 'labor';
  
  // Remove selected photos (iterate backwards to preserve indices)
  const photos = project.photos[key];
  const toDelete = Array.from(set).sort((a, b) => b - a);
  toDelete.forEach(idx => photos.splice(idx, 1));
  
  projectManager.saveCurrentProject();
  set.clear();
  
  // Refresh display
  if (tab === 'materials') {
    displayMaterialsPhotos();
  } else {
    displayLaborPhotos();
  }
}
