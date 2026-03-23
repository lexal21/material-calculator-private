require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function migrate() {
  console.log('[MIGRATE] Starting database migration...');
  
  try {
    // Create customers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[MIGRATE] ✓ customers table created/verified');

    // Create estimates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS estimates (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        job_address TEXT,
        carrier VARCHAR(255),
        claim_number VARCHAR(255),
        roof_squares DECIMAL(10,2),
        materials JSONB DEFAULT '[]',
        supplement_items JSONB DEFAULT '[]',
        labor JSONB DEFAULT '{}',
        subtotal DECIMAL(10,2) DEFAULT 0,
        tax DECIMAL(10,2) DEFAULT 0,
        grand_total DECIMAL(10,2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[MIGRATE] ✓ estimates table created/verified');

    console.log('[MIGRATE] Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('[MIGRATE] Error:', err);
    process.exit(1);
  }
}

migrate();
