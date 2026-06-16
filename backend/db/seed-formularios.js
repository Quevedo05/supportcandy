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

const formularios = [
  {
    formularioId: uuidv4(),
    nombre: 'Bienes de Capital - Persona Física',
    programa: 'BIENES DE CAPITAL',
    descripcion: 'Financiamiento para personas físicas (Microempresas) de San Juan para adquirir bienes de capital. Hasta $10.000.000. Tasa 50% BADLAR. 36 meses de plazo.',
    activo: 1,
    personas_fisicas: 1,
    personas_juridicas: 0,
    campos: [
      { id: uuidv4(), label: 'Teléfono Móvil', campo: 'cf_telefono_movil', tipo: 'texto', requerido: true, orden: 1, placeholder: 'Ej: 2645000000' },
      { id: uuidv4(), label: 'Domicilio del Emprendimiento', campo: 'cf_domicilio', tipo: 'texto', requerido: true, orden: 2, placeholder: 'Calle, número, barrio' },
      { id: uuidv4(), label: 'Departamento', campo: 'cf_departamento', tipo: 'selector', requerido: true, orden: 3, opciones: DEPARTAMENTOS_SJ },
      { id: uuidv4(), label: 'Rubro', campo: 'cf_rubro', tipo: 'selector', requerido: true, orden: 4, opciones: RUBROS },
      { id: uuidv4(), label: 'Constancia de ARCA Vigente', campo: 'cf_constancia_arca', tipo: 'archivo', requerido: true, orden: 5 },
      { id: uuidv4(), label: 'Constancia Ingresos Brutos', campo: 'cf_constancia_iibb', tipo: 'archivo', requerido: true, orden: 6 },
      { id: uuidv4(), label: 'Certificado Mi PYME', campo: 'cf_certificado_mipyme', tipo: 'archivo', requerido: true, orden: 7 },
      { id: uuidv4(), label: 'Foto Frente DNI', campo: 'cf_dni_frente', tipo: 'archivo', requerido: true, orden: 8 },
      { id: uuidv4(), label: 'Foto Dorso DNI', campo: 'cf_dni_dorso', tipo: 'archivo', requerido: true, orden: 9 },
      { id: uuidv4(), label: 'Boleta de Servicio', campo: 'cf_boleta_servicio', tipo: 'archivo', requerido: true, orden: 10 },
      { id: uuidv4(), label: 'Descripción del Proyecto', campo: 'cf_descripcion_proyecto', tipo: 'textarea', requerido: true, orden: 11, placeholder: 'Describa en qué consiste su proyecto' },
      { id: uuidv4(), label: 'Descripción del Equipo', campo: 'cf_descripcion_equipo', tipo: 'textarea', requerido: true, orden: 12, placeholder: 'Describa el equipo de trabajo' },
      { id: uuidv4(), label: 'Impacto', campo: 'cf_impacto', tipo: 'textarea', requerido: true, orden: 13, placeholder: 'Describa el impacto social y económico' },
      { id: uuidv4(), label: 'Foto Nro 1', campo: 'cf_foto_1', tipo: 'archivo', requerido: false, orden: 14 },
      { id: uuidv4(), label: 'Destino de Fondos', campo: 'cf_destino_fondos', tipo: 'texto', requerido: true, orden: 15, placeholder: 'Ej: Compra de maquinaria' },
      { id: uuidv4(), label: 'Foto Nro 2', campo: 'cf_foto_2', tipo: 'archivo', requerido: false, orden: 16 },
      { id: uuidv4(), label: 'Foto Nro 3', campo: 'cf_foto_3', tipo: 'archivo', requerido: false, orden: 17 },
      { id: uuidv4(), label: 'Presupuesto Formal 1', campo: 'cf_presupuesto_1', tipo: 'archivo', requerido: true, orden: 18 },
      { id: uuidv4(), label: 'Presupuesto Formal 2', campo: 'cf_presupuesto_2', tipo: 'archivo', requerido: false, orden: 19 },
      { id: uuidv4(), label: 'Presupuesto Formal 3', campo: 'cf_presupuesto_3', tipo: 'archivo', requerido: false, orden: 20 },
      { id: uuidv4(), label: 'Presupuesto Formal 4', campo: 'cf_presupuesto_4', tipo: 'archivo', requerido: false, orden: 21 },
      { id: uuidv4(), label: 'CBU Proveedor', campo: 'cf_cbu_proveedor', tipo: 'archivo', requerido: true, orden: 22 },
      { id: uuidv4(), label: 'Garantía con Cheque', campo: 'cf_garantia_cheque', tipo: 'archivo', requerido: true, orden: 23 },
    ],
  },
  {
    formularioId: uuidv4(),
    nombre: 'Bienes de Capital - Persona Jurídica',
    programa: 'BIENES DE CAPITAL',
    descripcion: 'Financiamiento para personas jurídicas (Microempresas) de San Juan para adquirir bienes de capital. Hasta $10.000.000. Tasa 50% BADLAR. 36 meses de plazo.',
    activo: 1,
    personas_fisicas: 0,
    personas_juridicas: 1,
    campos: [
      { id: uuidv4(), label: 'Teléfono Móvil', campo: 'cf_telefono_movil', tipo: 'texto', requerido: true, orden: 1, placeholder: 'Ej: 2645000000' },
      { id: uuidv4(), label: 'Domicilio del Emprendimiento', campo: 'cf_domicilio', tipo: 'texto', requerido: true, orden: 2, placeholder: 'Calle, número' },
      { id: uuidv4(), label: 'Departamento', campo: 'cf_departamento', tipo: 'selector', requerido: true, orden: 3, opciones: DEPARTAMENTOS_SJ },
      { id: uuidv4(), label: 'Rubro', campo: 'cf_rubro', tipo: 'selector', requerido: true, orden: 4, opciones: RUBROS },
      { id: uuidv4(), label: 'Constancia de ARCA Vigente', campo: 'cf_constancia_arca', tipo: 'archivo', requerido: true, orden: 5 },
      { id: uuidv4(), label: 'Constancia Ingresos Brutos', campo: 'cf_constancia_iibb', tipo: 'archivo', requerido: true, orden: 6 },
      { id: uuidv4(), label: 'Certificado Mi PYME', campo: 'cf_certificado_mipyme', tipo: 'archivo', requerido: true, orden: 7 },
      { id: uuidv4(), label: 'Estatuto Social o Contrato', campo: 'cf_estatuto_social', tipo: 'archivo', requerido: true, orden: 8 },
      { id: uuidv4(), label: 'Copia DNI / LC / LE / CE Representante Legal', campo: 'cf_dni_representante', tipo: 'archivo', requerido: true, orden: 9 },
      { id: uuidv4(), label: 'Descripción del Proyecto', campo: 'cf_descripcion_proyecto', tipo: 'textarea', requerido: true, orden: 10, placeholder: 'Describa en qué consiste su proyecto' },
      { id: uuidv4(), label: 'Descripción del Equipo', campo: 'cf_descripcion_equipo', tipo: 'textarea', requerido: true, orden: 11, placeholder: 'Describa el equipo de trabajo' },
      { id: uuidv4(), label: 'Impacto', campo: 'cf_impacto', tipo: 'textarea', requerido: true, orden: 12, placeholder: 'Describa el impacto social y económico' },
      { id: uuidv4(), label: 'Foto Nro 1', campo: 'cf_foto_1', tipo: 'archivo', requerido: false, orden: 13 },
      { id: uuidv4(), label: 'Destino de Fondos', campo: 'cf_destino_fondos', tipo: 'texto', requerido: true, orden: 14, placeholder: 'Ej: Adquisición de maquinaria de cocina' },
      { id: uuidv4(), label: 'Foto Nro 2', campo: 'cf_foto_2', tipo: 'archivo', requerido: false, orden: 15 },
      { id: uuidv4(), label: 'Foto Nro 3', campo: 'cf_foto_3', tipo: 'archivo', requerido: false, orden: 16 },
      { id: uuidv4(), label: 'Presupuesto Formal 1', campo: 'cf_presupuesto_1', tipo: 'archivo', requerido: true, orden: 17 },
      { id: uuidv4(), label: 'Presupuesto Formal 2', campo: 'cf_presupuesto_2', tipo: 'archivo', requerido: false, orden: 18 },
      { id: uuidv4(), label: 'Presupuesto Formal 3', campo: 'cf_presupuesto_3', tipo: 'archivo', requerido: false, orden: 19 },
      { id: uuidv4(), label: 'Presupuesto Formal 4', campo: 'cf_presupuesto_4', tipo: 'archivo', requerido: false, orden: 20 },
      { id: uuidv4(), label: 'CBU Proveedor', campo: 'cf_cbu_proveedor', tipo: 'archivo', requerido: true, orden: 21 },
      { id: uuidv4(), label: 'Garantía con Cheque', campo: 'cf_garantia_cheque', tipo: 'archivo', requerido: true, orden: 22 },
    ],
  },
  {
    formularioId: uuidv4(),
    nombre: 'Microcréditos Emprendedores',
    programa: 'MICROCRÉDITOS EMPRENDEDORES',
    descripcion: 'Microcréditos para emprendedores en estadío de iniciación, ejecución o crecimiento. Hasta $3.000.000. Tasa 50% BADLAR. 18 meses de plazo. Sin gastos de otorgamiento.',
    activo: 1,
    personas_fisicas: 1,
    personas_juridicas: 1,
    campos: [
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
      { id: uuidv4(), label: 'Presupuesto Formal Proveedor 1', campo: 'cf_presupuesto_1', tipo: 'archivo', requerido: true, orden: 17 },
      { id: uuidv4(), label: 'Presupuesto Formal Proveedor 2', campo: 'cf_presupuesto_2', tipo: 'archivo', requerido: false, orden: 18 },
      { id: uuidv4(), label: 'Presupuesto Formal Proveedor 3', campo: 'cf_presupuesto_3', tipo: 'archivo', requerido: false, orden: 19 },
      { id: uuidv4(), label: 'Presupuesto Formal Proveedor 4', campo: 'cf_presupuesto_4', tipo: 'archivo', requerido: false, orden: 20 },
      { id: uuidv4(), label: 'Currículum Vitae del Consultor', campo: 'cf_cv_consultor', tipo: 'archivo', requerido: false, orden: 21 },
      { id: uuidv4(), label: 'Constancia de ARCA Proveedor', campo: 'cf_constancia_arca_proveedor', tipo: 'archivo', requerido: true, orden: 22 },
      { id: uuidv4(), label: 'CBU Proveedor', campo: 'cf_cbu_proveedor', tipo: 'archivo', requerido: true, orden: 23 },
      { id: uuidv4(), label: 'Garantía con Cheque', campo: 'cf_garantia_cheque', tipo: 'archivo', requerido: true, orden: 24 },
    ],
  },
  {
    formularioId: uuidv4(),
    nombre: 'Potenciar Emprendedores',
    programa: 'POTENCIAR EMPRENDEDORES',
    descripcion: 'Línea de crédito para nuevos emprendedores y emprendimientos en ejecución o crecimiento. Hasta $4.000.000. Tasa 40% BADLAR. 12 meses de plazo. Sin gastos de otorgamiento.',
    activo: 1,
    personas_fisicas: 1,
    personas_juridicas: 1,
    campos: [
      { id: uuidv4(), label: 'Domicilio del Emprendimiento', campo: 'cf_domicilio', tipo: 'texto', requerido: true, orden: 1, placeholder: 'Calle, número, localidad' },
      { id: uuidv4(), label: 'Departamento', campo: 'cf_departamento', tipo: 'selector', requerido: true, orden: 2, opciones: DEPARTAMENTOS_SJ },
      { id: uuidv4(), label: 'Teléfono Móvil', campo: 'cf_telefono_movil', tipo: 'texto', requerido: true, orden: 3, placeholder: 'Ej: 2645000000' },
      { id: uuidv4(), label: 'Rubro', campo: 'cf_rubro', tipo: 'selector', requerido: true, orden: 4, opciones: RUBROS },
      { id: uuidv4(), label: 'Describa su Proyecto', campo: 'cf_descripcion_proyecto', tipo: 'textarea', requerido: true, orden: 5, placeholder: 'Describa en qué consiste su proyecto y su actividad' },
      { id: uuidv4(), label: 'Impacto del Proyecto', campo: 'cf_impacto', tipo: 'textarea', requerido: true, orden: 6, placeholder: 'Impacto económico, social y/o ambiental del proyecto' },
      { id: uuidv4(), label: 'Destino de Fondos', campo: 'cf_destino_fondos', tipo: 'texto', requerido: true, orden: 7, placeholder: 'Ej: Adquisición de equipo informático' },
      { id: uuidv4(), label: 'Fecha de Inicio de Actividades', campo: 'cf_fecha_inicio', tipo: 'fecha', requerido: false, orden: 8 },
      { id: uuidv4(), label: 'Foto Frente DNI / LE / LC / CE', campo: 'cf_dni_frente', tipo: 'archivo', requerido: true, orden: 9 },
      { id: uuidv4(), label: 'Foto Dorso DNI / LE / LC / CE', campo: 'cf_dni_dorso', tipo: 'archivo', requerido: true, orden: 10 },
      { id: uuidv4(), label: 'Constancia de ARCA Vigente', campo: 'cf_constancia_arca', tipo: 'archivo', requerido: true, orden: 11 },
      { id: uuidv4(), label: 'Presupuesto Formal 1', campo: 'cf_presupuesto_1', tipo: 'archivo', requerido: true, orden: 12 },
      { id: uuidv4(), label: 'Presupuesto Formal 2', campo: 'cf_presupuesto_2', tipo: 'archivo', requerido: false, orden: 13 },
      { id: uuidv4(), label: 'Presupuesto Formal 3', campo: 'cf_presupuesto_3', tipo: 'archivo', requerido: false, orden: 14 },
      { id: uuidv4(), label: 'Garantía con Cheque de Pago Diferido', campo: 'cf_garantia_cheque', tipo: 'archivo', requerido: true, orden: 15 },
      { id: uuidv4(), label: 'Constancia de Ingresos Brutos (si corresponde)', campo: 'cf_constancia_iibb', tipo: 'archivo', requerido: false, orden: 16 },
      { id: uuidv4(), label: 'Comprobante CBU o CVU del Beneficiario', campo: 'cf_cbu_beneficiario', tipo: 'archivo', requerido: true, orden: 17 },
    ],
  },
];

async function seedFormularios() {
  console.log('Seeding formularios...');

  for (const f of formularios) {
    const [existing] = await pool.query(
      'SELECT formularioId FROM formularios WHERE nombre = ? AND programa = ?',
      [f.nombre, f.programa]
    );

    if (existing.length > 0) {
      console.log(`Formulario ya existe: ${f.nombre}, saltando.`);
      continue;
    }

    await pool.query(
      `INSERT INTO formularios
        (formularioId, nombre, programa, descripcion, activo, campos, personas_fisicas, personas_juridicas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        f.formularioId,
        f.nombre,
        f.programa,
        f.descripcion,
        f.activo,
        JSON.stringify(f.campos),
        f.personas_fisicas,
        f.personas_juridicas,
      ]
    );

    console.log(`Formulario creado: ${f.nombre} (${f.campos.length} campos)`);
  }

  await pool.end();
  console.log('Seed formularios complete.');
}

seedFormularios().catch((err) => {
  console.error('Seed formularios failed:', err.message);
  process.exit(1);
});
