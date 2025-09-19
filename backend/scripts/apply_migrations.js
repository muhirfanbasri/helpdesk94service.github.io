const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function run() {
  try {
    const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    for (const file of files) {
      const full = path.join(migrationsDir, file);
      console.log('Applying', file);
      const sql = fs.readFileSync(full, 'utf8');
      // Execute the full SQL file (may contain multiple statements)
      await pool.query(sql);
      console.log('Applied', file);
    }
    console.log('Migrations applied');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

run();
