'use strict';
const PDFDocument = require('pdfkit');

// ─── Catálogo de productos SAG ────────────────────────────────────────────────
const PRODUCTOS_SAG = [
  { codigo: 1,   nombre: 'Aceituna' },    { codigo: 2,   nombre: 'Acelga' },
  { codigo: 3,   nombre: 'Achicoria' },   { codigo: 88,  nombre: 'Acusy' },
  { codigo: 5,   nombre: 'Ajo' },         { codigo: 4,   nombre: 'Ají' },
  { codigo: 6,   nombre: 'Albahaca' },    { codigo: 7,   nombre: 'Alcaucil' },
  { codigo: 103, nombre: 'Alcayota' },    { codigo: 83,  nombre: 'Alfalfa' },
  { codigo: 8,   nombre: 'Almendra' },    { codigo: 9,   nombre: 'Ananá' },
  { codigo: 10,  nombre: 'Apio' },        { codigo: 89,  nombre: 'Arándano' },
  { codigo: 85,  nombre: 'Aromáticas' },  { codigo: 11,  nombre: 'Arveja' },
  { codigo: 12,  nombre: 'Avellano' },    { codigo: 109, nombre: 'Babaco' },
  { codigo: 13,  nombre: 'Banana' },      { codigo: 14,  nombre: 'Batata' },
  { codigo: 15,  nombre: 'Berenjena' },   { codigo: 106, nombre: 'Bergamota' },
  { codigo: 16,  nombre: 'Berro' },       { codigo: 18,  nombre: 'Bruselas' },
  { codigo: 17,  nombre: 'Brócoli' },     { codigo: 92,  nombre: 'Carambola' },
  { codigo: 19,  nombre: 'Cardo' },       { codigo: 20,  nombre: 'Castaña' },
  { codigo: 21,  nombre: 'Cebolla' },     { codigo: 22,  nombre: 'Cebolla Verdeo' },
  { codigo: 23,  nombre: 'Cereza' },      { codigo: 24,  nombre: 'Champignon' },
  { codigo: 25,  nombre: 'Chauchas' },    { codigo: 26,  nombre: 'Chirimoya' },
  { codigo: 27,  nombre: 'Choclo' },      { codigo: 104, nombre: 'Cibullete' },
  { codigo: 93,  nombre: 'Cidra' },       { codigo: 102, nombre: 'Cilantro' },
  { codigo: 28,  nombre: 'Ciruela' },     { codigo: 86,  nombre: 'Coco' },
  { codigo: 29,  nombre: 'Coliflor' },    { codigo: 30,  nombre: 'Damasco' },
  { codigo: 31,  nombre: 'Durazno' },     { codigo: 32,  nombre: 'Echalote' },
  { codigo: 33,  nombre: 'Endivia' },     { codigo: 84,  nombre: 'Escarola' },
  { codigo: 34,  nombre: 'Espárrago' },   { codigo: 35,  nombre: 'Espinaca' },
  { codigo: 36,  nombre: 'Frambuesa' },   { codigo: 114, nombre: 'Frutas Finas' },
  { codigo: 37,  nombre: 'Frutillas' },   { codigo: 38,  nombre: 'Granada' },
  { codigo: 115, nombre: 'Guanábana' },   { codigo: 39,  nombre: 'Guayaba' },
  { codigo: 40,  nombre: 'Guinda' },      { codigo: 41,  nombre: 'Haba' },
  { codigo: 42,  nombre: 'Higo' },        { codigo: 43,  nombre: 'Hinojo' },
  { codigo: 44,  nombre: 'Kakí' },        { codigo: 45,  nombre: 'Kinoto' },
  { codigo: 46,  nombre: 'Kiwi' },        { codigo: 47,  nombre: 'Lechuga' },
  { codigo: 48,  nombre: 'Lima' },        { codigo: 49,  nombre: 'Limón' },
  { codigo: 50,  nombre: 'Litchi' },      { codigo: 94,  nombre: 'Lucuma' },
  { codigo: 110, nombre: 'Mamón' },       { codigo: 51,  nombre: 'Mandarina' },
  { codigo: 87,  nombre: 'Mandioca' },    { codigo: 52,  nombre: 'Mango' },
  { codigo: 53,  nombre: 'Manzana' },     { codigo: 96,  nombre: 'Maracuyá' },
  { codigo: 54,  nombre: 'Melón' },       { codigo: 55,  nombre: 'Membrillo' },
  { codigo: 105, nombre: 'Mineola' },     { codigo: 56,  nombre: 'Naranja' },
  { codigo: 57,  nombre: 'Níspero' },     { codigo: 101, nombre: 'Nabo' },
  { codigo: 58,  nombre: 'Nuez' },        { codigo: 59,  nombre: 'Palta' },
  { codigo: 60,  nombre: 'Papa' },        { codigo: 61,  nombre: 'Papaya' },
  { codigo: 108, nombre: 'Pasionaria' },  { codigo: 62,  nombre: 'Pelón' },
  { codigo: 63,  nombre: 'Pepino' },      { codigo: 111, nombre: 'Pepino Dulce' },
  { codigo: 64,  nombre: 'Pera' },        { codigo: 65,  nombre: 'Perejil' },
  { codigo: 66,  nombre: 'Pimiento' },    { codigo: 67,  nombre: 'Pomelo' },
  { codigo: 68,  nombre: 'Puerro' },      { codigo: 69,  nombre: 'Rabanito' },
  { codigo: 70,  nombre: 'Radicha' },     { codigo: 71,  nombre: 'Remolacha' },
  { codigo: 72,  nombre: 'Repollo' },     { codigo: 73,  nombre: 'Sandía' },
  { codigo: 82,  nombre: 'Soja' },        { codigo: 74,  nombre: 'Tomate Perita' },
  { codigo: 75,  nombre: 'Tomate Redondo' },{ codigo: 76, nombre: 'Tuna' },
  { codigo: 112, nombre: 'Uchuva' },      { codigo: 77,  nombre: 'Uva' },
  { codigo: 78,  nombre: 'Zanahoria' },   { codigo: 79,  nombre: 'Zapallito' },
  { codigo: 80,  nombre: 'Zapallo' },     { codigo: 81,  nombre: 'Zapallo Anquito' },
  { codigo: 107, nombre: 'Papa Semilla' },{ codigo: 95,  nombre: 'Cajones Vacíos' },
];

const PROVINCIAS_LISTA = [
  { cod: '06', nombre: 'Buenos Aires' },
  { cod: '02', nombre: 'Capital Federal' },
  { cod: '10', nombre: 'Catamarca' },
  { cod: '14', nombre: 'Córdoba' },
  { cod: '18', nombre: 'Corrientes' },
  { cod: '22', nombre: 'Chaco' },
  { cod: '26', nombre: 'Chubut' },
  { cod: '30', nombre: 'Entre Ríos' },
  { cod: '34', nombre: 'Formosa' },
  { cod: '38', nombre: 'Jujuy' },
  { cod: '42', nombre: 'La Pampa' },
  { cod: '46', nombre: 'La Rioja' },
  { cod: '50', nombre: 'Mendoza' },
  { cod: '54', nombre: 'Misiones' },
  { cod: '58', nombre: 'Neuquén' },
  { cod: '62', nombre: 'Río Negro' },
  { cod: '66', nombre: 'Salta' },
  { cod: '70', nombre: 'San Juan' },
  { cod: '74', nombre: 'San Luis' },
  { cod: '78', nombre: 'Santa Cruz' },
  { cod: '82', nombre: 'Santa Fe' },
  { cod: '86', nombre: 'Santiago del Estero' },
  { cod: '94', nombre: 'Tierra del Fuego' },
  { cod: '90', nombre: 'Tucumán' },
];

const PROVINCIAS_MAP = {};
PROVINCIAS_LISTA.forEach(p => { PROVINCIAS_MAP[p.cod] = p.nombre; });

const LOCALIDADES_SJ = [
  { cod: '01', nombre: 'Capital' },
  { cod: '02', nombre: 'Rivadavia' },
  { cod: '03', nombre: 'Santa Lucía' },
  { cod: '04', nombre: 'Rawson' },
  { cod: '05', nombre: 'Pocito' },
  { cod: '06', nombre: 'Zonda' },
  { cod: '07', nombre: 'Ullúm' },
  { cod: '08', nombre: 'Chimbas' },
  { cod: '09', nombre: '9 de Julio' },
  { cod: '10', nombre: 'Albardón' },
  { cod: '11', nombre: 'Angaco' },
  { cod: '12', nombre: 'San Martín' },
  { cod: '13', nombre: 'Caucete' },
  { cod: '14', nombre: '25 de Mayo' },
  { cod: '15', nombre: 'Sarmiento' },
  { cod: '16', nombre: 'Calingasta' },
  { cod: '17', nombre: 'Iglesia' },
  { cod: '18', nombre: 'Jáchal' },
  { cod: '19', nombre: 'Valle Fértil' },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function parseFecha(dt) {
  return dt ? new Date(dt) : new Date();
}

const TZ = 'America/Argentina/San_Juan';

function fmtDia(dt)  {
  return Number(parseFecha(dt).toLocaleDateString('es-AR', { day: 'numeric', timeZone: TZ }));
}
function fmtMes(dt)  {
  return parseFecha(dt).toLocaleDateString('es-AR', { month: 'long', timeZone: TZ });
}
function fmtAnio(dt) {
  return Number(parseFecha(dt).toLocaleDateString('es-AR', { year: 'numeric', timeZone: TZ }));
}
function fmtHora(dt) {
  return parseFecha(dt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
}
function fmtFecha(dt) {
  return parseFecha(dt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ });
}

function provinciaLabel(cod) {
  if (!cod) return '';
  return PROVINCIAS_MAP[cod] || cod;
}
function localidadSJLabel(cod) {
  if (!cod) return '';
  const found = LOCALIDADES_SJ.find(l => l.cod === cod);
  return found ? found.nombre : cod;
}

// línea punteada horizontal
function dotLine(doc, x1, y, x2) {
  doc.moveTo(x1, y).lineTo(x2, y)
    .strokeColor('#999999').lineWidth(0.4).dash(1, { space: 2 }).stroke();
  doc.undash();
}

// línea sólida horizontal
function line(doc, x1, y, x2, w = 0.5, color = '#000000') {
  doc.moveTo(x1, y).lineTo(x2, y).strokeColor(color).lineWidth(w).undash().stroke();
}

// rectángulo vacío (casilla de tick)
function checkbox(doc, x, y, size = 9) {
  doc.rect(x, y, size, size).strokeColor('#000000').lineWidth(0.6).undash().stroke();
}

// tilde dentro de la casilla si activo
function checkboxTick(doc, x, y, size = 9) {
  checkbox(doc, x, y, size);
  doc.fill('#000000').font('Helvetica-Bold').fontSize(size - 1)
    .text('X', x + 1, y + 0.5, { width: size - 2, align: 'center', lineBreak: false });
}

// texto con guiones si está vacío
function val(v) { return v && String(v).trim() ? String(v).trim() : ''; }

// ─── Página 1: Acta Fitozoosanitaria (Serie 20) ───────────────────────────────
function dibujarActa(doc, ing) {
  const ML = 38, MR = 558, PW = MR - ML;
  let y = 28;

  // ── Logo / título ────────────────────────────────────────────────────────────
  // Escudo San Juan (simplificado como cuadrado decorativo)
  doc.rect(ML, y, 28, 28).strokeColor('#000').lineWidth(1).stroke();
  doc.fill('#000').font('Helvetica-Bold').fontSize(7)
    .text('SAN\nJUAN', ML + 2, y + 7, { width: 24, align: 'center', lineBreak: true });

  doc.fill('#000').font('Helvetica-Bold').fontSize(8)
    .text('San Juan', ML + 34, y + 2);
  doc.fill('#444').font('Helvetica').fontSize(7)
    .text('Gobierno', ML + 34, y + 13);

  doc.fill('#000').font('Helvetica-Bold').fontSize(14)
    .text('BARRERAS FITOZOOSANITARIAS', ML + 34, y + 24, { width: 280 });

  // Serie y número (derecha)
  const numStr = val(ing.numero) || '—';
  doc.fill('#000').font('Helvetica').fontSize(8)
    .text(`Serie 20  N° ${numStr}`, MR - 160, y + 4, { width: 160, align: 'right' });

  y += 52;

  // ── Checkboxes tipo de acta (derecha) ────────────────────────────────────────
  const tipos = [
    { key: 'inspeccion',  label: 'Acta de INSPECCIÓN' },
    { key: 'rechazo',     label: 'Acta de RECHAZO' },
    { key: 'decomiso',    label: 'Acta de DECOMISO' },
    { key: 'infraccion',  label: 'Acta de INFRACCIÓN' },
    { key: 'constatacion',label: 'Acta de CONSTATACIÓN' },
  ];
  const chkX = MR - 140, chkBoxX = MR - 18;
  tipos.forEach((t, i) => {
    const cy = y + i * 14;
    doc.fill('#000').font('Helvetica').fontSize(7.5)
      .text(t.label, chkX, cy + 1, { width: 118, align: 'right', lineBreak: false });
    if (ing.actaTipo === t.key) checkboxTick(doc, chkBoxX, cy, 9);
    else checkbox(doc, chkBoxX, cy, 9);
  });

  // ── CONTROL ──────────────────────────────────────────────────────────────────
  doc.fill('#000').font('Helvetica').fontSize(8)
    .text('CONTROL', ML, y + 5, { lineBreak: false });
  const ctrlVal = val(ing.actaControl);
  dotLine(doc, ML + 50, y + 13, chkX - 10);
  if (ctrlVal) {
    doc.fill('#000').font('Helvetica').fontSize(8)
      .text(ctrlVal, ML + 52, y + 5, { width: chkX - ML - 65, lineBreak: false });
  }

  y += 80; // espacio para los 5 checkboxes (5 * 14 = 70) + margen

  // ── Texto narrativo ──────────────────────────────────────────────────────────
  const proseW = PW - 160; // deja espacio para checkboxes a la derecha

  function span(doc, label, value, opts = {}) {
    // imprime label en gris y value en negro, en línea
    if (label) {
      doc.fill('#555').font('Helvetica').fontSize(9)
        .text(label + ' ', { continued: true, ...opts });
    }
    const v = val(value);
    doc.fill('#000').font('Helvetica-Bold').fontSize(9)
      .text(v || '_______________________', { continued: true });
  }

  // Para el texto narrativo usamos text chunks con continued:true
  const d = parseFecha(ing.fechaHora);
  const localidad   = val(ing.localidad)             || '_____________________';
  const depto       = val(ing.departamento)           || '_____________________';
  const prov        = val(ing.provincia)              || '_____________________';
  const inspector   = val(ing.inspectorNombre)        || '_____________________';
  const nombre      = val(ing.interesadoNombre)       || '_____________________';
  const dni         = val(ing.interesadoDni)          || '_______________';
  const domicilio   = val(ing.interesadoDomicilio)    || '_____________________';
  const localInt    = val(ing.interesadoLocalidad)    || '_____________________';
  const provInt     = val(ing.interesadoProvincia)    || '_____________________';
  const vehiculo    = val(ing.vehiculo)               || '___________________________';
  const chasis      = val(ing.chasis)                 || '_______________';
  const acoplado    = val(ing.acoplado)               || '_______________';
  const procedente  = val(ing.procedenteDe)           || '_______________';
  const destino     = val(ing.destino)                || '_______________';
  const horaTxt     = fmtHora(ing.fechaHora);
  const diaTxt      = fmtDia(ing.fechaHora);
  const mesTxt      = fmtMes(ing.fechaHora);
  const anioTxt     = fmtAnio(ing.fechaHora);

  // Texto completo (un solo bloque para que fluya naturalmente)
  const proseText =
    `En la localidad de ${localidad}, Departamento ${depto}, Provincia de ${prov}, a los ${diaTxt} días del mes de ${mesTxt} del año ${anioTxt}, siendo las ${horaTxt} horas, los inspectores de PROCEM San Juan ${inspector} se constituyen en ______________________ propiedad de ______________________, siendo atendidos por ______________________ en su carácter de ______________________, proceden a confeccionar LA PRESENTE ACTA al Señor ${nombre}, D.N.I. ${dni}, Domicilio particular, sito en calle ${domicilio}, N° ______, Localidad de ${localInt}, Provincia de ${provInt}, Quien conduce el vehículo ${vehiculo}, chasis N° ${chasis}, acoplado N° ${acoplado}, procedente de ${procedente} con destino ${destino}.`;

  doc.fill('#000').font('Helvetica').fontSize(9)
    .text(proseText, ML, y, { width: PW, lineBreak: true, lineGap: 3 });

  y += doc.heightOfString(proseText, { width: PW, lineGap: 3 }) + 14;

  // ── "El Señor Declara" ────────────────────────────────────────────────────────
  doc.fill('#000').font('Helvetica').fontSize(9)
    .text('El Señor Declara', ML, y, { lineBreak: false });
  y += 16;

  const declTxt = val(ing.declaracion);
  if (declTxt) {
    doc.fill('#000').font('Helvetica').fontSize(9)
      .text(declTxt, ML, y, { width: PW, lineBreak: true, lineGap: 3 });
    y += doc.heightOfString(declTxt, { width: PW, lineGap: 3 }) + 8;
  }

  // Líneas punteadas para el resto del espacio disponible hasta las firmas
  const FIRMAS_Y = 790;
  while (y + 14 < FIRMAS_Y) {
    dotLine(doc, ML, y, MR);
    y += 14;
  }

  // ── Firmas ───────────────────────────────────────────────────────────────────
  const fw = 145, gap = 20;
  const fx = [ML, ML + fw + gap, ML + (fw + gap) * 2];
  const fLabels = ['FIRMA INSPECTOR', 'FIRMA INSPECTOR', 'FIRMA INTERESADO'];
  fx.forEach((x, i) => {
    line(doc, x, FIRMAS_Y, x + fw);
    doc.fill('#555').font('Helvetica').fontSize(7)
      .text(fLabels[i], x, FIRMAS_Y + 3, { width: fw, align: 'center', lineBreak: false });
  });
}

// ─── Página 2: Declaración Jurada de Productos Vegetales (Serie 23) LANDSCAPE ─
function dibujarDeclaracion(doc, ing) {
  const PAGE_W = 842;     // A4 landscape
  const ML = 8;
  const REF_W = 90;       // columna de referencia derecha (provincias + localidades)
  const GRID_RIGHT = PAGE_W - REF_W - 4;
  const GRID_W = GRID_RIGHT - ML;

  let y = 8;

  // ── Header ───────────────────────────────────────────────────────────────────
  // Borde superior del header
  doc.rect(ML, y, GRID_W, 48).strokeColor('#000').lineWidth(0.5).stroke();

  // Izquierda: SAG y A. / título / resolución
  doc.fill('#000').font('Helvetica-Bold').fontSize(7.5)
    .text('S.A.G. y A. SAN JUAN', ML + 4, y + 4);
  doc.fill('#000').font('Helvetica-Bold').fontSize(8.5)
    .text('DECLARACIÓN JURADA DE PRODUCTOS VEGETALES', ML + 4, y + 14, { width: GRID_W * 0.65 });
  doc.fill('#000').font('Helvetica').fontSize(6.5)
    .text('RESOLUCIÓN N° 281-SAG-99', ML + 4, y + 34);

  // Centro: Fecha / Hora / Control
  const centerX = ML + GRID_W * 0.42;
  doc.fill('#555').font('Helvetica').fontSize(6.5)
    .text('FECHA', centerX, y + 4, { lineBreak: false });
  doc.fill('#000').font('Helvetica').fontSize(7)
    .text(fmtFecha(ing.fechaHora), centerX + 28, y + 4, { lineBreak: false });
  doc.fill('#555').font('Helvetica').fontSize(6.5)
    .text('HORA', centerX, y + 15, { lineBreak: false });
  doc.fill('#000').font('Helvetica').fontSize(7)
    .text(fmtHora(ing.fechaHora), centerX + 28, y + 15, { lineBreak: false });
  doc.fill('#555').font('Helvetica').fontSize(6.5)
    .text('CONTROL', centerX, y + 26, { lineBreak: false });
  doc.fill('#000').font('Helvetica').fontSize(7)
    .text(val(ing.actaControl) || '', centerX + 37, y + 26, { lineBreak: false });

  // Derecha: ENTRADA-SALIDA / SERIE 23
  const rightX = ML + GRID_W * 0.75;
  doc.fill('#555').font('Helvetica').fontSize(6)
    .text('ENTRADA - SALIDA', rightX, y + 4, { width: GRID_W * 0.24, align: 'center' });
  doc.fill('#000').font('Helvetica-Bold').fontSize(8)
    .text(`SERIE 23  N°${val(ing.numero) || '—'}`, rightX, y + 15, { width: GRID_W * 0.24, align: 'center' });

  y += 52;

  // ── Remitente / Destinatario ─────────────────────────────────────────────────
  const halfW = GRID_W / 2 - 2;
  const destX = ML + halfW + 4;

  // Bordes de la sección
  doc.rect(ML, y, halfW, 40).strokeColor('#000').lineWidth(0.4).stroke();
  doc.rect(destX, y, halfW, 40).strokeColor('#000').lineWidth(0.4).stroke();

  function infoRow(label, value, x, ry, w) {
    doc.fill('#555').font('Helvetica').fontSize(6).text(label, x + 2, ry + 1, { lineBreak: false });
    doc.fill('#000').font('Helvetica').fontSize(7)
      .text(val(value) || '', x + 2, ry + 9, { width: w - 4, lineBreak: false });
    dotLine(doc, x + 2, ry + 17, x + w - 2);
  }

  // REMITENTE
  doc.fill('#000').font('Helvetica-Bold').fontSize(6.5).text('REMITENTE:', ML + 2, y + 1);
  doc.fill('#000').font('Helvetica').fontSize(7).text(val(ing.remitenteNombre) || '', ML + 2, y + 9, { width: halfW * 0.6 - 4 });
  dotLine(doc, ML + 2, y + 17, ML + halfW * 0.6 - 2);

  doc.fill('#555').font('Helvetica').fontSize(6).text('LOCALIDAD:', ML + 2, y + 19);
  doc.fill('#000').font('Helvetica').fontSize(7).text(
    localidadSJLabel(val(ing.remitenteLocalidadCod)) || val(ing.remitenteLocalidadCod) || '',
    ML + 2, y + 27, { width: halfW * 0.55 - 4 }
  );
  dotLine(doc, ML + 2, y + 35, ML + halfW * 0.55 - 2);

  // Código + Provincia (remitente)
  const codRX = ML + halfW * 0.6;
  doc.fill('#555').font('Helvetica').fontSize(6).text('CÓDIGO', codRX, y + 1);
  doc.rect(codRX, y + 8, 22, 10).strokeColor('#000').lineWidth(0.4).stroke();
  doc.fill('#000').font('Helvetica').fontSize(7)
    .text(val(ing.remitenteLocalidadCod) || '', codRX + 1, y + 10, { width: 20, align: 'center' });

  doc.fill('#555').font('Helvetica').fontSize(6).text('PROVINCIA:', codRX, y + 20);
  doc.fill('#000').font('Helvetica').fontSize(7)
    .text(provinciaLabel(val(ing.remitenteProvinciaCod)) || '', codRX, y + 28, { width: halfW - (codRX - ML) - 4 });

  doc.fill('#555').font('Helvetica').fontSize(6).text('N° C.U.I.T.', ML + halfW * 0.6 + 30, y + 1);
  doc.fill('#000').font('Helvetica').fontSize(7)
    .text(val(ing.remitenteCuit) || '', ML + halfW * 0.6 + 30, y + 9, { width: halfW - (halfW * 0.6 + 30) - 4 });

  // DESTINATARIO
  doc.fill('#000').font('Helvetica-Bold').fontSize(6.5).text('DESTINATARIO:', destX + 2, y + 1);
  doc.fill('#000').font('Helvetica').fontSize(7)
    .text(val(ing.destinatarioNombre) || '', destX + 2, y + 9, { width: halfW * 0.55 - 4 });
  dotLine(doc, destX + 2, y + 17, destX + halfW * 0.55 - 2);

  const codDX = destX + halfW * 0.55;
  doc.fill('#555').font('Helvetica').fontSize(6).text('LOCALIDAD:', destX + 2, y + 19);
  doc.fill('#000').font('Helvetica').fontSize(7)
    .text(localidadSJLabel(val(ing.destinatarioLocalidadCod)) || val(ing.destinatarioLocalidadCod) || '',
      destX + 2, y + 27, { width: halfW * 0.5 - 4 });
  dotLine(doc, destX + 2, y + 35, destX + halfW * 0.5 - 2);

  doc.fill('#555').font('Helvetica').fontSize(6).text('CÓDIGO', codDX, y + 1);
  doc.rect(codDX, y + 8, 22, 10).strokeColor('#000').lineWidth(0.4).stroke();
  doc.fill('#000').font('Helvetica').fontSize(7)
    .text(val(ing.destinatarioLocalidadCod) || '', codDX + 1, y + 10, { width: 20, align: 'center' });

  doc.fill('#555').font('Helvetica').fontSize(6).text('PROVINCIA:', codDX + 26, y + 1);
  doc.fill('#000').font('Helvetica').fontSize(7)
    .text(provinciaLabel(val(ing.destinatarioProvinciaCod)) || '',
      codDX + 26, y + 9, { width: halfW - (codDX - destX) - 30 - 4 });

  doc.fill('#555').font('Helvetica').fontSize(6).text('N° C.U.I.T.', codDX + 26, y + 20);
  doc.fill('#000').font('Helvetica').fontSize(7)
    .text(val(ing.destinatarioCuit) || '', codDX + 26, y + 28, { width: halfW - (codDX - destX) - 30 - 4 });

  y += 44;

  // ── Tipo de destino ───────────────────────────────────────────────────────────
  doc.rect(ML, y, GRID_W, 14).strokeColor('#000').lineWidth(0.4).stroke();
  const tiposD = [
    { key: 'industria',  label: 'Industria' },
    { key: 'exportacion',label: 'Exportación' },
    { key: 'transito',   label: 'Tránsito' },
  ];
  doc.fill('#555').font('Helvetica').fontSize(6.5).text('Tipo destino:', ML + 4, y + 4, { lineBreak: false });
  let tdx = ML + 65;
  tiposD.forEach(t => {
    const act = ing.destinoTipo === t.key;
    if (act) checkboxTick(doc, tdx, y + 3, 8);
    else checkbox(doc, tdx, y + 3, 8);
    doc.fill('#000').font('Helvetica').fontSize(6.5).text(t.label, tdx + 10, y + 4, { lineBreak: false });
    tdx += t.label.length * 4.5 + 18;
  });

  y += 18;

  // ── Grilla de productos ───────────────────────────────────────────────────────
  const N = PRODUCTOS_SAG.length;
  const PER_COL = Math.ceil(N / 3);
  const COL_W = Math.floor(GRID_W / 3);

  // Anchos de sub-columnas dentro de cada columna de productos
  // PRODUCTO | CÓD | BULTOS | KG/B | KG TOT
  const SW = [
    COL_W * 0.43, // producto
    COL_W * 0.12, // código
    COL_W * 0.15, // bultos
    COL_W * 0.15, // kg/bulto
    COL_W * 0.15, // kg total
  ];

  const ROW_H = 8.8;
  const HDR_H = 12;

  // Encabezados de las 3 columnas
  const HDRS = ['PRODUCTO', 'CÓDIGO', 'CANT.\nBULTOS', 'Kg.\nBULTO', 'Kg.\nTOTALES'];
  for (let col = 0; col < 3; col++) {
    const cx = ML + col * COL_W;
    // borde columna
    doc.rect(cx, y, COL_W, HDR_H + PER_COL * ROW_H + ROW_H + 2)
      .strokeColor('#000').lineWidth(0.4).stroke();
    // encabezados sub-columnas
    let sx = cx;
    HDRS.forEach((h, hi) => {
      doc.fill('#000').font('Helvetica-Bold').fontSize(5.5)
        .text(h, sx + 1, y + 1, { width: SW[hi] - 1, align: hi === 0 ? 'left' : 'center', lineBreak: true });
      if (hi < HDRS.length - 1) {
        line(doc, sx + SW[hi], y, sx + SW[hi], 0.3, '#ccc'); // separador vertical
      }
      sx += SW[hi];
    });
    // línea bajo encabezado
    line(doc, cx, y + HDR_H, cx + COL_W, 0.5);
  }
  y += HDR_H;

  // Mapa de productos declarados
  const pmap = {};
  (ing.productos || []).forEach(p => { pmap[Number(p.codigo)] = p; });

  // Filas de productos
  for (let row = 0; row < PER_COL; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = col * PER_COL + row;
      if (idx >= N) continue;
      const prod = PRODUCTOS_SAG[idx];
      const dec  = pmap[prod.codigo];
      const cx   = ML + col * COL_W;
      const ry   = y + row * ROW_H;
      const isDec = Boolean(dec);
      const txtCol = isDec ? '#000000' : '#aaaaaa';

      doc.fill(txtCol).font('Helvetica').fontSize(5.8)
        .text(prod.nombre, cx + 1, ry + 1.5, { width: SW[0] - 1, lineBreak: false });

      doc.fill(isDec ? '#444444' : '#cccccc').font('Helvetica').fontSize(5.8)
        .text(String(prod.codigo), cx + SW[0] + 1, ry + 1.5, { width: SW[1] - 2, align: 'right', lineBreak: false });

      if (isDec) {
        doc.fill('#000').font('Helvetica-Bold').fontSize(6)
          .text(String(dec.cant_bultos ?? ''), cx + SW[0] + SW[1] + 1, ry + 1.5, { width: SW[2] - 2, align: 'right', lineBreak: false });
        doc.fill('#000').font('Helvetica-Bold').fontSize(6)
          .text(String(dec.kg_bulto ?? ''), cx + SW[0] + SW[1] + SW[2] + 1, ry + 1.5, { width: SW[3] - 2, align: 'right', lineBreak: false });
        const kgt = dec.kg_totales ?? (dec.cant_bultos && dec.kg_bulto ? (Number(dec.cant_bultos) * Number(dec.kg_bulto)).toFixed(1) : '');
        doc.fill('#000').font('Helvetica-Bold').fontSize(6)
          .text(String(kgt), cx + SW[0] + SW[1] + SW[2] + SW[3] + 1, ry + 1.5, { width: SW[4] - 2, align: 'right', lineBreak: false });
      } else {
        // tachado en gris claro
        const midY = ry + ROW_H / 2;
        doc.moveTo(cx + 1, midY).lineTo(cx + COL_W - 1, midY)
          .strokeColor('#dddddd').lineWidth(0.3).stroke();
      }

      // separador horizontal entre filas
      if (row < PER_COL - 1) {
        line(doc, cx, ry + ROW_H, cx + COL_W, 0.2, '#dddddd');
      }
    }
  }

  // SUBTOTAL KGS
  const subtotalY = y + PER_COL * ROW_H;
  const totBultos = (ing.productos || []).reduce((s, p) => s + Number(p.cant_bultos || 0), 0);
  const totKg     = (ing.productos || []).reduce((s, p) => s + Number(p.kg_totales  || 0), 0);
  for (let col = 0; col < 3; col++) {
    const cx = ML + col * COL_W;
    line(doc, cx, subtotalY, cx + COL_W, 0.6);
    doc.fill('#000').font('Helvetica-Bold').fontSize(6)
      .text('SUBTOTAL KGS.', cx + 2, subtotalY + 2, { width: COL_W - 4, lineBreak: false });
    if (col === 2) {
      doc.fill('#000').font('Helvetica-Bold').fontSize(6.5)
        .text(`${totBultos} bultos  —  ${totKg.toFixed(1)} Kg`, cx + 2, subtotalY + 2, { width: COL_W - 4, align: 'right', lineBreak: false });
    }
  }

  y = subtotalY + 14;

  // ── Columna de referencia (derecha) ──────────────────────────────────────────
  const refX  = GRID_RIGHT + 4;
  const refY0 = 8;

  // Provincias
  doc.rect(refX, refY0, REF_W - 2, 10).fillAndStroke('#000000', '#000000');
  doc.fill('#ffffff').font('Helvetica-Bold').fontSize(5.5)
    .text('CÓDIGO DE PROVINCIAS', refX + 1, refY0 + 2, { width: REF_W - 4, align: 'center', lineBreak: false });

  let ry = refY0 + 11;
  PROVINCIAS_LISTA.forEach(p => {
    doc.fill('#000').font('Helvetica').fontSize(5)
      .text(`${p.cod}  ${p.nombre}`, refX + 2, ry, { width: REF_W - 4, lineBreak: false });
    ry += 7.5;
  });

  ry += 4;
  doc.rect(refX, ry, REF_W - 2, 10).fillAndStroke('#000000', '#000000');
  doc.fill('#ffffff').font('Helvetica-Bold').fontSize(5.5)
    .text('CÓDIGO DE LOCALIDADES\nDE SAN JUAN', refX + 1, ry + 1, { width: REF_W - 4, align: 'center', lineBreak: true });

  ry += 12;
  LOCALIDADES_SJ.forEach(l => {
    doc.fill('#000').font('Helvetica').fontSize(5)
      .text(`${l.cod}  ${l.nombre}`, refX + 2, ry, { width: REF_W - 4, lineBreak: false });
    ry += 7.5;
  });

  // ── Transporte ────────────────────────────────────────────────────────────────
  doc.rect(ML, y, GRID_W, 24).strokeColor('#000').lineWidth(0.4).stroke();

  doc.fill('#555').font('Helvetica').fontSize(5.8).text('EMPRESA DE TRANSPORTE', ML + 2, y + 1);
  doc.fill('#000').font('Helvetica').fontSize(7)
    .text(val(ing.transporteEmpresa) || '', ML + 2, y + 9, { width: GRID_W * 0.35 - 4, lineBreak: false });
  dotLine(doc, ML + 2, y + 17, ML + GRID_W * 0.35 - 2);

  const tr2x = ML + GRID_W * 0.35;
  doc.fill('#555').font('Helvetica').fontSize(5.8).text('CUIT TRANSPORTISTA', tr2x + 2, y + 1);
  doc.fill('#000').font('Helvetica').fontSize(7)
    .text(val(ing.transporteCuit) || '', tr2x + 2, y + 9, { width: GRID_W * 0.2 - 4, lineBreak: false });
  dotLine(doc, tr2x + 2, y + 17, tr2x + GRID_W * 0.2 - 2);

  const tr3x = ML + GRID_W * 0.55;
  doc.fill('#555').font('Helvetica').fontSize(5.8).text('PATENTE CAMIÓN', tr3x + 2, y + 1);
  doc.fill('#000').font('Helvetica').fontSize(7)
    .text(val(ing.transportePatente) || '', tr3x + 2, y + 9, { width: GRID_W * 0.22 - 4, lineBreak: false });
  dotLine(doc, tr3x + 2, y + 17, tr3x + GRID_W * 0.22 - 2);

  const tr4x = ML + GRID_W * 0.77;
  doc.fill('#555').font('Helvetica').fontSize(5.8).text('ACOPLADO', tr4x + 2, y + 1);
  doc.fill('#000').font('Helvetica').fontSize(7)
    .text(val(ing.transporteAcoplado) || '', tr4x + 2, y + 9, { width: GRID_W * 0.23 - 4, lineBreak: false });
  dotLine(doc, tr4x + 2, y + 17, ML + GRID_W - 2);

  y += 28;

  // ── Firmas ───────────────────────────────────────────────────────────────────
  doc.rect(ML, y, GRID_W, 30).strokeColor('#000').lineWidth(0.4).stroke();
  const sigW3 = GRID_W / 3;
  const sigLabels = ['FIRMA RESPONSABLE', 'INSPECTOR', 'FIRMA Y SELLO'];
  sigLabels.forEach((lbl, i) => {
    const sx = ML + i * sigW3;
    if (i > 0) line(doc, sx, y, sx, 0.4, '#000'); // separador vertical
    doc.fill('#555').font('Helvetica').fontSize(6)
      .text(lbl, sx + 2, y + 4, { width: sigW3 - 4, align: 'center', lineBreak: false });
    // línea firma
    line(doc, sx + 10, y + 22, sx + sigW3 - 10, 0.5);
  });

  y += 34;

  // ── Inspector / licencia / sello ──────────────────────────────────────────────
  doc.rect(ML, y, GRID_W, 18).strokeColor('#000').lineWidth(0.4).stroke();
  const leg4 = GRID_W / 4;
  const insLabels = ['INSPECTOR', 'ACLARACIÓN NOMBRE Y APELLIDO', 'LICENCIA DE CONDUCIR', 'FIRMA Y SELLO'];
  const insVals   = [val(ing.inspectorNombre), val(ing.interesadoNombre), val(ing.transporteLicencia), ''];
  insLabels.forEach((lbl, i) => {
    const sx = ML + i * leg4;
    if (i > 0) line(doc, sx, y, sx, 0.4, '#000');
    doc.fill('#555').font('Helvetica').fontSize(5.5)
      .text(lbl, sx + 2, y + 1, { width: leg4 - 4, align: 'center', lineBreak: false });
    if (insVals[i]) {
      doc.fill('#000').font('Helvetica').fontSize(6.5)
        .text(insVals[i], sx + 2, y + 9, { width: leg4 - 4, align: 'center', lineBreak: false });
    } else {
      dotLine(doc, sx + 4, y + 14, sx + leg4 - 4);
    }
  });
}

// ─── Exportado principal ──────────────────────────────────────────────────────
async function generarPdfIngreso(ingreso) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: { Title: ingreso.numero || 'Acta de Ingreso', Author: 'SAVEAN — Agencia Calidad San Juan' },
    });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Página 1 — Acta Fitozoosanitaria (Serie 20)
    dibujarActa(doc, ingreso);

    // Página 2 — Declaración Jurada (Serie 23) en landscape
    doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 });
    dibujarDeclaracion(doc, ingreso);

    doc.end();
  });
}

module.exports = { generarPdfIngreso, PRODUCTOS_SAG };
