const express = require('express');
const router = express.Router();
const pool = require('./db');

// Search customers by name
router.get('/search', async (req, res) => {
  const { name } = req.query;
  if (!name || name.trim().length < 2) {
    return res.json({ success: true, customers: [] });
  }
  try {
    const result = await pool.query(
      `SELECT id, name, phone, email, address, carrier, claim_number, created_at
       FROM customers
       WHERE name ILIKE $1
       ORDER BY name ASC
       LIMIT 20`,
      [`%${name.trim()}%`]
    );
    res.json({ success: true, customers: result.rows });
  } catch (err) {
    console.error('[CUSTOMERS] Search error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all customers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM customers ORDER BY created_at DESC'
    );
    res.json({ success: true, customers: result.rows });
  } catch (err) {
    console.error('[CUSTOMERS] List error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create a new customer
router.post('/', async (req, res) => {
  const { name, phone, email, address, carrier, claim_number } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Name is required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO customers (name, phone, email, address, carrier, claim_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, phone || null, email || null, address || null, carrier || null, claim_number || null]
    );
    res.json({ success: true, customer: result.rows[0] });
  } catch (err) {
    console.error('[CUSTOMERS] Create error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get a single customer with their estimates
router.get('/:id', async (req, res) => {
  try {
    const customer = await pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (customer.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    const estimates = await pool.query(
      'SELECT * FROM estimates WHERE customer_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );

    // Group by doc_type
    const grouped = {};
    estimates.rows.forEach(e => {
      const type = e.doc_type || 'material';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(e);
    });

    res.json({
      success: true,
      customer: customer.rows[0],
      estimates: estimates.rows,
      grouped
    });
  } catch (err) {
    console.error('[CUSTOMERS] Get error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update a customer
router.put('/:id', async (req, res) => {
  const { name, phone, email, address, carrier, claim_number } = req.body;
  try {
    const result = await pool.query(
      'UPDATE customers SET name = $1, phone = $2, email = $3, address = $4, carrier = $5, claim_number = $6, updated_at = NOW() WHERE id = $7 RETURNING *',
      [name, phone || null, email || null, address || null, carrier || null, claim_number || null, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, customer: result.rows[0] });
  } catch (err) {
    console.error('[CUSTOMERS] Update error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete a customer (and their estimates via CASCADE)
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM customers WHERE id = $1 RETURNING id, name',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    console.error('[CUSTOMERS] Delete error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Save estimate to a customer
router.post('/:id/estimates', async (req, res) => {
  const {
    doc_type,
    job_address, carrier, claim_number, roof_squares,
    materials, supplement_items, labor,
    subtotal, tax, grand_total, notes,
    retail_data
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO estimates
      (customer_id, doc_type, job_address, carrier, claim_number, roof_squares,
       materials, supplement_items, labor, subtotal, tax, grand_total, notes, retail_data)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *`,
      [
        req.params.id,
        doc_type || 'material',
        job_address || null,
        carrier || null,
        claim_number || null,
        roof_squares || null,
        JSON.stringify(materials || []),
        JSON.stringify(supplement_items || []),
        JSON.stringify(labor || {}),
        subtotal || 0,
        tax || 0,
        grand_total || 0,
        notes || null,
        retail_data ? JSON.stringify(retail_data) : null
      ]
    );
    res.json({ success: true, estimate: result.rows[0] });
  } catch (err) {
    console.error('[CUSTOMERS] Save estimate error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
