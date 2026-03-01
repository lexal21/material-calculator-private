/**
 * loss-compare.js
 * QuikBitz - Loss Sheet Enhancement to Roof Report Upload
 */

const LossCompare = (() => {
  // -- State --
  let droppedFiles = [];

  // -- Loss sheet signatures --
  const LOSS_SHEET_SIGNATURES = [
    'USAA', 'State Farm', 'Allstate', 'Travelers', 'Farmers', 'Liberty Mutual',
    'Nationwide', 'American Family', 'Chubb', 'Erie Insurance', 'Auto-Owners',
    'Cincinnati Insurance', 'Amica', 'GEICO', 'Progressive', 'SafeCo', 'Hartford',
    'Hippo', 'Kin Insurance', 'Universal Property', 'Heritage Insurance',
    'Citizens Property', 'Security First', 'Tower Hill',
    'David Morse', 'Pilot Catastrophe', 'Eberl Claims', 'Crawford', 'Sedgwick',
    'Gallagher Bassett', 'Xactimate', 'Symbility',
    // Additional carriers
    'AAA Insurance', 'Members Insurance', 'Universal Insurance Company', 'acg.aaa.com',
    'National Catastrophe Team', 'Griston', 'Griston Claim Management', 'gristonclaim.com',
    'TYPTAP', 'TyptAp', 'Typtap Insurance',
    // Universal Xactimate fallbacks — these appear in ALL loss sheets regardless of carrier
    'Claim Number:', 'Price List:', 'UNIT PRICE', 'Replacement Cost Value', 
    'Line Item Total', 'Actual Cash Value', 'Recoverable Depreciation',
    'Net Claim', 'Deductible', 'Policy Number', 'Date of Loss', 'Cause of Loss'
  ];

  // -- Init --
  function init() {
    var zone = document.getElementById('lc-dropzone');
    var input = document.getElementById('lc-fileInput');
    var btn = document.getElementById('lc-selectBtn');
    var generateBtn = document.getElementById('lc-generateBtn');
    if (!zone) return;

    btn.addEventListener('click', function() {
      input.click();
    });

    zone.addEventListener('click', function(e) {
      if (e.target === zone || e.target.classList.contains('lc-upload-text') || e.target.classList.contains('lc-upload-subtext')) {
        input.click();
      }
    });

    input.addEventListener('change', function(e) {
      handleFiles(Array.from(e.target.files));
    });

    zone.addEventListener('dragover', function(e) {
      e.preventDefault();
      zone.classList.add('lc-dragover');
    });

    zone.addEventListener('dragleave', function() {
      zone.classList.remove('lc-dragover');
    });

    zone.addEventListener('drop', function(e) {
      e.preventDefault();
      zone.classList.remove('lc-dragover');
      var files = Array.from(e.dataTransfer.files).filter(function(f) {
        return f.type === 'application/pdf';
      });
      if (files.length) handleFiles(files);
    });

    generateBtn.addEventListener('click', generateReport);
  }

  // -- Handle files --
  function handleFiles(newFiles) {
    newFiles.forEach(function(file) {
      if (droppedFiles.length >= 2) return;
      if (!droppedFiles.find(function(f) { return f.name === file.name; })) {
        droppedFiles.push(file);
      }
    });
    renderFileChips();
    updateGenerateBtn();
  }

  function removeFile(name) {
    droppedFiles = droppedFiles.filter(function(f) {
      return f.name !== name;
    });
    renderFileChips();
    updateGenerateBtn();
    clearError();
  }

  // -- Render file chips --
  function renderFileChips() {
    var container = document.getElementById('lc-fileChips');
    if (!container) return;
    container.innerHTML = '';

    droppedFiles.forEach(function(file) {
      var chip = document.createElement('div');
      chip.className = 'lc-chip';
      chip.innerHTML = '<span class="lc-chip-icon">PDF</span>' +
        '<span class="lc-chip-name">' + file.name + '</span>' +
        '<span class="lc-chip-badge lc-detecting">Detecting...</span>' +
        '<button class="lc-chip-remove" onclick="LossCompare.removeFile(\'' + file.name + '\')" title="Remove">x</button>';
      container.appendChild(chip);

      detectFileType(file).then(function(type) {
        var badge = chip.querySelector('.lc-chip-badge');
        badge.textContent = type.label;
        badge.className = 'lc-chip-badge ' + type.cls;
        chip.dataset.type = type.key;
      });
    });
  }

  // -- Detect file type --
  function detectFileType(file) {
    return new Promise(function(resolve) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var binary = e.target.result;
        var text = extractTextFromBinary(binary);

        // Primary check: scan extracted text for signatures
        for (var i = 0; i < LOSS_SHEET_SIGNATURES.length; i++) {
          if (text.indexOf(LOSS_SHEET_SIGNATURES[i]) !== -1) {
            var carrier = extractCarrierName(text);
            return resolve({
              key: 'loss',
              label: carrier ? 'Loss: ' + carrier : 'Loss Sheet',
              cls: 'lc-badge-loss'
            });
          }
        }

        // Secondary check: scan raw binary for metadata strings (image-based PDFs)
        var metadataPatterns = ['Griston', 'TYPTAP', 'Claim Number', 'Price List', 'SCBE', 'SCCO'];
        for (var i = 0; i < metadataPatterns.length; i++) {
          if (binary.indexOf(metadataPatterns[i]) !== -1) {
            return resolve({
              key: 'loss',
              label: 'Loss Sheet',
              cls: 'lc-badge-loss'
            });
          }
        }

        // Tertiary check: filename contains loss-related keywords
        var lowerName = file.name.toLowerCase();
        if (lowerName.indexOf('loss') !== -1 || lowerName.indexOf('claim') !== -1) {
          return resolve({
            key: 'loss',
            label: 'Loss Sheet',
            cls: 'lc-badge-loss'
          });
        }

        // Default to Roof Report
        resolve({
          key: 'roof',
          label: 'Roof Report',
          cls: 'lc-badge-roof'
        });
      };
      reader.readAsBinaryString(file);
    });
  }

  function extractTextFromBinary(binary) {
    var text = '';
    var run = '';
    var limit = Math.min(binary.length, 80000);
    for (var i = 0; i < limit; i++) {
      var c = binary.charCodeAt(i);
      if (c >= 32 && c <= 126) {
        run += binary[i];
      } else {
        if (run.length > 3) text += run + ' ';
        run = '';
      }
    }
    return text;
  }

  function extractCarrierName(text) {
    var carriers = [
      'USAA', 'State Farm', 'Allstate', 'Travelers', 'Farmers', 'Liberty Mutual',
      'Nationwide', 'American Family', 'Chubb', 'Erie Insurance', 'Auto-Owners',
      'Cincinnati Insurance', 'SafeCo', 'Hartford', 'Hippo', 'Universal Property',
      'Heritage Insurance', 'Citizens Property', 'Security First', 'Tower Hill',
      'Progressive', 'GEICO'
    ];
    for (var i = 0; i < carriers.length; i++) {
      if (text.indexOf(carriers[i]) !== -1) return carriers[i];
    }
    return null;
  }

  // -- Update generate button --
  function updateGenerateBtn() {
    var btn = document.getElementById('lc-generateBtn');
    if (!btn) return;
    btn.disabled = droppedFiles.length === 0;
    if (droppedFiles.length === 2) {
      btn.textContent = 'Generate Report';
    } else if (droppedFiles.length === 1) {
      btn.textContent = 'Generate Report';
    } else {
      btn.textContent = 'Generate Report';
    }
  }

  // -- Progress modal helpers --
  function showProgress(msg, sub) {
    var overlay = document.getElementById('lc-progress-overlay');
    overlay.style.display = 'flex';
    overlay.classList.remove('lc-success');
    document.getElementById('lc-progress-message').textContent = msg;
    document.getElementById('lc-progress-sub').textContent = sub || '';
  }

  function updateProgress(msg, sub) {
    document.getElementById('lc-progress-message').textContent = msg;
    document.getElementById('lc-progress-sub').textContent = sub || '';
  }

  function dismissProgress(successMsg) {
    var overlay = document.getElementById('lc-progress-overlay');
    overlay.classList.add('lc-success');
    document.getElementById('lc-spinner').style.borderTopColor = '#22c55e';
    document.getElementById('lc-progress-message').textContent = successMsg || 'Done!';
    document.getElementById('lc-progress-sub').textContent = '';
    setTimeout(function() {
      overlay.style.display = 'none';
      overlay.classList.remove('lc-success');
      document.getElementById('lc-spinner').style.borderTopColor = '#f59e0b';
    }, 1800);
  }

  // -- Generate report --
  async function generateReport() {
    // Lock to prevent double execution
    if (generateReport._running) return;
    generateReport._running = true;
    
    var generateBtn = document.getElementById('lc-generateBtn');
    if (generateBtn) generateBtn.disabled = true;
    
    try {
      if (droppedFiles.length === 0) return;
      clearError();

      showProgress('Starting...', 'Preparing files');

      // Find roof report and loss sheet from dropped files
      var roofFile = null;
      var lossFile = null;
      // Detect file types from chip dataset (already classified on drop)
      droppedFiles.forEach(function(file) {
        var chips = document.querySelectorAll('.lc-chip');
        chips.forEach(function(chip) {
          var chipName = chip.querySelector('.lc-chip-name')?.textContent;
          if (chipName === file.name) {
            if (chip.dataset.type === 'loss') {
              lossFile = file;
            } else {
              roofFile = file;
            }
          }
        });
      });

      // SINGLE FILE: Always use /api/parse-loss (backend routes to correct parser)
      if (droppedFiles.length === 1) {
        console.log('[LOSS-COMPARE] Single file upload - using /api/parse-loss');
        updateProgress('Processing document...', 'Detecting file type and extracting data');
        
        var singleFile = droppedFiles[0];
        
        var singleForm = new FormData();
        singleForm.append('pdf', singleFile);
        singleForm.append('shed_included', window.shedIncluded !== false ? 'true' : 'false');
        singleForm.append('location', document.getElementById('location')?.value || 'charleston');
        
        var singleResp = await fetch('/api/parse-loss', {
          method: 'POST',
          body: singleForm,
          credentials: 'same-origin'
        });
        
        var singleData = await singleResp.json();
        
        if (singleData.success && typeof displayResults === 'function') {
          // Store for shed toggle (if loss sheet)
          if (singleData.shed_squares) {
            window.currentLossData = singleData;
            window.currentLossFile = singleFile;
            
            // Show shed toggle if shed squares present
            if (singleData.shed_squares > 0) {
              showShedToggle(singleData.shed_included, singleData.shed_squares);
            }
          }
          
          updateProgress('Building report...', 'Rendering your material list');
          displayResults(singleData);
          dismissProgress('Report complete!');
        } else {
          updateProgress('Something went wrong', singleData.message || 'Unknown error');
          setTimeout(function() {
            document.getElementById('lc-progress-overlay').style.display = 'none';
            showError('Failed to parse PDF: ' + (singleData.message || 'Unknown error'));
          }, 2500);
        }
        return;
      }

      var uploadData = null;

      // Step 1: Always send roof report to /upload to populate Materials and Labor tabs
      if (roofFile) {
        updateProgress('Processing roof report...', 'Extracting measurements and materials');
        
        var locationEl = document.getElementById('locationSelect');
        var location = locationEl ? locationEl.value : 'charleston';
        var uploadForm = new FormData();
        uploadForm.append('pdf', roofFile);
        uploadForm.append('location', location);
        uploadForm.append('pricing', JSON.stringify(window.customPricing || {}));

        var uploadResp = await fetch('/upload', {
          method: 'POST',
          body: uploadForm,
          credentials: 'same-origin'
        });

        uploadData = await uploadResp.json();
      }

      // Step 2: If loss sheet present, extract and merge loss-only items
      if (lossFile && uploadData) {
        updateProgress('Parsing loss sheet...', 'Identifying supplement items');
        
        var lossForm2 = new FormData();
        lossForm2.append('pdf0', roofFile || lossFile);
        if (roofFile) lossForm2.append('pdf1', lossFile);

        var lossResp2 = await fetch('/api/loss-compare', {
          method: 'POST',
          body: lossForm2,
          credentials: 'same-origin'
        });

        if (lossResp2.ok) {
          var lossData2 = await lossResp2.json();
          console.log('[LOSS-COMPARE FRONTEND] lossData2.success:', lossData2.success);
          console.log('[LOSS-COMPARE FRONTEND] lossData2.supplementItems:', JSON.stringify(lossData2.supplementItems));
          console.log('[LOSS-COMPARE] Response data:', lossData2);
          if (lossData2.success && lossData2.supplementItems && lossData2.supplementItems.length > 0) {
            console.log('[LOSS-COMPARE] Received', lossData2.supplementItems.length, 'supplement items from API');
            uploadData.supplementItems = lossData2.supplementItems;
          }
        }
      }

      // Step 3: Call displayResults once with merged data
      if (uploadData && uploadData.success && typeof displayResults === 'function') {
        updateProgress('Merging results...', 'Building your material list');
        displayResults(uploadData);
        dismissProgress('Report complete!');
      }
    } catch (err) {
      updateProgress('Something went wrong', err.message || '');
      setTimeout(function() {
        document.getElementById('lc-progress-overlay').style.display = 'none';
        showError('Error: ' + err.message);
      }, 2500);
    } finally {
      generateReport._running = false;
      if (generateBtn) generateBtn.disabled = false;
    }
  }
  
  // -- Show shed toggle banner --
  function showShedToggle(included, shedSquares) {
    var existingBanner = document.getElementById('lc-shed-banner');
    if (existingBanner) existingBanner.remove();
    
    var materialsTable = document.getElementById('materialsTable');
    if (!materialsTable) return;
    
    var banner = document.createElement('div');
    banner.id = 'lc-shed-banner';
    banner.style.cssText = 'background:#fef3c7;border:1px solid #fbbf24;color:#78350f;padding:12px 16px;border-radius:8px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;';
    banner.innerHTML = '<div><strong>Parsed from Insurance Loss Sheet</strong> &mdash; Shed: ' + shedSquares.toFixed(2) + ' SQ</div>' +
      '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;">' +
      '<input type="checkbox" id="lc-shed-toggle" ' + (included ? 'checked' : '') + ' style="width:18px;height:18px;cursor:pointer;">' +
      '<span>Include shed in calculations</span>' +
      '</label>';
    
    materialsTable.parentNode.insertBefore(banner, materialsTable);
    
    document.getElementById('lc-shed-toggle').addEventListener('change', function(e) {
      toggleShed(e.target.checked);
    });
  }
  
  // -- Toggle shed recalculation --
  async function toggleShed(include) {
    if (!window.currentLossFile) return;
    
    window.shedIncluded = include;
    
    try {
      var form = new FormData();
      form.append('pdf', window.currentLossFile);
      form.append('shed_included', include ? 'true' : 'false');
      
      var resp = await fetch('/api/parse-loss', {
        method: 'POST',
        body: form,
        credentials: 'same-origin'
      });
      
      var data = await resp.json();
      
      if (data.success && typeof displayResults === 'function') {
        window.currentLossData = data;
        displayResults(data);
        
        // Update banner
        var banner = document.getElementById('lc-shed-banner');
        if (banner) {
          var checkbox = document.getElementById('lc-shed-toggle');
          if (checkbox) checkbox.checked = include;
        }
      }
    } catch (err) {
      console.error('[LOSS-COMPARE] Toggle shed error:', err);
      showError('Failed to recalculate: ' + err.message);
    }
  }

  // -- Inject loss-only items into materials tab --
  function injectLossItems(items) {
    // Find the materials table body
    var tbody = document.querySelector('#materialsTable tbody');
    if (!tbody) {
      // Try alternate selector
      tbody = document.querySelector('.materials-table tbody');
    }
    if (!tbody) return;

    items.forEach(function(item) {
      var tr = document.createElement('tr');
      tr.className = 'loss-injected-row';
      tr.innerHTML = '<td>' + item.description +
        ' <span class="from-loss-badge">From Loss</span></td>' +
        '<td>' + item.quantity + '</td>' +
        '<td>' + item.unit + '</td>' +
        '<td><input type="text" class="loss-color-input" placeholder="Color..." style="width:120px;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;font-size:13px;" data-item="' + item.description + '" /></td>' +
        '<td></td>';
      tbody.appendChild(tr);
    });

    // Add badge style if not already present
    if (!document.getElementById('loss-inject-styles')) {
      var style = document.createElement('style');
      style.id = 'loss-inject-styles';
      style.textContent = '.from-loss-badge{display:inline-block;padding:1px 6px;background:#fef3c7;color:#92400e;border-radius:10px;font-size:10px;font-weight:700;margin-left:6px;}' +
        '.loss-injected-row{background:#fffbeb;}' +
        '.loss-color-input{outline:none;}' +
        '.loss-color-input:focus{border-color:#2B5BA3;}';
      document.head.appendChild(style);
    }
  }

  // -- Utility --
  function showError(msg) {
    var el = document.getElementById('lc-error');
    if (el) {
      el.textContent = msg;
      el.style.display = 'block';
    }
  }

  function clearError() {
    var el = document.getElementById('lc-error');
    if (el) {
      el.style.display = 'none';
      el.textContent = '';
    }
  }

  // -- Clear all uploaded files and reset UI --
  function clearAll() {
    // Clear files array
    droppedFiles = [];
    
    // Clear file input
    var input = document.getElementById('lc-fileInput');
    if (input) {
      input.value = '';
    }
    
    // Clear file chips display
    var chipsContainer = document.getElementById('lc-fileChips');
    if (chipsContainer) {
      chipsContainer.innerHTML = '';
    }
    
    // Clear/hide results
    var resultsContainer = document.getElementById('lc-results');
    if (resultsContainer) {
      resultsContainer.style.display = 'none';
      resultsContainer.innerHTML = '';
    }
    
    // Clear error
    clearError();
    
    // Hide loading
    var loadingEl = document.getElementById('lc-loading');
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }
    
    // Reset generate button
    updateGenerateBtn();
    
    console.log('[LOSS-COMPARE] Cleared all uploaded files');
  }

  // -- Public API --
  return {
    init: init,
    removeFile: removeFile,
    handleFiles: handleFiles,
    clearAll: clearAll
  };
})();

document.addEventListener('DOMContentLoaded', LossCompare.init);
