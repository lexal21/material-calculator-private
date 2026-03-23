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
  try {
    const res = await fetch(`/api/customers/${customerId}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    const estimates = data.estimates;
    if (estimates.length === 0) {
      alert('This customer has no saved estimates yet.');
      return;
    }

    // Load the most recent estimate
    const e = estimates[0];

    // Parse stored JSON fields (Railway returns them as objects already, but guard either way)
    const materials = typeof e.materials === 'string' ? JSON.parse(e.materials) : (e.materials || []);
    const supplementItems = typeof e.supplement_items === 'string' ? JSON.parse(e.supplement_items) : (e.supplement_items || []);
    const labor = typeof e.labor === 'string' ? JSON.parse(e.labor) : (e.labor || { items: [] });

    // Build a raw measurements object from what we stored
    const raw = {
      customer_name: data.customer.name,
      address: e.job_address || '',
      carrier: e.carrier || '',
      claim_number: e.claim_number || '',
      roof_sq: e.roof_squares || 0,
      order_number: e.notes ? e.notes.replace('Job #', '') : ''
    };

    const measurements = {
      roofSquares: parseFloat(e.roof_squares) || 0,
      ridgeLength: 0,
      hipLength: 0,
      valleyLength: 0,
      eaveLength: 0,
      rakeLength: 0,
      ridgeCount: 0
    };

    // Fire displayResults exactly as if a PDF was just processed
    if (typeof displayResults === 'function') {
      displayResults({
        success: true,
        source: 'customer_db',
        raw: raw,
        measurements: measurements,
        materials: materials,
        supplementItems: supplementItems,
        labor: labor,
        subtotal: parseFloat(e.subtotal) || 0,
        tax: parseFloat(e.tax) || 0,
        grandTotal: parseFloat(e.grand_total) || 0
      });
    }

    // Switch to materials tab
    if (typeof switchTab === 'function') {
      switchTab('calculator');
    }

  } catch (err) {
    console.error('[LOAD-CUSTOMER] Error:', err);
    alert('Error loading customer: ' + err.message);
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
