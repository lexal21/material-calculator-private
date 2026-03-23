// ==========================================
// CUSTOMER SEARCH — Global Modal
// Trigger: Customers nav button or Ctrl+K
// ==========================================

let _csTimeout = null;

// Open on Ctrl+K
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    openCustomerModal();
  }
  if (e.key === 'Escape') closeCustomerModal();
});

function openCustomerModal() {
  const modal = document.getElementById('customerModal');
  if (!modal) return;
  modal.style.display = 'flex';
  requestAnimationFrame(() => {
    modal.classList.add('cs-visible');
    const input = document.getElementById('csInput');
    if (input) { input.value = ''; input.focus(); }
    setResults('<p class="cs-hint">Start typing a customer name…</p>');
  });
}

function closeCustomerModal() {
  const modal = document.getElementById('customerModal');
  if (!modal) return;
  modal.classList.remove('cs-visible');
  setTimeout(() => { modal.style.display = 'none'; }, 180);
}

function setResults(html) {
  const el = document.getElementById('csResults');
  if (el) el.innerHTML = html;
}

function highlightMatch(text, query) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<strong>$1</strong>');
}

async function csSearch(value) {
  const q = value.trim();
  if (q.length < 2) {
    setResults('<p class="cs-hint">Start typing a customer name…</p>');
    return;
  }

  setResults('<p class="cs-hint">Searching…</p>');

  try {
    const res = await fetch(`/api/customers/search?name=${encodeURIComponent(q)}`);
    const data = await res.json();

    if (!data.success || !data.customers.length) {
      setResults('<p class="cs-hint">No customers found.</p>');
      return;
    }

    setResults(data.customers.map(c => `
      <div class="cs-row" onclick="loadCustomer(${c.id})">
        <div class="cs-name">${highlightMatch(c.name, q)}</div>
        <div class="cs-meta">
          ${[c.address, c.carrier, c.claim_number ? 'Claim #' + c.claim_number : ''].filter(Boolean).join(' · ')}
        </div>
      </div>
    `).join(''));
  } catch {
    setResults('<p class="cs-hint" style="color:#ef4444">Error — try again.</p>');
  }
}

async function loadCustomer(id) {
  setResults('<p class="cs-hint">Loading…</p>');
  try {
    const res = await fetch(`/api/customers/${id}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    if (!data.estimates.length) {
      setResults('<p class="cs-hint">No estimates saved for this customer.</p>');
      return;
    }

    const e = data.estimates[0];
    const parse = v => typeof v === 'string' ? JSON.parse(v) : (v || null);

    closeCustomerModal();

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
    setResults(`<p class="cs-hint" style="color:#ef4444">Error: ${err.message}</p>`);
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
