require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 30,
  queueLimit: 50,
  timezone: '+00:00',
  dateStrings: false,
});

async function testConnection() {
  const conn = await pool.getConnection();
  console.log('MySQL connection pool established successfully.');
  conn.release();
}

module.exports = { pool, testConnection };
