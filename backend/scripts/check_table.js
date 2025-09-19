const { pool } = require('../config/database');

async function check() {
  try {
    const [rows] = await pool.execute("SHOW TABLES LIKE 'password_resets'");
    console.log('rows:', rows);
    process.exit(0);
  } catch (err) {
    console.error('err', err.message);
    process.exit(1);
  }
}

check();
