/**
 * Migración v4: ampliar Potenciar Emprendedores a 4 proveedores
 * - Agrega la opción '4' al selector de cantidad de proveedores
 * - Agrega el grupo Presupuesto + ARCA para el proveedor 4
 * - Actualiza condiciones de proveedores 1-3 para incluir '4'
 *
 * Ejecutar desde la raíz del proyecto:
 *   node backend/db/migrate-formularios-v4.js
 */
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('./connection');

const SLUG_CANT_PROVEEDORES = 'cf_cantidad_proveedores';

function proveedorGroupSinCBU(n, slugControl, valoresVisibles, ordenBase) {
  const cond = n === 1 ? undefined : { campo: slugControl, valor: valoresVisibles };
  return [
    { id: uuidv4(), label: `Presupuesto Proveedor ${n}`,        campo: `cf_presupuesto_${n}`,               tipo: 'archivo', requerido: true, orden: ordenBase,     condicion: cond },
    { id: uuidv4(), label: `Constancia en ARCA Proveedor ${n}`, campo: `cf_constancia_arca_proveedor_${n}`, tipo: 'archivo', requerido: true, orden: ordenBase + 1, condicion: cond },
  ];
}

async function migrate() {
  console.log('Iniciando migración de formularios v4...\n');

  const [peRows] = await pool.query(
    "SELECT formularioId, campos FROM formularios WHERE nombre = 'Potenciar Emprendedores'"
  );

  if (peRows.length === 0) {
    console.log('✗ "Potenciar Emprendedores" no encontrado — verificar seed.');
    await pool.end();
    process.exit(1);
  }

  const formularioId = peRows[0].formularioId;
  const camposActuales = JSON.parse(peRows[0].campos);

  // Actualizar el selector de cantidad de proveedores a ['1','2','3','4']
  const camposActualizados = camposActuales.map((c) => {
    if (c.campo !== SLUG_CANT_PROVEEDORES) return c;
    return { ...c, opciones: ['1', '2', '3', '4'] };
  });

  // Actualizar condiciones de proveedores existentes para incluir '4'
  const actualizacionesCondicion = {
    cf_presupuesto_1:               ['1', '2', '3', '4'],
    cf_constancia_arca_proveedor_1: ['1', '2', '3', '4'],
    cf_presupuesto_2:               ['2', '3', '4'],
    cf_constancia_arca_proveedor_2: ['2', '3', '4'],
    cf_presupuesto_3:               ['3', '4'],
    cf_constancia_arca_proveedor_3: ['3', '4'],
  };

  for (const campo of camposActualizados) {
    if (campo.campo in actualizacionesCondicion) {
      const nuevosValores = actualizacionesCondicion[campo.campo];
      if (campo.condicion) {
        campo.condicion = { ...campo.condicion, valor: nuevosValores };
      }
    }
  }

  // Calcular el orden máximo para agregar el grupo del proveedor 4 al final
  const ordenMax = Math.max(...camposActualizados.map((c) => c.orden));
  const grupo4 = proveedorGroupSinCBU(4, SLUG_CANT_PROVEEDORES, ['4'], ordenMax + 1);

  const camposFinales = [...camposActualizados, ...grupo4];

  await pool.query('UPDATE formularios SET campos = ? WHERE formularioId = ?', [
    JSON.stringify(camposFinales),
    formularioId,
  ]);

  console.log(`✓ "Potenciar Emprendedores" actualizado a 4 proveedores (${camposFinales.length} campos)`);

  await pool.end();
  console.log('\nMigración v4 completada.');
}

migrate().catch((err) => {
  console.error('Error en migración:', err.message);
  process.exit(1);
});
