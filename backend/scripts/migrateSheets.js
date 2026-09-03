'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { google } = require('googleapis');

const HEADERS = [
  'Fecha Solicitud', 'Fecha doc. completa', 'Fecha Comité',
  'Legajo', 'Beneficiario', 'CUIT/CUIL', 'Fecha de nacimiento',
  'Teléfono', 'E-mail', 'Domicilio', 'Departamento', 'Inscripto ARCA',
  'Rubro', 'Descripción Proyecto', 'Destino de los fondos', 'Impacto del Proyecto',
  'DNI/ESTATUTO', 'ARCA BENEFICIARIO', 'FOTOS EMPRENDIMIENTO', 'PRESUPUESTOS',
  'ARCA PROVEEDORES', 'CBU BENEFICIARIO', 'CERTIFICADO MIPYME', 'CHEQUE',
];

const TOTAL_COLS = 1 + HEADERS.length; // 25: A (REP ETIDO) + 24 columnas de datos

// Crea una pestaña de backup con todos los datos originales antes de tocar nada.
async function crearBackup(sheets, spreadsheetId, sheetTitle, allData) {
  const backupName = `BACKUP_${sheetTitle}`.slice(0, 100); // Sheets limita a 100 chars

  // Eliminar backup anterior si existe
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const existente = spreadsheet.data.sheets.find((s) => s.properties.title === backupName);
  if (existente) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [{ deleteSheet: { sheetId: existente.properties.sheetId } }],
      },
    });
  }

  // Crear la pestaña de backup
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: { requests: [{ addSheet: { properties: { title: backupName } } }] },
  });

  // Escribir todos los datos originales (incluida la fila de encabezados)
  if (allData.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${backupName}'!A1`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: allData },
    });
  }

  console.log(`  Backup creado en pestaña "${backupName}" (${allData.length} filas).`);
  return backupName;
}

async function migrateTab(sheets, spreadsheetId, sheetTitle, sheetId) {
  console.log(`\n── [${sheetTitle}] ──────────────────────`);

  // Detectar si está en formato viejo (A1 = "Fecha Solicitud")
  const a1Result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetTitle}'!A1`,
  });
  const a1 = (a1Result.data.values?.[0]?.[0] ?? '').toString().trim();

  if (a1 !== 'Fecha Solicitud') {
    console.log(`  Sin formato antiguo (A1="${a1}") — omitiendo.`);
    return;
  }

  // Leer TODOS los datos originales (fila 1 incluida = encabezados viejos + datos)
  const allDataResult = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetTitle}'!A1:Z`,
  });
  const allData = allDataResult.data.values || [];

  // Los datos reales empiezan en fila 2 (fila 1 = encabezados viejos)
  const dataRows = allData.slice(1);
  console.log(`  ${dataRows.length} filas de datos leídas.`);

  // ── BACKUP primero, antes de tocar nada ──────────────────────────────────
  const backupName = await crearBackup(sheets, spreadsheetId, sheetTitle, allData);

  // Limpiar contenido de la pestaña original
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${sheetTitle}'!A:Z`,
  });

  // Quitar filtros y filas congeladas si existían
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          { clearBasicFilter: { sheetId } },
          {
            updateSheetProperties: {
              properties: { sheetId, gridProperties: { frozenRowCount: 0 } },
              fields: 'gridProperties.frozenRowCount',
            },
          },
        ],
      },
    });
  } catch (_) { /* sin filtro previo — continuar */ }

  // Escribir template: título en A1, encabezados en fila 3
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    resource: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: `'${sheetTitle}'!A1`, values: [[sheetTitle.toUpperCase()]] },
        { range: `'${sheetTitle}'!A3`, values: [['REP ETIDO = 2', ...HEADERS]] },
      ],
    },
  });

  // Aplicar formato visual
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [
        // Merge fila 1 (título)
        {
          mergeCells: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: TOTAL_COLS },
            mergeType: 'MERGE_ALL',
          },
        },
        // Título: negrita, centrado, tamaño 13
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: TOTAL_COLS },
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
        // Encabezados fila 3: fondo amarillo #FFE599, negrita, centrado
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: TOTAL_COLS },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                textFormat: { bold: true },
                backgroundColor: { red: 1.0, green: 0.898, blue: 0.6 },
              },
            },
            fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment,textFormat,backgroundColor)',
          },
        },
        // Filtros automáticos desde fila 3
        {
          setBasicFilter: {
            filter: {
              range: { sheetId, startRowIndex: 2, startColumnIndex: 0, endColumnIndex: TOTAL_COLS },
            },
          },
        },
        // Congelar primeras 3 filas
        {
          updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 3 } },
            fields: 'gridProperties.frozenRowCount',
          },
        },
      ],
    },
  });

  // Restaurar datos desde B4 (columna A vacía = REP ETIDO manual)
  if (dataRows.length > 0) {
    const migratedRows = dataRows.map((row) => ['', ...row]);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetTitle}'!A4`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: migratedRows },
    });
    console.log(`  Datos restaurados en B4:Y${3 + dataRows.length}.`);
  }

  console.log(`  ✓ Migrado. Backup guardado en "${backupName}" — borrarlo cuando verifiques que todo está bien.`);
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
  const tabs        = spreadsheet.data.sheets;

  // Ignorar pestañas de backup (las que empiezan con BACKUP_)
  const tabsAMigrar = tabs.filter((s) => !s.properties.title.startsWith('BACKUP_'));

  console.log(`Spreadsheet encontrado.`);
  console.log(`Pestañas a evaluar: ${tabsAMigrar.map((s) => s.properties.title).join(', ')}\n`);

  for (const tab of tabsAMigrar) {
    await migrateTab(sheets, spreadsheetId, tab.properties.title, tab.properties.sheetId);
  }

  console.log('\n✓ Proceso completo.');
  console.log('  Verificá cada pestaña y borrá las pestañas BACKUP_ cuando estés conforme.');
}

main().catch((err) => {
  console.error('\nError:', err.message);
  process.exit(1);
});
