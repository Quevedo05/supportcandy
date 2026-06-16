require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db/connection');

async function seed() {
  const directorHash  = await bcrypt.hash('director123', 10);
  const inspectorHash = await bcrypt.hash('savean123',   10);

  const usuarios = [
    { id: uuidv4(), nombre: 'Director SAVEAN',  email: 'director@savean.gob.ar',  hash: directorHash,  rol: 'admin',     modulo: 'savean' },
    { id: uuidv4(), nombre: 'Inspector SAVEAN', email: 'inspector@savean.gob.ar', hash: inspectorHash, rol: 'inspector', modulo: 'savean' },
  ];

  for (const u of usuarios) {
    const [existing] = await pool.query('SELECT usuarioId, password_hash FROM usuarios WHERE email = ?', [u.email]);
    if (existing.length > 0) {
      // Si existe pero sin contraseña (pendiente activación), le seteamos la contraseña
      if (!existing[0].password_hash) {
        await pool.query(
          'UPDATE usuarios SET password_hash = ?, rol = ?, modulo = ?, activo = 1, invitation_token = NULL, invitation_expires_at = NULL WHERE email = ?',
          [u.hash, u.rol, u.modulo, u.email]
        );
        console.log(`Actualizado: ${u.email} — contraseña seteada`);
      } else {
        console.log(`Ya existe con contraseña: ${u.email} — saltando`);
      }
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
