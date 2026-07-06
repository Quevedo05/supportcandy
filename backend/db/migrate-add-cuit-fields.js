'use strict';

// Migración: agrega campos CUIT/CUIL y Fecha de Nacimiento a todos los formularios que no los tengan.
// Cómo correr: node backend/db/migrate-add-cuit-fields.js

require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('./connection');

async function run() {
  console.log('Iniciando migración: agregar campos CUIT/CUIL y Fecha de Nacimiento...\n');

  const [rows] = await pool.query('SELECT formularioId, nombre, campos FROM formularios');

  for (const row of rows) {
    let campos = [];
    try {
      campos = JSON.parse(row.campos || '[]');
    } catch {
      console.warn(`  [!] No se pudo parsear campos del formulario ${row.nombre}, omitiendo.`);
      continue;
    }

    const tieneCuit     = campos.some((c) => c.campo === 'cf_cuit_cuil');
    const tieneFechaNac = campos.some((c) => c.campo === 'cf_fecha_nacimiento');

    if (tieneCuit && tieneFechaNac) {
      console.log(`  [ok] "${row.nombre}" ya tiene ambos campos, omitiendo.`);
      continue;
    }

    // Desplazar los órdenes existentes para hacer espacio al principio
    campos = campos.map((c) => ({ ...c, orden: c.orden + 2 }));

    if (!tieneCuit) {
      campos.unshift({
        id: uuidv4(),
        label: 'CUIT/CUIL',
        campo: 'cf_cuit_cuil',
        tipo: 'texto',
        requerido: true,
        orden: 1,
        placeholder: 'Ej: 20301234567 (11 dígitos sin guiones)',
        longitudMaxima: 11,
      });
    }

    if (!tieneFechaNac) {
      campos.splice(1, 0, {
        id: uuidv4(),
        label: 'Fecha de Nacimiento',
        campo: 'cf_fecha_nacimiento',
        tipo: 'fecha',
        requerido: false,
        orden: 2,
      });
    }

    await pool.query(
      'UPDATE formularios SET campos = ? WHERE formularioId = ?',
      [JSON.stringify(campos), row.formularioId]
    );
    console.log(`  [+] "${row.nombre}" actualizado: CUIT/CUIL${!tieneCuit ? ' ✓' : ''}, Fecha de Nacimiento${!tieneFechaNac ? ' ✓' : ''}`);
  }

  await pool.end();
  console.log('\nMigración completada.');
}

run().catch((err) => {
  console.error('Error en migración:', err.message);
  process.exit(1);
});
