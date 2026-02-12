// ============================================
// RETAIL ESTIMATE MODULE
// Version: 2026-02-12 v2
// Fully customizable with customer/internal views
// ============================================

console.log('[RETAIL] Module loaded v2');

window.retailData = null;
window.retailViewMode = 'internal'; // 'internal' or 'customer'

// Initialize from materials data
function initializeRetailEstimate() {
  if (!window.materialsData || !window.currentMeasurements) {
    console.log('[RETAIL] No materials data');
    return null;
  }

  const measurements = window.currentMeasurements;
  const raw = window.currentRawMeasurements || {};
  const squares = parseFloat(raw.roof_sq) || parseFloat(measurements.roofSquares) || 0;

  // Build line items from materials (fully editable)
  const lineItems = [];

  // Add materials as individual line items
  window.materialsData.forEach((mat, idx) => {
    if (mat.quantity > 0) {
      lineItems.push({
        id: 'mat-' + idx,
        category: 'Materials',
        description: mat.name,
        quantity: mat.quantity,
        unit: mat.unit,
        unitCost: mat.unitPrice,
        markup: 35
      });
    }
  });

  // Add labor items from labor tab if available
  if (window.laborData && window.laborData.items) {
    window.laborData.items.forEach((labor, idx) => {
      if (labor.quantity > 0) {
        lineItems.push({
          id: 'labor-' + idx,
          category: 'Labor',
          description: labor.name,
          quantity: labor.quantity,
          unit: labor.unit,
          unitCost: labor.unitPrice,
          markup: 25
        });
      }
    });
  } else {
    lineItems.push({
      id: 'labor-default',
      category: 'Labor',
      description: 'Roof Installation Labor',
      quantity: squares,
      unit: 'SQ',
      unitCost: 80,
      markup: 25
    });
  }

  const estimate = {
    customerName: document.getElementById('customerName')?.value || '',
    jobAddress: document.getElementById('jobAddress')?.value || '',
    jobNumber: document.getElementById('jobNumber')?.value || '',
    shingleColor: document.getElementById('shingleColorInput')?.value || '',
    measurements: { squares },
    lineItems: lineItems,
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

  window.retailData = estimate;
  return estimate;
}

function calculateRetailTotals() {
  if (!window.retailData) return { subtotal: 0, fees: 0, tax: 0, grandTotal: 0 };

  const est = window.retailData;
  let materialsTotal = 0, laborTotal = 0;

  est.lineItems.forEach(item => {
    const itemTotal = item.quantity * item.unitCost * (1 + item.markup / 100);
    if (item.category === 'Materials') materialsTotal += itemTotal;
    else laborTotal += itemTotal;
  });

  const subtotal = materialsTotal + laborTotal;
  let feesTotal = 0, runningTotal = subtotal;

  est.fees.forEach(fee => {
    if (fee.enabled) {
      fee.calculated = fee.type === 'percent' ? runningTotal * (fee.value / 100) : fee.value;
      feesTotal += fee.calculated;
      runningTotal += fee.calculated;
    } else {
      fee.calculated = 0;
    }
  });

  let taxableAmount = est.tax.applyTo === 'materials' ? materialsTotal :
                      est.tax.applyTo === 'all' ? subtotal + feesTotal : 0;

  const taxAmount = taxableAmount * (est.tax.rate / 100);

  return {
    materialsTotal,
    laborTotal,
    subtotal,
    feesTotal,
    taxAmount,
    grandTotal: subtotal + feesTotal + taxAmount
  };
}

function toggleRetailView(mode) {
  window.retailViewMode = mode || (window.retailViewMode === 'internal' ? 'customer' : 'internal');
  const toggle = document.getElementById('retailViewToggle');
  if (toggle) toggle.checked = window.retailViewMode === 'customer';
  displayRetailEstimate();
}

function displayRetailEstimate() {
  const notReady = document.getElementById('retailNotReady');
  const results = document.getElementById('retailResults');

  if (!window.retailData) initializeRetailEstimate();

  if (!window.retailData) {
    if (notReady) notReady.style.display = 'block';
    if (results) results.style.display = 'none';
    return;
  }

  if (notReady) notReady.style.display = 'none';
  if (results) results.style.display = 'block';

  const est = window.retailData;
  const totals = calculateRetailTotals();
  const isCustomer = window.retailViewMode === 'customer';
  const el = id => document.getElementById(id);

  if (el('retailCustomerName')) el('retailCustomerName').textContent = est.customerName || 'Customer';
  if (el('retailJobAddress')) el('retailJobAddress').textContent = est.jobAddress || '';
  if (el('retailSquares')) el('retailSquares').textContent = est.measurements.squares.toFixed(1) + ' sq';

  document.querySelectorAll('.retail-internal-only').forEach(e => e.style.display = isCustomer ? 'none' : '');

  const tableBody = el('retailLineItemsTable');
  if (tableBody) {
    tableBody.innerHTML = est.lineItems.map((item, idx) => {
      const itemTotal = item.quantity * item.unitCost * (1 + item.markup / 100);

      if (isCustomer) {
        return `<tr><td>${item.description}</td></tr>`;
      }

      return `
        <tr>
          <td><select onchange="updateRetailItem(${idx},'category',this.value)" class="editable-input" style="width:auto;">
            <option value="Materials" ${item.category==='Materials'?'selected':''}>Materials</option>
            <option value="Labor" ${item.category==='Labor'?'selected':''}>Labor</option>
            <option value="Other" ${item.category==='Other'?'selected':''}>Other</option>
          </select></td>
          <td><input type="text" value="${item.description}" onchange="updateRetailItem(${idx},'description',this.value)" class="editable-input" style="width:100%;"></td>
          <td style="text-align:right;"><input type="number" value="${item.quantity}" step="0.01" onchange="updateRetailItem(${idx},'quantity',this.value)" class="editable-input" style="width:70px;text-align:right;"> <span style="display:inline-block;width:45px;text-align:left;">${item.unit}</span></td>
          <td style="text-align:right;">$<input type="number" value="${item.unitCost.toFixed(2)}" step="0.01" onchange="updateRetailItem(${idx},'unitCost',this.value)" class="editable-input" style="width:80px;"></td>
          <td style="text-align:right;"><input type="number" value="${item.markup}" step="1" onchange="updateRetailItem(${idx},'markup',this.value)" class="editable-input" style="width:65px;text-align:right;">%</td>
          <td style="text-align:right;font-weight:600;">$${itemTotal.toFixed(2)}</td>
          <td class="delete-cell"><button class="delete-btn" onclick="deleteRetailItem(${idx})">×</button></td>
        </tr>`;
    }).join('');
  }

  const feesBody = el('retailFeesTable');
  if (feesBody && !isCustomer) {
    feesBody.innerHTML = est.fees.map((fee, idx) => `
      <tr>
        <td><label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" ${fee.enabled?'checked':''} onchange="toggleRetailFee(${idx},this.checked)">
          <input type="text" value="${fee.description}" onchange="updateRetailFee(${idx},'description',this.value)" class="editable-input" style="width:150px;">
        </label></td>
        <td><select onchange="updateRetailFee(${idx},'type',this.value)" class="editable-input">
          <option value="percent" ${fee.type==='percent'?'selected':''}>Percent</option>
          <option value="flat" ${fee.type==='flat'?'selected':''}>Flat $</option>
        </select></td>
        <td><input type="number" value="${fee.value}" step="0.01" onchange="updateRetailFee(${idx},'value',this.value)" class="editable-input" style="width:80px;">${fee.type==='percent'?'%':''}</td>
        <td style="text-align:right;font-weight:600;">${fee.enabled?'$'+fee.calculated.toFixed(2):'-'}</td>
      </tr>`).join('');
  }

  if (el('retailSubtotal')) el('retailSubtotal').innerHTML = '<strong>$' + totals.subtotal.toFixed(2) + '</strong>';
  if (el('retailFeesTotal')) el('retailFeesTotal').textContent = '$' + totals.feesTotal.toFixed(2);
  if (el('retailTaxAmount')) el('retailTaxAmount').textContent = '$' + totals.taxAmount.toFixed(2);
  if (el('retailGrandTotal')) el('retailGrandTotal').innerHTML = '<strong>$' + totals.grandTotal.toFixed(2) + '</strong>';

  if (el('retailTaxRate')) el('retailTaxRate').value = est.tax.rate;
  if (el('retailTaxApplyTo')) el('retailTaxApplyTo').value = est.tax.applyTo;
}

function updateRetailItem(idx, field, value) {
  if (!window.retailData) return;
  const item = window.retailData.lineItems[idx];
  if (!item) return;

  item[field] = (field === 'quantity' || field === 'unitCost' || field === 'markup') ?
    parseFloat(value) || 0 : value;

  displayRetailEstimate();
}

function addRetailLineItem() {
  if (!window.retailData) return;
  window.retailData.lineItems.push({
    id: 'custom-' + Date.now(),
    category: 'Other',
    description: 'New Item',
    quantity: 1,
    unit: 'EA',
    unitCost: 0,
    markup: 0
  });
  displayRetailEstimate();
}

function deleteRetailItem(idx) {
  if (!window.retailData || !confirm('Delete this line item?')) return;
  window.retailData.lineItems.splice(idx, 1);
  displayRetailEstimate();
}

function updateRetailFee(idx, field, value) {
  if (!window.retailData) return;
  const fee = window.retailData.fees[idx];
  fee[field] = field === 'value' ? parseFloat(value) || 0 : value;
  displayRetailEstimate();
}

function toggleRetailFee(idx, enabled) {
  if (!window.retailData) return;
  window.retailData.fees[idx].enabled = enabled;
  displayRetailEstimate();
}

function addRetailFee() {
  if (!window.retailData) return;
  window.retailData.fees.push({
    id: 'custom-' + Date.now(),
    description: 'Custom Fee',
    type: 'flat',
    value: 0,
    enabled: true,
    calculated: 0
  });
  displayRetailEstimate();
}

function updateRetailTax(field, value) {
  if (!window.retailData) return;
  if (field === 'rate') window.retailData.tax.rate = parseFloat(value) || 0;
  else if (field === 'applyTo') window.retailData.tax.applyTo = value;
  displayRetailEstimate();
}

function printRetailEstimate() {
  if (!window.retailData) {
    alert('No estimate data. Upload a PDF first.');
    return;
  }
  pdfMake.createPdf(buildRetailPDF()).open();
}

function saveRetailEstimate() {
  if (!window.retailData) {
    alert('No estimate data. Upload a PDF first.');
    return;
  }
  const name = (window.retailData.customerName || 'Customer').replace(/[^a-z0-9]/gi, '_');
  pdfMake.createPdf(buildRetailPDF()).download(name + '_Estimate.pdf');
}

function buildRetailPDF() {
  const est = window.retailData;
  const totals = calculateRetailTotals();
  const isCustomer = window.retailViewMode === 'customer';

  const tableBody = [];

  if (isCustomer) {
    tableBody.push([{ text: 'Materials & Labor Included', style: 'tableHeader' }]);
    est.lineItems.forEach(item => {
      tableBody.push([item.description]);
    });
  } else {
    tableBody.push([
      { text: 'Category', style: 'tableHeader' },
      { text: 'Description', style: 'tableHeader' },
      { text: 'Qty', style: 'tableHeader', alignment: 'right' },
      { text: 'Unit Cost', style: 'tableHeader', alignment: 'right' },
      { text: 'Markup', style: 'tableHeader', alignment: 'right' },
      { text: 'Total', style: 'tableHeader', alignment: 'right' }
    ]);

    est.lineItems.forEach(item => {
      const t = item.quantity * item.unitCost * (1 + item.markup / 100);
      tableBody.push([item.category, item.description, { text: item.quantity + ' ' + item.unit, alignment: 'right' }, { text: '$' + item.unitCost.toFixed(2), alignment: 'right' }, { text: item.markup + '%', alignment: 'right' }, { text: '$' + t.toFixed(2), alignment: 'right' }]);
    });
  }

  const totalsStack = [
    { columns: [{ text: 'Subtotal:', width: '*', alignment: 'right' }, { text: '$' + totals.subtotal.toFixed(2), width: 100, alignment: 'right' }], margin: [0, 4, 0, 4] }
  ];

  if (!isCustomer) {
    est.fees.filter(f => f.enabled).forEach(fee => {
      totalsStack.push({ columns: [{ text: fee.description + (fee.type === 'percent' ? ' (' + fee.value + '%)' : '') + ':', width: '*', alignment: 'right' }, { text: '$' + fee.calculated.toFixed(2), width: 100, alignment: 'right' }], margin: [0, 2, 0, 2] });
    });
  } else if (totals.feesTotal > 0) {
    totalsStack.push({ columns: [{ text: 'Fees:', width: '*', alignment: 'right' }, { text: '$' + totals.feesTotal.toFixed(2), width: 100, alignment: 'right' }], margin: [0, 2, 0, 2] });
  }

  totalsStack.push({ columns: [{ text: 'Tax (' + est.tax.rate + '%):', width: '*', alignment: 'right' }, { text: '$' + totals.taxAmount.toFixed(2), width: 100, alignment: 'right' }], margin: [0, 4, 0, 4] });

  totalsStack.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 2, lineColor: '#0891b2' }], margin: [0, 8, 0, 8] });

  totalsStack.push({ columns: [{ text: 'TOTAL:', width: '*', alignment: 'right', bold: true, fontSize: 14 }, { text: '$' + totals.grandTotal.toFixed(2), width: 100, alignment: 'right', bold: true, fontSize: 14, color: '#0891b2' }] });

  return {
    pageSize: 'LETTER',
    pageMargins: [72, 72, 72, 72],
    content: [
      { text: isCustomer ? 'ROOFING ESTIMATE' : 'INTERNAL ESTIMATE', style: 'header' },
      { text: 'Date: ' + new Date().toLocaleDateString(), margin: [0, 8, 0, 20] },
      { columns: [
        { width: '50%', stack: [{ text: 'PREPARED FOR:', style: 'label' }, { text: est.customerName || 'Customer', style: 'customerName', margin: [0, 4, 0, 0] }, { text: est.jobAddress || '', margin: [0, 4, 0, 0] }, { text: 'Job #: ' + (est.jobNumber || 'N/A'), margin: [0, 4, 0, 0] }] },
        { width: '50%', stack: [{ text: 'PROJECT DETAILS:', style: 'label' }, { text: 'Roof Size: ' + est.measurements.squares.toFixed(1) + ' squares', margin: [0, 4, 0, 0] }, { text: 'Shingle: ' + (est.shingleColor || 'TBD'), margin: [0, 4, 0, 0] }] }
      ], margin: [0, 0, 0, 30] },
      { text: 'SCOPE OF WORK', style: 'sectionHeader', margin: [0, 0, 0, 12] },
      { table: { headerRows: 1, widths: isCustomer ? ['*'] : ['auto', '*', 'auto', 'auto', 'auto', 'auto'], body: tableBody }, layout: { hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5, vLineWidth: () => 0, hLineColor: () => '#E5E7EB', paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 6, paddingBottom: () => 6 }, margin: [0, 0, 0, 20] },
      { columns: [{ width: '*', text: '' }, { width: 250, stack: totalsStack }] },
      { text: ' This estimate is valid for 30 days.', style: 'terms' },
      { columns: [{ width: '45%', stack: [{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 1 }], margin: [0, 50, 0, 4] }, { text: 'Customer Signature / Date', fontSize: 9, color: '#64748b' }] }, { width: '10%', text: '' }, { width: '45%', stack: [{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 1 }], margin: [0, 50, 0, 4] }, { text: 'Contractor Signature / Date', fontSize: 9, color: '#64748b' }] }] }
    ],
    styles: {
      header: { fontSize: 24, bold: true, color: '#0891b2' },
      label: { fontSize: 10, bold: true, color: '#64748b' },
      customerName: { fontSize: 14, bold: true },
      sectionHeader: { fontSize: 12, bold: true },
      tableHeader: { bold: true, fontSize: 9, fillColor: '#f8fafc' },
      terms: { fontSize: 9, color: '#64748b' }
    }
  };
}

function refreshRetailFromSource() {
  if (!confirm('Reload all items from Materials/Labor tabs? Custom items will be lost.')) return;
  window.retailData = null;
  initializeRetailEstimate();
  displayRetailEstimate();
}
