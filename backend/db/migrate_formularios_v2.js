require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('./connection');

async function getFormulario(nombre) {
  const [rows] = await pool.query(
    'SELECT formularioId, campos FROM formularios WHERE nombre = ? LIMIT 1',
    [nombre]
  );
  if (!rows.length) throw new Error(`Formulario no encontrado: "${nombre}"`);
  const row = rows[0];
  return {
    formularioId: row.formularioId,
    campos: typeof row.campos === 'string' ? JSON.parse(row.campos) : (row.campos ?? []),
  };
}

async function updateCampos(formularioId, campos) {
  campos.forEach((c, i) => { c.orden = i + 1; });
  await pool.query(
    'UPDATE formularios SET campos = ? WHERE formularioId = ?',
    [JSON.stringify(campos), formularioId]
  );
}

function removeCampo(campos, campoClave) {
  return campos.filter(c => c.campo !== campoClave);
}

function modifyCampo(campos, campoClave, changes) {
  return campos.map(c => c.campo === campoClave ? { ...c, ...changes } : c);
}

function insertAfter(campos, afterCampoClave, newCampo) {
  const idx = campos.findIndex(c => c.campo === afterCampoClave);
  const result = [...campos];
  result.splice(idx === -1 ? campos.length : idx + 1, 0, newCampo);
  return result;
}

function insertBefore(campos, beforeCampoClave, newCampo) {
  const idx = campos.findIndex(c => c.campo === beforeCampoClave);
  const result = [...campos];
  result.splice(idx === -1 ? 0 : idx, 0, newCampo);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────

async function migrateBDCFisica() {
  const { formularioId, campos } = await getFormulario('Bienes de Capital - Persona Física');
  let c = campos;

  // Remove duplicate teléfono (main form already captures ciudadano_telefono)
  c = removeCampo(c, 'cf_telefono_movil');

  // Add Fecha de Nacimiento at start
  c = [
    { id: uuidv4(), label: 'Fecha de Nacimiento', campo: 'cf_fecha_nacimiento', tipo: 'fecha', requerido: true, orden: 0 },
    ...c,
  ];

  // Add CUIT after Fecha de Nacimiento
  c = insertAfter(c, 'cf_fecha_nacimiento', {
    id: uuidv4(), label: 'CUIT', campo: 'cf_cuit', tipo: 'texto', requerido: true, orden: 0, placeholder: 'Ej: 20-12345678-9',
  });

  // Make Certificado Mi PYME and Constancia IIBB optional
  c = modifyCampo(c, 'cf_certificado_mipyme', { requerido: false });
  c = modifyCampo(c, 'cf_constancia_iibb', { requerido: false });

  // Rename photos
  c = modifyCampo(c, 'cf_foto_1', { label: 'Foto 1 del emprendimiento' });
  c = modifyCampo(c, 'cf_foto_2', { label: 'Foto 2 del emprendimiento' });
  c = modifyCampo(c, 'cf_foto_3', { label: 'Foto 3 del emprendimiento' });

  // Update Garantía label
  c = modifyCampo(c, 'cf_garantia_cheque', { label: 'Garantía — copia del cheque de pago diferido' });

  await updateCampos(formularioId, c);
  console.log(`✓ Bienes de Capital - Persona Física (${c.length} campos)`);
}

async function migrateBDCJuridica() {
  const { formularioId, campos } = await getFormulario('Bienes de Capital - Persona Jurídica');
  let c = campos;

  // Remove duplicate teléfono
  c = removeCampo(c, 'cf_telefono_movil');

  // Add CUIT at start
  c = [
    { id: uuidv4(), label: 'CUIT', campo: 'cf_cuit', tipo: 'texto', requerido: true, orden: 0, placeholder: 'Ej: 30-12345678-9' },
    ...c,
  ];

  // Add Poder de Representación (optional) after DNI representante
  c = insertAfter(c, 'cf_dni_representante', {
    id: uuidv4(), label: 'Poder de Representación', campo: 'cf_poder_representacion', tipo: 'archivo', requerido: false, orden: 0,
  });

  // Rename photos
  c = modifyCampo(c, 'cf_foto_1', { label: 'Foto 1 del emprendimiento' });
  c = modifyCampo(c, 'cf_foto_2', { label: 'Foto 2 del emprendimiento' });
  c = modifyCampo(c, 'cf_foto_3', { label: 'Foto 3 del emprendimiento' });

  // Update Garantía label
  c = modifyCampo(c, 'cf_garantia_cheque', { label: 'Garantía — copia del cheque de pago diferido' });

  await updateCampos(formularioId, c);
  console.log(`✓ Bienes de Capital - Persona Jurídica (${c.length} campos)`);
}

async function migrateMicrocreditos() {
  const { formularioId, campos } = await getFormulario('Microcréditos Emprendedores');
  let c = campos;

  // Add CUIT/CUIL at start
  c = [
    { id: uuidv4(), label: 'CUIT / CUIL', campo: 'cf_cuit_cuil', tipo: 'texto', requerido: true, orden: 0, placeholder: 'Ej: 20-12345678-9' },
    ...c,
  ];

  // Add Fecha de Nacimiento after CUIT/CUIL
  c = insertAfter(c, 'cf_cuit_cuil', {
    id: uuidv4(), label: 'Fecha de Nacimiento', campo: 'cf_fecha_nacimiento', tipo: 'fecha', requerido: true, orden: 0,
  });

  // Constancia ARCA del beneficiario: optional + updated label
  c = modifyCampo(c, 'cf_constancia_arca', { requerido: false, label: 'Constancia de ARCA Vigente del beneficiario' });

  // Update Garantía label
  c = modifyCampo(c, 'cf_garantia_cheque', { label: 'Garantía — copia del cheque de pago diferido' });

  await updateCampos(formularioId, c);
  console.log(`✓ Microcréditos Emprendedores (${c.length} campos)`);
}

async function migratePotenciar() {
  const { formularioId, campos } = await getFormulario('Potenciar Emprendedores');
  let c = campos;

  // Add CUIT at start
  c = [
    { id: uuidv4(), label: 'CUIT', campo: 'cf_cuit', tipo: 'texto', requerido: true, orden: 0, placeholder: 'Ej: 20-12345678-9' },
    ...c,
  ];

  // Add Fecha de Nacimiento after CUIT
  c = insertAfter(c, 'cf_cuit', {
    id: uuidv4(), label: 'Fecha de Nacimiento', campo: 'cf_fecha_nacimiento', tipo: 'fecha', requerido: true, orden: 0,
  });

  // Update Garantía label
  c = modifyCampo(c, 'cf_garantia_cheque', { label: 'Garantía — copia del cheque de pago diferido' });

  // Add Boleta de Servicio before Constancia IIBB
  c = insertBefore(c, 'cf_constancia_iibb', {
    id: uuidv4(), label: 'Boleta de Servicio', campo: 'cf_boleta_servicio', tipo: 'archivo', requerido: true, orden: 0,
  });

  // Add 4th Presupuesto after Presupuesto 3
  c = insertAfter(c, 'cf_presupuesto_3', {
    id: uuidv4(), label: 'Presupuesto Formal 4', campo: 'cf_presupuesto_4', tipo: 'archivo', requerido: false, orden: 0,
  });

  await updateCampos(formularioId, c);
  console.log(`✓ Potenciar Emprendedores (${c.length} campos)`);
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Iniciando migración de formularios v2...\n');
  try {
    await migrateBDCFisica();
    await migrateBDCJuridica();
    await migrateMicrocreditos();
    await migratePotenciar();
    console.log('\n✓ Migración completada exitosamente');
  } catch (err) {
    console.error('\n✗ Error en migración:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
