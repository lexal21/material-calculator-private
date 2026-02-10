# Photo Upload Feature - Implementation Guide

## Overview
Add photo upload capability to Materials and Labor pages with print/PDF support.

---

## Technical Approach

### 1. Image Upload & Storage

**Best Practice: Client-side compression + localStorage**

```javascript
// Compress and convert to base64
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

// Usage
async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('Please upload an image file');
    return;
  }
  
  // Validate file size (e.g., 10MB max before compression)
  if (file.size > 10 * 1024 * 1024) {
    alert('File too large. Please upload images under 10MB.');
    return;
  }
  
  const base64 = await compressAndStoreImage(file);
  
  // Store in project data
  const currentProject = getCurrentProject();
  if (!currentProject.photos) currentProject.photos = {};
  if (!currentProject.photos.materials) currentProject.photos.materials = [];
  
  currentProject.photos.materials.push({
    data: base64,
    name: file.name,
    timestamp: Date.now()
  });
  
  saveProject(currentProject);
  displayPhotos();
}
```

---

## 2. UI Implementation

### Materials Page Photo Section

```html
<!-- Add after materials table -->
<div class="photo-section no-print">
  <h3>📸 Job Photos</h3>
  <div class="photo-upload-controls">
    <input type="file" 
           id="materialsPhotoUpload" 
           accept="image/*" 
           multiple 
           style="display: none;"
           onchange="handleMaterialsPhotos(event)">
    <button class="btn-secondary" onclick="document.getElementById('materialsPhotoUpload').click()">
      + Add Photos
    </button>
    <button class="btn-danger" onclick="deleteSelectedPhotos('materials')" id="deleteMaterialsPhotosBtn">
      Delete Selected
    </button>
  </div>
  <div id="materialsPhotoGrid" class="photo-grid">
    <!-- Photos appear here -->
  </div>
</div>

<!-- Photo grid for print -->
<div class="print-only photo-print-section">
  <h3>Job Photos</h3>
  <div id="materialsPrintPhotos" class="print-photo-grid">
    <!-- Photos copied here for printing -->
  </div>
</div>
```

### CSS for Photo Display

```css
/* Photo grid layout */
.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.photo-item {
  position: relative;
  border: 2px solid #cbd5e0;
  border-radius: 8px;
  overflow: hidden;
  background: #f7fafc;
}

.photo-item img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
}

.photo-item-controls {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
}

.photo-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.photo-item-name {
  padding: 8px;
  font-size: 12px;
  color: #4a5568;
  background: white;
  border-top: 1px solid #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Print styles */
@media print {
  .photo-section.no-print {
    display: none !important;
  }
  
  .print-only {
    display: block !important;
  }
  
  .print-photo-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    page-break-inside: avoid;
    margin-top: 20px;
  }
  
  .print-photo-item {
    border: 1px solid #333;
    page-break-inside: avoid;
  }
  
  .print-photo-item img {
    width: 100%;
    height: auto;
    max-height: 300px;
    object-fit: contain;
  }
  
  .print-photo-name {
    padding: 4px;
    font-size: 10pt;
    text-align: center;
  }
}

/* Hide print section by default */
.print-only {
  display: none;
}
```

---

## 3. pdfmake Integration

### Adding Photos to PDF

```javascript
function buildMaterialsPDFDocDefinition() {
  const currentProject = getCurrentProject();
  const photos = currentProject.photos?.materials || [];
  
  // Base PDF definition
  const docDef = {
    pageSize: 'LETTER',
    pageMargins: [40, 60, 40, 60],
    content: [
      // ... existing header, table, totals ...
      
      // Add photos if present
      ...(photos.length > 0 ? [
        { text: '\n\nJob Photos', style: 'subheader', pageBreak: 'before' },
        {
          columns: photos.slice(0, 4).map(photo => ({
            image: photo.data,
            width: 240,
            margin: [0, 10, 10, 10]
          })),
          columnGap: 10
        }
      ] : [])
    ],
    styles: {
      header: { fontSize: 18, bold: true },
      subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 10] }
    }
  };
  
  return docDef;
}
```

**Important pdfmake Image Considerations:**
- Images must be base64 data URLs
- Use `width` or `fit: [width, height]` for sizing
- Use `pageBreak: 'before'` to start photos on new page
- Limit photos per PDF to 4-8 to keep file size reasonable
- Consider 2-column layout for better space usage

---

## 4. localStorage Considerations

### Storage Limits
- **localStorage limit:** ~5-10MB per domain
- **Compressed JPEG:** ~100-300KB per photo (1200px wide, 0.8 quality)
- **Practical limit:** 15-30 photos per project before hitting storage limits

### Storage Management

```javascript
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

// Warn user if approaching limit
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
```

---

## 5. Implementation Plan

### Step 1: Add Photo Storage to Data Model
```javascript
// Extend project data structure
{
  materials: [...],
  labor: {...},
  photos: {
    materials: [
      { data: 'data:image/jpeg;base64,...', name: 'roof_damage.jpg', timestamp: 1234567890 }
    ],
    labor: [
      { data: 'data:image/jpeg;base64,...', name: 'completed_work.jpg', timestamp: 1234567891 }
    ]
  }
}
```

### Step 2: Add Upload UI
- File input (hidden) + styled button
- Photo grid display
- Checkbox selection for deletion
- Photo count indicator

### Step 3: Add Display Functions
- `displayMaterialsPhotos()` - Show photos in grid
- `displayLaborPhotos()` - Same for labor tab
- Handle selection state
- Copy photos to print section

### Step 4: Integrate with Print
- Copy photos to `.print-only` section on print
- Use CSS `@media print` for layout
- 2-column grid for better use of space

### Step 5: Integrate with PDF
- Add photos section to `buildMaterialsPDFDocDefinition()`
- Add photos section to `buildLaborPDFDocDefinition()`
- Page break before photos
- Limit to 4-6 photos per PDF

### Step 6: Project Save/Load
- Photos auto-save with project
- Photos load when switching projects
- Photos preserved in localStorage

---

## 6. Code Snippets

### Complete Photo Handler

```javascript
// Photo management for materials tab
let selectedMaterialsPhotos = new Set();

async function handleMaterialsPhotos(event) {
  const files = Array.from(event.target.files);
  
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
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
      const project = getCurrentProject();
      if (!project.photos) project.photos = {};
      if (!project.photos.materials) project.photos.materials = [];
      
      project.photos.materials.push({
        data: base64,
        name: file.name,
        timestamp: Date.now()
      });
      
      saveProject(project);
    } catch (err) {
      console.error('Photo upload error:', err);
      alert(`Failed to upload ${file.name}`);
    }
  }
  
  // Reset input and refresh display
  event.target.value = '';
  displayMaterialsPhotos();
}

function displayMaterialsPhotos() {
  const project = getCurrentProject();
  const photos = project.photos?.materials || [];
  const grid = document.getElementById('materialsPhotoGrid');
  const printGrid = document.getElementById('materialsPrintPhotos');
  
  if (photos.length === 0) {
    grid.innerHTML = '<p style="color: #718096;">No photos uploaded yet.</p>';
    printGrid.innerHTML = '';
    return;
  }
  
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

function deleteSelectedPhotos(tab) {
  const set = tab === 'materials' ? selectedMaterialsPhotos : selectedLaborPhotos;
  
  if (set.size === 0) return;
  
  const confirm = window.confirm(
    `Delete ${set.size} selected photo${set.size > 1 ? 's' : ''}?`
  );
  
  if (!confirm) return;
  
  const project = getCurrentProject();
  const key = tab === 'materials' ? 'materials' : 'labor';
  
  // Remove selected photos (iterate backwards to preserve indices)
  const photos = project.photos[key];
  const toDelete = Array.from(set).sort((a, b) => b - a);
  toDelete.forEach(idx => photos.splice(idx, 1));
  
  saveProject(project);
  set.clear();
  
  // Refresh display
  if (tab === 'materials') {
    displayMaterialsPhotos();
  } else {
    displayLaborPhotos();
  }
}
```

---

## 7. Testing Checklist

- [ ] Upload single photo
- [ ] Upload multiple photos at once
- [ ] Photo displays in grid
- [ ] Photo appears in print preview (Ctrl+P)
- [ ] Photo appears in saved PDF
- [ ] Photo persists after page refresh
- [ ] Photo loads when switching projects
- [ ] Delete single photo
- [ ] Delete multiple photos
- [ ] Storage warning appears at 80% usage
- [ ] Upload rejected when storage full
- [ ] Large images compressed properly
- [ ] Non-image files rejected
- [ ] Photo grid responsive on mobile

---

## 8. Potential Enhancements

**Future Considerations:**
1. **Thumbnails** - Generate smaller thumbnails for grid, full size for PDF
2. **Captions** - Add text captions to photos
3. **Reordering** - Drag-and-drop to reorder photos
4. **Server Storage** - Move to server storage when localStorage fills up
5. **Image Editing** - Basic crop/rotate before upload
6. **Photo Gallery View** - Lightbox/modal for full-size viewing

---

## 9. Key Files to Modify

1. **public/index.html**
   - Add photo upload sections to materials and labor tabs
   - Add print-only photo sections

2. **public/style.css**
   - Photo grid styles
   - Print media query styles

3. **public/app.js**
   - Photo upload handlers
   - Photo display functions
   - Photo selection/deletion
   - Compression helper

4. **public/app.js** (PDF generation)
   - Update `buildMaterialsPDFDocDefinition()`
   - Update `buildLaborPDFDocDefinition()`

5. **public/project-manager.js**
   - Extend data model to include photos
   - Ensure photos save/load correctly

---

## 10. Estimated Implementation Time

- **Photo upload + compression:** 30 min
- **Photo display grid:** 30 min
- **Photo selection/deletion:** 20 min
- **Print integration:** 20 min
- **PDF integration:** 30 min
- **Testing + polish:** 30 min

**Total:** ~2.5-3 hours

---

## Resources

- **pdfmake docs:** https://pdfmake.github.io/docs/
- **Canvas API:** https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- **FileReader API:** https://developer.mozilla.org/en-US/docs/Web/API/FileReader
- **localStorage limits:** https://web.dev/storage-for-the-web/

---

**Ready to implement tomorrow! All research complete.** 🎉
