require('dotenv').config();
const pool = require('./db');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('[MIGRATE] Starting database migration...');
    
    // Create customers table with carrier and claim_number
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        carrier TEXT,
        claim_number TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('[MIGRATE] ✓ customers table created/verified');

    // Add carrier and claim_number columns if they don't exist (for existing tables)
    await client.query(`
      DO $$ 
      BEGIN
        BEGIN
          ALTER TABLE customers ADD COLUMN carrier TEXT;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        BEGIN
          ALTER TABLE customers ADD COLUMN claim_number TEXT;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
      END $$;
    `);
    console.log('[MIGRATE] ✓ customers columns updated');

    // Create estimates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS estimates (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        job_address TEXT,
        carrier TEXT,
        claim_number TEXT,
        roof_squares NUMERIC,
        materials JSONB,
        supplement_items JSONB,
        labor JSONB,
        subtotal NUMERIC,
        tax NUMERIC,
        grand_total NUMERIC,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('[MIGRATE] ✓ estimates table created/verified');

    // Add doc_type and retail_data columns to estimates
    await client.query(`
      ALTER TABLE estimates ADD COLUMN IF NOT EXISTS doc_type TEXT DEFAULT 'material';
      ALTER TABLE estimates ADD COLUMN IF NOT EXISTS retail_data JSONB;
    `);
    console.log('[MIGRATE] ✓ estimates columns updated (doc_type, retail_data)');

    // Create search index on customer name
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_name ON customers USING gin(to_tsvector('english', name));
    `);
    console.log('[MIGRATE] ✓ search index created/verified');

    console.log('[MIGRATE] Migration complete!');
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

migrate().catch(err => {
  console.error('[MIGRATE] Fatal error:', err);
  process.exit(1);
});
