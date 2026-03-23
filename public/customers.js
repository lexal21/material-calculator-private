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
      <div style="
        padding: 14px 12px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        margin-bottom: 8px;
        background: white;
        display: flex;
        align-items: center;
        gap: 10px;
      ">
        <div onclick="loadCustomerFromDrawer(${c.id})" style="
          flex: 1;
          cursor: pointer;
          min-width: 0;
        "
        onmouseover="this.style.opacity='0.75'"
        onmouseout="this.style.opacity='1'"
        >
          <div style="font-weight:600;color:#1e293b;font-size:15px;">${highlightMatch(c.name, q)}</div>
          <div style="font-size:12px;color:#64748b;margin-top:3px;">
            ${[c.address, c.carrier, c.claim_number ? 'Claim #' + c.claim_number : ''].filter(Boolean).join(' · ')}
          </div>
        </div>
        <button onclick="deleteCustomer(${c.id}, '${c.name.replace(/'/g, "\\'")}'); event.stopPropagation();" style="
          flex-shrink: 0;
          background: none;
          border: 1px solid #fca5a5;
          color: #ef4444;
          border-radius: 6px;
          padding: 5px 10px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.1s;
        "
        onmouseover="this.style.background='#fef2f2'"
        onmouseout="this.style.background='none'"
        >Delete</button>
      </div>
    `).join(''));

  } catch {
    setDrawerResults('<div style="text-align:center;color:#ef4444;font-size:14px;padding:32px 0;">Error loading results</div>');
  }
}

async function loadCustomerFromDrawer(id) {
  setDrawerResults('<div style="text-align:center;color:#94a3b8;font-size:14px;padding:32px 0;">Loading…</div>');
  try {
    const res = await fetch(`/api/customers/${id}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    // Reset drawer search
    const input = document.getElementById('drawerSearchInput');
    if (input) await searchCustomersDrawer(input.value);

    openCustomerProfile(data);
  } catch (err) {
    setDrawerResults(`<div style="text-align:center;color:#ef4444;font-size:14px;padding:32px 0;">Error: ${err.message}</div>`);
  }
}

function openCustomerProfile(data) {
  const modal = document.getElementById('customerProfileModal');
  const c = data.customer;
  const grouped = data.grouped || {};

  document.getElementById('profileCustomerName').textContent = c.name;
  document.getElementById('profileCustomerMeta').textContent =
    [c.address, c.carrier, c.claim_number ? 'Claim #' + c.claim_number : ''].filter(Boolean).join(' · ') || 'No additional info';

  const sections = document.getElementById('profileDocSections');

  const typeConfig = {
    material: { label: '📋 Material Estimates', color: '#0891b2', action: 'loadMaterialEstimate' },
    retail: { label: '💰 Retail Estimates', color: '#7c3aed', action: 'loadRetailEstimate' }
  };

  const order = ['material', 'retail'];
  let html = '';

  order.forEach(type => {
    const docs = grouped[type] || [];
    const config = typeConfig[type];

    html += `
      <div style="margin-bottom: 20px;">
        <div style="font-size: 13px; font-weight: 700; color: ${config.color}; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          ${config.label} (${docs.length})
        </div>
        ${docs.length === 0 ? `
          <div style="color: #94a3b8; font-size: 13px; padding: 10px 0;">None saved yet</div>
        ` : docs.map(e => `
          <div onclick="${config.action}(${JSON.stringify(e).replace(/"/g, '&quot;')})" style="
            padding: 12px 14px;
            border: 1.5px solid #e2e8f0;
            border-radius: 8px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.12s;
            display: flex;
            justify-content: space-between;
            align-items: center;
          "
          onmouseover="this.style.borderColor='${config.color}';this.style.background='#f8fafc'"
          onmouseout="this.style.borderColor='#e2e8f0';this.style.background='white'"
          >
            <div>
              <div style="font-weight: 600; color: #1e293b; font-size: 14px;">${e.job_address || 'No address'}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                ${new Date(e.created_at).toLocaleDateString()}
                ${e.notes ? ' · ' + e.notes : ''}
              </div>
            </div>
            <div style="text-align: right; flex-shrink: 0; margin-left: 12px;">
              ${e.roof_squares ? `<div style="font-size: 12px; color: #94a3b8;">${e.roof_squares} sq</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  });

  sections.innerHTML = html;
  modal.style.display = 'flex';
}

function closeCustomerProfile() {
  document.getElementById('customerProfileModal').style.display = 'none';
}

function loadMaterialEstimate(e) {
  const parse = v => typeof v === 'string' ? JSON.parse(v) : (v || null);
  closeCustomerProfile();
  closeCustomerDrawer();

  if (typeof displayResults === 'function') {
    displayResults({
      success: true,
      source: 'customer_db',
      raw: {
        customer_name: e.customer_name || '',
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
}

function loadRetailEstimate(e) {
  const parse = v => typeof v === 'string' ? JSON.parse(v) : (v || null);
  const retailData = parse(e.retail_data);
  closeCustomerProfile();
  closeCustomerDrawer();

  if (retailData && typeof displayRetailEstimate === 'function') {
    window.retailData = retailData;
    displayRetailEstimate();
  }

  // Navigate to retail module
  if (typeof switchModule === 'function') switchModule('retail');
  else if (typeof switchTab === 'function') switchTab('retail');
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

    openCustomerProfile(data);

  } catch (err) {
    alert('Error loading customer: ' + err.message);
  }
}

// ==========================================
// DELETE CUSTOMER
// ==========================================

async function deleteCustomer(id, name) {
  if (!confirm(`Delete ${name} and all their estimates? This cannot be undone.`)) return;

  try {
    const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    // Re-run the current search to refresh the list
    const input = document.getElementById('drawerSearchInput');
    if (input && input.value.trim().length >= 2) {
      searchCustomersDrawer(input.value);
    } else {
      setDrawerResults('<div style="text-align:center;color:#94a3b8;font-size:14px;padding:32px 0;">Customer deleted</div>');
    }
  } catch (err) {
    alert('Error deleting customer: ' + err.message);
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
    const matches = searchData.customers?.filter(c => c.name.toLowerCase() === name.toLowerCase());

    let customerId;
    if (matches && matches.length > 0) {
      // Build a prompt showing existing matches
      const matchList = matches.map((c, i) =>
        `${i + 1}) ${c.name}${c.address ? ' — ' + c.address : ''}${c.carrier ? ' (' + c.carrier + ')' : ''}`
      ).join('\n');

      const choice = confirm(
        `A customer named "${name}" already exists:\n\n${matchList}\n\nClick OK to save to the existing customer.\nClick Cancel to create a new customer instead.`
      );

      if (choice) {
        customerId = matches[0].id;
      } else {
        const cr = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, address: address || null, carrier: raw?.carrier || null, claim_number: raw?.claim_number || null })
        });
        const cd = await cr.json();
        if (!cd.success) throw new Error(cd.message);
        customerId = cd.customer.id;
      }
    } else {
      const cr = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address: address || null, carrier: raw?.carrier || null, claim_number: raw?.claim_number || null })
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

// ==========================================
// SAVE RETAIL TO CUSTOMER
// ==========================================

async function saveRetailToCustomer() {
  const name = document.getElementById('retailCustomerName')?.value?.trim();
  const address = document.getElementById('retailJobAddress')?.value?.trim();
  const jobNum = document.getElementById('retailJobNumber')?.value?.trim();

  if (!name) { alert('Enter a customer name in the Retail section first.'); return; }

  const btn = document.getElementById('saveRetailToCustomerBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

  try {
    const searchRes = await fetch(`/api/customers/search?name=${encodeURIComponent(name)}`);
    const searchData = await searchRes.json();
    const matches = searchData.customers?.filter(c => c.name.toLowerCase() === name.toLowerCase());

    let customerId;
    if (matches && matches.length > 0) {
      // Build a prompt showing existing matches
      const matchList = matches.map((c, i) =>
        `${i + 1}) ${c.name}${c.address ? ' — ' + c.address : ''}${c.carrier ? ' (' + c.carrier + ')' : ''}`
      ).join('\n');

      const choice = confirm(
        `A customer named "${name}" already exists:\n\n${matchList}\n\nClick OK to save to the existing customer.\nClick Cancel to create a new customer instead.`
      );

      if (choice) {
        customerId = matches[0].id;
      } else {
        const cr = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, address: address || null })
        });
        const cd = await cr.json();
        if (!cd.success) throw new Error(cd.message);
        customerId = cd.customer.id;
      }
    } else {
      const cr = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address: address || null })
      });
      const cd = await cr.json();
      if (!cd.success) throw new Error(cd.message);
      customerId = cd.customer.id;
    }

    const totals = typeof calculateRetailTotals === 'function' ? calculateRetailTotals() : {};

    const er = await fetch(`/api/customers/${customerId}/estimates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doc_type: 'retail',
        job_address: address || null,
        roof_squares: window.retailData?.measurements?.squares || null,
        subtotal: totals.subtotal || 0,
        tax: totals.taxAmount || 0,
        grand_total: totals.grandTotal || 0,
        notes: jobNum ? `Job #${jobNum}` : null,
        retail_data: window.retailData || {}
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
