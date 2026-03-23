// ==========================================
// CUSTOMERS TAB
// ==========================================

let customerSearchTimeout = null;

function initCustomersTab() {
  const searchInput = document.getElementById('customerSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(customerSearchTimeout);
      customerSearchTimeout = setTimeout(() => {
        searchCustomers(searchInput.value);
      }, 300);
    });
  }
}

async function searchCustomers(name) {
  const resultsDiv = document.getElementById('customerSearchResults');
  if (!name || name.trim().length < 2) {
    resultsDiv.innerHTML = '';
    return;
  }

  resultsDiv.innerHTML = '<div style="padding: 12px; color: #64748b;">Searching...</div>';

  try {
    const res = await fetch(`/api/customers/search?name=${encodeURIComponent(name.trim())}`);
    const data = await res.json();

    if (!data.success || data.customers.length === 0) {
      resultsDiv.innerHTML = '<div style="padding: 12px; color: #64748b;">No customers found.</div>';
      return;
    }

    resultsDiv.innerHTML = data.customers.map(c => `
      <div class="customer-result-row" onclick="loadCustomer(${c.id})" style="
        padding: 12px 16px;
        border-bottom: 1px solid #e2e8f0;
        cursor: pointer;
        transition: background 0.15s;
      " onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='white'">
        <div style="font-weight: 600; color: #1e293b;">${c.name}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
          ${c.address || 'No address'} ${c.carrier ? '· ' + c.carrier : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    resultsDiv.innerHTML = '<div style="padding: 12px; color: #ef4444;">Error loading results.</div>';
  }
}

async function loadCustomer(customerId) {
  const detailDiv = document.getElementById('customerDetail');
  const searchSection = document.getElementById('customerSearchSection');
  detailDiv.style.display = 'block';
  searchSection.style.display = 'none';
  detailDiv.innerHTML = '<div style="padding: 20px; color: #64748b;">Loading...</div>';

  try {
    const res = await fetch(`/api/customers/${customerId}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    const c = data.customer;
    const estimates = data.estimates;

    detailDiv.innerHTML = `
      <div style="margin-bottom: 20px;">
        <button onclick="backToSearch()" style="
          background: none; border: none; color: #0891b2; cursor: pointer;
          font-size: 14px; padding: 0; margin-bottom: 16px; display: flex; align-items: center; gap: 4px;
        ">← Back to Search</button>
        <h2 style="margin: 0 0 4px 0; color: #1e293b;">${c.name}</h2>
        <div style="color: #64748b; font-size: 14px;">
          ${[c.phone, c.email, c.address, c.carrier].filter(Boolean).join(' · ')}
        </div>
      </div>

      <h3 style="color: #0891b2; margin-bottom: 12px;">Estimate History (${estimates.length})</h3>

      ${estimates.length === 0 ? '<div style="color: #64748b;">No estimates saved yet.</div>' : ''}

      ${estimates.map(e => `
        <div style="
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 12px;
          background: white;
        ">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div>
              <div style="font-weight: 600; color: #1e293b;">${e.job_address || 'No address'}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                ${new Date(e.created_at).toLocaleDateString()} 
                ${e.carrier ? '· ' + e.carrier : ''}
                ${e.claim_number ? '· Claim #' + e.claim_number : ''}
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 700; color: #0891b2; font-size: 18px;">$${parseFloat(e.grand_total || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
              <div style="font-size: 12px; color: #64748b;">${e.roof_squares ? e.roof_squares + ' sq' : ''}</div>
            </div>
          </div>
          ${e.notes ? `<div style="font-size: 13px; color: #475569; border-top: 1px solid #f1f5f9; padding-top: 8px; margin-top: 8px;">${e.notes}</div>` : ''}
        </div>
      `).join('')}
    `;
  } catch (err) {
    detailDiv.innerHTML = `<div style="padding: 20px; color: #ef4444;">Error: ${err.message}</div>`;
  }
}

function backToSearch() {
  document.getElementById('customerDetail').style.display = 'none';
  document.getElementById('customerSearchSection').style.display = 'block';
}

// ==========================================
// SAVE TO CUSTOMER (from Materials tab)
// ==========================================

async function saveToCustomer() {
  const customerName = document.getElementById('customerName')?.value?.trim();
  const jobAddress = document.getElementById('jobAddress')?.value?.trim();
  const jobNumber = document.getElementById('jobNumber')?.value?.trim();
  const raw = window.currentRawMeasurements || {};

  if (!customerName) {
    alert('Please enter a customer name before saving.');
    return;
  }

  const btn = document.getElementById('saveToCustomerBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  try {
    // Step 1: Create or find customer
    // Try searching first
    const searchRes = await fetch(`/api/customers/search?name=${encodeURIComponent(customerName)}`);
    const searchData = await searchRes.json();

    let customerId;

    const exactMatch = searchData.customers?.find(c =>
      c.name.toLowerCase() === customerName.toLowerCase()
    );

    if (exactMatch) {
      customerId = exactMatch.id;
    } else {
      // Create new customer
      const createRes = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customerName,
          address: jobAddress || null,
          carrier: raw.carrier || null,
          claim_number: raw.claim_number || null
        })
      });
      const createData = await createRes.json();
      if (!createData.success) throw new Error(createData.message);
      customerId = createData.customer.id;
    }

    // Step 2: Save estimate
    const estimateRes = await fetch(`/api/customers/${customerId}/estimates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_address: jobAddress || null,
        carrier: raw.carrier || null,
        claim_number: raw.claim_number || null,
        roof_squares: raw.roof_sq || window.currentMeasurements?.roofSquares || null,
        materials: window.materialsData || [],
        supplement_items: window.supplementItems || [],
        labor: window.laborData || {},
        subtotal: parseFloat(document.getElementById('subtotalCell')?.textContent?.replace(/[^0-9.]/g, '')) || 0,
        tax: parseFloat(document.getElementById('taxCell')?.textContent?.replace(/[^0-9.]/g, '')) || 0,
        grand_total: parseFloat(document.getElementById('grandTotal')?.textContent?.replace(/[^0-9.]/g, '')) || 0,
        notes: jobNumber ? `Job #${jobNumber}` : null
      })
    });

    const estimateData = await estimateRes.json();
    if (!estimateData.success) throw new Error(estimateData.message);

    if (btn) { btn.disabled = false; btn.textContent = '✓ Saved'; btn.style.background = '#10b981'; }
    setTimeout(() => {
      if (btn) { btn.textContent = 'Save to Customer'; btn.style.background = ''; btn.disabled = false; }
    }, 3000);

  } catch (err) {
    console.error('[SAVE-CUSTOMER] Error:', err);
    alert('Error saving: ' + err.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Save to Customer'; }
  }
}
