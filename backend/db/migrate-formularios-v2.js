/**
 * Migración v2: campos condicionales
 * - Microcréditos Emprendedores: selector de proveedores (1-4) con Presupuesto + ARCA + CBU por proveedor
 * - Bienes de Capital: formulario unificado Persona Física/Jurídica + selector de proveedores (1-4)
 * - Potenciar Emprendedores: selector de proveedores (1-3) con Presupuesto + ARCA (sin CBU del proveedor)
 *
 * Ejecutar con: node backend/db/migrate-formularios-v2.js
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
const SLUG_TIPO_PERSONA = 'cf_tipo_persona';

// Grupo de 3 campos por proveedor: Presupuesto + ARCA + CBU
function proveedorGroup(n, slugControl, valoresVisibles, ordenBase) {
  const cond = n === 1 ? undefined : { campo: slugControl, valor: valoresVisibles };
  return [
    { id: uuidv4(), label: `Presupuesto Proveedor ${n}`,        campo: `cf_presupuesto_${n}`,              tipo: 'archivo', requerido: true, orden: ordenBase,     condicion: cond },
    { id: uuidv4(), label: `Constancia en ARCA Proveedor ${n}`, campo: `cf_constancia_arca_proveedor_${n}`, tipo: 'archivo', requerido: true, orden: ordenBase + 1, condicion: cond },
    { id: uuidv4(), label: `Constancia de CBU Proveedor ${n}`,  campo: `cf_cbu_proveedor_${n}`,            tipo: 'archivo', requerido: true, orden: ordenBase + 2, condicion: cond },
  ];
}

// Grupo de 2 campos por proveedor: Presupuesto + ARCA (sin CBU — se deposita al beneficiario)
function proveedorGroupSinCBU(n, slugControl, valoresVisibles, ordenBase) {
  const cond = n === 1 ? undefined : { campo: slugControl, valor: valoresVisibles };
  return [
    { id: uuidv4(), label: `Presupuesto Proveedor ${n}`,        campo: `cf_presupuesto_${n}`,              tipo: 'archivo', requerido: true, orden: ordenBase,     condicion: cond },
    { id: uuidv4(), label: `Constancia en ARCA Proveedor ${n}`, campo: `cf_constancia_arca_proveedor_${n}`, tipo: 'archivo', requerido: true, orden: ordenBase + 1, condicion: cond },
  ];
}

// ─── MICROCRÉDITOS EMPRENDEDORES ────────────────────────────────────────────

const camposMicrocreditos = [
  { id: uuidv4(), label: 'Domicilio del Emprendimiento',       campo: 'cf_domicilio',            tipo: 'texto',    requerido: true,  orden: 1,  placeholder: 'Calle, número, localidad' },
  { id: uuidv4(), label: 'Departamento',                        campo: 'cf_departamento',          tipo: 'selector', requerido: true,  orden: 2,  opciones: DEPARTAMENTOS_SJ },
  { id: uuidv4(), label: 'Teléfono Móvil',                     campo: 'cf_telefono_movil',        tipo: 'texto',    requerido: true,  orden: 3,  placeholder: 'Ej: 2645000000' },
  { id: uuidv4(), label: 'Rubro',                              campo: 'cf_rubro',                 tipo: 'selector', requerido: true,  orden: 4,  opciones: RUBROS },
  { id: uuidv4(), label: 'Describa su Proyecto',               campo: 'cf_descripcion_proyecto',  tipo: 'textarea', requerido: true,  orden: 5,  placeholder: 'Describa en qué consiste su proyecto' },
  { id: uuidv4(), label: 'Describa su Equipo de Trabajo',      campo: 'cf_descripcion_equipo',    tipo: 'textarea', requerido: true,  orden: 6,  placeholder: 'Describa las personas que integran el equipo' },
  { id: uuidv4(), label: 'Fecha de Inicio de Actividades',     campo: 'cf_fecha_inicio',          tipo: 'fecha',    requerido: true,  orden: 7 },
  { id: uuidv4(), label: 'Impacto que Genera su Proyecto',     campo: 'cf_impacto',               tipo: 'textarea', requerido: true,  orden: 8,  placeholder: 'Impacto social, económico o ambiental' },
  { id: uuidv4(), label: 'Destino',                            campo: 'cf_destino_fondos',        tipo: 'texto',    requerido: true,  orden: 9,  placeholder: 'Ej: Adquisición de equipo informático' },
  { id: uuidv4(), label: 'Cómo ayuda a su Emprendimiento',     campo: 'cf_como_ayuda',            tipo: 'textarea', requerido: true,  orden: 10, placeholder: 'Explique cómo el financiamiento mejora su emprendimiento' },
  { id: uuidv4(), label: 'Fotos del Emprendimiento 1',         campo: 'cf_foto_1',                tipo: 'archivo',  requerido: false, orden: 11 },
  { id: uuidv4(), label: 'Fotos del Emprendimiento 2',         campo: 'cf_foto_2',                tipo: 'archivo',  requerido: false, orden: 12 },
  { id: uuidv4(), label: 'Fotos del Emprendimiento 3',         campo: 'cf_foto_3',                tipo: 'archivo',  requerido: false, orden: 13 },
  { id: uuidv4(), label: 'Foto Frente DNI / LE / LC / CE',     campo: 'cf_dni_frente',            tipo: 'archivo',  requerido: true,  orden: 14 },
  { id: uuidv4(), label: 'Foto Dorso DNI / LE / LC / CE',      campo: 'cf_dni_dorso',             tipo: 'archivo',  requerido: true,  orden: 15 },
  { id: uuidv4(), label: 'Constancia de ARCA Vigente',         campo: 'cf_constancia_arca',       tipo: 'archivo',  requerido: true,  orden: 16 },
  { id: uuidv4(), label: 'Currículum Vitae del Consultor',     campo: 'cf_cv_consultor',          tipo: 'archivo',  requerido: false, orden: 17 },
  { id: uuidv4(), label: 'Seleccione la cantidad de proveedores', campo: SLUG_CANT_PROVEEDORES,   tipo: 'selector', requerido: true,  orden: 18, opciones: ['1', '2', '3', '4'] },
  ...proveedorGroup(1, SLUG_CANT_PROVEEDORES, ['1', '2', '3', '4'], 19),
  ...proveedorGroup(2, SLUG_CANT_PROVEEDORES, ['2', '3', '4'],       22),
  ...proveedorGroup(3, SLUG_CANT_PROVEEDORES, ['3', '4'],             25),
  ...proveedorGroup(4, SLUG_CANT_PROVEEDORES, ['4'],                  28),
  { id: uuidv4(), label: 'Garantía con Cheque', campo: 'cf_garantia_cheque', tipo: 'archivo', requerido: true, orden: 31 },
];

// ─── BIENES DE CAPITAL UNIFICADO ────────────────────────────────────────────

const camposBienesCapital = [
  { id: uuidv4(), label: 'Teléfono Móvil',                     campo: 'cf_telefono_movil',        tipo: 'texto',    requerido: true,  orden: 1,  placeholder: 'Ej: 2645000000' },
  { id: uuidv4(), label: 'Domicilio del Emprendimiento',       campo: 'cf_domicilio',             tipo: 'texto',    requerido: true,  orden: 2,  placeholder: 'Calle, número, barrio' },
  { id: uuidv4(), label: 'Departamento',                        campo: 'cf_departamento',          tipo: 'selector', requerido: true,  orden: 3,  opciones: DEPARTAMENTOS_SJ },
  { id: uuidv4(), label: 'Rubro',                              campo: 'cf_rubro',                 tipo: 'selector', requerido: true,  orden: 4,  opciones: RUBROS },
  { id: uuidv4(), label: 'Constancia de ARCA Vigente',         campo: 'cf_constancia_arca',       tipo: 'archivo',  requerido: true,  orden: 5 },
  { id: uuidv4(), label: 'Constancia Ingresos Brutos',         campo: 'cf_constancia_iibb',       tipo: 'archivo',  requerido: true,  orden: 6 },
  { id: uuidv4(), label: 'Certificado Mi PYME',                campo: 'cf_certificado_mipyme',    tipo: 'archivo',  requerido: true,  orden: 7 },
  // Selector tipo de persona
  { id: uuidv4(), label: 'Tipo de Persona', campo: SLUG_TIPO_PERSONA, tipo: 'selector', requerido: true, orden: 8, opciones: ['Persona Física', 'Persona Jurídica'] },
  // Solo Persona Física
  { id: uuidv4(), label: 'Foto Frente DNI',                    campo: 'cf_dni_frente',            tipo: 'archivo',  requerido: true, orden: 9,  condicion: { campo: SLUG_TIPO_PERSONA, valor: ['Persona Física'] } },
  { id: uuidv4(), label: 'Foto Dorso DNI',                     campo: 'cf_dni_dorso',             tipo: 'archivo',  requerido: true, orden: 10, condicion: { campo: SLUG_TIPO_PERSONA, valor: ['Persona Física'] } },
  { id: uuidv4(), label: 'Boleta de Servicio',                 campo: 'cf_boleta_servicio',       tipo: 'archivo',  requerido: true, orden: 11, condicion: { campo: SLUG_TIPO_PERSONA, valor: ['Persona Física'] } },
  // Solo Persona Jurídica
  { id: uuidv4(), label: 'Estatuto Social o Contrato',         campo: 'cf_estatuto_social',       tipo: 'archivo',  requerido: true, orden: 12, condicion: { campo: SLUG_TIPO_PERSONA, valor: ['Persona Jurídica'] } },
  { id: uuidv4(), label: 'Copia DNI / LC / LE / CE Representante Legal', campo: 'cf_dni_representante', tipo: 'archivo', requerido: true, orden: 13, condicion: { campo: SLUG_TIPO_PERSONA, valor: ['Persona Jurídica'] } },
  // Campos comunes
  { id: uuidv4(), label: 'Descripción del Proyecto',           campo: 'cf_descripcion_proyecto',  tipo: 'textarea', requerido: true,  orden: 14, placeholder: 'Describa en qué consiste su proyecto' },
  { id: uuidv4(), label: 'Descripción del Equipo',             campo: 'cf_descripcion_equipo',    tipo: 'textarea', requerido: true,  orden: 15, placeholder: 'Describa el equipo de trabajo' },
  { id: uuidv4(), label: 'Impacto',                            campo: 'cf_impacto',               tipo: 'textarea', requerido: true,  orden: 16, placeholder: 'Describa el impacto social y económico' },
  { id: uuidv4(), label: 'Foto Nro 1',                         campo: 'cf_foto_1',                tipo: 'archivo',  requerido: false, orden: 17 },
  { id: uuidv4(), label: 'Destino de Fondos',                  campo: 'cf_destino_fondos',        tipo: 'texto',    requerido: true,  orden: 18, placeholder: 'Ej: Compra de maquinaria' },
  { id: uuidv4(), label: 'Foto Nro 2',                         campo: 'cf_foto_2',                tipo: 'archivo',  requerido: false, orden: 19 },
  { id: uuidv4(), label: 'Foto Nro 3',                         campo: 'cf_foto_3',                tipo: 'archivo',  requerido: false, orden: 20 },
  // Selector proveedores (1-4) con Presupuesto + ARCA + CBU
  { id: uuidv4(), label: 'Seleccione la cantidad de proveedores', campo: SLUG_CANT_PROVEEDORES,   tipo: 'selector', requerido: true, orden: 21, opciones: ['1', '2', '3', '4'] },
  ...proveedorGroup(1, SLUG_CANT_PROVEEDORES, ['1', '2', '3', '4'], 22),
  ...proveedorGroup(2, SLUG_CANT_PROVEEDORES, ['2', '3', '4'],       25),
  ...proveedorGroup(3, SLUG_CANT_PROVEEDORES, ['3', '4'],             28),
  ...proveedorGroup(4, SLUG_CANT_PROVEEDORES, ['4'],                  31),
  { id: uuidv4(), label: 'Garantía con Cheque', campo: 'cf_garantia_cheque', tipo: 'archivo', requerido: true, orden: 34 },
];

// ─── POTENCIAR EMPRENDEDORES ─────────────────────────────────────────────────

const camposPotenciar = [
  { id: uuidv4(), label: 'Domicilio del Emprendimiento',       campo: 'cf_domicilio',             tipo: 'texto',    requerido: true,  orden: 1,  placeholder: 'Calle, número, localidad' },
  { id: uuidv4(), label: 'Departamento',                        campo: 'cf_departamento',          tipo: 'selector', requerido: true,  orden: 2,  opciones: DEPARTAMENTOS_SJ },
  { id: uuidv4(), label: 'Teléfono Móvil',                     campo: 'cf_telefono_movil',        tipo: 'texto',    requerido: true,  orden: 3,  placeholder: 'Ej: 2645000000' },
  { id: uuidv4(), label: 'Rubro',                              campo: 'cf_rubro',                 tipo: 'selector', requerido: true,  orden: 4,  opciones: RUBROS },
  { id: uuidv4(), label: 'Describa su Proyecto',               campo: 'cf_descripcion_proyecto',  tipo: 'textarea', requerido: true,  orden: 5,  placeholder: 'Describa en qué consiste su proyecto y su actividad' },
  { id: uuidv4(), label: 'Impacto del Proyecto',               campo: 'cf_impacto',               tipo: 'textarea', requerido: true,  orden: 6,  placeholder: 'Impacto económico, social y/o ambiental del proyecto' },
  { id: uuidv4(), label: 'Destino de Fondos',                  campo: 'cf_destino_fondos',        tipo: 'texto',    requerido: true,  orden: 7,  placeholder: 'Ej: Adquisición de equipo informático' },
  { id: uuidv4(), label: 'Fecha de Inicio de Actividades',     campo: 'cf_fecha_inicio',          tipo: 'fecha',    requerido: false, orden: 8 },
  { id: uuidv4(), label: 'Foto Frente DNI / LE / LC / CE',     campo: 'cf_dni_frente',            tipo: 'archivo',  requerido: true,  orden: 9 },
  { id: uuidv4(), label: 'Foto Dorso DNI / LE / LC / CE',      campo: 'cf_dni_dorso',             tipo: 'archivo',  requerido: true,  orden: 10 },
  { id: uuidv4(), label: 'Constancia de ARCA Vigente',         campo: 'cf_constancia_arca',       tipo: 'archivo',  requerido: true,  orden: 11 },
  { id: uuidv4(), label: 'Garantía con Cheque de Pago Diferido', campo: 'cf_garantia_cheque',     tipo: 'archivo',  requerido: true,  orden: 12 },
  { id: uuidv4(), label: 'Constancia de Ingresos Brutos (si corresponde)', campo: 'cf_constancia_iibb', tipo: 'archivo', requerido: false, orden: 13 },
  { id: uuidv4(), label: 'Comprobante CBU o CVU del Beneficiario', campo: 'cf_cbu_beneficiario',  tipo: 'archivo',  requerido: true,  orden: 14 },
  // Selector proveedores (1-3) solo con Presupuesto + ARCA (sin CBU del proveedor)
  { id: uuidv4(), label: 'Seleccione la cantidad de proveedores', campo: SLUG_CANT_PROVEEDORES,   tipo: 'selector', requerido: true, orden: 15, opciones: ['1', '2', '3'] },
  ...proveedorGroupSinCBU(1, SLUG_CANT_PROVEEDORES, ['1', '2', '3'], 16),
  ...proveedorGroupSinCBU(2, SLUG_CANT_PROVEEDORES, ['2', '3'],       18),
  ...proveedorGroupSinCBU(3, SLUG_CANT_PROVEEDORES, ['3'],             20),
];

// ─── MIGRACIÓN ──────────────────────────────────────────────────────────────

async function migrate() {
  console.log('Iniciando migración de formularios v2...\n');

  // 1. Microcréditos Emprendedores
  const [mcRows] = await pool.query(
    "SELECT formularioId FROM formularios WHERE nombre = 'Microcréditos Emprendedores'"
  );
  if (mcRows.length > 0) {
    await pool.query('UPDATE formularios SET campos = ? WHERE formularioId = ?',
      [JSON.stringify(camposMicrocreditos), mcRows[0].formularioId]);
    console.log(`✓ Microcréditos Emprendedores actualizado (${camposMicrocreditos.length} campos)`);
  } else {
    console.log('✗ "Microcréditos Emprendedores" no encontrado — verificar seed.');
  }

  // 2. Bienes de Capital (unificado)
  const [bcRows] = await pool.query(
    "SELECT formularioId FROM formularios WHERE nombre = 'Bienes de Capital'"
  );
  if (bcRows.length > 0) {
    await pool.query('UPDATE formularios SET campos = ? WHERE formularioId = ?',
      [JSON.stringify(camposBienesCapital), bcRows[0].formularioId]);
    console.log(`✓ Bienes de Capital (unificado) actualizado (${camposBienesCapital.length} campos)`);
  } else {
    await pool.query(
      `INSERT INTO formularios (formularioId, nombre, programa, descripcion, activo, campos, personas_fisicas, personas_juridicas)
       VALUES (?, ?, ?, ?, 1, ?, 1, 1)`,
      [
        uuidv4(),
        'Bienes de Capital',
        'BIENES DE CAPITAL',
        'Financiamiento para personas físicas y jurídicas (Microempresas) de San Juan. Hasta $10.000.000. Tasa 50% BADLAR. 36 meses de plazo.',
        JSON.stringify(camposBienesCapital),
      ]
    );
    console.log(`✓ Bienes de Capital (unificado) creado (${camposBienesCapital.length} campos)`);
  }

  // 3. Desactivar formularios separados de Bienes de Capital
  for (const nombre of ['Bienes de Capital - Persona Física', 'Bienes de Capital - Persona Jurídica']) {
    const [rows] = await pool.query('SELECT formularioId FROM formularios WHERE nombre = ?', [nombre]);
    if (rows.length > 0) {
      await pool.query('UPDATE formularios SET activo = 0 WHERE formularioId = ?', [rows[0].formularioId]);
      console.log(`✓ "${nombre}" desactivado`);
    }
  }

  // 4. Potenciar Emprendedores
  const [peRows] = await pool.query(
    "SELECT formularioId FROM formularios WHERE nombre = 'Potenciar Emprendedores'"
  );
  if (peRows.length > 0) {
    await pool.query('UPDATE formularios SET campos = ? WHERE formularioId = ?',
      [JSON.stringify(camposPotenciar), peRows[0].formularioId]);
    console.log(`✓ Potenciar Emprendedores actualizado (${camposPotenciar.length} campos)`);
  } else {
    console.log('✗ "Potenciar Emprendedores" no encontrado — verificar seed.');
  }

  await pool.end();
  console.log('\nMigración v2 completada.');
}

migrate().catch((err) => {
  console.error('Error en migración:', err.message);
  process.exit(1);
});
