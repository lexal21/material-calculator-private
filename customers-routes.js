const express = require('express');
const router = express.Router();
const pool = require('./db');

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
  const { name, phone, email, address } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO customers (name, phone, email, address) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, phone || null, email || null, address || null]
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
    const customerResult = await pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    
    const estimatesResult = await pool.query(
      'SELECT * FROM estimates WHERE customer_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    
    res.json({
      success: true,
      customer: customerResult.rows[0],
      estimates: estimatesResult.rows
    });
  } catch (err) {
    console.error('[CUSTOMERS] Get error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update a customer
router.put('/:id', async (req, res) => {
  const { name, phone, email, address } = req.body;
  try {
    const result = await pool.query(
      'UPDATE customers SET name = $1, phone = $2, email = $3, address = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [name, phone || null, email || null, address || null, req.params.id]
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

// Delete a customer
router.delete('/:id', async (req, res) => {
  try {
    // Delete associated estimates first
    await pool.query('DELETE FROM estimates WHERE customer_id = $1', [req.params.id]);
    
    const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, message: 'Customer deleted' });
  } catch (err) {
    console.error('[CUSTOMERS] Delete error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Save estimate to a customer
router.post('/:id/estimates', async (req, res) => {
  const { job_address, carrier, claim_number, roof_squares, materials, supplement_items, labor, subtotal, tax, grand_total, notes } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO estimates 
      (customer_id, job_address, carrier, claim_number, roof_squares, materials, supplement_items, labor, subtotal, tax, grand_total, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`,
      [
        req.params.id,
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
        notes || null
      ]
    );
    res.json({ success: true, estimate: result.rows[0] });
  } catch (err) {
    console.error('[CUSTOMERS] Save estimate error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
