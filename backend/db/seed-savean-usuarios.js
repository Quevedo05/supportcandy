require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db/connection');

async function seed() {
  const directorHash  = await bcrypt.hash('director123', 10);
  const inspectorHash = await bcrypt.hash('savean123',   10);

  const usuarios = [
    { id: uuidv4(), nombre: 'Director SAVEAN',  email: 'director@savean.gob.ar',  hash: directorHash,  rol: 'admin',        modulo: 'savean' },
    { id: uuidv4(), nombre: 'Inspector SAVEAN', email: 'inspector@savean.gob.ar', hash: inspectorHash, rol: 'contribuidor', modulo: 'savean' },
  ];

  for (const u of usuarios) {
    const [existing] = await pool.query('SELECT usuarioId FROM usuarios WHERE email = ?', [u.email]);
    if (existing.length > 0) {
      console.log(`Ya existe: ${u.email} — saltando`);
      continue;
    }
    await pool.query(
      `INSERT INTO usuarios (usuarioId, nombre, email, password_hash, rol, modulo, activo)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [u.id, u.nombre, u.email, u.hash, u.rol, u.modulo]
    );
    console.log(`Creado: ${u.email} (${u.rol} / ${u.modulo})`);
  }

  console.log('Listo.');
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
