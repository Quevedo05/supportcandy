require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('./connection');

// Solo los departamentos habilitados para actividad minera según el programa
const DEPARTAMENTOS_MINEROS = [
  'IGLESIA', 'CALINGASTA', 'VALLE FÉRTIL', 'JÁCHAL', 'SARMIENTO', 'ANGACO',
];

const TIPO_ACTIVIDAD_MINERA = [
  'Productor Minero',
  'Comerciante Minero',
  'Industrial Minero',
];

const formularios = [
  // ── EJE 2 · PERSONA FÍSICA ────────────────────────────────────────────────
  {
    formularioId: uuidv4(),
    nombre: 'Desarrollo Minero Eje 2 - Persona Física',
    programa: 'DESARROLLO MINERO EJE 2',
    descripcion:
      'Línea de financiamiento para pequeños productores, comerciantes e industriales mineros con Registro Minero Vigente, para adquisición de bienes de capital y capital de trabajo. Hasta $30.000.000. Tasa 50% BADLAR. 3 meses de gracia + 33 meses de devolución (36 meses en total).',
    activo: 1,
    personas_fisicas: 1,
    personas_juridicas: 0,
    campos: [
      // ── Datos de contacto y ubicación ──────────────────────────────────────
      {
        id: uuidv4(),
        label: 'Teléfono Móvil',
        campo: 'cf_telefono_movil',
        tipo: 'texto',
        requerido: true,
        orden: 1,
        placeholder: 'Ej: 2645000000',
      },
      {
        id: uuidv4(),
        label: 'Domicilio Real',
        campo: 'cf_domicilio_real',
        tipo: 'texto',
        requerido: true,
        orden: 2,
        placeholder: 'Calle, número, barrio',
      },
      {
        id: uuidv4(),
        label: 'Departamento donde desarrolla la actividad minera',
        campo: 'cf_departamento_minero',
        tipo: 'selector',
        requerido: true,
        orden: 3,
        opciones: DEPARTAMENTOS_MINEROS,
      },
      {
        id: uuidv4(),
        label: 'Tipo de actividad minera',
        campo: 'cf_tipo_actividad_minera',
        tipo: 'selector',
        requerido: true,
        orden: 4,
        opciones: TIPO_ACTIVIDAD_MINERA,
      },

      // ── Descripción del proyecto ────────────────────────────────────────────
      {
        id: uuidv4(),
        label: 'Descripción del proyecto minero',
        campo: 'cf_descripcion_proyecto_minero',
        tipo: 'textarea',
        requerido: true,
        orden: 5,
        placeholder: 'Describa la actividad minera, los minerales a extraer o comercializar, y el destino de los fondos solicitados',
      },
      {
        id: uuidv4(),
        label: 'Destino de fondos',
        campo: 'cf_destino_fondos',
        tipo: 'texto',
        requerido: true,
        orden: 6,
        placeholder: 'Ej: Compra de maquinaria de extracción, capital de trabajo para insumos',
      },

      // ── Documentación del solicitante ──────────────────────────────────────
      {
        id: uuidv4(),
        label: 'Foto Frente DNI',
        campo: 'cf_dni_frente',
        tipo: 'archivo',
        requerido: true,
        orden: 7,
      },
      {
        id: uuidv4(),
        label: 'Foto Dorso DNI',
        campo: 'cf_dni_dorso',
        tipo: 'archivo',
        requerido: true,
        orden: 8,
      },
      {
        id: uuidv4(),
        label: 'Acreditación de domicilio real (factura de servicios, contrato de alquiler, comodato, etc.)',
        campo: 'cf_acreditacion_domicilio',
        tipo: 'archivo',
        requerido: true,
        orden: 9,
      },
      {
        id: uuidv4(),
        label: 'Constancia de inscripción en ARCA',
        campo: 'cf_constancia_arca',
        tipo: 'archivo',
        requerido: true,
        orden: 10,
      },
      {
        id: uuidv4(),
        label: 'Constancia Dirección General de Rentas San Juan (si corresponde)',
        campo: 'cf_constancia_dgr',
        tipo: 'archivo',
        requerido: false,
        orden: 11,
      },
      {
        id: uuidv4(),
        label: 'Certificado vigente de inscripción en el Registro de Productores, Comerciantes e Industriales Mineros (Ministerio de Minería de San Juan)',
        campo: 'cf_certificado_registro_minero',
        tipo: 'archivo',
        requerido: true,
        orden: 12,
      },

      // ── Documentación proveedores – Tramo 70% ──────────────────────────────
      {
        id: uuidv4(),
        label: 'Presupuesto Formal Proveedor 1 (Tramo 70%)',
        campo: 'cf_presupuesto_1',
        tipo: 'archivo',
        requerido: true,
        orden: 13,
      },
      {
        id: uuidv4(),
        label: 'Presupuesto Formal Proveedor 2 (Tramo 70%)',
        campo: 'cf_presupuesto_2',
        tipo: 'archivo',
        requerido: false,
        orden: 14,
      },
      {
        id: uuidv4(),
        label: 'Presupuesto Formal Proveedor 3 (Tramo 70%)',
        campo: 'cf_presupuesto_3',
        tipo: 'archivo',
        requerido: false,
        orden: 15,
      },
      {
        id: uuidv4(),
        label: 'Presupuesto Formal Proveedor 4 (Tramo 70%)',
        campo: 'cf_presupuesto_4',
        tipo: 'archivo',
        requerido: false,
        orden: 16,
      },
      {
        id: uuidv4(),
        label: 'Constancia de inscripción en ARCA del proveedor (Tramo 70%)',
        campo: 'cf_constancia_arca_proveedor',
        tipo: 'archivo',
        requerido: true,
        orden: 17,
      },
      {
        id: uuidv4(),
        label: 'Constancia de CBU del proveedor (Tramo 70%)',
        campo: 'cf_cbu_proveedor',
        tipo: 'archivo',
        requerido: true,
        orden: 18,
      },

      // ── Documentación Tramo 30% (desembolso al beneficiario) ───────────────
      {
        id: uuidv4(),
        label: 'Presupuesto para Tramo 30% (capital de trabajo / gastos directos)',
        campo: 'cf_presupuesto_tramo30',
        tipo: 'archivo',
        requerido: false,
        orden: 19,
      },
      {
        id: uuidv4(),
        label: 'Constancia CBU de la cuenta bancaria del beneficiario (Tramo 30%)',
        campo: 'cf_cbu_beneficiario',
        tipo: 'archivo',
        requerido: true,
        orden: 20,
      },

      // ── Garantía ───────────────────────────────────────────────────────────
      {
        id: uuidv4(),
        label: 'Garantía - Copia del Cheque de Pago Diferido',
        campo: 'cf_garantia_cheque',
        tipo: 'archivo',
        requerido: true,
        orden: 21,
      },
    ],
  },

  // ── EJE 2 · PERSONA JURÍDICA ─────────────────────────────────────────────
  {
    formularioId: uuidv4(),
    nombre: 'Desarrollo Minero Eje 2 - Persona Jurídica',
    programa: 'DESARROLLO MINERO EJE 2',
    descripcion:
      'Línea de financiamiento para personas jurídicas (pequeños productores, comerciantes e industriales mineros) con Registro Minero Vigente, para adquisición de bienes de capital y capital de trabajo. Hasta $30.000.000. Tasa 50% BADLAR. 3 meses de gracia + 33 meses de devolución (36 meses en total).',
    activo: 1,
    personas_fisicas: 0,
    personas_juridicas: 1,
    campos: [
      // ── Datos de contacto y ubicación ──────────────────────────────────────
      {
        id: uuidv4(),
        label: 'Teléfono Móvil',
        campo: 'cf_telefono_movil',
        tipo: 'texto',
        requerido: true,
        orden: 1,
        placeholder: 'Ej: 2645000000',
      },
      {
        id: uuidv4(),
        label: 'Domicilio Real',
        campo: 'cf_domicilio_real',
        tipo: 'texto',
        requerido: true,
        orden: 2,
        placeholder: 'Calle, número, barrio',
      },
      {
        id: uuidv4(),
        label: 'Departamento donde desarrolla la actividad minera',
        campo: 'cf_departamento_minero',
        tipo: 'selector',
        requerido: true,
        orden: 3,
        opciones: DEPARTAMENTOS_MINEROS,
      },
      {
        id: uuidv4(),
        label: 'Tipo de actividad minera',
        campo: 'cf_tipo_actividad_minera',
        tipo: 'selector',
        requerido: true,
        orden: 4,
        opciones: TIPO_ACTIVIDAD_MINERA,
      },

      // ── Descripción del proyecto ────────────────────────────────────────────
      {
        id: uuidv4(),
        label: 'Descripción del proyecto minero',
        campo: 'cf_descripcion_proyecto_minero',
        tipo: 'textarea',
        requerido: true,
        orden: 5,
        placeholder: 'Describa la actividad minera, los minerales a extraer o comercializar, y el destino de los fondos solicitados',
      },
      {
        id: uuidv4(),
        label: 'Destino de fondos',
        campo: 'cf_destino_fondos',
        tipo: 'texto',
        requerido: true,
        orden: 6,
        placeholder: 'Ej: Adquisición de maquinaria de extracción, capital de trabajo para insumos',
      },

      // ── Documentación del solicitante (persona jurídica) ───────────────────
      {
        id: uuidv4(),
        label: 'Foto Frente DNI del representante legal',
        campo: 'cf_dni_frente',
        tipo: 'archivo',
        requerido: true,
        orden: 7,
      },
      {
        id: uuidv4(),
        label: 'Foto Dorso DNI del representante legal',
        campo: 'cf_dni_dorso',
        tipo: 'archivo',
        requerido: true,
        orden: 8,
      },
      {
        id: uuidv4(),
        label: 'Acreditación de domicilio real (factura de servicios, contrato de alquiler, comodato, etc.)',
        campo: 'cf_acreditacion_domicilio',
        tipo: 'archivo',
        requerido: true,
        orden: 9,
      },
      {
        id: uuidv4(),
        label: 'Constancia de inscripción en ARCA',
        campo: 'cf_constancia_arca',
        tipo: 'archivo',
        requerido: true,
        orden: 10,
      },
      {
        id: uuidv4(),
        label: 'Constancia Dirección General de Rentas San Juan (si corresponde)',
        campo: 'cf_constancia_dgr',
        tipo: 'archivo',
        requerido: false,
        orden: 11,
      },
      {
        id: uuidv4(),
        label: 'Certificado vigente de inscripción en el Registro de Productores, Comerciantes e Industriales Mineros (Ministerio de Minería de San Juan)',
        campo: 'cf_certificado_registro_minero',
        tipo: 'archivo',
        requerido: true,
        orden: 12,
      },
      {
        id: uuidv4(),
        label: 'Estatuto Social o Contrato Constitutivo con sus modificaciones',
        campo: 'cf_estatuto_social',
        tipo: 'archivo',
        requerido: true,
        orden: 13,
      },
      {
        id: uuidv4(),
        label: 'Acta de designación de autoridades vigente (con objeto acorde a la actividad minera)',
        campo: 'cf_acta_autoridades',
        tipo: 'archivo',
        requerido: true,
        orden: 14,
      },
      {
        id: uuidv4(),
        label: 'Constancia de inscripción en el Registro Público de Comercio',
        campo: 'cf_constancia_registro_publico',
        tipo: 'archivo',
        requerido: true,
        orden: 15,
      },

      // ── Documentación proveedores – Tramo 70% ──────────────────────────────
      {
        id: uuidv4(),
        label: 'Presupuesto Formal Proveedor 1 (Tramo 70%)',
        campo: 'cf_presupuesto_1',
        tipo: 'archivo',
        requerido: true,
        orden: 16,
      },
      {
        id: uuidv4(),
        label: 'Presupuesto Formal Proveedor 2 (Tramo 70%)',
        campo: 'cf_presupuesto_2',
        tipo: 'archivo',
        requerido: false,
        orden: 17,
      },
      {
        id: uuidv4(),
        label: 'Presupuesto Formal Proveedor 3 (Tramo 70%)',
        campo: 'cf_presupuesto_3',
        tipo: 'archivo',
        requerido: false,
        orden: 18,
      },
      {
        id: uuidv4(),
        label: 'Presupuesto Formal Proveedor 4 (Tramo 70%)',
        campo: 'cf_presupuesto_4',
        tipo: 'archivo',
        requerido: false,
        orden: 19,
      },
      {
        id: uuidv4(),
        label: 'Constancia de inscripción en ARCA del proveedor (Tramo 70%)',
        campo: 'cf_constancia_arca_proveedor',
        tipo: 'archivo',
        requerido: true,
        orden: 20,
      },
      {
        id: uuidv4(),
        label: 'Constancia de CBU del proveedor (Tramo 70%)',
        campo: 'cf_cbu_proveedor',
        tipo: 'archivo',
        requerido: true,
        orden: 21,
      },

      // ── Documentación Tramo 30% (desembolso al beneficiario) ───────────────
      {
        id: uuidv4(),
        label: 'Presupuesto para Tramo 30% (capital de trabajo / gastos directos)',
        campo: 'cf_presupuesto_tramo30',
        tipo: 'archivo',
        requerido: false,
        orden: 22,
      },
      {
        id: uuidv4(),
        label: 'Constancia CBU de la cuenta bancaria del beneficiario (Tramo 30%)',
        campo: 'cf_cbu_beneficiario',
        tipo: 'archivo',
        requerido: true,
        orden: 23,
      },

      // ── Garantía ───────────────────────────────────────────────────────────
      {
        id: uuidv4(),
        label: 'Garantía - Copia del Cheque de Pago Diferido',
        campo: 'cf_garantia_cheque',
        tipo: 'archivo',
        requerido: true,
        orden: 24,
      },
    ],
  },
];

async function seedFormulariosEje2() {
  console.log('Seeding formularios Eje 2 - Desarrollo Minero...');

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
  console.log('Seed Eje 2 Desarrollo Minero completo.');
}

seedFormulariosEje2().catch((err) => {
  console.error('Seed Eje 2 Desarrollo Minero falló:', err.message);
  process.exit(1);
});
