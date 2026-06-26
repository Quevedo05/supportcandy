/**
 * Migración v5: reescribir campos de Potenciar Emprendedores desde cero
 * - Garantiza el estado correcto con 4 proveedores y condiciones bien aplicadas
 * - Elimina cualquier campo huérfano o sin condición (ej: "Presupuesto Formal 4")
 *
 * Ejecutar desde la raíz del proyecto:
 *   node backend/db/migrate-formularios-v5.js
 */
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('./connection');

const DEPARTAMENTOS_SJ = [
  'CAPITAL', 'CHIMBAS', 'SANTA LUCIA', 'RIVADAVIA', 'RAWSON', 'POCITO',
  'CAUCETE', 'SARMIENTO', 'ANGACO', 'SAN MARTIN', 'ULLUM', 'ZONDA',
  'IGLESIA', 'JÁCHAL', 'CALINGASTA', 'VALLE FÉRTIL', '25 DE MAYO', '9 DE JULIO',
];

const RUBROS = [
  'SERVICIOS', 'COMERCIO', 'INDUSTRIA', 'TURISMO', 'AGROPECUARIO',
  'CONSTRUCCION', 'TECNOLOGIA', 'GASTRONOMIA', 'SALUD', 'EDUCACION', 'OTRO',
];

const SLUG_CANT_PROVEEDORES = 'cf_cantidad_proveedores';

function proveedorGroupSinCBU(n, slugControl, valoresVisibles, ordenBase) {
  const cond = n === 1 ? undefined : { campo: slugControl, valor: valoresVisibles };
  return [
    { id: uuidv4(), label: `Presupuesto Proveedor ${n}`,        campo: `cf_presupuesto_${n}`,               tipo: 'archivo', requerido: true, orden: ordenBase,     condicion: cond },
    { id: uuidv4(), label: `Constancia en ARCA Proveedor ${n}`, campo: `cf_constancia_arca_proveedor_${n}`, tipo: 'archivo', requerido: true, orden: ordenBase + 1, condicion: cond },
  ];
}

const camposPotenciar = [
  { id: uuidv4(), label: 'Domicilio del Emprendimiento',                    campo: 'cf_domicilio',             tipo: 'texto',    requerido: true,  orden: 1,  placeholder: 'Calle, número, localidad' },
  { id: uuidv4(), label: 'Departamento',                                    campo: 'cf_departamento',          tipo: 'selector', requerido: true,  orden: 2,  opciones: DEPARTAMENTOS_SJ },
  { id: uuidv4(), label: 'Teléfono Móvil',                                  campo: 'cf_telefono_movil',        tipo: 'texto',    requerido: true,  orden: 3,  placeholder: 'Ej: 2645000000' },
  { id: uuidv4(), label: 'Rubro',                                           campo: 'cf_rubro',                 tipo: 'selector', requerido: true,  orden: 4,  opciones: RUBROS },
  { id: uuidv4(), label: 'Describa su Proyecto',                            campo: 'cf_descripcion_proyecto',  tipo: 'textarea', requerido: true,  orden: 5,  placeholder: 'Describa en qué consiste su proyecto y su actividad' },
  { id: uuidv4(), label: 'Impacto del Proyecto',                            campo: 'cf_impacto',               tipo: 'textarea', requerido: true,  orden: 6,  placeholder: 'Impacto económico, social y/o ambiental del proyecto' },
  { id: uuidv4(), label: 'Destino de Fondos',                              campo: 'cf_destino_fondos',        tipo: 'texto',    requerido: true,  orden: 7,  placeholder: 'Ej: Adquisición de equipo informático' },
  { id: uuidv4(), label: 'Fecha de Inicio de Actividades',                  campo: 'cf_fecha_inicio',          tipo: 'fecha',    requerido: false, orden: 8 },
  { id: uuidv4(), label: 'Foto Frente DNI / LE / LC / CE',                  campo: 'cf_dni_frente',            tipo: 'archivo',  requerido: true,  orden: 9 },
  { id: uuidv4(), label: 'Foto Dorso DNI / LE / LC / CE',                   campo: 'cf_dni_dorso',             tipo: 'archivo',  requerido: true,  orden: 10 },
  { id: uuidv4(), label: 'Constancia de ARCA Vigente',                      campo: 'cf_constancia_arca',       tipo: 'archivo',  requerido: true,  orden: 11 },
  { id: uuidv4(), label: 'Garantía con Cheque de Pago Diferido',            campo: 'cf_garantia_cheque',       tipo: 'archivo',  requerido: true,  orden: 12 },
  { id: uuidv4(), label: 'Constancia de Ingresos Brutos (si corresponde)',  campo: 'cf_constancia_iibb',       tipo: 'archivo',  requerido: false, orden: 13 },
  { id: uuidv4(), label: 'Comprobante CBU o CVU del Beneficiario',          campo: 'cf_cbu_beneficiario',      tipo: 'archivo',  requerido: true,  orden: 14 },
  { id: uuidv4(), label: 'Seleccione la cantidad de proveedores',           campo: SLUG_CANT_PROVEEDORES,      tipo: 'selector', requerido: true,  orden: 15, opciones: ['1', '2', '3', '4'] },
  ...proveedorGroupSinCBU(1, SLUG_CANT_PROVEEDORES, ['1', '2', '3', '4'], 16),
  ...proveedorGroupSinCBU(2, SLUG_CANT_PROVEEDORES, ['2', '3', '4'],       18),
  ...proveedorGroupSinCBU(3, SLUG_CANT_PROVEEDORES, ['3', '4'],             20),
  ...proveedorGroupSinCBU(4, SLUG_CANT_PROVEEDORES, ['4'],                  22),
];

async function migrate() {
  console.log('Iniciando migración de formularios v5...\n');

  const [peRows] = await pool.query(
    "SELECT formularioId FROM formularios WHERE nombre = 'Potenciar Emprendedores'"
  );

  if (peRows.length === 0) {
    console.log('✗ "Potenciar Emprendedores" no encontrado.');
    await pool.end();
    process.exit(1);
  }

  await pool.query('UPDATE formularios SET campos = ? WHERE formularioId = ?', [
    JSON.stringify(camposPotenciar),
    peRows[0].formularioId,
  ]);

  console.log(`✓ "Potenciar Emprendedores" reescrito con ${camposPotenciar.length} campos correctos`);
  console.log('  - Selector de proveedores: 1 a 4');
  console.log('  - Proveedor 2: visible con 2, 3 o 4 seleccionado');
  console.log('  - Proveedor 3: visible con 3 o 4 seleccionado');
  console.log('  - Proveedor 4: visible solo con 4 seleccionado');

  await pool.end();
  console.log('\nMigración v5 completada.');
}

migrate().catch((err) => {
  console.error('Error en migración:', err.message);
  process.exit(1);
});
