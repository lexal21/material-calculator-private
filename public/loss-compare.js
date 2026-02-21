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
    'Replacement Cost Value', 'Actual Cash Value', 'Recoverable Depreciation',
    'Net Claim', 'Deductible', 'Policy Number', 'Date of Loss', 'Cause of Loss',
    'Line Item Total', 'Price List'
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

        // Default anything undetected to Roof Report
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

  // -- Generate report --
  async function generateReport() {
    if (droppedFiles.length === 0) return;
    clearError();

    // Find roof report and loss sheet from dropped files
    var roofFile = null;
    var lossFile = null;
    var chips = document.querySelectorAll('.lc-chip');
    chips.forEach(function(chip, i) {
      if (chip.dataset.type === 'loss') {
        lossFile = droppedFiles[i];
      } else {
        roofFile = droppedFiles[i];
      }
    });

    // If only one file, treat it as roof report
    if (droppedFiles.length === 1) {
      roofFile = droppedFiles[0];
    }

    try {
      // Step 1: Always send roof report to /upload to populate Materials and Labor tabs
      if (roofFile) {
        var locationEl = document.getElementById('locationSelect');
        var location = locationEl ? locationEl.value : 'charleston';
        var uploadForm = new FormData();
        uploadForm.append('pdf', roofFile);
        uploadForm.append('location', location);
        uploadForm.append('pricing', JSON.stringify(window.customPricing || {}));

        var uploadResp = await fetch('/upload', {
          method: 'POST',
          body: uploadForm
        });

        var uploadData = await uploadResp.json();
        if (uploadData.success && typeof displayResults === 'function') {
          displayResults(uploadData);
        }
      }

      // Step 2: If loss sheet present, extract and inject loss-only items
      if (lossFile) {
        var lossForm = new FormData();
        lossForm.append('pdf0', roofFile || lossFile);
        if (roofFile) lossForm.append('pdf1', lossFile);

        var lossResp = await fetch('/api/loss-compare', {
          method: 'POST',
          body: lossForm
        });

        if (lossResp.ok) {
          var lossData = await lossResp.json();
          if (lossData.success && lossData.lossItems && lossData.lossItems.length > 0) {
            injectLossItems(lossData.lossItems);
          }
        }
      }
    } catch (err) {
      showError('Error: ' + err.message);
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

  // -- Public API --
  return {
    init: init,
    removeFile: removeFile,
    handleFiles: handleFiles
  };
})();

document.addEventListener('DOMContentLoaded', LossCompare.init);
