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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function crearBackup(sheets, spreadsheetId, sheetTitle, allData) {
  const backupName = `BACKUP_${sheetTitle}`.slice(0, 100);

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const existente = spreadsheet.data.sheets.find((s) => s.properties.title === backupName);
  if (existente) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests: [{ deleteSheet: { sheetId: existente.properties.sheetId } }] },
    });
    await sleep(1500);
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: { requests: [{ addSheet: { properties: { title: backupName } } }] },
  });
  await sleep(1500);

  if (allData.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${backupName}'!A1`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: allData },
    });
    await sleep(1500);
  }

  console.log(`  Backup creado en "${backupName}" (${allData.length} filas).`);
  return backupName;
}

async function aplicarTemplate(sheets, spreadsheetId, sheetTitle, sheetId, dataRows) {
  // Limpiar contenido
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${sheetTitle}'!A:Z`,
  });
  await sleep(1500);

  // Quitar filtros y filas congeladas previas
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
    await sleep(1500);
  } catch (_) { /* sin filtro previo */ }

  // Escribir título y encabezados
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
  await sleep(1500);

  // Formato visual
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [
        {
          mergeCells: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: TOTAL_COLS },
            mergeType: 'MERGE_ALL',
          },
        },
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
        {
          setBasicFilter: {
            filter: {
              range: { sheetId, startRowIndex: 2, startColumnIndex: 0, endColumnIndex: TOTAL_COLS },
            },
          },
        },
        {
          updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 3 } },
            fields: 'gridProperties.frozenRowCount',
          },
        },
      ],
    },
  });
  await sleep(1500);

  // Restaurar datos desde B4
  if (dataRows.length > 0) {
    const migratedRows = dataRows.map((row) => ['', ...row]);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetTitle}'!A4`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: migratedRows },
    });
    await sleep(1500);
    console.log(`  Datos restaurados en B4:Y${3 + dataRows.length}.`);
  }
}

async function migrateTab(sheets, spreadsheetId, sheetTitle, sheetId, allSheetTitles) {
  console.log(`\n── [${sheetTitle}] ──────────────────────`);

  const backupName = `BACKUP_${sheetTitle}`.slice(0, 100);

  // Leer A1 para detectar el estado actual
  const a1Result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetTitle}'!A1`,
  });
  const a1 = (a1Result.data.values?.[0]?.[0] ?? '').toString().trim();

  let dataRows = [];

  if (a1 === 'Fecha Solicitud') {
    // Formato viejo normal: encabezados en A1, datos desde A2
    const allDataResult = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetTitle}'!A1:Z`,
    });
    const allData = allDataResult.data.values || [];
    dataRows = allData.slice(1);
    console.log(`  Formato viejo detectado. ${dataRows.length} filas de datos.`);
    await crearBackup(sheets, spreadsheetId, sheetTitle, allData);

  } else if (a1 === '' && allSheetTitles.includes(backupName)) {
    // Migración parcial anterior: A1 vacío pero existe backup → retomar desde backup
    console.log(`  Migración parcial detectada. Retomando desde "${backupName}"...`);
    const backupResult = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${backupName}'!A2:Z`,
    });
    dataRows = backupResult.data.values || [];
    console.log(`  ${dataRows.length} filas recuperadas del backup.`);

  } else {
    console.log(`  Sin formato antiguo (A1="${a1}") — omitiendo.`);
    return;
  }

  await aplicarTemplate(sheets, spreadsheetId, sheetTitle, sheetId, dataRows);
  console.log(`  ✓ Migrado. Verificá y borrá "${backupName}" cuando estés conforme.`);
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
  const allTitles   = tabs.map((s) => s.properties.title);

  // Procesar solo pestañas que no son backups
  const tabsAMigrar = tabs.filter((s) => !s.properties.title.startsWith('BACKUP_'));

  console.log(`Pestañas a evaluar: ${tabsAMigrar.map((s) => s.properties.title).join(', ')}\n`);

  for (let i = 0; i < tabsAMigrar.length; i++) {
    const tab = tabsAMigrar[i];
    await migrateTab(sheets, spreadsheetId, tab.properties.title, tab.properties.sheetId, allTitles);

    // Pausa entre pestañas para no exceder la cuota de la API (60 escrituras/minuto)
    if (i < tabsAMigrar.length - 1) {
      console.log(`\n  Esperando 10 s antes de continuar...`);
      await sleep(10000);
    }
  }

  console.log('\n✓ Proceso completo.');
  console.log('  Verificá cada pestaña y borrá las pestañas BACKUP_ cuando estés conforme.');
}

main().catch((err) => {
  console.error('\nError:', err.message);
  process.exit(1);
});
