/**
 * loss-compare.js
 * QuikBitz - Insurance Loss vs Roof Report Comparison
 * Drop zone, file detection, and results rendering
 */

const LossCompare = (() => {
  // ── State ──────────────────────────────────────────────────────────────────
  let droppedFiles = [];

  // ── Known carrier / adjuster signatures for detection ─────────────────────
  const LOSS_SHEET_SIGNATURES = [
    'USAA', 'State Farm', 'Allstate', 'Travelers', 'Farmers', 'Liberty Mutual',
    'Nationwide', 'American Family', 'Chubb', 'Erie Insurance', 'Auto-Owners',
    'Cincinnati Insurance', 'Amica', 'GEICO', 'Progressive', 'SafeCo', 'Hartford',
    'Hippo', 'Kin Insurance', 'Universal Property', 'Heritage Insurance',
    'Citizens Property', 'Security First', 'Tower Hill', 'Homeowners of America',
    'Openly', 'Branch Insurance',
    'David Morse', 'Pilot Catastrophe', 'Eberl Claims', 'Crawford', 'Sedgwick',
    'Gallagher Bassett', 'McLarens', 'Engle Martin', 'Rimkus', 'Haag Engineering',
    'Xactimate', 'Symbility',
    'Replacement Cost Value', 'Actual Cash Value', 'Recoverable Depreciation',
    'Net Claim', 'Deductible', 'Policy Number', 'Date of Loss', 'Cause of Loss',
    'Line Item Total', 'Price List: SC'
  ];

  const ROOF_REPORT_SIGNATURES = [
    'RidgeTop', 'Ridge Top Aerial', 'EagleView', 'GAF QuickMeasure', 'Hover',
    'Xactimate Sketch', 'RoofScope', 'Roof Area', 'Roof Squares', 'Hip Length',
    'Ridge Length', 'Valley Length', 'Eave Edge', 'Rake Edge', 'Step Flashing',
    'Waste Factor', 'Number of Squares', 'Total Perimeter'
  ];

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    const zone = document.getElementById('lc-dropzone');
    const input = document.getElementById('lc-fileInput');
    const btn = document.getElementById('lc-selectBtn');
    const generateBtn = document.getElementById('lc-generateBtn');

    if (!zone) return;

    btn.addEventListener('click', () => input.click());

    zone.addEventListener('click', (e) => {
      if (e.target === zone || e.target.classList.contains('lc-upload-text') || e.target.classList.contains('lc-upload-subtext')) {
        input.click();
      }
    });

    input.addEventListener('change', (e) => handleFiles(Array.from(e.target.files)));

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('lc-dragover');
    });

    zone.addEventListener('dragleave', () => zone.classList.remove('lc-dragover'));

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('lc-dragover');
      const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
      if (files.length) handleFiles(files);
    });

    generateBtn.addEventListener('click', generateReport);
  }

  // ── Handle dropped / selected files ───────────────────────────────────────
  function handleFiles(newFiles) {
    newFiles.forEach(file => {
      if (droppedFiles.length >= 2) return;
      if (!droppedFiles.find(f => f.name === file.name)) {
        droppedFiles.push(file);
      }
    });
    renderFileChips();
    updateGenerateBtn();
  }

  function removeFile(name) {
    droppedFiles = droppedFiles.filter(f => f.name !== name);
    renderFileChips();
    updateGenerateBtn();
    clearResults();
  }

  // ── Render file chips below drop zone ─────────────────────────────────────
  function renderFileChips() {
    const container = document.getElementById('lc-fileChips');
    container.innerHTML = '';

    droppedFiles.forEach(file => {
      const chip = document.createElement('div');
      chip.className = 'lc-chip';
      chip.innerHTML =
        '<span class="lc-chip-icon">\uD83D\uDCC4</span>' +
        '<span class="lc-chip-name">' + file.name + '</span>' +
        '<span class="lc-chip-badge lc-detecting">Detecting...</span>' +
        '<button class="lc-chip-remove" onclick="LossCompare.removeFile(\'' + file.name.replace(/'/g, "\\'") + '\')" title="Remove">\u2715</button>';
      container.appendChild(chip);

      detectFileType(file).then(type => {
        const badge = chip.querySelector('.lc-chip-badge');
        badge.textContent = type.label;
        badge.className = 'lc-chip-badge ' + type.cls;
        chip.dataset.type = type.key;
        chip.dataset.carrier = type.carrier || '';
      });
    });
  }

  // ── Detect file type by reading text ──────────────────────────────────────
  async function detectFileType(file) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const binary = e.target.result;
        const text = extractTextFromBinary(binary);

        for (const sig of LOSS_SHEET_SIGNATURES) {
          if (text.includes(sig)) {
            const carrier = extractCarrierName(text);
            return resolve({
              key: 'loss',
              label: carrier ? 'Loss: ' + carrier : 'Loss Sheet',
              cls: 'lc-badge-loss',
              carrier
            });
          }
        }

        for (const sig of ROOF_REPORT_SIGNATURES) {
          if (text.includes(sig)) {
            const provider = extractReportProvider(text);
            return resolve({
              key: 'roof',
              label: provider ? 'Roof: ' + provider : 'Roof Report',
              cls: 'lc-badge-roof',
              carrier: provider
            });
          }
        }

        resolve({ key: 'unknown', label: 'Unknown - Review', cls: 'lc-badge-unknown' });
      };
      reader.readAsBinaryString(file);
    });
  }

  function extractTextFromBinary(binary) {
    let text = '';
    let run = '';
    for (let i = 0; i < Math.min(binary.length, 80000); i++) {
      const c = binary.charCodeAt(i);
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
    const carriers = [
      'USAA', 'State Farm', 'Allstate', 'Travelers', 'Farmers', 'Liberty Mutual',
      'Nationwide', 'American Family', 'Chubb', 'Erie Insurance', 'Auto-Owners',
      'Cincinnati Insurance', 'Amica', 'SafeCo', 'Hartford', 'Hippo', 'Kin Insurance',
      'Universal Property', 'Heritage Insurance', 'Citizens Property', 'Security First',
      'Tower Hill', 'Progressive', 'GEICO'
    ];
    for (const c of carriers) {
      if (text.includes(c)) return c;
    }
    const match = text.match(/Insurance\s+Company[:\s]+([A-Z][A-Za-z\s&]+?)(?:\s{2,}|\n|$)/);
    if (match) return match[1].trim().substring(0, 30);
    return null;
  }

  function extractReportProvider(text) {
    const providers = ['RidgeTop', 'EagleView', 'GAF QuickMeasure', 'Hover', 'RoofScope'];
    for (const p of providers) {
      if (text.includes(p)) return p;
    }
    return null;
  }

  // ── Update generate button state ───────────────────────────────────────────
  function updateGenerateBtn() {
    const btn = document.getElementById('lc-generateBtn');
    btn.disabled = droppedFiles.length === 0;
    btn.textContent = droppedFiles.length === 2
      ? '\uD83D\uDD0D Generate Comparison Report'
      : droppedFiles.length === 1
        ? '\uD83D\uDCCB Generate Report'
        : 'Generate Report';
  }

  // ── Generate report ────────────────────────────────────────────────────────
  async function generateReport() {
    if (droppedFiles.length === 0) return;
    showLoading(true);
    clearResults();

    try {
      const formData = new FormData();
      droppedFiles.forEach((file, i) => formData.append('pdf' + i, file));

      const resp = await fetch('/api/loss-compare', { method: 'POST', body: formData });
      if (!resp.ok) throw new Error('Server error: ' + resp.status);

      const data = await resp.json();
      if (!data.success) throw new Error(data.error || 'Processing failed');

      renderResults(data);
    } catch (err) {
      showError(err.message);
    } finally {
      showLoading(false);
    }
  }

  // ── Render results ─────────────────────────────────────────────────────────
  function renderResults(data) {
    const container = document.getElementById('lc-results');
    container.style.display = 'block';

    // Header info bar
    let headerHtml = '<div class="lc-info-bar">';
    if (data.roofReport) {
      headerHtml += '<div class="lc-info-pill lc-pill-roof">\uD83D\uDCCF Roof Report: ' + (data.roofReport.provider || 'Detected') + '</div>';
    }
    if (data.lossSheet) {
      headerHtml += '<div class="lc-info-pill lc-pill-loss">\uD83D\uDCC4 Loss Sheet: ' + (data.lossSheet.carrier || 'Detected') + (data.lossSheet.insured ? ' \u2014 ' + data.lossSheet.insured : '') + '</div>';
    }
    headerHtml += '</div>';

    // Comparison table
    let compHtml = '';
    if (data.comparison && data.comparison.length > 0) {
      const flagged = data.comparison.filter(r => r.status === 'flagged');
      compHtml =
        '<div class="lc-section">' +
          '<div class="lc-section-header lc-header-compare">' +
            '<div>' +
              '<h3>\u2696\uFE0F Quantity Comparison</h3>' +
              '<p>Roof report measurements vs. insurance estimate</p>' +
            '</div>' +
            '<div class="lc-flag-count">' + flagged.length + ' item' + (flagged.length !== 1 ? 's' : '') + ' flagged</div>' +
          '</div>' +
          '<div class="lc-section-body">' +
            '<table class="lc-table">' +
              '<thead><tr>' +
                '<th>Line Item</th><th>Roof Report</th><th>Loss Sheet</th><th>Difference</th><th>Status</th>' +
              '</tr></thead>' +
              '<tbody>' +
                data.comparison.map(row =>
                  '<tr class="' + (row.status === 'flagged' ? 'lc-row-flagged' : 'lc-row-ok') + '">' +
                    '<td>' + row.item + '</td>' +
                    '<td>' + row.roofValue + '</td>' +
                    '<td>' + row.lossValue + '</td>' +
                    '<td>' + row.difference + '</td>' +
                    '<td><span class="lc-status-badge lc-status-' + row.status + '">' + (row.status === 'flagged' ? '\u26A0\uFE0F Flagged' : '\u2713 Match') + '</span></td>' +
                  '</tr>'
                ).join('') +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>';
    }

    // Roof report measurements
    let roofHtml = '';
    if (data.roofReport && data.roofReport.measurements) {
      const m = data.roofReport.measurements;
      roofHtml =
        '<div class="lc-section">' +
          '<div class="lc-section-header lc-header-roof">' +
            '<div>' +
              '<h3>\uD83D\uDCCF Roof Report Measurements</h3>' +
              '<p>' + (data.roofReport.address || '') + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="lc-section-body">' +
            '<div class="lc-measurements-grid">' +
              measurementCard('Roof Squares', m.roofSquares, 'SQ') +
              measurementCard('Roof Area', m.roofArea, 'ft\u00B2') +
              measurementCard('Ridge Length', m.ridgeLength, 'LF') +
              measurementCard('Hip Length', m.hipLength, 'LF') +
              measurementCard('Valley Length', m.valleyLength, 'LF') +
              measurementCard('Eave Edge', m.eaveEdge, 'LF') +
              measurementCard('Rake Edge', m.rakeEdge, 'LF') +
              measurementCard('Step Flashing', m.stepFlashing, 'LF') +
              measurementCard('Wall Flashing', m.wallFlashing, 'LF') +
            '</div>' +
          '</div>' +
        '</div>';
    }

    // Loss sheet line items
    let lossHtml = '';
    if (data.lossSheet && data.lossSheet.lineItems && data.lossSheet.lineItems.length > 0) {
      lossHtml =
        '<div class="lc-section">' +
          '<div class="lc-section-header lc-header-loss">' +
            '<div>' +
              '<h3>\uD83D\uDCC4 Loss Sheet Line Items</h3>' +
              '<p>' + (data.lossSheet.carrier || '') + (data.lossSheet.rcv ? ' \u2014 RCV: ' + data.lossSheet.rcv : '') + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="lc-section-body">' +
            '<table class="lc-table">' +
              '<thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>RCV</th></tr></thead>' +
              '<tbody>' +
                data.lossSheet.lineItems.map(item =>
                  '<tr>' +
                    '<td>' + item.description + '</td>' +
                    '<td>' + item.quantity + '</td>' +
                    '<td>' + item.unit + '</td>' +
                    '<td>' + (item.rcv ? '$' + item.rcv.toFixed(2) : '\u2014') + '</td>' +
                  '</tr>'
                ).join('') +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>';
    }

    // Supplement items
    let suppHtml = '';
    if (data.supplementItems && data.supplementItems.length > 0) {
      suppHtml =
        '<div class="lc-section">' +
          '<div class="lc-section-header lc-header-supp">' +
            '<div>' +
              '<h3>\uD83D\uDD27 Items to Order (Loss Sheet Only)</h3>' +
              '<p>These items appear on the loss sheet but are not measured by the roof report \u2014 verify quantities on site</p>' +
            '</div>' +
          '</div>' +
          '<div class="lc-section-body">' +
            '<table class="lc-table">' +
              '<thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Note</th></tr></thead>' +
              '<tbody>' +
                data.supplementItems.map(item =>
                  '<tr>' +
                    '<td>' + item.description + '</td>' +
                    '<td>' + item.quantity + '</td>' +
                    '<td>' + item.unit + '</td>' +
                    '<td style="color:#92400e; font-size:12px;">' + (item.note || 'Field verify') + '</td>' +
                  '</tr>'
                ).join('') +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>';
    }

    container.innerHTML = headerHtml + compHtml + roofHtml + lossHtml + suppHtml;
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function measurementCard(label, value, unit) {
    if (!value && value !== 0) return '';
    return '<div class="lc-meas-card">' +
      '<div class="lc-meas-label">' + label + '</div>' +
      '<div class="lc-meas-value">' + value + ' <span class="lc-meas-unit">' + unit + '</span></div>' +
      '</div>';
  }

  // ── Utility ────────────────────────────────────────────────────────────────
  function showLoading(show) {
    document.getElementById('lc-loading').style.display = show ? 'flex' : 'none';
  }

  function showError(msg) {
    const el = document.getElementById('lc-error');
    el.textContent = '\u26A0\uFE0F ' + msg;
    el.style.display = 'block';
  }

  function clearResults() {
    const r = document.getElementById('lc-results');
    if (r) { r.innerHTML = ''; r.style.display = 'none'; }
    const e = document.getElementById('lc-error');
    if (e) { e.style.display = 'none'; e.textContent = ''; }
  }

  return { init, removeFile, handleFiles };
})();

document.addEventListener('DOMContentLoaded', LossCompare.init);
