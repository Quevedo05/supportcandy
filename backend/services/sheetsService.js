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

const HEADERS = [
  'Fecha Solicitud', 'Fecha doc. completa', 'Fecha Comité',
  'Legajo', 'Beneficiario', 'CUIT/CUIL', 'Fecha de nacimiento',
  'Teléfono', 'E-mail', 'Domicilio', 'Departamento', 'Inscripto ARCA',
  'Rubro', 'Descripción Proyecto', 'Destino de los fondos', 'Impacto del Proyecto',
  'DNI/ESTATUTO', 'ARCA BENEFICIARIO', 'FOTOS EMPRENDIMIENTO', 'PRESUPUESTOS',
  'ARCA PROVEEDORES', 'CBU BENEFICIARIO', 'CERTIFICADO MIPYME', 'CHEQUE',
];

// Anchos en píxeles por columna (A=0 … Y=24)
const COLUMN_WIDTHS = [
   80,  // A  REP ETIDO = 2
  100,  // B  Fecha Solicitud
  110,  // C  Fecha doc. completa
  100,  // D  Fecha Comité
   80,  // E  Legajo
  180,  // F  Beneficiario
  120,  // G  CUIT/CUIL
  100,  // H  Fecha de nacimiento
  120,  // I  Teléfono
  200,  // J  E-mail
  180,  // K  Domicilio
  110,  // L  Departamento
   90,  // M  Inscripto ARCA
  100,  // N  Rubro
  260,  // O  Descripción Proyecto
  220,  // P  Destino de los fondos
  260,  // Q  Impacto del Proyecto
   80,  // R  DNI/ESTATUTO
   80,  // S  ARCA BENEFICIARIO
   80,  // T  FOTOS EMPRENDIMIENTO
   80,  // U  PRESUPUESTOS
   80,  // V  ARCA PROVEEDORES
   80,  // W  CBU BENEFICIARIO
   80,  // X  CERTIFICADO MIPYME
   80,  // Y  CHEQUE
];

// Estructura de la pestaña:
//   Fila 1 : Título (nombre del programa) — celdas mergeadas, negrita, centrado
//   Fila 2 : vacía
//   Fila 3 : A3 = "REP ETIDO = 2"  |  B3:Y3 = encabezados con fondo amarillo y filtros
//   Fila 4+: datos — columna A queda libre para marcar repetidos a mano
async function asegurarPestana(sheets, spreadsheetId, sheetName) {
  // Obtener el spreadsheet y buscar la pestaña
  let spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  let sheetMeta = spreadsheet.data.sheets.find((s) => s.properties.title === sheetName);

  if (!sheetMeta) {
    const addResult = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    });
    sheetMeta = { properties: addResult.data.replies[0].addSheet.properties };
    console.log(`[Sheets] Pestaña "${sheetName}" creada automáticamente.`);
  }

  const sheetId = sheetMeta.properties.sheetId;

  // Verificar si B3 ya tiene el encabezado de datos
  const checkResult = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!B3`,
  });
  const celdaB3 = (checkResult.data.values?.[0]?.[0] ?? '').toString().trim();

  if (celdaB3 !== 'Fecha Solicitud') {
    const totalCols = 1 + HEADERS.length; // 25: A (REP ETIDO) + 24 columnas de datos

    // 1. Escribir contenido: título en A1, encabezados en fila 3
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: `'${sheetName}'!A1`, values: [[sheetName.toUpperCase()]] },
          { range: `'${sheetName}'!A3`, values: [['REP ETIDO = 2', ...HEADERS]] },
        ],
      },
    });

    // 2. Aplicar formato visual
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          // Merge A1:Y1 para el título
          {
            mergeCells: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: totalCols },
              mergeType: 'MERGE_ALL',
            },
          },
          // Formato del título: negrita, centrado, tamaño 13
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: totalCols },
              cell: {
                userEnteredFormat: {
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE',
                  textFormat: { bold: true, fontSize: 13 },
                },
              },
              fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment,textFormat)',
            },
          },
          // Formato de encabezados fila 3: fondo amarillo, negrita, centrado, wrap
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: totalCols },
              cell: {
                userEnteredFormat: {
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE',
                  wrapStrategy: 'WRAP',
                  textFormat: { bold: true },
                  backgroundColor: { red: 1.0, green: 0.898, blue: 0.6 },
                },
              },
              fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment,wrapStrategy,textFormat,backgroundColor)',
            },
          },
          // Área de datos (fila 4 en adelante): wrap + centrado + bordes
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 3, endRowIndex: 10000, startColumnIndex: 0, endColumnIndex: totalCols },
              cell: {
                userEnteredFormat: {
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE',
                  wrapStrategy: 'WRAP',
                  borders: {
                    top:    { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
                    bottom: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
                    left:   { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
                    right:  { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
                  },
                },
              },
              fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment,wrapStrategy,borders)',
            },
          },
          // Filtros automáticos en fila 3
          {
            setBasicFilter: {
              filter: {
                range: { sheetId, startRowIndex: 2, startColumnIndex: 0, endColumnIndex: totalCols },
              },
            },
          },
          // Congelar las primeras 3 filas
          {
            updateSheetProperties: {
              properties: { sheetId, gridProperties: { frozenRowCount: 3 } },
              fields: 'gridProperties.frozenRowCount',
            },
          },
          // Anchos de columna
          ...COLUMN_WIDTHS.map((pixelSize, colIndex) => ({
            updateDimensionProperties: {
              range: { sheetId, dimension: 'COLUMNS', startIndex: colIndex, endIndex: colIndex + 1 },
              properties: { pixelSize },
              fields: 'pixelSize',
            },
          })),
        ],
      },
    });

    console.log(`[Sheets] Template inicializado en "${sheetName}".`);
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

  // Los datos empiezan en columna B; la columna A queda para "REP ETIDO" manual.
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetName}'!B:Z`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [row] },
  });

  console.log(`[Sheets] Fila agregada en "${sheetName}" — ticket #${ticket.numero || ticket.ticketId}`);
}

module.exports = { appendTicketRow };
