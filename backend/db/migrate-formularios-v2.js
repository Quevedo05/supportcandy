/**
 * Migración v2: campos condicionales
 * - Microcréditos Emprendedores: selector de cantidad de proveedores + grupos por proveedor
 * - Bienes de Capital: formulario unificado con selector Persona Física / Jurídica
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

// ─── MICROCRÉDITOS EMPRENDEDORES ────────────────────────────────────────────

const SLUG_CANT_PROVEEDORES = 'cf_cantidad_proveedores';

function proveedorGroup(n, slugControl, valoresVisibles, ordenBase) {
  return [
    {
      id: uuidv4(),
      label: `Presupuesto Proveedor ${n}`,
      campo: `cf_presupuesto_${n}`,
      tipo: 'archivo',
      requerido: true,
      orden: ordenBase,
      condicion: n === 1 ? undefined : { campo: slugControl, valor: valoresVisibles },
    },
    {
      id: uuidv4(),
      label: `Constancia en ARCA Proveedor ${n}`,
      campo: `cf_constancia_arca_proveedor_${n}`,
      tipo: 'archivo',
      requerido: true,
      orden: ordenBase + 1,
      condicion: n === 1 ? undefined : { campo: slugControl, valor: valoresVisibles },
    },
    {
      id: uuidv4(),
      label: `Constancia de CBU Proveedor ${n}`,
      campo: `cf_cbu_proveedor_${n}`,
      tipo: 'archivo',
      requerido: true,
      orden: ordenBase + 2,
      condicion: n === 1 ? undefined : { campo: slugControl, valor: valoresVisibles },
    },
  ];
}

const camposMicrocreditos = [
  { id: uuidv4(), label: 'Domicilio del Emprendimiento', campo: 'cf_domicilio', tipo: 'texto', requerido: true, orden: 1, placeholder: 'Calle, número, localidad' },
  { id: uuidv4(), label: 'Departamento', campo: 'cf_departamento', tipo: 'selector', requerido: true, orden: 2, opciones: DEPARTAMENTOS_SJ },
  { id: uuidv4(), label: 'Teléfono Móvil', campo: 'cf_telefono_movil', tipo: 'texto', requerido: true, orden: 3, placeholder: 'Ej: 2645000000' },
  { id: uuidv4(), label: 'Rubro', campo: 'cf_rubro', tipo: 'selector', requerido: true, orden: 4, opciones: RUBROS },
  { id: uuidv4(), label: 'Describa su Proyecto', campo: 'cf_descripcion_proyecto', tipo: 'textarea', requerido: true, orden: 5, placeholder: 'Describa en qué consiste su proyecto' },
  { id: uuidv4(), label: 'Describa su Equipo de Trabajo', campo: 'cf_descripcion_equipo', tipo: 'textarea', requerido: true, orden: 6, placeholder: 'Describa las personas que integran el equipo' },
  { id: uuidv4(), label: 'Fecha de Inicio de Actividades', campo: 'cf_fecha_inicio', tipo: 'fecha', requerido: true, orden: 7 },
  { id: uuidv4(), label: 'Impacto que Genera su Proyecto', campo: 'cf_impacto', tipo: 'textarea', requerido: true, orden: 8, placeholder: 'Impacto social, económico o ambiental' },
  { id: uuidv4(), label: 'Destino', campo: 'cf_destino_fondos', tipo: 'texto', requerido: true, orden: 9, placeholder: 'Ej: Adquisición de equipo informático' },
  { id: uuidv4(), label: 'Cómo ayuda a su Emprendimiento', campo: 'cf_como_ayuda', tipo: 'textarea', requerido: true, orden: 10, placeholder: 'Explique cómo el financiamiento mejora su emprendimiento' },
  { id: uuidv4(), label: 'Fotos del Emprendimiento 1', campo: 'cf_foto_1', tipo: 'archivo', requerido: false, orden: 11 },
  { id: uuidv4(), label: 'Fotos del Emprendimiento 2', campo: 'cf_foto_2', tipo: 'archivo', requerido: false, orden: 12 },
  { id: uuidv4(), label: 'Fotos del Emprendimiento 3', campo: 'cf_foto_3', tipo: 'archivo', requerido: false, orden: 13 },
  { id: uuidv4(), label: 'Foto Frente DNI / LE / LC / CE', campo: 'cf_dni_frente', tipo: 'archivo', requerido: true, orden: 14 },
  { id: uuidv4(), label: 'Foto Dorso DNI / LE / LC / CE', campo: 'cf_dni_dorso', tipo: 'archivo', requerido: true, orden: 15 },
  { id: uuidv4(), label: 'Constancia de ARCA Vigente', campo: 'cf_constancia_arca', tipo: 'archivo', requerido: true, orden: 16 },
  { id: uuidv4(), label: 'Currículum Vitae del Consultor', campo: 'cf_cv_consultor', tipo: 'archivo', requerido: false, orden: 17 },
  // Selector de cantidad de proveedores
  {
    id: uuidv4(),
    label: 'Seleccione la cantidad de proveedores',
    campo: SLUG_CANT_PROVEEDORES,
    tipo: 'selector',
    requerido: true,
    orden: 18,
    opciones: ['1', '2', '3', '4'],
  },
  // Proveedor 1 (siempre visible)
  ...proveedorGroup(1, SLUG_CANT_PROVEEDORES, ['1', '2', '3', '4'], 19),
  // Proveedor 2 (visible si >= 2)
  ...proveedorGroup(2, SLUG_CANT_PROVEEDORES, ['2', '3', '4'], 22),
  // Proveedor 3 (visible si >= 3)
  ...proveedorGroup(3, SLUG_CANT_PROVEEDORES, ['3', '4'], 25),
  // Proveedor 4 (visible solo si = 4)
  ...proveedorGroup(4, SLUG_CANT_PROVEEDORES, ['4'], 28),
  // Campos finales
  { id: uuidv4(), label: 'Garantía con Cheque', campo: 'cf_garantia_cheque', tipo: 'archivo', requerido: true, orden: 31 },
];

// ─── BIENES DE CAPITAL UNIFICADO ────────────────────────────────────────────

const SLUG_TIPO_PERSONA = 'cf_tipo_persona';

const camposBienesCapital = [
  { id: uuidv4(), label: 'Teléfono Móvil', campo: 'cf_telefono_movil', tipo: 'texto', requerido: true, orden: 1, placeholder: 'Ej: 2645000000' },
  { id: uuidv4(), label: 'Domicilio del Emprendimiento', campo: 'cf_domicilio', tipo: 'texto', requerido: true, orden: 2, placeholder: 'Calle, número, barrio' },
  { id: uuidv4(), label: 'Departamento', campo: 'cf_departamento', tipo: 'selector', requerido: true, orden: 3, opciones: DEPARTAMENTOS_SJ },
  { id: uuidv4(), label: 'Rubro', campo: 'cf_rubro', tipo: 'selector', requerido: true, orden: 4, opciones: RUBROS },
  { id: uuidv4(), label: 'Constancia de ARCA Vigente', campo: 'cf_constancia_arca', tipo: 'archivo', requerido: true, orden: 5 },
  { id: uuidv4(), label: 'Constancia Ingresos Brutos', campo: 'cf_constancia_iibb', tipo: 'archivo', requerido: true, orden: 6 },
  { id: uuidv4(), label: 'Certificado Mi PYME', campo: 'cf_certificado_mipyme', tipo: 'archivo', requerido: true, orden: 7 },
  // Selector de tipo de persona
  {
    id: uuidv4(),
    label: 'Tipo de Persona',
    campo: SLUG_TIPO_PERSONA,
    tipo: 'selector',
    requerido: true,
    orden: 8,
    opciones: ['Persona Física', 'Persona Jurídica'],
  },
  // Solo Persona Física
  { id: uuidv4(), label: 'Foto Frente DNI', campo: 'cf_dni_frente', tipo: 'archivo', requerido: true, orden: 9, condicion: { campo: SLUG_TIPO_PERSONA, valor: ['Persona Física'] } },
  { id: uuidv4(), label: 'Foto Dorso DNI', campo: 'cf_dni_dorso', tipo: 'archivo', requerido: true, orden: 10, condicion: { campo: SLUG_TIPO_PERSONA, valor: ['Persona Física'] } },
  { id: uuidv4(), label: 'Boleta de Servicio', campo: 'cf_boleta_servicio', tipo: 'archivo', requerido: true, orden: 11, condicion: { campo: SLUG_TIPO_PERSONA, valor: ['Persona Física'] } },
  // Solo Persona Jurídica
  { id: uuidv4(), label: 'Estatuto Social o Contrato', campo: 'cf_estatuto_social', tipo: 'archivo', requerido: true, orden: 12, condicion: { campo: SLUG_TIPO_PERSONA, valor: ['Persona Jurídica'] } },
  { id: uuidv4(), label: 'Copia DNI / LC / LE / CE Representante Legal', campo: 'cf_dni_representante', tipo: 'archivo', requerido: true, orden: 13, condicion: { campo: SLUG_TIPO_PERSONA, valor: ['Persona Jurídica'] } },
  // Campos comunes
  { id: uuidv4(), label: 'Descripción del Proyecto', campo: 'cf_descripcion_proyecto', tipo: 'textarea', requerido: true, orden: 14, placeholder: 'Describa en qué consiste su proyecto' },
  { id: uuidv4(), label: 'Descripción del Equipo', campo: 'cf_descripcion_equipo', tipo: 'textarea', requerido: true, orden: 15, placeholder: 'Describa el equipo de trabajo' },
  { id: uuidv4(), label: 'Impacto', campo: 'cf_impacto', tipo: 'textarea', requerido: true, orden: 16, placeholder: 'Describa el impacto social y económico' },
  { id: uuidv4(), label: 'Foto Nro 1', campo: 'cf_foto_1', tipo: 'archivo', requerido: false, orden: 17 },
  { id: uuidv4(), label: 'Destino de Fondos', campo: 'cf_destino_fondos', tipo: 'texto', requerido: true, orden: 18, placeholder: 'Ej: Compra de maquinaria' },
  { id: uuidv4(), label: 'Foto Nro 2', campo: 'cf_foto_2', tipo: 'archivo', requerido: false, orden: 19 },
  { id: uuidv4(), label: 'Foto Nro 3', campo: 'cf_foto_3', tipo: 'archivo', requerido: false, orden: 20 },
  { id: uuidv4(), label: 'Presupuesto Formal 1', campo: 'cf_presupuesto_1', tipo: 'archivo', requerido: true, orden: 21 },
  { id: uuidv4(), label: 'Presupuesto Formal 2', campo: 'cf_presupuesto_2', tipo: 'archivo', requerido: false, orden: 22 },
  { id: uuidv4(), label: 'Presupuesto Formal 3', campo: 'cf_presupuesto_3', tipo: 'archivo', requerido: false, orden: 23 },
  { id: uuidv4(), label: 'Presupuesto Formal 4', campo: 'cf_presupuesto_4', tipo: 'archivo', requerido: false, orden: 24 },
  { id: uuidv4(), label: 'CBU Proveedor', campo: 'cf_cbu_proveedor', tipo: 'archivo', requerido: true, orden: 25 },
  { id: uuidv4(), label: 'Garantía con Cheque', campo: 'cf_garantia_cheque', tipo: 'archivo', requerido: true, orden: 26 },
];

// ─── MIGRACIÓN ──────────────────────────────────────────────────────────────

async function migrate() {
  console.log('Iniciando migración de formularios v2...\n');

  // 1. Actualizar Microcréditos Emprendedores
  const [mcRows] = await pool.query(
    "SELECT formularioId FROM formularios WHERE nombre = 'Microcréditos Emprendedores'"
  );
  if (mcRows.length > 0) {
    await pool.query(
      'UPDATE formularios SET campos = ? WHERE formularioId = ?',
      [JSON.stringify(camposMicrocreditos), mcRows[0].formularioId]
    );
    console.log(`✓ Microcréditos Emprendedores actualizado (${camposMicrocreditos.length} campos)`);
  } else {
    console.log('✗ No se encontró "Microcréditos Emprendedores" — verificar que el seed fue ejecutado.');
  }

  // 2. Crear o actualizar formulario unificado "Bienes de Capital"
  const [bcRows] = await pool.query(
    "SELECT formularioId FROM formularios WHERE nombre = 'Bienes de Capital'"
  );
  if (bcRows.length > 0) {
    await pool.query(
      'UPDATE formularios SET campos = ? WHERE formularioId = ?',
      [JSON.stringify(camposBienesCapital), bcRows[0].formularioId]
    );
    console.log(`✓ Bienes de Capital (unificado) actualizado`);
  } else {
    await pool.query(
      `INSERT INTO formularios
         (formularioId, nombre, programa, descripcion, activo, campos, personas_fisicas, personas_juridicas)
       VALUES (?, ?, ?, ?, 1, ?, 1, 1)`,
      [
        uuidv4(),
        'Bienes de Capital',
        'BIENES DE CAPITAL',
        'Financiamiento para personas físicas y jurídicas (Microempresas) de San Juan. Hasta $10.000.000. Tasa 50% BADLAR. 36 meses de plazo.',
        JSON.stringify(camposBienesCapital),
      ]
    );
    console.log(`✓ Bienes de Capital (unificado) creado`);
  }

  // 3. Desactivar los dos formularios separados de Bienes de Capital si existen
  const [bcFisica] = await pool.query(
    "SELECT formularioId FROM formularios WHERE nombre = 'Bienes de Capital - Persona Física'"
  );
  if (bcFisica.length > 0) {
    await pool.query(
      'UPDATE formularios SET activo = 0 WHERE formularioId = ?',
      [bcFisica[0].formularioId]
    );
    console.log('✓ Bienes de Capital - Persona Física desactivado (reemplazado por formulario unificado)');
  }

  const [bcJuridica] = await pool.query(
    "SELECT formularioId FROM formularios WHERE nombre = 'Bienes de Capital - Persona Jurídica'"
  );
  if (bcJuridica.length > 0) {
    await pool.query(
      'UPDATE formularios SET activo = 0 WHERE formularioId = ?',
      [bcJuridica[0].formularioId]
    );
    console.log('✓ Bienes de Capital - Persona Jurídica desactivado (reemplazado por formulario unificado)');
  }

  await pool.end();
  console.log('\nMigración v2 completada.');
}

migrate().catch((err) => {
  console.error('Error en migración:', err.message);
  process.exit(1);
});
