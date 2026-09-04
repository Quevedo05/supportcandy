/**
 * Migración de barreras SAVEAN — v1
 *
 * Cambios:
 *  - 25 de Mayo  → Encon          (renombrar + actualizar guías históricas)
 *  - Caucete     → Vallecito       (renombrar + actualizar guías históricas)
 *  - Valle Fértil → Valdecito      (renombrar + actualizar guías históricas)
 *  - Iglesia     → Calingasta      (renombrar + actualizar guías históricas)
 *  - Albardón    → desactivar      (activa = 0, guías históricas intactas)
 *  - Zonda       → desactivar      (activa = 0, guías históricas intactas)
 *  - Talacasto   → desactivar      (activa = 0, guías históricas intactas)
 *  - Agregar: Encon Sur
 *  - Agregar: Barreal
 *  - San Carlos  → sin cambios
 *
 * Ejecutar desde la raíz del proyecto:
 *   node backend/db/migrate-barreras-v1.js
 */
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('./connection');

const renombres = [
  { de: '25 de Mayo',   a: 'Encon'      },
  { de: 'Caucete',      a: 'Vallecito'  },
  { de: 'Valle Fértil', a: 'Valdecito'  },
  { de: 'Iglesia',      a: 'Calingasta' },
];

const desactivar = ['Albardón', 'Zonda', 'Talacasto'];

const nuevas = [
  { nombre: 'Encon Sur',  ruta: null, kilometro: null, departamento: null },
  { nombre: 'Barreal',    ruta: null, kilometro: null, departamento: null },
];

async function run() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ── 1. Renombrar barreras y actualizar guías históricas ──────────────────
    for (const { de, a } of renombres) {
      const [res] = await conn.query(
        'UPDATE barreras_savean SET nombre = ? WHERE nombre = ?',
        [a, de]
      );
      const [guias] = await conn.query(
        'UPDATE guias_savean SET barrera_nombre = ? WHERE barrera_nombre = ?',
        [a, de]
      );
      console.log(`Renombrar "${de}" → "${a}": ${res.affectedRows} barrera(s), ${guias.affectedRows} guía(s) actualizadas`);
    }

    // ── 2. Desactivar barreras eliminadas ────────────────────────────────────
    for (const nombre of desactivar) {
      const [res] = await conn.query(
        'UPDATE barreras_savean SET activa = 0 WHERE nombre = ?',
        [nombre]
      );
      console.log(`Desactivar "${nombre}": ${res.affectedRows} barrera(s)`);
    }

    // ── 3. Agregar nuevas barreras (solo si no existen) ──────────────────────
    for (const b of nuevas) {
      const [[existing]] = await conn.query(
        'SELECT barreraId FROM barreras_savean WHERE nombre = ?',
        [b.nombre]
      );
      if (existing) {
        console.log(`Barrera "${b.nombre}" ya existe, omitiendo.`);
        continue;
      }
      await conn.query(
        'INSERT INTO barreras_savean (barreraId, nombre, ruta, kilometro, departamento, activa) VALUES (?, ?, ?, ?, ?, 1)',
        [uuidv4(), b.nombre, b.ruta, b.kilometro, b.departamento]
      );
      console.log(`Agregada: "${b.nombre}"`);
    }

    await conn.commit();
    console.log('\n✓ Migración completada correctamente.');
  } catch (err) {
    await conn.rollback();
    console.error('✗ Error en la migración, se revirtieron los cambios:', err);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

run();
