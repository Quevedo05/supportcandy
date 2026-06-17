/**
 * Migración v3: revertir Bienes de Capital a dos formularios separados
 * - Desactiva el formulario unificado "Bienes de Capital"
 * - Reactiva "Bienes de Capital - Persona Física" con campos propios + proveedores 1-4
 * - Reactiva "Bienes de Capital - Persona Jurídica" con campos propios + proveedores 1-4
 *
 * Ejecutar desde /var/www/sistema/backend:
 *   node db/migrate-formularios-v3.js
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

function proveedorGroup(n, slugControl, valoresVisibles, ordenBase) {
  const cond = n === 1 ? undefined : { campo: slugControl, valor: valoresVisibles };
  return [
    { id: uuidv4(), label: `Presupuesto Proveedor ${n}`,        campo: `cf_presupuesto_${n}`,               tipo: 'archivo', requerido: true, orden: ordenBase,     condicion: cond },
    { id: uuidv4(), label: `Constancia en ARCA Proveedor ${n}`, campo: `cf_constancia_arca_proveedor_${n}`, tipo: 'archivo', requerido: true, orden: ordenBase + 1, condicion: cond },
    { id: uuidv4(), label: `Constancia de CBU Proveedor ${n}`,  campo: `cf_cbu_proveedor_${n}`,             tipo: 'archivo', requerido: true, orden: ordenBase + 2, condicion: cond },
  ];
}

// ─── BIENES DE CAPITAL — PERSONA FÍSICA ─────────────────────────────────────

const camposFisica = [
  { id: uuidv4(), label: 'Teléfono Móvil',                     campo: 'cf_telefono_movil',       tipo: 'texto',    requerido: true,  orden: 1,  placeholder: 'Ej: 2645000000' },
  { id: uuidv4(), label: 'Domicilio del Emprendimiento',        campo: 'cf_domicilio',            tipo: 'texto',    requerido: true,  orden: 2,  placeholder: 'Calle, número, barrio' },
  { id: uuidv4(), label: 'Departamento',                        campo: 'cf_departamento',         tipo: 'selector', requerido: true,  orden: 3,  opciones: DEPARTAMENTOS_SJ },
  { id: uuidv4(), label: 'Rubro',                               campo: 'cf_rubro',                tipo: 'selector', requerido: true,  orden: 4,  opciones: RUBROS },
  { id: uuidv4(), label: 'Constancia de ARCA Vigente',          campo: 'cf_constancia_arca',      tipo: 'archivo',  requerido: true,  orden: 5 },
  { id: uuidv4(), label: 'Constancia Ingresos Brutos',          campo: 'cf_constancia_iibb',      tipo: 'archivo',  requerido: true,  orden: 6 },
  { id: uuidv4(), label: 'Certificado Mi PYME',                 campo: 'cf_certificado_mipyme',   tipo: 'archivo',  requerido: true,  orden: 7 },
  { id: uuidv4(), label: 'Foto Frente DNI',                     campo: 'cf_dni_frente',           tipo: 'archivo',  requerido: true,  orden: 8 },
  { id: uuidv4(), label: 'Foto Dorso DNI',                      campo: 'cf_dni_dorso',            tipo: 'archivo',  requerido: true,  orden: 9 },
  { id: uuidv4(), label: 'Boleta de Servicio',                  campo: 'cf_boleta_servicio',      tipo: 'archivo',  requerido: true,  orden: 10 },
  { id: uuidv4(), label: 'Descripción del Proyecto',            campo: 'cf_descripcion_proyecto', tipo: 'textarea', requerido: true,  orden: 11, placeholder: 'Describa en qué consiste su proyecto' },
  { id: uuidv4(), label: 'Descripción del Equipo',              campo: 'cf_descripcion_equipo',   tipo: 'textarea', requerido: true,  orden: 12, placeholder: 'Describa el equipo de trabajo' },
  { id: uuidv4(), label: 'Impacto',                             campo: 'cf_impacto',              tipo: 'textarea', requerido: true,  orden: 13, placeholder: 'Describa el impacto social y económico' },
  { id: uuidv4(), label: 'Foto Nro 1',                          campo: 'cf_foto_1',               tipo: 'archivo',  requerido: false, orden: 14 },
  { id: uuidv4(), label: 'Destino de Fondos',                   campo: 'cf_destino_fondos',       tipo: 'texto',    requerido: true,  orden: 15, placeholder: 'Ej: Compra de maquinaria' },
  { id: uuidv4(), label: 'Foto Nro 2',                          campo: 'cf_foto_2',               tipo: 'archivo',  requerido: false, orden: 16 },
  { id: uuidv4(), label: 'Foto Nro 3',                          campo: 'cf_foto_3',               tipo: 'archivo',  requerido: false, orden: 17 },
  { id: uuidv4(), label: 'Seleccione la cantidad de proveedores', campo: SLUG_CANT_PROVEEDORES,   tipo: 'selector', requerido: true,  orden: 18, opciones: ['1', '2', '3', '4'] },
  ...proveedorGroup(1, SLUG_CANT_PROVEEDORES, ['1', '2', '3', '4'], 19),
  ...proveedorGroup(2, SLUG_CANT_PROVEEDORES, ['2', '3', '4'],       22),
  ...proveedorGroup(3, SLUG_CANT_PROVEEDORES, ['3', '4'],             25),
  ...proveedorGroup(4, SLUG_CANT_PROVEEDORES, ['4'],                  28),
  { id: uuidv4(), label: 'Garantía con Cheque', campo: 'cf_garantia_cheque', tipo: 'archivo', requerido: true, orden: 31 },
];

// ─── BIENES DE CAPITAL — PERSONA JURÍDICA ───────────────────────────────────

const camposJuridica = [
  { id: uuidv4(), label: 'Teléfono Móvil',                     campo: 'cf_telefono_movil',       tipo: 'texto',    requerido: true,  orden: 1,  placeholder: 'Ej: 2645000000' },
  { id: uuidv4(), label: 'Domicilio del Emprendimiento',        campo: 'cf_domicilio',            tipo: 'texto',    requerido: true,  orden: 2,  placeholder: 'Calle, número, barrio' },
  { id: uuidv4(), label: 'Departamento',                        campo: 'cf_departamento',         tipo: 'selector', requerido: true,  orden: 3,  opciones: DEPARTAMENTOS_SJ },
  { id: uuidv4(), label: 'Rubro',                               campo: 'cf_rubro',                tipo: 'selector', requerido: true,  orden: 4,  opciones: RUBROS },
  { id: uuidv4(), label: 'Constancia de ARCA Vigente',          campo: 'cf_constancia_arca',      tipo: 'archivo',  requerido: true,  orden: 5 },
  { id: uuidv4(), label: 'Constancia Ingresos Brutos',          campo: 'cf_constancia_iibb',      tipo: 'archivo',  requerido: true,  orden: 6 },
  { id: uuidv4(), label: 'Certificado Mi PYME',                 campo: 'cf_certificado_mipyme',   tipo: 'archivo',  requerido: true,  orden: 7 },
  { id: uuidv4(), label: 'Estatuto Social o Contrato',          campo: 'cf_estatuto_social',      tipo: 'archivo',  requerido: true,  orden: 8 },
  { id: uuidv4(), label: 'Copia DNI / LC / LE / CE Representante Legal', campo: 'cf_dni_representante', tipo: 'archivo', requerido: true, orden: 9 },
  { id: uuidv4(), label: 'Descripción del Proyecto',            campo: 'cf_descripcion_proyecto', tipo: 'textarea', requerido: true,  orden: 10, placeholder: 'Describa en qué consiste su proyecto' },
  { id: uuidv4(), label: 'Descripción del Equipo',              campo: 'cf_descripcion_equipo',   tipo: 'textarea', requerido: true,  orden: 11, placeholder: 'Describa el equipo de trabajo' },
  { id: uuidv4(), label: 'Impacto',                             campo: 'cf_impacto',              tipo: 'textarea', requerido: true,  orden: 12, placeholder: 'Describa el impacto social y económico' },
  { id: uuidv4(), label: 'Foto Nro 1',                          campo: 'cf_foto_1',               tipo: 'archivo',  requerido: false, orden: 13 },
  { id: uuidv4(), label: 'Destino de Fondos',                   campo: 'cf_destino_fondos',       tipo: 'texto',    requerido: true,  orden: 14, placeholder: 'Ej: Compra de maquinaria' },
  { id: uuidv4(), label: 'Foto Nro 2',                          campo: 'cf_foto_2',               tipo: 'archivo',  requerido: false, orden: 15 },
  { id: uuidv4(), label: 'Foto Nro 3',                          campo: 'cf_foto_3',               tipo: 'archivo',  requerido: false, orden: 16 },
  { id: uuidv4(), label: 'Seleccione la cantidad de proveedores', campo: SLUG_CANT_PROVEEDORES,   tipo: 'selector', requerido: true,  orden: 17, opciones: ['1', '2', '3', '4'] },
  ...proveedorGroup(1, SLUG_CANT_PROVEEDORES, ['1', '2', '3', '4'], 18),
  ...proveedorGroup(2, SLUG_CANT_PROVEEDORES, ['2', '3', '4'],       21),
  ...proveedorGroup(3, SLUG_CANT_PROVEEDORES, ['3', '4'],             24),
  ...proveedorGroup(4, SLUG_CANT_PROVEEDORES, ['4'],                  27),
  { id: uuidv4(), label: 'Garantía con Cheque', campo: 'cf_garantia_cheque', tipo: 'archivo', requerido: true, orden: 30 },
];

// ─── MIGRACIÓN ──────────────────────────────────────────────────────────────

async function migrate() {
  console.log('Iniciando migración de formularios v3...\n');

  // 1. Desactivar el formulario unificado "Bienes de Capital"
  const [bcUnif] = await pool.query(
    "SELECT formularioId FROM formularios WHERE nombre = 'Bienes de Capital'"
  );
  if (bcUnif.length > 0) {
    await pool.query('UPDATE formularios SET activo = 0 WHERE formularioId = ?', [bcUnif[0].formularioId]);
    console.log('✓ "Bienes de Capital" (unificado) desactivado');
  } else {
    console.log('— "Bienes de Capital" (unificado) no encontrado, no hay nada que desactivar');
  }

  // 2. Reactivar y actualizar "Bienes de Capital - Persona Física"
  const [bcFis] = await pool.query(
    "SELECT formularioId FROM formularios WHERE nombre = 'Bienes de Capital - Persona Física'"
  );
  if (bcFis.length > 0) {
    await pool.query(
      'UPDATE formularios SET activo = 1, campos = ?, personas_fisicas = 1, personas_juridicas = 0 WHERE formularioId = ?',
      [JSON.stringify(camposFisica), bcFis[0].formularioId]
    );
    console.log(`✓ "Bienes de Capital - Persona Física" reactivado (${camposFisica.length} campos)`);
  } else {
    await pool.query(
      `INSERT INTO formularios (formularioId, nombre, programa, descripcion, activo, campos, personas_fisicas, personas_juridicas)
       VALUES (?, ?, ?, ?, 1, ?, 1, 0)`,
      [
        uuidv4(),
        'Bienes de Capital - Persona Física',
        'BIENES DE CAPITAL',
        'Financiamiento para personas físicas categorizadas como Microempresa. Hasta $10.000.000. Tasa 50% BADLAR. 36 meses de plazo.',
        JSON.stringify(camposFisica),
      ]
    );
    console.log(`✓ "Bienes de Capital - Persona Física" creado (${camposFisica.length} campos)`);
  }

  // 3. Reactivar y actualizar "Bienes de Capital - Persona Jurídica"
  const [bcJur] = await pool.query(
    "SELECT formularioId FROM formularios WHERE nombre = 'Bienes de Capital - Persona Jurídica'"
  );
  if (bcJur.length > 0) {
    await pool.query(
      'UPDATE formularios SET activo = 1, campos = ?, personas_fisicas = 0, personas_juridicas = 1 WHERE formularioId = ?',
      [JSON.stringify(camposJuridica), bcJur[0].formularioId]
    );
    console.log(`✓ "Bienes de Capital - Persona Jurídica" reactivado (${camposJuridica.length} campos)`);
  } else {
    await pool.query(
      `INSERT INTO formularios (formularioId, nombre, programa, descripcion, activo, campos, personas_fisicas, personas_juridicas)
       VALUES (?, ?, ?, ?, 1, ?, 0, 1)`,
      [
        uuidv4(),
        'Bienes de Capital - Persona Jurídica',
        'BIENES DE CAPITAL',
        'Financiamiento para personas jurídicas categorizadas como Microempresa. Hasta $10.000.000. Tasa 50% BADLAR. 36 meses de plazo.',
        JSON.stringify(camposJuridica),
      ]
    );
    console.log(`✓ "Bienes de Capital - Persona Jurídica" creado (${camposJuridica.length} campos)`);
  }

  await pool.end();
  console.log('\nMigración v3 completada.');
}

migrate().catch((err) => {
  console.error('Error en migración:', err.message);
  process.exit(1);
});
