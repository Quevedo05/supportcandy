'use strict';

const { google } = require('googleapis');

// Parsea la descripción del ticket (formato "Label: valor\n") en un objeto clave-valor.
// Los archivos quedan con el prefijo [Adjunto] intacto para poder detectarlos.
function parseDescripcion(descripcion) {
  const result = {};
  if (!descripcion) return result;
  descripcion.split('\n').forEach((linea) => {
    const idx = linea.indexOf(': ');
    if (idx === -1) return;
    const label = linea.slice(0, idx).trim();
    const valor = linea.slice(idx + 2).trim();
    if (label) result[label] = valor;
  });
  return result;
}

// Devuelve ✓ si al menos uno de los labels tiene un archivo adjunto.
function tieneArchivo(parsed, ...labels) {
  return labels.some((label) => {
    const val = parsed[label] || '';
    return val.startsWith('[Adjunto]') || val.startsWith('data:');
  });
}

function check(parsed, ...labels) {
  return tieneArchivo(parsed, ...labels) ? '✓' : '';
}

function formatFecha(fecha) {
  if (!fecha) return '';
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return '';
  const day   = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year  = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Construye el array de celdas en el orden de columnas de la planilla:
// Fecha Solicitud | Fecha doc. completa | Fecha Comité |
// Legajo | Beneficiario | CUIT/CUIL | Fecha de nacimiento |
// Teléfono | E-mail | Domicilio | Departamento | Inscripto ARCA |
// Rubro | Descripción Proyecto | Destino de fondos | Impacto del Proyecto |
// DNI/ESTATUTO | ARCA BENEFICIARIO | FOTOS EMPRENDIMIENTO | PRESUPUESTOS |
// ARCA PROVEEDORES | CBU BENEFICIARIO | CERTIFICADO MIPYME | CHEQUE
function buildRow(ticket, parsed) {
  return [
    formatFecha(ticket.fecha_creacion),
    '',                                                    // Fecha doc. completa (manual)
    '',                                                    // Fecha Comité (manual)
    ticket.numero_legajo || '',
    ticket.ciudadano_nombre || '',
    parsed['CUIT/CUIL'] || '',
    parsed['Fecha de Nacimiento'] || '',
    ticket.ciudadano_telefono || parsed['Teléfono Móvil'] || '',
    ticket.ciudadano_email || '',
    parsed['Domicilio del Emprendimiento'] || '',
    parsed['Departamento'] || '',
    tieneArchivo(parsed, 'Constancia de ARCA Vigente') ? 'SI' : '',
    parsed['Rubro'] || '',
    parsed['Describa su Proyecto'] || parsed['Descripción del Proyecto'] || '',
    parsed['Destino de Fondos'] || parsed['Destino'] || '',
    parsed['Impacto del Proyecto'] || parsed['Impacto que Genera su Proyecto'] || parsed['Impacto'] || '',
    check(parsed,
      'Foto Frente DNI / LE / LC / CE',
      'Foto Frente DNI',
      'Estatuto Social o Contrato',
      'Copia DNI / LC / LE / CE Representante Legal'
    ),
    check(parsed, 'Constancia de ARCA Vigente'),
    check(parsed, 'Foto Nro 1', 'Fotos del Emprendimiento 1'),
    check(parsed,
      'Presupuesto Formal 1',
      'Presupuesto Formal Proveedor 1'
    ),
    check(parsed, 'Constancia de ARCA Proveedor'),
    check(parsed,
      'Comprobante CBU o CVU del Beneficiario',
      'CBU Proveedor'
    ),
    check(parsed, 'Certificado Mi PYME'),
    check(parsed,
      'Garantía con Cheque de Pago Diferido',
      'Garantía con Cheque'
    ),
  ];
}

// Crea la pestaña si no existe en el spreadsheet.
async function asegurarPestana(sheets, spreadsheetId, sheetName) {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const existe = spreadsheet.data.sheets.some(
    (s) => s.properties.title === sheetName
  );
  if (!existe) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    });
    console.log(`[Sheets] Pestaña "${sheetName}" creada automáticamente.`);
  }
}

// Función principal: agrega una fila al Google Sheet correspondiente al programa.
// Es segura de llamar sin await — si falla, solo logea el error sin interrumpir el ticket.
async function appendTicketRow(ticket, formularioPrograma) {
  const keyJson        = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const spreadsheetId  = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!keyJson || !spreadsheetId) {
    console.warn('[Sheets] Variables de entorno no configuradas, omitiendo sync.');
    return;
  }

  let credentials;
  try {
    credentials = JSON.parse(keyJson);
  } catch {
    console.error('[Sheets] GOOGLE_SERVICE_ACCOUNT_KEY no es JSON válido.');
    return;
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets   = google.sheets({ version: 'v4', auth });
  const sheetName = formularioPrograma || 'General';

  await asegurarPestana(sheets, spreadsheetId, sheetName);

  const parsed = parseDescripcion(ticket.descripcion || '');
  const row    = buildRow(ticket, parsed);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetName}'!A:Z`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [row] },
  });

  console.log(`[Sheets] Fila agregada en "${sheetName}" — ticket #${ticket.numero || ticket.ticketId}`);
}

module.exports = { appendTicketRow };
