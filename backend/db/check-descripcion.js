require('dotenv').config();
const { pool } = require('./connection');

async function run() {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT numero, LEFT(descripcion, 500) AS desc_preview FROM tickets WHERE eliminado = 0 ORDER BY id_seq DESC LIMIT 3'
    );
    rows.forEach((r) => {
      console.log(`\n=== Ticket #${r.numero} ===`);
      console.log(JSON.stringify(r.desc_preview));
    });
  } finally {
    conn.release();
    process.exit(0);
  }
}
run();
