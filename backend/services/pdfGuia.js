const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const C_RED = '#7F1D1D';
const C_GRAY = '#6b7280';
const C_DARK = '#111827';
const C_LIGHT = '#f3f4f6';
const C_BORDER = '#e5e7eb';

function fmtFecha(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function hline(doc, y, x0 = 50, x1 = 545) {
  doc.moveTo(x0, y).lineTo(x1, y).strokeColor(C_BORDER).lineWidth(0.5).stroke();
}

function sectionTitle(doc, text, y) {
  doc.fill(C_RED).font('Helvetica-Bold').fontSize(8).text(text, 50, y);
  return y + 13;
}

function labelVal(doc, label, val, x, y, lw = 90) {
  doc.fill(C_GRAY).font('Helvetica').fontSize(9)
    .text(label + ':', x, y, { width: lw, lineBreak: false });
  doc.fill(C_DARK).font('Helvetica').fontSize(9)
    .text(val || '—', x + lw + 2, y, { width: 200 });
}

async function generarPdfGuia(guia) {
  const sistemaUrl = process.env.SISTEMA_URL || 'https://sistema.agenciacalidadsanjuan.com.ar';
  const verUrl = `${sistemaUrl}/?verificar=${guia.token}`;
  const qrBuffer = await QRCode.toBuffer(verUrl, { width: 108, margin: 1 });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: guia.numero, Author: 'SAVEAN' } });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const ML = 50;        // left margin
    const CW = 495;       // content width (595 - 50*2)
    let y = 0;

    // ─── Header ───────────────────────────────────────────
    doc.rect(0, 0, 595, 68).fill(C_RED);
    doc.fill('#ffffff').font('Helvetica-Bold').fontSize(17)
      .text('SAVEAN — Agencia Calidad San Juan', ML, 17, { width: CW });
    doc.fill('#fca5a5').font('Helvetica').fontSize(10)
      .text('Guía de Origen Fitosanitario', ML, 42, { width: CW });
    y = 84;

    // ─── Número + estado + fechas ─────────────────────────
    doc.fill(C_DARK).font('Helvetica-Bold').fontSize(19)
      .text(guia.numero, ML, y);
    y += 24;

    const estadoColor = guia.estado === 'verificada' ? '#16a34a'
      : guia.estado === 'denegada' ? '#dc2626' : '#d97706';
    doc.fill(estadoColor).font('Helvetica-Bold').fontSize(10)
      .text(guia.estado.toUpperCase(), ML, y, { continued: true });
    doc.fill(C_GRAY).font('Helvetica').fontSize(9)
      .text(`   ·   Emitida: ${fmtFecha(guia.fechaEmision)}   ·   Vence: ${fmtFecha(guia.fechaVencimiento)}`, { continued: false });
    y += 18;

    hline(doc, y); y += 13;

    // ─── Remitente / Destinatario ─────────────────────────
    const col1 = ML, col2 = ML + CW / 2 + 8, colW = CW / 2 - 10;

    doc.fill(C_RED).font('Helvetica-Bold').fontSize(8).text('REMITENTE', col1, y);
    doc.fill(C_RED).font('Helvetica-Bold').fontSize(8).text('DESTINATARIO', col2, y);
    y += 13;

    doc.fill(C_DARK).font('Helvetica-Bold').fontSize(10)
      .text(guia.remitenteNombre || '—', col1, y, { width: colW });
    doc.fill(C_DARK).font('Helvetica-Bold').fontSize(10)
      .text(guia.destinatarioNombre || '—', col2, y, { width: colW });
    y += 16;

    // Remitente fields
    let yR = y;
    for (const [l, v] of [['RENSPA', guia.remitenteRenspa], ['INV', guia.remitenteInv], ['Tipo', guia.remitenteTipo]]) {
      if (!v) continue;
      doc.fill(C_GRAY).font('Helvetica').fontSize(9).text(`${l}:`, col1, yR, { width: 48, lineBreak: false });
      doc.fill(C_DARK).font('Helvetica').fontSize(9).text(v, col1 + 50, yR, { width: colW - 52 });
      yR += 13;
    }

    // Destinatario fields
    let yD = y;
    const tipoLabel = guia.destinoTipo === 'externo' ? 'Externo (Exportación)' : 'Mercado Interno';
    doc.fill(C_GRAY).font('Helvetica').fontSize(9).text('Tipo:', col2, yD, { width: 55, lineBreak: false });
    doc.fill(C_DARK).font('Helvetica').fontSize(9).text(tipoLabel, col2 + 57, yD, { width: colW - 59 });
    yD += 13;

    const destFields = guia.destinoTipo === 'externo'
      ? [['País', guia.destinoPais], ['Punto de salida', guia.destinoPuntoSalida]]
      : [['Mercado', guia.destinoMercadoInterno], ['Provincia', guia.destinoProvincia]];
    for (const [l, v] of destFields) {
      if (!v) continue;
      const lw = l.length > 8 ? 75 : 55;
      doc.fill(C_GRAY).font('Helvetica').fontSize(9).text(`${l}:`, col2, yD, { width: lw, lineBreak: false });
      doc.fill(C_DARK).font('Helvetica').fontSize(9).text(v, col2 + lw + 2, yD, { width: colW - lw - 4 });
      yD += 13;
    }

    y = Math.max(yR, yD) + 8;
    hline(doc, y); y += 13;

    // ─── Mercadería ───────────────────────────────────────
    y = sectionTitle(doc, 'MERCADERÍA', y);

    const items = Array.isArray(guia.items) ? guia.items : [];
    if (items.length === 0) {
      doc.fill(C_GRAY).font('Helvetica').fontSize(9).text('Sin detalle de mercadería.', ML, y);
      y += 14;
    } else {
      const cols = [
        { label: 'Especie', x: ML, w: 110 },
        { label: 'Variedad', x: ML + 115, w: 100 },
        { label: 'Tipo Envase', x: ML + 220, w: 90 },
        { label: 'Bultos', x: ML + 315, w: 55 },
        { label: 'Kg', x: ML + 375, w: 55 },
        { label: 'Lugar Empaque', x: ML + 435, w: CW - 385 },
      ];

      // Header row
      doc.rect(ML, y, CW, 16).fill(C_LIGHT);
      for (const col of cols) {
        doc.fill(C_GRAY).font('Helvetica-Bold').fontSize(8)
          .text(col.label, col.x + 3, y + 4, { width: col.w - 4, lineBreak: false });
      }
      y += 16;

      for (const item of items) {
        const especie = item.especie || '—';
        const variedad = item.variedad || '—';
        const tipoEnvase = item.tipoEnvase || '—';
        const bultos = item.cantidadBultos != null ? String(item.cantidadBultos) : '—';
        const kg = item.cantidadKg != null ? String(item.cantidadKg) : '—';
        const lugar = item.lugarEmpaque || '—';
        const vals = [especie, variedad, tipoEnvase, bultos, kg, lugar];

        hline(doc, y);
        for (let i = 0; i < cols.length; i++) {
          doc.fill(C_DARK).font('Helvetica').fontSize(9)
            .text(vals[i], cols[i].x + 3, y + 3, { width: cols[i].w - 5, lineBreak: false });
        }
        y += 15;
      }
      hline(doc, y);
      y += 4;

      // Vid destinos adicionales
      const vidItems = items.filter(it => it.vidDestino && it.vidDestino.length > 0);
      if (vidItems.length > 0) {
        y += 4;
        doc.fill(C_GRAY).font('Helvetica').fontSize(8)
          .text('Destino de Vid: ' + vidItems.flatMap(it => it.vidDestino).join(', '), ML, y, { width: CW });
        y += 12;
      }
    }

    y += 6;
    hline(doc, y); y += 13;

    // ─── Transporte ───────────────────────────────────────
    y = sectionTitle(doc, 'TRANSPORTE', y);

    const transFields = [
      ['Empresa', guia.transporteEmpresa],
      ['Conductor', guia.transporteConductor],
      ['Tipo', guia.transporteTipo],
      ['Patente vehículo', guia.transporteCamionPatente],
      ['Patente acoplado', guia.transporteAcopladoPatente],
      ['Precintos', guia.transportePrecintos],
    ].filter(([, v]) => v);

    for (let i = 0; i < transFields.length; i += 2) {
      const [l1, v1] = transFields[i];
      labelVal(doc, l1, v1, ML, y, 95);
      if (transFields[i + 1]) {
        const [l2, v2] = transFields[i + 1];
        labelVal(doc, l2, v2, ML + 260, y, 95);
      }
      y += 14;
    }

    y += 4;
    hline(doc, y); y += 13;

    // ─── Verificación + QR ────────────────────────────────
    y = sectionTitle(doc, 'VERIFICACIÓN', y);

    doc.image(qrBuffer, ML + CW - 110, y, { width: 110 });

    doc.fill(C_GRAY).font('Helvetica').fontSize(9)
      .text('Escaneá el código QR o ingresá al enlace para verificar\nla autenticidad de esta guía:', ML, y, { width: CW - 125 });
    y += 34;
    doc.fill('#3b82f6').font('Helvetica').fontSize(9)
      .text(verUrl, ML, y, { width: CW - 125, link: verUrl, underline: true });
    y += 14;
    doc.fill(C_GRAY).font('Helvetica').fontSize(8)
      .text(`Token: ${guia.token}`, ML, y, { width: CW - 125 });

    // ─── Footer ───────────────────────────────────────────
    doc.rect(0, 807, 595, 35).fill('#f9fafb');
    doc.moveTo(0, 807).lineTo(595, 807).strokeColor(C_BORDER).lineWidth(0.5).stroke();
    doc.fill(C_GRAY).font('Helvetica').fontSize(8)
      .text(
        `© ${new Date().getFullYear()} Agencia de Calidad San Juan · Ministerio de Producción · Documento generado automáticamente`,
        ML, 818, { width: CW, align: 'center' }
      );

    doc.end();
  });
}

module.exports = { generarPdfGuia };
