require('dotenv').config();
const { pool } = require('./connection');

async function run() {
  const conn = await pool.getConnection();
  try {
    console.log('Ejecutando migración...');
    await conn.query('ALTER TABLE tickets MODIFY COLUMN descripcion MEDIUMTEXT NOT NULL');
    console.log('OK: columna descripcion ahora es MEDIUMTEXT (16 MB)');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    conn.release();
    process.exit(0);
  }
}

run();
