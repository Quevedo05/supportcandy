'use strict';

// Aplica formato visual a todas las pestañas del spreadsheet sin tocar los datos.
// Usar cuando se cambian anchos de columna, wrap o bordes después de una migración.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { google } = require('googleapis');

const TOTAL_COLS = 25; // A (REP ETIDO) + 24 columnas de datos

const COLUMN_WIDTHS = [
   80,  // A  REP ETIDO = 2
  120,  // B  Fecha Solicitud
  120,  // C  Fecha doc. completa
  120,  // D  Fecha Comité
   90,  // E  Legajo
  200,  // F  Beneficiario
  130,  // G  CUIT/CUIL
  110,  // H  Fecha de nacimiento
  130,  // I  Teléfono
  210,  // J  E-mail
  200,  // K  Domicilio
  120,  // L  Departamento
   90,  // M  Inscripto ARCA
  110,  // N  Rubro
  280,  // O  Descripción Proyecto
  240,  // P  Destino de los fondos
  280,  // Q  Impacto del Proyecto
   80,  // R  DNI/ESTATUTO
   80,  // S  ARCA BENEFICIARIO
   80,  // T  FOTOS EMPRENDIMIENTO
   80,  // U  PRESUPUESTOS
   80,  // V  ARCA PROVEEDORES
   80,  // W  CBU BENEFICIARIO
   80,  // X  CERTIFICADO MIPYME
   80,  // Y  CHEQUE
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function formatTab(sheets, spreadsheetId, sheetTitle, sheetId) {
  console.log(`  Aplicando formato...`);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [
        // Encabezados fila 3: amarillo, negrita, centrado, wrap
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: TOTAL_COLS },
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
        // Área de datos (fila 4+): wrap + centrado + bordes
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 3, endRowIndex: 10000, startColumnIndex: 0, endColumnIndex: TOTAL_COLS },
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
        // Anchos de columna
        ...COLUMN_WIDTHS.map((pixelSize, colIndex) => ({
          updateDimensionProperties: {
            range: { sheetId, dimension: 'COLUMNS', startIndex: colIndex, endIndex: colIndex + 1 },
            properties: { pixelSize },
            fields: 'pixelSize',
          },
        })),
        // Auto-ajustar altura de filas para que el texto wrapeado se vea completo
        {
          autoResizeDimensions: {
            dimensions: { sheetId, dimension: 'ROWS', startIndex: 3, endIndex: 10000 },
          },
        },
      ],
    },
  });

  await sleep(2000);
  console.log(`  ✓ Listo.`);
}

async function main() {
  const keyJson       = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!keyJson || !spreadsheetId) {
    console.error('ERROR: Faltan GOOGLE_SERVICE_ACCOUNT_KEY o GOOGLE_SHEETS_SPREADSHEET_ID en .env');
    process.exit(1);
  }

  const credentials = JSON.parse(keyJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets      = google.sheets({ version: 'v4', auth });
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const tabs        = spreadsheet.data.sheets.filter((s) => !s.properties.title.startsWith('BACKUP_'));

  console.log(`Pestañas a formatear: ${tabs.map((s) => s.properties.title).join(', ')}\n`);

  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    console.log(`\n── [${tab.properties.title}]`);
    await formatTab(sheets, spreadsheetId, tab.properties.title, tab.properties.sheetId);

    if (i < tabs.length - 1) {
      console.log(`  Esperando 10 s...`);
      await sleep(10000);
    }
  }

  console.log('\n✓ Formato aplicado a todas las pestañas.');
}

main().catch((err) => {
  console.error('\nError:', err.message);
  process.exit(1);
});
