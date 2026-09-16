/**
 * Script de configuración del usuario desarrollador.
 * Ejecutar UNA sola vez en el servidor:
 *   node setup-dev-user.js
 *
 * Requiere que el .env esté configurado (DB_HOST, DB_USER, etc.)
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('./db/connection');
const readline = require('readline');

const DEV_EMAIL  = 'lquevedoberjano@gmail.com';
const DEV_NOMBRE = 'Lucas Quevedo (Dev)';

function pregunta(rl, texto) {
  return new Promise((resolve) => rl.question(texto, resolve));
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    console.log('\n=== Setup de usuario desarrollador ===');
    console.log(`Email: ${DEV_EMAIL}`);
    console.log(`Nombre: ${DEV_NOMBRE}\n`);

    const [existing] = await pool.query(
      'SELECT usuarioId, email, rol FROM usuarios WHERE email = ? OR rol = ?',
      [DEV_EMAIL, 'dev']
    );

    if (existing.length > 0) {
      const u = existing[0];
      console.log(`Ya existe un usuario dev: ${u.email} (id: ${u.usuarioId})`);
      const resp = await pregunta(rl, '¿Querés actualizar la contraseña? (s/n): ');
      if (resp.trim().toLowerCase() !== 's') {
        console.log('Sin cambios. Saliendo.');
        return;
      }
      const password = await pregunta(rl, 'Nueva contraseña (mín. 8 caracteres): ');
      if (password.length < 8) {
        console.error('Error: la contraseña debe tener al menos 8 caracteres.');
        process.exit(1);
      }
      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE usuarios SET password_hash = ?, activo = 1, invitation_token = NULL, invitation_expires_at = NULL WHERE email = ?',
        [hash, DEV_EMAIL]
      );
      console.log('\n✓ Contraseña actualizada correctamente.');
      return;
    }

    const password = await pregunta(rl, 'Contraseña para el usuario dev (mín. 8 caracteres): ');
    if (password.length < 8) {
      console.error('Error: la contraseña debe tener al menos 8 caracteres.');
      process.exit(1);
    }

    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();

    await pool.query(
      `INSERT INTO usuarios (usuarioId, nombre, email, password_hash, rol, modulo, activo)
       VALUES (?, ?, ?, ?, 'dev', 'tickets', 1)`,
      [id, DEV_NOMBRE, DEV_EMAIL, hash]
    );

    console.log(`\n✓ Usuario dev creado exitosamente.`);
    console.log(`  Email:    ${DEV_EMAIL}`);
    console.log(`  Nombre:   ${DEV_NOMBRE}`);
    console.log(`  Rol:      dev`);
    console.log('\nYa podés iniciar sesión en el sistema con ese email y contraseña.\n');
  } finally {
    rl.close();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
