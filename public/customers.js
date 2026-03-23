// ==========================================
// CUSTOMER DRAWER
// ==========================================

let _drawerSearchTimeout = null;

function openCustomerDrawer() {
  const drawer = document.getElementById('customerDrawer');
  const backdrop = document.getElementById('customerDrawerBackdrop');
  if (!drawer) return;
  backdrop.style.display = 'block';
  requestAnimationFrame(() => {
    drawer.style.right = '0';
    const input = document.getElementById('drawerSearchInput');
    if (input) { input.value = ''; input.focus(); }
    setDrawerResults('<div style="text-align:center;color:#94a3b8;font-size:14px;padding:32px 0;">Start typing to find a customer</div>');
  });
}

function closeCustomerDrawer() {
  const drawer = document.getElementById('customerDrawer');
  const backdrop = document.getElementById('customerDrawerBackdrop');
  if (!drawer) return;
  drawer.style.right = '-100%';
  backdrop.style.display = 'none';
}

function setDrawerResults(html) {
  const el = document.getElementById('drawerResults');
  if (el) el.innerHTML = html;
}

function highlightMatch(text, query) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<strong style="color:#0891b2">$1</strong>');
}

function drawerSearch(value) {
  clearTimeout(_drawerSearchTimeout);
  _drawerSearchTimeout = setTimeout(() => searchCustomersDrawer(value), 220);
}

async function searchCustomersDrawer(name) {
  const q = name.trim();
  if (q.length < 2) {
    setDrawerResults('<div style="text-align:center;color:#94a3b8;font-size:14px;padding:32px 0;">Start typing to find a customer</div>');
    return;
  }

  setDrawerResults('<div style="text-align:center;color:#94a3b8;font-size:14px;padding:32px 0;">Searching…</div>');

  try {
    const res = await fetch(`/api/customers/search?name=${encodeURIComponent(q)}`);
    const data = await res.json();

    if (!data.success || !data.customers.length) {
      setDrawerResults('<div style="text-align:center;color:#94a3b8;font-size:14px;padding:32px 0;">No customers found</div>');
      return;
    }

    setDrawerResults(data.customers.map(c => `
      <div onclick="loadCustomerFromDrawer(${c.id})" style="
        padding: 14px 12px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.12s;
        background: white;
      "
      onmouseover="this.style.borderColor='#0891b2';this.style.background='#f0f9ff'"
      onmouseout="this.style.borderColor='#e2e8f0';this.style.background='white'"
      >
        <div style="font-weight:600;color:#1e293b;font-size:15px;">${highlightMatch(c.name, q)}</div>
        <div style="font-size:12px;color:#64748b;margin-top:3px;">
          ${[c.address, c.carrier, c.claim_number ? 'Claim #' + c.claim_number : ''].filter(Boolean).join(' · ')}
        </div>
      </div>
    `).join(''));

  } catch {
    setDrawerResults('<div style="text-align:center;color:#ef4444;font-size:14px;padding:32px 0;">Error loading results</div>');
  }
}

async function loadCustomerFromDrawer(id) {
  setDrawerResults('<div style="text-align:center;color:#94a3b8;font-size:14px;padding:32px 0;">Loading estimate…</div>');
  try {
    const res = await fetch(`/api/customers/${id}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    if (!data.estimates.length) {
      setDrawerResults('<div style="text-align:center;color:#94a3b8;font-size:14px;padding:32px 0;">No estimates saved for this customer</div>');
      return;
    }

    const e = data.estimates[0];
    const parse = v => typeof v === 'string' ? JSON.parse(v) : (v || null);

    closeCustomerDrawer();

    if (typeof displayResults === 'function') {
      displayResults({
        success: true,
        source: 'customer_db',
        raw: {
          customer_name: data.customer.name,
          address: e.job_address || '',
          carrier: e.carrier || '',
          claim_number: e.claim_number || '',
          roof_sq: e.roof_squares || 0,
          order_number: (e.notes || '').replace('Job #', '')
        },
        measurements: {
          roofSquares: parseFloat(e.roof_squares) || 0,
          ridgeLength: 0, hipLength: 0, valleyLength: 0,
          eaveLength: 0, rakeLength: 0, ridgeCount: 0
        },
        materials: parse(e.materials) || [],
        supplementItems: parse(e.supplement_items) || [],
        labor: parse(e.labor) || { items: [] },
        subtotal: parseFloat(e.subtotal) || 0,
        tax: parseFloat(e.tax) || 0,
        grandTotal: parseFloat(e.grand_total) || 0
      });
    }

    if (typeof switchTab === 'function') switchTab('calculator');

  } catch (err) {
    setDrawerResults(`<div style="text-align:center;color:#ef4444;font-size:14px;padding:32px 0;">Error: ${err.message}</div>`);
  }
}

// ==========================================
// QUICK SEARCH BAR (Materials, Labor, Retail)
// ==========================================

let _quickSearchTimeout = null;

function initQuickCustomerSearch(inputId, resultsId) {
  const input = document.getElementById(inputId);
  const results = document.getElementById(resultsId);
  if (!input || !results) return;

  input.addEventListener('input', () => {
    clearTimeout(_quickSearchTimeout);
    _quickSearchTimeout = setTimeout(() => quickCustomerSearch(input.value, results), 220);
  });

  input.addEventListener('blur', () => {
    setTimeout(() => { results.style.display = 'none'; }, 200);
  });

  input.addEventListener('focus', () => {
    if (input.value.trim().length >= 2) results.style.display = 'block';
  });
}

async function quickCustomerSearch(value, resultsEl) {
  const q = value.trim();
  if (q.length < 2) { resultsEl.style.display = 'none'; return; }

  resultsEl.style.display = 'block';
  resultsEl.innerHTML = '<div style="padding:10px 14px;color:#94a3b8;font-size:13px;">Searching…</div>';

  try {
    const res = await fetch(`/api/customers/search?name=${encodeURIComponent(q)}`);
    const data = await res.json();

    if (!data.success || !data.customers.length) {
      resultsEl.innerHTML = '<div style="padding:10px 14px;color:#94a3b8;font-size:13px;">No customers found</div>';
      return;
    }

    resultsEl.innerHTML = data.customers.map(c => `
      <div onclick="loadCustomerQuick(${c.id})" style="
        padding: 10px 14px;
        cursor: pointer;
        border-bottom: 1px solid #f1f5f9;
        transition: background 0.1s;
      "
      onmouseover="this.style.background='#f0f9ff'"
      onmouseout="this.style.background='white'"
      >
        <div style="font-weight:600;color:#1e293b;font-size:14px;">${highlightMatch(c.name, q)}</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px;">${c.address || ''}</div>
      </div>
    `).join('');
  } catch {
    resultsEl.innerHTML = '<div style="padding:10px 14px;color:#ef4444;font-size:13px;">Error</div>';
  }
}

async function loadCustomerQuick(id) {
  // Hide all quick search dropdowns
  document.querySelectorAll('.quick-search-results').forEach(el => el.style.display = 'none');

  try {
    const res = await fetch(`/api/customers/${id}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    if (!data.estimates.length) { alert('No estimates saved for this customer.'); return; }

    const e = data.estimates[0];
    const parse = v => typeof v === 'string' ? JSON.parse(v) : (v || null);

    if (typeof displayResults === 'function') {
      displayResults({
        success: true,
        source: 'customer_db',
        raw: {
          customer_name: data.customer.name,
          address: e.job_address || '',
          carrier: e.carrier || '',
          claim_number: e.claim_number || '',
          roof_sq: e.roof_squares || 0,
          order_number: (e.notes || '').replace('Job #', '')
        },
        measurements: {
          roofSquares: parseFloat(e.roof_squares) || 0,
          ridgeLength: 0, hipLength: 0, valleyLength: 0,
          eaveLength: 0, rakeLength: 0, ridgeCount: 0
        },
        materials: parse(e.materials) || [],
        supplementItems: parse(e.supplement_items) || [],
        labor: parse(e.labor) || { items: [] },
        subtotal: parseFloat(e.subtotal) || 0,
        tax: parseFloat(e.tax) || 0,
        grandTotal: parseFloat(e.grand_total) || 0
      });
    }

    if (typeof switchTab === 'function') switchTab('calculator');

  } catch (err) {
    alert('Error loading customer: ' + err.message);
  }
}

// ==========================================
// SAVE TO CUSTOMER
// ==========================================

async function saveToCustomer() {
  const name = document.getElementById('customerName')?.value?.trim();
  const address = document.getElementById('jobAddress')?.value?.trim();
  const jobNum = document.getElementById('jobNumber')?.value?.trim();
  const raw = window.currentRawMeasurements || {};

  if (!name) { alert('Enter a customer name first.'); return; }

  const btn = document.getElementById('saveToCustomerBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

  try {
    const searchRes = await fetch(`/api/customers/search?name=${encodeURIComponent(name)}`);
    const searchData = await searchRes.json();
    const match = searchData.customers?.find(c => c.name.toLowerCase() === name.toLowerCase());

    let customerId;
    if (match) {
      customerId = match.id;
    } else {
      const cr = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address: address || null, carrier: raw.carrier || null, claim_number: raw.claim_number || null })
      });
      const cd = await cr.json();
      if (!cd.success) throw new Error(cd.message);
      customerId = cd.customer.id;
    }

    const getNum = id => parseFloat(document.getElementById(id)?.textContent?.replace(/[^0-9.]/g, '')) || 0;

    const er = await fetch(`/api/customers/${customerId}/estimates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_address: address || null,
        carrier: raw.carrier || null,
        claim_number: raw.claim_number || null,
        roof_squares: raw.roof_sq || window.currentMeasurements?.roofSquares || null,
        materials: window.materialsData || [],
        supplement_items: window.supplementItems || [],
        labor: window.laborData || {},
        subtotal: getNum('subtotalCell'),
        tax: getNum('taxCell'),
        grand_total: getNum('grandTotal'),
        notes: jobNum ? `Job #${jobNum}` : null
      })
    });

    const ed = await er.json();
    if (!ed.success) throw new Error(ed.message);

    if (btn) {
      btn.textContent = '✓ Saved';
      btn.style.background = '#10b981';
      setTimeout(() => { btn.textContent = 'Save to Customer'; btn.style.background = ''; btn.disabled = false; }, 3000);
    }
  } catch (err) {
    alert('Error saving: ' + err.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Save to Customer'; }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initQuickCustomerSearch('matQuickSearch', 'matQuickResults');
  initQuickCustomerSearch('laborQuickSearch', 'laborQuickResults');
  initQuickCustomerSearch('retailQuickSearch', 'retailQuickResults');
});
