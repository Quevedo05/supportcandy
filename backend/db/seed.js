require('dotenv').config();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('./connection');

async function seed() {
  console.log('Starting seed...');

  // ── Admin user ──────────────────────────────────────────────────────────
  const adminEmail = 'admin@agenciacalidad.gob.ar';
  const adminPassword = 'admin123';

  const [existing] = await pool.query(
    'SELECT usuarioId FROM usuarios WHERE email = ?',
    [adminEmail]
  );

  if (existing.length === 0) {
    const adminHash = await bcrypt.hash(adminPassword, 10);
    const adminId = uuidv4();
    await pool.query(
      `INSERT INTO usuarios (usuarioId, nombre, email, password_hash, rol, activo)
       VALUES (?, 'Administrador', ?, ?, 'admin', 1)`,
      [adminId, adminEmail, adminHash]
    );
    console.log(`Admin user created: ${adminEmail}`);
  } else {
    console.log('Admin user already exists, skipping.');
  }

  // ── Formularios ─────────────────────────────────────────────────────────
  const formularios = [
    {
      programa: 'Microcréditos 2024',
      descripcion: 'Formulario para solicitar microcréditos 2024',
    },
    {
      programa: 'Cosecha y Acarreo 2026',
      descripcion: 'Formulario para beneficiarios de Cosecha y Acarreo 2026',
    },
    {
      programa: 'Programa Aprender, Trabajar y Producir',
      descripcion: 'Formulario para el programa Aprender, Trabajar y Producir',
    },
  ];

  for (const f of formularios) {
    const [existingF] = await pool.query(
      'SELECT formularioId FROM formularios WHERE programa = ?',
      [f.programa]
    );
    if (existingF.length === 0) {
      await pool.query(
        `INSERT INTO formularios (formularioId, programa, descripcion, activo)
         VALUES (?, ?, ?, 1)`,
        [uuidv4(), f.programa, f.descripcion]
      );
      console.log(`Formulario created: ${f.programa}`);
    } else {
      console.log(`Formulario already exists: ${f.programa}, skipping.`);
    }
  }

  await pool.end();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
