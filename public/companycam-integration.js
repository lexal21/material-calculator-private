// CompanyCam Integration Module
// Handles photo import from CompanyCam API

let companyCamProjects = [];
let companyCamPhotos = [];
let selectedPhotoIds = new Set();

// Initialize CompanyCam integration
function initCompanyCam() {
  console.log('[CompanyCam] Integration initialized');
}

// Open CompanyCam import modal
async function openCompanyCamModal(tab) {
  console.log('[CompanyCam] Opening modal for tab:', tab);
  
  const modal = document.getElementById('companycam-modal');
  const modalTab = document.getElementById('companycam-modal-tab');
  
  if (!modal || !modalTab) {
    console.error('[CompanyCam] Modal elements not found');
    return;
  }
  
  modalTab.textContent = tab === 'materials' ? 'Materials' : 'Labor';
  modal.dataset.tab = tab;
  modal.style.display = 'flex';
  
  // Load projects
  await loadCompanyCamProjects();
}

// Close CompanyCam modal
function closeCompanyCamModal() {
  const modal = document.getElementById('companycam-modal');
  if (modal) {
    modal.style.display = 'none';
    selectedPhotoIds.clear();
    updateImportButtonState();
  }
}

// Load projects from CompanyCam
async function loadCompanyCamProjects() {
  const projectsList = document.getElementById('companycam-projects-list');
  const loadingEl = document.getElementById('companycam-loading');
  const errorEl = document.getElementById('companycam-error');
  
  if (!projectsList) return;
  
  try {
    loadingEl.style.display = 'block';
    errorEl.style.display = 'none';
    projectsList.innerHTML = '';
    
    const response = await fetch('/api/companycam/projects');
    if (!response.ok) throw new Error('Failed to load projects');
    
    const data = await response.json();
    companyCamProjects = data.results || data || [];
    
    console.log('[CompanyCam] Loaded projects:', companyCamProjects.length);
    
    if (companyCamProjects.length === 0) {
      projectsList.innerHTML = '<div class="companycam-empty">No projects found</div>';
      loadingEl.style.display = 'none';
      return;
    }
    
    // Create project cards
    companyCamProjects.forEach(project => {
      const card = document.createElement('div');
      card.className = 'companycam-project-card';
      card.onclick = () => selectCompanyCamProject(project.id, project.name);
      
      card.innerHTML = `
        <div class="companycam-project-name">${project.name || 'Unnamed Project'}</div>
        <div class="companycam-project-meta">
          <span>${project.photos_count || 0} photos</span>
        </div>
      `;
      
      projectsList.appendChild(card);
    });
    
    loadingEl.style.display = 'none';
  } catch (error) {
    console.error('[CompanyCam] Error loading projects:', error);
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
    errorEl.textContent = 'Failed to load projects. Please try again.';
  }
}

// Select a project and load its photos
async function selectCompanyCamProject(projectId, projectName) {
  console.log('[CompanyCam] Selected project:', projectId);
  
  const projectsView = document.getElementById('companycam-projects-view');
  const photosView = document.getElementById('companycam-photos-view');
  const projectNameEl = document.getElementById('companycam-selected-project-name');
  const photosList = document.getElementById('companycam-photos-list');
  const loadingEl = document.getElementById('companycam-photos-loading');
  const errorEl = document.getElementById('companycam-photos-error');
  
  // Switch to photos view
  projectsView.style.display = 'none';
  photosView.style.display = 'block';
  projectNameEl.textContent = projectName || 'Loading...';
  
  selectedPhotoIds.clear();
  updateImportButtonState();
  
  try {
    loadingEl.style.display = 'block';
    errorEl.style.display = 'none';
    photosList.innerHTML = '';
    
    const response = await fetch(`/api/companycam/photos/${projectId}`);
    if (!response.ok) throw new Error('Failed to load photos');
    
    const data = await response.json();
    companyCamPhotos = data.results || data || [];
    
    console.log('[CompanyCam] Loaded photos:', companyCamPhotos.length);
    
    if (companyCamPhotos.length === 0) {
      photosList.innerHTML = '<div class="companycam-empty">No photos found in this project</div>';
      loadingEl.style.display = 'none';
      return;
    }
    
    // Create photo grid
    companyCamPhotos.forEach(photo => {
      const card = document.createElement('div');
      card.className = 'companycam-photo-card';
      card.dataset.photoId = photo.id;
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'companycam-photo-checkbox';
      checkbox.onchange = (e) => {
        e.stopPropagation();
        togglePhotoSelection(photo.id);
      };
      
      const img = document.createElement('img');
      img.src = photo.uris?.thumbnail || photo.uris?.small || photo.uris?.large || '';
      img.alt = photo.caption || 'Photo';
      img.loading = 'lazy';
      
      card.appendChild(checkbox);
      card.appendChild(img);
      
      if (photo.caption) {
        const caption = document.createElement('div');
        caption.className = 'companycam-photo-caption';
        caption.textContent = photo.caption;
        card.appendChild(caption);
      }
      
      card.onclick = () => {
        checkbox.checked = !checkbox.checked;
        togglePhotoSelection(photo.id);
      };
      
      photosList.appendChild(card);
    });
    
    loadingEl.style.display = 'none';
  } catch (error) {
    console.error('[CompanyCam] Error loading photos:', error);
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
    errorEl.textContent = 'Failed to load photos. Please try again.';
  }
}

// Toggle photo selection
function togglePhotoSelection(photoId) {
  if (selectedPhotoIds.has(photoId)) {
    selectedPhotoIds.delete(photoId);
  } else {
    selectedPhotoIds.add(photoId);
  }
  
  updateImportButtonState();
}

// Update import button state
function updateImportButtonState() {
  const importBtn = document.getElementById('companycam-import-btn');
  const countEl = document.getElementById('companycam-selected-count');
  
  if (importBtn && countEl) {
    const count = selectedPhotoIds.size;
    importBtn.disabled = count === 0;
    countEl.textContent = count;
  }
}

// Go back to projects list
function backToCompanyCamProjects() {
  const projectsView = document.getElementById('companycam-projects-view');
  const photosView = document.getElementById('companycam-photos-view');
  
  projectsView.style.display = 'block';
  photosView.style.display = 'none';
  
  selectedPhotoIds.clear();
  updateImportButtonState();
}

// Import selected photos
async function importCompanyCamPhotos() {
  const modal = document.getElementById('companycam-modal');
  const tab = modal.dataset.tab;
  const importBtn = document.getElementById('companycam-import-btn');
  const originalText = importBtn.textContent;
  
  if (selectedPhotoIds.size === 0) return;
  
  try {
    importBtn.disabled = true;
    importBtn.textContent = 'Importing...';
    
    const selectedPhotos = companyCamPhotos.filter(p => selectedPhotoIds.has(p.id));
    
    console.log('[CompanyCam] Importing', selectedPhotos.length, 'photos to', tab);
    
    // Download and convert photos
    for (const photo of selectedPhotos) {
      const imageUrl = photo.uris?.large || photo.uris?.original || photo.uris?.small;
      if (!imageUrl) continue;
      
      try {
        // Fetch the image
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        // Convert to base64
        const base64 = await blobToBase64(blob);
        
        // Add to current photos
        const project = projectManager.getCurrentProject();
        if (!project.photos) {
          project.photos = { materials: [], labor: [] };
        }
        
        const photoData = {
          data: base64,
          name: photo.caption || `CompanyCam_${photo.id}.jpg`,
          timestamp: Date.now(),
          label: photo.caption || '',
          source: 'companycam',
          companycamId: photo.id
        };
        
        if (tab === 'materials') {
          project.photos.materials.push(photoData);
        } else {
          project.photos.labor.push(photoData);
        }
        
        console.log('[CompanyCam] Imported photo:', photoData.name);
      } catch (error) {
        console.error('[CompanyCam] Error importing photo:', error);
      }
    }
    
    // Save project
    projectManager.saveCurrentProject();
    
    // Refresh displays
    if (tab === 'materials') {
      displayMaterialsPhotos();
    } else {
      displayLaborPhotos();
    }
    
    // Close modal
    closeCompanyCamModal();
    
    console.log('[CompanyCam] Import complete');
  } catch (error) {
    console.error('[CompanyCam] Import error:', error);
    alert('Failed to import some photos. Please try again.');
  } finally {
    importBtn.disabled = false;
    importBtn.textContent = originalText;
  }
}

// Helper: Convert blob to base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Initialize on page load
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', initCompanyCam);
  
  // Expose functions globally
  window.openCompanyCamModal = openCompanyCamModal;
  window.closeCompanyCamModal = closeCompanyCamModal;
  window.backToCompanyCamProjects = backToCompanyCamProjects;
  window.importCompanyCamPhotos = importCompanyCamPhotos;
}
