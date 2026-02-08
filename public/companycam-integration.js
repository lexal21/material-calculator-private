// CompanyCam Integration Module
// Handles photo import from CompanyCam API

let companyCamProjects = [];
let companyCamPhotos = [];
let selectedPhotoIds = new Set();
let projectSearchQuery = '';
let currentPage = 1;
let isLoadingProjects = false;
let hasMoreProjects = true;
let searchTimeout = null;

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
  
  // Reset state
  currentPage = 1;
  companyCamProjects = [];
  hasMoreProjects = true;
  projectSearchQuery = '';
  
  modalTab.textContent = tab === 'materials' ? 'Materials' : 'Labor';
  modal.dataset.tab = tab;
  modal.style.display = 'flex';
  
  // Clear search box
  const searchBox = document.getElementById('companycam-project-search');
  if (searchBox) searchBox.value = '';
  
  // Load first page of projects
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
    
    console.log('[CompanyCam] Fetching page ' + currentPage + ' from API...');
    const response = await fetch('/api/companycam/projects?page=' + currentPage);
    if (!response.ok) {
      console.error('[CompanyCam] API returned error:', response.status);
      throw new Error('Failed to load projects');
    }
    
    const data = await response.json();
    const newProjects = data.projects || [];
    hasMoreProjects = data.hasMore;
    
    console.log('[CompanyCam] ✅ Page ' + currentPage + ': Loaded ' + newProjects.length + ' projects (hasMore: ' + hasMoreProjects + ')');
    
    companyCamProjects = newProjects; // First page only for now
    currentPage++;
    
    if (companyCamProjects.length === 0) {
      projectsList.innerHTML = '<div class="companycam-empty">No projects found</div>';
      loadingEl.style.display = 'none';
      return;
    }
    
    renderProjectsList(companyCamProjects);
    
    // Show/hide load more button
    const loadMoreBtn = document.getElementById('companycam-load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.style.display = hasMoreProjects ? 'block' : 'none';
    }
    
    loadingEl.style.display = 'none';
  } catch (error) {
    console.error('[CompanyCam] Error loading projects:', error);
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
    errorEl.textContent = 'Failed to load projects. Please try again.';
  }
}

// Load more projects (next page)
async function loadMoreCompanyCamProjects() {
  const projectsList = document.getElementById('companycam-projects-list');
  const loadingEl = document.getElementById('companycam-loading');
  const errorEl = document.getElementById('companycam-error');
  
  if (isLoadingProjects || !hasMoreProjects) return;
  
  try {
    isLoadingProjects = true;
    loadingEl.style.display = 'block';
    errorEl.style.display = 'none';
    
    console.log('[CompanyCam] Loading more projects (page ' + currentPage + ')...');
    
    // Include search query if active
    let url = '/api/companycam/projects?page=' + currentPage;
    if (projectSearchQuery) {
      url += '&search=' + encodeURIComponent(projectSearchQuery);
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to load more projects');
    }
    
    const data = await response.json();
    const newProjects = data.projects || [];
    hasMoreProjects = data.hasMore;
    
    console.log('[CompanyCam] ✅ Loaded ' + newProjects.length + ' more projects (total: ' + (companyCamProjects.length + newProjects.length) + ')');
    
    companyCamProjects = companyCamProjects.concat(newProjects);
    currentPage++;
    
    renderProjectsList(companyCamProjects);
    
    // Show/hide load more button
    const loadMoreBtn = document.getElementById('companycam-load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.style.display = hasMoreProjects ? 'block' : 'none';
    }
    
    loadingEl.style.display = 'none';
    isLoadingProjects = false;
  } catch (error) {
    console.error('[CompanyCam] Error loading more projects:', error);
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
    errorEl.textContent = 'Failed to load more projects.';
    isLoadingProjects = false;
  }
}

// Render projects list (no filtering - server handles it)
function renderProjectsList(projects) {
  const projectsList = document.getElementById('companycam-projects-list');
  if (!projectsList) return;
  
  projectsList.innerHTML = '';
  
  if (projects.length === 0) {
    projectsList.innerHTML = '<div class="companycam-empty">No projects found</div>';
    return;
  }
  
  // Create project cards
  projects.forEach(project => {
    const card = document.createElement('div');
    card.className = 'companycam-project-card';
    card.onclick = () => selectCompanyCamProject(project.id, project.name);
    
    const address = project.address ? 
      `${project.address.street_address_1 || ''}, ${project.address.city || ''}, ${project.address.state || ''}` : '';
    
    card.innerHTML = `
      <div class="companycam-project-name">${project.name || 'Unnamed Project'}</div>
      ${address ? `<div class="companycam-project-address">${address}</div>` : ''}
      <div class="companycam-project-meta">
        <span>${project.photo_count || 0} photos</span>
      </div>
    `;
    
    projectsList.appendChild(card);
  });
}

// Handle project search with debouncing
function searchCompanyCamProjects(query) {
  // Clear previous timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  // Wait 400ms after user stops typing
  searchTimeout = setTimeout(() => {
    executeCompanyCamSearch(query);
  }, 400);
}

// Execute the actual search
async function executeCompanyCamSearch(query) {
  projectSearchQuery = query;
  
  if (!query || query.trim() === '') {
    // No search - reload normal list
    currentPage = 1;
    companyCamProjects = [];
    hasMoreProjects = true;
    await loadCompanyCamProjects();
    return;
  }
  
  // Server-side search
  const projectsList = document.getElementById('companycam-projects-list');
  const loadingEl = document.getElementById('companycam-loading');
  const errorEl = document.getElementById('companycam-error');
  
  try {
    loadingEl.style.display = 'block';
    errorEl.style.display = 'none';
    projectsList.innerHTML = '';
    
    console.log('[CompanyCam] Searching for:', query);
    const response = await fetch('/api/companycam/projects?search=' + encodeURIComponent(query));
    if (!response.ok) {
      throw new Error('Search failed');
    }
    
    const data = await response.json();
    companyCamProjects = data.projects || [];
    hasMoreProjects = data.hasMore || false;
    
    const totalText = data.total ? ' (total: ' + data.total + ')' : '';
    console.log('[CompanyCam] Search found ' + companyCamProjects.length + ' projects' + totalText);
    
    if (companyCamProjects.length === 0) {
      projectsList.innerHTML = '<div class="companycam-empty">No projects match your search</div>';
    } else {
      renderProjectsList(companyCamProjects);
    }
    
    // Show/hide load more button based on hasMore
    const loadMoreBtn = document.getElementById('companycam-load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.style.display = hasMoreProjects ? 'block' : 'none';
    }
    
    loadingEl.style.display = 'none';
  } catch (error) {
    console.error('[CompanyCam] Search error:', error);
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
    errorEl.textContent = 'Search failed. Please try again.';
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
    // CompanyCam returns plain array
    companyCamPhotos = Array.isArray(data) ? data : (data.results || data.data || []);
    
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
      checkbox.id = 'companycam-photo-' + photo.id;
      checkbox.onchange = (e) => {
        e.stopPropagation();
        toggleCompanyCamPhotoSelection(photo.id);
      };
      
      // Find the best image URL from uris array
      const getPhotoUrl = (uris, preferredType = 'web') => {
        if (!Array.isArray(uris)) return '';
        const preferred = uris.find(u => u.type === preferredType);
        if (preferred) return preferred.uri || preferred.url || '';
        // Fallback to thumbnail or first available
        const thumbnail = uris.find(u => u.type === 'thumbnail');
        if (thumbnail) return thumbnail.uri || thumbnail.url || '';
        return uris[0]?.uri || uris[0]?.url || '';
      };
      
      const img = document.createElement('img');
      img.src = getPhotoUrl(photo.uris, 'thumbnail');
      img.alt = photo.description || 'Photo';
      img.loading = 'lazy';
      
      card.appendChild(checkbox);
      card.appendChild(img);
      
      if (photo.description) {
        const caption = document.createElement('div');
        caption.className = 'companycam-photo-caption';
        caption.textContent = photo.description;
        card.appendChild(caption);
      }
      
      card.onclick = (e) => {
        // Don't toggle if clicking the checkbox itself
        if (e.target === checkbox) return;
        
        checkbox.checked = !checkbox.checked;
        toggleCompanyCamPhotoSelection(photo.id);
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

// Toggle CompanyCam photo selection (in modal before import)
function toggleCompanyCamPhotoSelection(photoId) {
  try {
    const checkbox = document.getElementById('companycam-photo-' + photoId);
    
    if (selectedPhotoIds.has(photoId)) {
      selectedPhotoIds.delete(photoId);
      if (checkbox) checkbox.checked = false;
      console.log('[CompanyCam] Deselected photo:', photoId);
    } else {
      selectedPhotoIds.add(photoId);
      if (checkbox) checkbox.checked = true;
      console.log('[CompanyCam] Selected photo:', photoId);
    }
    
    updateImportButtonState();
    console.log('[CompanyCam] Total selected:', selectedPhotoIds.size);
  } catch (error) {
    console.error('[CompanyCam] Error toggling selection:', error);
  }
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

// Select all photos
function selectAllCompanyCamPhotos() {
  selectedPhotoIds.clear();
  companyCamPhotos.forEach(photo => {
    selectedPhotoIds.add(photo.id);
  });
  
  // Update all checkboxes
  document.querySelectorAll('.companycam-photo-checkbox').forEach(checkbox => {
    checkbox.checked = true;
  });
  
  updateImportButtonState();
  console.log('[CompanyCam] Selected all photos:', selectedPhotoIds.size);
}

// Deselect all photos
function deselectAllCompanyCamPhotos() {
  selectedPhotoIds.clear();
  
  // Update all checkboxes
  document.querySelectorAll('.companycam-photo-checkbox').forEach(checkbox => {
    checkbox.checked = false;
  });
  
  updateImportButtonState();
  console.log('[CompanyCam] Deselected all photos');
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
  
  if (selectedPhotoIds.size === 0) {
    console.log('[CompanyCam] No photos selected');
    return;
  }
  
  try {
    importBtn.disabled = true;
    importBtn.textContent = `Importing ${selectedPhotoIds.size} photos...`;
    
    const selectedPhotos = companyCamPhotos.filter(p => selectedPhotoIds.has(p.id));
    
    console.log('[CompanyCam] Importing', selectedPhotos.length, 'photos to', tab);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Helper to get best quality image URL
    const getBestPhotoUrl = (uris) => {
      if (!Array.isArray(uris)) return null;
      const original = uris.find(u => u.type === 'original');
      if (original) return original.uri || original.url;
      const web = uris.find(u => u.type === 'web');
      if (web) return web.uri || web.url;
      return uris[0]?.uri || uris[0]?.url || null;
    };
    
    // Download and convert photos
    for (const photo of selectedPhotos) {
      const imageUrl = getBestPhotoUrl(photo.uris);
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
          name: photo.description || `CompanyCam_${photo.id}.jpg`,
          timestamp: Date.now(),
          label: photo.description || '',
          source: 'companycam',
          companycamId: photo.id
        };
        
        if (tab === 'materials') {
          project.photos.materials.push(photoData);
        } else {
          project.photos.labor.push(photoData);
        }
        
        console.log('[CompanyCam] Imported photo:', photoData.name);
        successCount++;
      } catch (error) {
        console.error('[CompanyCam] Error importing photo:', photo.id, error);
        errorCount++;
      }
    }
    
    console.log(`[CompanyCam] Import complete: ${successCount} success, ${errorCount} failed`);
    
    // Save project
    projectManager.saveCurrentProject();
    
    // Clear any existing selections
    if (tab === 'materials') {
      if (window.selectedMaterialsPhotos) {
        window.selectedMaterialsPhotos.clear();
      }
      // Refresh display
      displayMaterialsPhotos();
    } else {
      if (window.selectedLaborPhotos) {
        window.selectedLaborPhotos.clear();
      }
      // Refresh display
      displayLaborPhotos();
    }
    
    // Close modal
    closeCompanyCamModal();
    
    if (errorCount > 0) {
      alert(`Imported ${successCount} photos successfully. ${errorCount} failed.`);
    }
    
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
  window.searchCompanyCamProjects = searchCompanyCamProjects;
  window.selectAllCompanyCamPhotos = selectAllCompanyCamPhotos;
  window.deselectAllCompanyCamPhotos = deselectAllCompanyCamPhotos;
  window.loadMoreCompanyCamProjects = loadMoreCompanyCamProjects;
}
