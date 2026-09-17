'use strict';
const PDFDocument = require('pdfkit');

const TZ = 'America/Argentina/San_Juan';

function fmtFecha(s) {
  if (!s) return '—';
  const str = s instanceof Date ? s.toISOString().slice(0, 10) : String(s).slice(0, 10);
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

function fmtHora(s) {
  if (!s) return '—';
  return String(s).slice(0, 5);
}

function fmtHoraFull(dt) {
  if (!dt) return '—';
  try {
    return new Date(dt).toLocaleTimeString('es-AR', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ,
    });
  } catch {
    return '—';
  }
}

function hline(doc, x1, y, x2, w = 0.4, color = '#cccccc') {
  doc.moveTo(x1, y).lineTo(x2, y).strokeColor(color).lineWidth(w).undash().stroke();
}

// ─── Genera el PDF de una planilla de control diario ─────────────────────────
async function generarPdfPlanilla(planilla, entradas) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: {
        Title: `Planilla ${planilla.barreraNombre} ${planilla.fecha}`,
        Author: 'SAVEAN — Agencia de Calidad San Juan',
      },
    });

    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const ML = 40, MR = 555, PW = MR - ML;

    const autos      = entradas.filter(e => e.tipoVehiculo === 'auto').length;
    const colectivos = entradas.filter(e => e.tipoVehiculo === 'colectivo').length;
    const camiones   = entradas.filter(e => e.tipoVehiculo === 'camion').length;
    const total      = entradas.length;

    // ── Columnas de la tabla ────────────────────────────────────────────────────
    // Total ancho = PW = 515
    const COLS = [
      { label: '#',           w: 22,  align: 'center' },
      { label: 'TIPO',        w: 55,  align: 'left'   },
      { label: 'PATENTE',     w: 70,  align: 'center' },
      { label: 'PROCEDENCIA', w: 133, align: 'left'   },
      { label: 'DECOMISO',    w: 80,  align: 'left'   },
      { label: 'INSPECTOR',   w: 85,  align: 'left'   },
      { label: 'HORA',        w: 40,  align: 'center' },
      { label: 'ACTA',        w: 30,  align: 'center' },
    ];

    const ROW_H = 16;
    const HDR_H = 18;

    function dibujarEncabezadoTabla(doc, y) {
      doc.rect(ML, y, PW, HDR_H).fillColor('#1a1a2e').fill();
      let cx = ML;
      COLS.forEach(col => {
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#ffffff')
          .text(col.label, cx + 2, y + 5, { width: col.w - 4, align: col.align, lineBreak: false });
        cx += col.w;
      });
      return y + HDR_H;
    }

    function nuevaPagina(doc, planilla) {
      doc.addPage({ size: 'A4', margin: 0 });
      let y = 20;
      doc.font('Helvetica').fontSize(8).fillColor('#666')
        .text(
          `Planilla — ${planilla.barreraNombre} — ${fmtFecha(planilla.fecha)} (cont.)`,
          ML, y, { width: PW, align: 'left', lineBreak: false }
        );
      y += 16;
      return dibujarEncabezadoTabla(doc, y);
    }

    // ── PÁGINA 1 ────────────────────────────────────────────────────────────────
    let y = 36;

    // Header
    doc.rect(ML, y, PW, 52).fillColor('#f8f9fa').fill();
    doc.rect(ML, y, PW, 52).strokeColor('#dee2e6').lineWidth(0.5).stroke();

    doc.font('Helvetica-Bold').fontSize(13).fillColor('#1a1a2e')
      .text('PLANILLA DE CONTROL DIARIO', ML + 10, y + 8, { width: PW - 20, align: 'center', lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor('#666')
      .text('Agencia de Calidad San Juan — SAVEAN · Sistema Barreras Fitosanitarias', ML + 10, y + 26, { width: PW - 20, align: 'center', lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor('#444')
      .text(
        `Barrera: ${planilla.barreraNombre}   ·   Fecha: ${fmtFecha(planilla.fecha)}   ·   Horario: ${fmtHora(planilla.horaInicio)} — ${planilla.horaCierre ? fmtHora(planilla.horaCierre) : 'en curso'}   ·   ${planilla.estado === 'abierta' ? 'ABIERTA' : 'CERRADA'}`,
        ML + 10, y + 38, { width: PW - 20, align: 'center', lineBreak: false }
      );

    y += 64;

    // Totales
    const boxW = 116, boxH = 44, boxGap = 7;
    const totalBoxW = 4 * boxW + 3 * boxGap;
    const boxStartX = ML + (PW - totalBoxW) / 2;

    [
      { label: 'Autos',      value: autos,      color: '#2563eb' },
      { label: 'Colectivos', value: colectivos,  color: '#7c3aed' },
      { label: 'Camiones',   value: camiones,    color: '#b45309' },
      { label: 'Total',      value: total,       color: '#065f46' },
    ].forEach((item, i) => {
      const bx = boxStartX + i * (boxW + boxGap);
      doc.rect(bx, y, boxW, boxH).strokeColor('#e5e7eb').lineWidth(0.8).fillAndStroke('#ffffff', '#e5e7eb');
      doc.font('Helvetica-Bold').fontSize(22).fillColor(item.color)
        .text(String(item.value), bx, y + 6, { width: boxW, align: 'center', lineBreak: false });
      doc.font('Helvetica').fontSize(7.5).fillColor('#666')
        .text(item.label, bx, y + boxH - 13, { width: boxW, align: 'center', lineBreak: false });
    });

    y += boxH + 16;

    // Tabla
    y = dibujarEncabezadoTabla(doc, y);

    const TIPO_LABELS = { auto: 'Auto', colectivo: 'Colectivo', camion: 'Camión' };

    entradas.forEach((e, i) => {
      // Paginación
      if (y + ROW_H > 800) {
        y = nuevaPagina(doc, planilla);
      }

      const bgColor = i % 2 === 0 ? '#ffffff' : '#f9fafb';
      doc.rect(ML, y, PW, ROW_H).fillColor(bgColor).fill();
      hline(doc, ML, y + ROW_H, MR, 0.3, '#e5e7eb');

      const vals = [
        { v: String(i + 1),                                align: 'center' },
        { v: TIPO_LABELS[e.tipoVehiculo] || e.tipoVehiculo, align: 'left'   },
        { v: e.patente || '—',                             align: 'center' },
        { v: e.procedencia || '—',                         align: 'left'   },
        { v: e.decomisokKg ? `${e.decomisokKg} kg${e.decomisokFruta ? ` · ${e.decomisokFruta}` : ''}` : '—', align: 'left' },
        { v: e.inspectorNombre || '—',                     align: 'left'   },
        { v: fmtHoraFull(e.fechaHora),                     align: 'center' },
        { v: e.ingresoId ? '✓' : '—',                      align: 'center' },
      ];

      let cx = ML;
      vals.forEach((cell, ci) => {
        const textColor = ci === 7 && e.ingresoId ? '#059669' : '#111';
        const font = (ci === 7 && e.ingresoId) ? 'Helvetica-Bold' : 'Helvetica';
        doc.font(font).fontSize(7.5).fillColor(textColor)
          .text(cell.v, cx + 3, y + 4, { width: COLS[ci].w - 6, align: cell.align, lineBreak: false });
        cx += COLS[ci].w;
      });

      y += ROW_H;
    });

    if (entradas.length === 0) {
      doc.rect(ML, y, PW, 32).fillColor('#f9fafb').fill();
      doc.font('Helvetica').fontSize(9).fillColor('#999')
        .text('Sin registros en esta planilla.', ML, y + 10, { width: PW, align: 'center', lineBreak: false });
      y += 32;
    }

    // Pie totales
    hline(doc, ML, y, MR, 0.8, '#1a1a2e');
    y += 2;
    doc.rect(ML, y, PW, 18).fillColor('#f8f9fa').fill();
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#1a1a2e')
      .text(
        `TOTAL: ${total} vehículos    Autos: ${autos}    Colectivos: ${colectivos}    Camiones: ${camiones}`,
        ML + 6, y + 5, { width: PW - 12, align: 'left', lineBreak: false }
      );
    y += 18;

    // Firmas
    y += 30;
    const fw = 150, fg = 28;
    const fx = [ML, ML + fw + fg, ML + 2 * (fw + fg)];
    const fLabels = ['FIRMA INSPECTOR', 'FIRMA INSPECTOR', 'JEFE DE BARRERA'];
    fx.forEach((x, i) => {
      hline(doc, x, y, x + fw, 0.6, '#333');
      doc.font('Helvetica').fontSize(7).fillColor('#666')
        .text(fLabels[i], x, y + 3, { width: fw, align: 'center', lineBreak: false });
    });

    y += 28;

    // Footer
    doc.font('Helvetica').fontSize(6.5).fillColor('#aaa')
      .text(
        `Generado el ${new Date().toLocaleString('es-AR', { timeZone: TZ })} · SAVEAN — Agencia de Calidad San Juan`,
        ML, y, { width: PW, align: 'center', lineBreak: false }
      );

    doc.end();
  });
}

module.exports = { generarPdfPlanilla };
