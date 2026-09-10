const PDFDocument = require('pdfkit');

// Catálogo completo de productos SAG (código → nombre)
const PRODUCTOS_SAG = [
  { codigo: 1,   nombre: 'Aceituna' },
  { codigo: 2,   nombre: 'Acelga' },
  { codigo: 3,   nombre: 'Achicoria' },
  { codigo: 88,  nombre: 'Acusy' },
  { codigo: 5,   nombre: 'Ajo' },
  { codigo: 4,   nombre: 'Ají' },
  { codigo: 6,   nombre: 'Albahaca' },
  { codigo: 7,   nombre: 'Alcaucil' },
  { codigo: 103, nombre: 'Alcayota' },
  { codigo: 83,  nombre: 'Alfalfa' },
  { codigo: 8,   nombre: 'Almendra' },
  { codigo: 9,   nombre: 'Ananá' },
  { codigo: 10,  nombre: 'Apio' },
  { codigo: 89,  nombre: 'Arándano' },
  { codigo: 85,  nombre: 'Aromáticas' },
  { codigo: 11,  nombre: 'Arveja' },
  { codigo: 12,  nombre: 'Avellano' },
  { codigo: 109, nombre: 'Babaco' },
  { codigo: 13,  nombre: 'Banana' },
  { codigo: 14,  nombre: 'Batata' },
  { codigo: 15,  nombre: 'Berenjena' },
  { codigo: 106, nombre: 'Bergamota' },
  { codigo: 16,  nombre: 'Berro' },
  { codigo: 18,  nombre: 'Bruselas' },
  { codigo: 17,  nombre: 'Brócoli' },
  { codigo: 92,  nombre: 'Carambola' },
  { codigo: 19,  nombre: 'Cardo' },
  { codigo: 20,  nombre: 'Castaña' },
  { codigo: 21,  nombre: 'Cebolla' },
  { codigo: 22,  nombre: 'Cebolla Verdeo' },
  { codigo: 23,  nombre: 'Cereza' },
  { codigo: 24,  nombre: 'Champignon' },
  { codigo: 25,  nombre: 'Chauchas' },
  { codigo: 26,  nombre: 'Chirimoya' },
  { codigo: 27,  nombre: 'Choclo' },
  { codigo: 104, nombre: 'Cibullete' },
  { codigo: 93,  nombre: 'Cidra' },
  { codigo: 102, nombre: 'Cilantro' },
  { codigo: 28,  nombre: 'Ciruela' },
  { codigo: 86,  nombre: 'Coco' },
  { codigo: 29,  nombre: 'Coliflor' },
  { codigo: 30,  nombre: 'Damasco' },
  { codigo: 31,  nombre: 'Durazno' },
  { codigo: 32,  nombre: 'Echalote' },
  { codigo: 33,  nombre: 'Endivia' },
  { codigo: 84,  nombre: 'Escarola' },
  { codigo: 34,  nombre: 'Espárrago' },
  { codigo: 35,  nombre: 'Espinaca' },
  { codigo: 36,  nombre: 'Frambuesa' },
  { codigo: 114, nombre: 'Frutas Finas' },
  { codigo: 37,  nombre: 'Frutillas' },
  { codigo: 38,  nombre: 'Granada' },
  { codigo: 115, nombre: 'Guanábana' },
  { codigo: 39,  nombre: 'Guayaba' },
  { codigo: 40,  nombre: 'Guinda' },
  { codigo: 41,  nombre: 'Haba' },
  { codigo: 42,  nombre: 'Higo' },
  { codigo: 43,  nombre: 'Hinojo' },
  { codigo: 44,  nombre: 'Kakí' },
  { codigo: 45,  nombre: 'Kinoto' },
  { codigo: 46,  nombre: 'Kiwi' },
  { codigo: 47,  nombre: 'Lechuga' },
  { codigo: 48,  nombre: 'Lima' },
  { codigo: 49,  nombre: 'Limón' },
  { codigo: 50,  nombre: 'Litchi' },
  { codigo: 94,  nombre: 'Lucuma' },
  { codigo: 110, nombre: 'Mamón' },
  { codigo: 51,  nombre: 'Mandarina' },
  { codigo: 87,  nombre: 'Mandioca' },
  { codigo: 52,  nombre: 'Mango' },
  { codigo: 53,  nombre: 'Manzana' },
  { codigo: 96,  nombre: 'Maracuyá' },
  { codigo: 54,  nombre: 'Melón' },
  { codigo: 55,  nombre: 'Membrillo' },
  { codigo: 105, nombre: 'Mineola' },
  { codigo: 56,  nombre: 'Naranja' },
  { codigo: 57,  nombre: 'Níspero' },
  { codigo: 101, nombre: 'Nabo' },
  { codigo: 58,  nombre: 'Nuez' },
  { codigo: 59,  nombre: 'Palta' },
  { codigo: 60,  nombre: 'Papa' },
  { codigo: 61,  nombre: 'Papaya' },
  { codigo: 108, nombre: 'Pasionaria' },
  { codigo: 62,  nombre: 'Pelón' },
  { codigo: 63,  nombre: 'Pepino' },
  { codigo: 111, nombre: 'Pepino Dulce' },
  { codigo: 64,  nombre: 'Pera' },
  { codigo: 65,  nombre: 'Perejil' },
  { codigo: 66,  nombre: 'Pimiento' },
  { codigo: 67,  nombre: 'Pomelo' },
  { codigo: 68,  nombre: 'Puerro' },
  { codigo: 69,  nombre: 'Rabanito' },
  { codigo: 70,  nombre: 'Radicha' },
  { codigo: 71,  nombre: 'Remolacha' },
  { codigo: 72,  nombre: 'Repollo' },
  { codigo: 73,  nombre: 'Sandía' },
  { codigo: 82,  nombre: 'Soja' },
  { codigo: 74,  nombre: 'Tomate Perita' },
  { codigo: 75,  nombre: 'Tomate Redondo' },
  { codigo: 76,  nombre: 'Tuna' },
  { codigo: 112, nombre: 'Uchuva' },
  { codigo: 77,  nombre: 'Uva' },
  { codigo: 78,  nombre: 'Zanahoria' },
  { codigo: 79,  nombre: 'Zapallito' },
  { codigo: 80,  nombre: 'Zapallo' },
  { codigo: 81,  nombre: 'Zapallo Anquito' },
  { codigo: 107, nombre: 'Papa Semilla' },
  { codigo: 95,  nombre: 'Cajones Vacíos' },
];

const PROVINCIAS = {
  '06': 'Buenos Aires', '02': 'Capital Federal', '10': 'Catamarca',
  '14': 'Córdoba', '18': 'Corrientes', '22': 'Chaco', '26': 'Chubut',
  '30': 'Entre Ríos', '34': 'Formosa', '38': 'Jujuy', '42': 'La Pampa',
  '46': 'La Rioja', '50': 'Mendoza', '54': 'Misiones', '58': 'Neuquén',
  '62': 'Río Negro', '66': 'Salta', '70': 'San Juan', '74': 'San Luis',
  '78': 'Santa Cruz', '82': 'Santa Fe', '86': 'Santiago del Estero',
  '94': 'Tierra del Fuego', '90': 'Tucumán',
};

const LOCALIDADES_SJ = {
  '01': 'Capital', '02': 'Rivadavia', '03': 'Santa Lucía', '04': 'Rawson',
  '05': 'Pocito', '06': 'Zonda', '07': 'Ullúm', '08': 'Chimbas',
  '09': '9 de Julio', '10': 'Albardón', '11': 'Angaco', '12': 'San Martín',
  '13': 'Caucete', '14': '25 de Mayo', '15': 'Sarmiento', '16': 'Calingasta',
  '17': 'Iglesia', '18': 'Jáchal', '19': 'Valle Fértil',
};

const C_RED   = '#7F1D1D';
const C_GRAY  = '#6b7280';
const C_DARK  = '#111827';
const C_LIGHT = '#f3f4f6';
const C_BOR   = '#d1d5db';

function fmtFechaHora(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    '  ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function hline(doc, y, x0 = 40, x1 = 555) {
  doc.moveTo(x0, y).lineTo(x1, y).strokeColor(C_BOR).lineWidth(0.5).stroke();
}

function lv(doc, label, val, x, y, lw = 100, vw = 160) {
  doc.fill(C_GRAY).font('Helvetica').fontSize(7.5)
    .text(label + ':', x, y, { width: lw, lineBreak: false });
  doc.fill(C_DARK).font('Helvetica').fontSize(8)
    .text(val || '—', x + lw + 2, y, { width: vw });
}

// ─── Página 1: Acta Fitozoosanitaria ─────────────────────────────────────────
function dibujarActa(doc, ingreso) {
  const ML = 40;
  const CW = 515;
  let y = 0;

  // Header
  doc.rect(0, 0, 595, 62).fill(C_RED);
  doc.fill('#ffffff').font('Helvetica-Bold').fontSize(14)
    .text('BARRERAS FITOZOOSANITARIAS', ML, 14, { width: CW });
  doc.fill('#fca5a5').font('Helvetica').fontSize(9)
    .text('Gobierno de San Juan · Agencia de Calidad San Juan', ML, 34, { width: CW });
  // Número
  doc.fill('#ffffff').font('Helvetica-Bold').fontSize(10)
    .text(`Serie 20  N° ${ingreso.numero || '—'}`, 355, 14, { width: 200, align: 'right' });
  y = 76;

  // Tipo de acta
  const tipos = ['inspeccion', 'rechazo', 'decomiso', 'infraccion', 'constatacion'];
  const labels = ['INSPECCIÓN', 'RECHAZO', 'DECOMISO', 'INFRACCIÓN', 'CONSTATACIÓN'];
  doc.fill(C_GRAY).font('Helvetica').fontSize(7.5).text('Tipo de acta:', ML, y);
  let tx = ML + 75;
  tipos.forEach((t, i) => {
    const activo = ingreso.actaTipo === t;
    doc.rect(tx, y - 1, 9, 9).strokeColor(C_DARK).lineWidth(0.7).stroke();
    if (activo) doc.fill(C_RED).rect(tx + 1.5, y + 0.5, 6, 6).fill();
    doc.fill(activo ? C_RED : C_GRAY).font(activo ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5)
      .text(labels[i], tx + 12, y, { lineBreak: false });
    tx += labels[i].length * 5.2 + 18;
  });
  y += 18;
  hline(doc, y);
  y += 8;

  // Control / Barrera
  doc.fill(C_GRAY).font('Helvetica').fontSize(7.5)
    .text('CONTROL:', ML, y, { lineBreak: false });
  doc.fill(C_DARK).font('Helvetica').fontSize(8)
    .text(ingreso.actaControl || '—', ML + 55, y, { width: 200, lineBreak: false });
  doc.fill(C_GRAY).font('Helvetica').fontSize(7.5)
    .text('Barrera:', 340, y, { lineBreak: false });
  doc.fill(C_DARK).font('Helvetica').fontSize(8)
    .text(ingreso.barreraNombre || '—', 380, y, { width: 175 });
  y += 14;

  // Fecha/hora
  doc.fill(C_GRAY).font('Helvetica').fontSize(7.5)
    .text('Fecha y hora:', ML, y, { lineBreak: false });
  doc.fill(C_DARK).font('Helvetica').fontSize(8)
    .text(fmtFechaHora(ingreso.fechaHora), ML + 70, y, { width: 250 });
  y += 14;
  hline(doc, y);
  y += 8;

  // Lugar
  doc.fill(C_RED).font('Helvetica-Bold').fontSize(7.5).text('LUGAR', ML, y);
  y += 11;
  lv(doc, 'Localidad', ingreso.localidad, ML, y, 60, 130);
  lv(doc, 'Departamento', ingreso.departamento, 240, y, 80, 130);
  lv(doc, 'Provincia', ingreso.provincia, 400, y, 55, 100);
  y += 16;
  hline(doc, y);
  y += 8;

  // Interesado
  doc.fill(C_RED).font('Helvetica-Bold').fontSize(7.5).text('INTERESADO', ML, y);
  y += 11;
  lv(doc, 'Nombre', ingreso.interesadoNombre, ML, y, 55, 220);
  lv(doc, 'DNI', ingreso.interesadoDni, 330, y, 30, 195);
  y += 14;
  lv(doc, 'Domicilio', ingreso.interesadoDomicilio, ML, y, 55, 150);
  lv(doc, 'Localidad', ingreso.interesadoLocalidad, 250, y, 55, 120);
  lv(doc, 'Provincia', ingreso.interesadoProvincia, 445, y, 50, 100);
  y += 16;
  hline(doc, y);
  y += 8;

  // Vehículo
  doc.fill(C_RED).font('Helvetica-Bold').fontSize(7.5).text('VEHÍCULO', ML, y);
  y += 11;
  lv(doc, 'Vehículo', ingreso.vehiculo, ML, y, 55, 150);
  lv(doc, 'Chasis N°', ingreso.chasis, 250, y, 55, 120);
  lv(doc, 'Acoplado N°', ingreso.acoplado, 445, y, 65, 100);
  y += 14;
  lv(doc, 'Procedente de', ingreso.procedenteDe, ML, y, 80, 160);
  lv(doc, 'Destino', ingreso.destino, 300, y, 45, 210);
  y += 16;
  hline(doc, y);
  y += 8;

  // Declaración
  doc.fill(C_RED).font('Helvetica-Bold').fontSize(7.5).text('EL SEÑOR DECLARA', ML, y);
  y += 11;
  const declTexto = ingreso.declaracion || '—';
  doc.fill(C_DARK).font('Helvetica').fontSize(8)
    .text(declTexto, ML, y, { width: CW, lineBreak: true });
  const declAlto = doc.heightOfString(declTexto, { width: CW }) + 4;
  y += Math.max(declAlto, 60);
  hline(doc, y);
  y += 12;

  // Inspector
  doc.fill(C_GRAY).font('Helvetica').fontSize(7.5)
    .text('Inspector:', ML, y, { lineBreak: false });
  doc.fill(C_DARK).font('Helvetica-Bold').fontSize(8)
    .text(ingreso.inspectorNombre || '—', ML + 55, y, { width: 300 });
  y += 30;

  // Firmas
  const firmaW = 155;
  const firmas = ['FIRMA INSPECTOR', 'FIRMA INSPECTOR', 'FIRMA INTERESADO'];
  firmas.forEach((f, i) => {
    const fx = ML + i * (firmaW + 15);
    doc.moveTo(fx, y).lineTo(fx + firmaW, y).strokeColor(C_DARK).lineWidth(0.5).stroke();
    doc.fill(C_GRAY).font('Helvetica').fontSize(7).text(f, fx, y + 3, { width: firmaW, align: 'center' });
  });

  // Nota web (sin email)
  if (!ingreso.emailConductor) {
    y += 22;
    doc.fill(C_GRAY).font('Helvetica').fontSize(7.5)
      .text(
        'Para solicitar una copia de este documento ingresá a: agenciacalidadsanjuan.com.ar',
        ML, y, { width: CW, align: 'center' }
      );
  }
}

// ─── Página 2: Declaración Jurada de Productos Vegetales ─────────────────────
function dibujarDeclaracion(doc, ingreso) {
  const ML = 30;
  const CW = 535;
  let y = 0;

  // Header
  doc.rect(0, 0, 595, 58).fill(C_RED);
  doc.fill('#ffffff').font('Helvetica-Bold').fontSize(11)
    .text('DECLARACIÓN JURADA DE PRODUCTOS VEGETALES', ML, 10, { width: 370 });
  doc.fill('#fca5a5').font('Helvetica').fontSize(8)
    .text('S.A.G. y A. SAN JUAN — Resolución N° 281-SAG-99', ML, 28, { width: 370 });
  doc.fill('#ffffff').font('Helvetica-Bold').fontSize(9)
    .text(`Serie 23  N° ${ingreso.numero || '—'}`, 380, 10, { width: 185, align: 'right' });
  doc.fill('#fca5a5').font('Helvetica').fontSize(8)
    .text('ENTRADA', 380, 28, { width: 185, align: 'right' });
  y = 68;

  // Fecha / hora / barrera
  lv(doc, 'Fecha / Hora', fmtFechaHora(ingreso.fechaHora), ML, y, 65, 130);
  lv(doc, 'Control', ingreso.actaControl || '—', 250, y, 45, 140);
  lv(doc, 'Barrera', ingreso.barreraNombre || '—', 440, y, 45, 115);
  y += 16;
  hline(doc, y);
  y += 8;

  // Remitente / Destinatario
  doc.fill(C_RED).font('Helvetica-Bold').fontSize(7.5).text('REMITENTE', ML, y);
  doc.fill(C_RED).font('Helvetica-Bold').fontSize(7.5).text('DESTINATARIO', 290, y);
  y += 11;
  lv(doc, 'Nombre', ingreso.remitenteNombre, ML, y, 50, 185);
  lv(doc, 'Nombre', ingreso.destinatarioNombre, 290, y, 50, 185);
  y += 13;
  lv(doc, 'CUIT', ingreso.remitenteCuit, ML, y, 50, 110);
  lv(doc, 'Localidad', LOCALIDADES_SJ[ingreso.remitenteLocalidadCod] || ingreso.remitenteLocalidadCod || '—', ML + 180, y, 55, 90);
  lv(doc, 'CUIT', ingreso.destinatarioCuit, 290, y, 50, 90);
  lv(doc, 'Localidad', LOCALIDADES_SJ[ingreso.destinatarioLocalidadCod] || ingreso.destinatarioLocalidadCod || '—', 440, y, 55, 100);
  y += 13;
  lv(doc, 'Provincia', PROVINCIAS[ingreso.remitenteProvinciaCod] || ingreso.remitenteProvinciaCod || '—', ML, y, 50, 190);
  lv(doc, 'Provincia', PROVINCIAS[ingreso.destinatarioProvinciaCod] || ingreso.destinatarioProvinciaCod || '—', 290, y, 50, 235);
  y += 14;

  // Destino tipo
  const tiposD = ['industria', 'exportacion', 'transito'];
  const labsD  = ['Industria', 'Exportación', 'Tránsito'];
  doc.fill(C_GRAY).font('Helvetica').fontSize(7.5).text('Tipo destino:', ML, y);
  let dx = ML + 75;
  tiposD.forEach((t, i) => {
    const act = ingreso.destinoTipo === t;
    doc.rect(dx, y - 1, 8, 8).strokeColor(C_DARK).lineWidth(0.7).stroke();
    if (act) doc.fill(C_RED).rect(dx + 1.5, y + 0.5, 5, 5).fill();
    doc.fill(act ? C_RED : C_GRAY).font(act ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5)
      .text(labsD[i], dx + 11, y, { lineBreak: false });
    dx += labsD[i].length * 5 + 18;
  });
  y += 16;
  hline(doc, y);
  y += 6;

  // Tabla de productos
  doc.fill(C_RED).font('Helvetica-Bold').fontSize(7.5).text('PRODUCTOS', ML, y);
  y += 10;

  // Mapa de productos ingresados
  const productosMap = {};
  (ingreso.productos || []).forEach(p => {
    productosMap[Number(p.codigo)] = p;
  });

  // 3 columnas
  const COL = Math.ceil(PRODUCTOS_SAG.length / 3);
  const colW = 175;
  const rowH = 11;
  const colHeaders = ['PRODUCTO', 'CÓD', 'BULTOS', 'KG TOTAL'];
  const colHW      = [70, 18, 28, 35];

  // Encabezados de las 3 columnas
  for (let col = 0; col < 3; col++) {
    const cx = ML + col * (colW + 5);
    let hx = cx;
    doc.fill(C_DARK).font('Helvetica-Bold').fontSize(6.5);
    colHeaders.forEach((h, hi) => {
      doc.text(h, hx, y, { width: colHW[hi], lineBreak: false, align: hi > 0 ? 'right' : 'left' });
      hx += colHW[hi] + 2;
    });
  }
  y += 10;
  hline(doc, y, ML, 555);
  y += 2;

  // Filas de productos (hasta 3 columnas)
  const maxFilas = Math.max(
    Math.ceil(PRODUCTOS_SAG.length / 3),
    1
  );

  for (let fila = 0; fila < maxFilas; fila++) {
    for (let col = 0; col < 3; col++) {
      const idx = col * COL + fila;
      if (idx >= PRODUCTOS_SAG.length) continue;
      const prod = PRODUCTOS_SAG[idx];
      const ingresado = productosMap[prod.codigo];
      const cx = ML + col * (colW + 5);

      if (ingresado) {
        // Producto declarado: normal
        doc.fill(C_DARK).font('Helvetica').fontSize(6.5)
          .text(prod.nombre, cx, y, { width: 70, lineBreak: false });
        doc.fill(C_GRAY).font('Helvetica').fontSize(6.5)
          .text(String(prod.codigo), cx + 72, y, { width: 16, lineBreak: false, align: 'right' });
        doc.fill(C_DARK).font('Helvetica-Bold').fontSize(6.5)
          .text(String(ingresado.cant_bultos ?? ''), cx + 92, y, { width: 26, lineBreak: false, align: 'right' });
        const kgTotal = ingresado.kg_totales ??
          (ingresado.cant_bultos && ingresado.kg_bulto
            ? (Number(ingresado.cant_bultos) * Number(ingresado.kg_bulto)).toFixed(1)
            : '');
        doc.fill(C_DARK).font('Helvetica-Bold').fontSize(6.5)
          .text(String(kgTotal), cx + 122, y, { width: 33, lineBreak: false, align: 'right' });
      } else {
        // Producto no declarado: tachado en gris claro
        doc.fill('#d1d5db').font('Helvetica').fontSize(6.5)
          .text(prod.nombre, cx, y, { width: 70, lineBreak: false });
        doc.fill('#e5e7eb').font('Helvetica').fontSize(6.5)
          .text(String(prod.codigo), cx + 72, y, { width: 16, lineBreak: false, align: 'right' });
        // Línea de tachado
        const midY = y + 4;
        doc.moveTo(cx, midY).lineTo(cx + 155, midY)
          .strokeColor('#d1d5db').lineWidth(0.4).stroke();
      }
    }
    y += rowH;

    // Nueva página si se agota espacio
    if (y > 770 && fila < maxFilas - 1) {
      doc.addPage();
      y = 30;
    }
  }

  // Subtotales
  y += 4;
  hline(doc, y, ML, 555);
  y += 6;
  const totalBultos = (ingreso.productos || []).reduce((s, p) => s + Number(p.cant_bultos || 0), 0);
  const totalKg     = (ingreso.productos || []).reduce((s, p) => s + Number(p.kg_totales || 0), 0);
  doc.fill(C_GRAY).font('Helvetica').fontSize(7.5)
    .text('SUBTOTAL KGS.:', ML, y, { lineBreak: false });
  doc.fill(C_DARK).font('Helvetica-Bold').fontSize(8)
    .text(`${totalBultos} bultos — ${totalKg.toFixed(1)} kg`, ML + 90, y);
  y += 18;
  hline(doc, y);
  y += 10;

  // Transporte
  doc.fill(C_RED).font('Helvetica-Bold').fontSize(7.5).text('TRANSPORTE', ML, y);
  y += 11;
  lv(doc, 'Empresa', ingreso.transporteEmpresa, ML, y, 50, 140);
  lv(doc, 'CUIT', ingreso.transporteCuit, 240, y, 35, 100);
  lv(doc, 'Patente', ingreso.transportePatente, 390, y, 45, 120);
  y += 13;
  lv(doc, 'Acoplado', ingreso.transporteAcoplado, ML, y, 55, 100);
  lv(doc, 'Licencia', ingreso.transporteLicencia, 200, y, 50, 110);
  y += 18;
  hline(doc, y);
  y += 12;

  // Firmas
  const firmaW = 155;
  const firmas = ['FIRMA RESPONSABLE', 'INSPECTOR', 'FIRMA Y SELLO'];
  firmas.forEach((f, i) => {
    const fx = ML + i * (firmaW + 17);
    doc.moveTo(fx, y).lineTo(fx + firmaW, y).strokeColor(C_DARK).lineWidth(0.5).stroke();
    doc.fill(C_GRAY).font('Helvetica').fontSize(7).text(f, fx, y + 3, { width: firmaW, align: 'center' });
  });
  y += 14;
  doc.fill(C_GRAY).font('Helvetica').fontSize(7.5)
    .text(`Inspector: ${ingreso.inspectorNombre || '—'}`, ML, y, { width: CW, align: 'center' });

  if (!ingreso.emailConductor) {
    y += 12;
    doc.fill(C_GRAY).font('Helvetica').fontSize(7.5)
      .text(
        'Para solicitar una copia: agenciacalidadsanjuan.com.ar',
        ML, y, { width: CW, align: 'center' }
      );
  }
}

// ─── Exportado principal ──────────────────────────────────────────────────────
async function generarPdfIngreso(ingreso) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: { Title: ingreso.numero || 'Ingreso', Author: 'SAVEAN' },
    });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Página 1 — Acta
    dibujarActa(doc, ingreso);

    // Página 2 — Declaración Jurada
    doc.addPage({ size: 'A4', margin: 0 });
    dibujarDeclaracion(doc, ingreso);

    doc.end();
  });
}

module.exports = { generarPdfIngreso, PRODUCTOS_SAG };
