import { useState, useMemo } from 'react';
import { useSavean } from '../context/SaveanContext';
import { GuiaSavean } from '../types/savean';
import { Download, FileText, TrendingUp, MapPin, Package, BarChart2 } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

type Periodo = 'semana' | 'mes' | 'año' | 'custom';

function isoHoy() { return new Date().toISOString().slice(0, 10); }

function isoLunes() {
  const d = new Date();
  d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
  return d.toISOString().slice(0, 10);
}

function isoPrimerMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function isoPrimerAnio() {
  return `${new Date().getFullYear()}-01-01`;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + ' K';
  return n.toLocaleString('es-AR');
}

function vidDestinoLabel(destinos: string[]): string {
  if (!destinos || destinos.length === 0) return '';
  return destinos.map(d => {
    if (d === 'Pasa')  return 'Pasas de Uva';
    if (d === 'Mesa')  return 'Uva de Mesa';
    if (d === 'Vino')  return 'Uva para Vino';
    if (d === 'Mosto') return 'Uva para Mosto';
    return d;
  }).join(' / ');
}

function exportarCSV(guias: GuiaSavean[], label: string) {
  const headers = [
    'N°', 'FECHA', 'N° GUÍA', 'PUESTO DE CONTROL', 'REMITENTE', 'ORIGEN',
    'ESPECIE/HOSPEDERO', 'FRESCO / INDUSTRIALIZADO', 'TIPO ENVASE',
    'KG MERCADO INTERNO', 'KG MERCADO EXTERNO', 'OBLEAS EN TRÁNSITO',
    'MERCADO', 'DESTINO', 'MES',
  ];

  const rows: (string | number)[][] = [];
  let n = 0;

  for (const g of guias) {
    const fecha      = g.fechaEmision.slice(0, 10);
    const mes        = Number(g.fechaEmision.slice(5, 7));
    const mercado    = g.destinoTipo === 'externo' ? 'Ext' : 'Int';
    const destino    = g.destinoTipo === 'externo'
      ? (g.destinoPais ?? g.destinoPuntoSalida ?? 'Exterior')
      : (g.destinoProvincia ?? g.destinoMercadoInterno ?? 'Mercado Interno');
    const obleas     = g.transportePrecintos ?? '';
    const barrera    = g.barrieraNombre ?? '';

    for (const item of g.items) {
      n++;
      const kg    = Number(item.cantidadKg ?? 0);
      const fresco = item.especie === 'Vid'
        ? vidDestinoLabel(item.vidDestino ?? [])
        : (item.variedad ?? '');

      rows.push([
        n,
        fecha,
        g.numero,
        barrera,
        g.remitenteNombre,
        item.lugarEmpaque ?? '',
        item.especie,
        fresco,
        item.tipoEnvase ?? '',
        g.destinoTipo === 'interno' ? kg || '' : '',
        g.destinoTipo === 'externo' ? kg || '' : '',
        obleas,
        mercado,
        destino,
        mes,
      ]);
    }
  }

  const csv = [headers, ...rows]
    .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `reporte-savean-${label}-${isoHoy()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type StatsReporte = {
  byEstado: Record<string, number>;
  byBarrera: Record<string, { total: number; verificadas: number; kg: number; bultos: number }>;
  byEspecie: Record<string, { guias: number; bultos: number; kg: number }>;
  byDestino: Record<string, number>;
  totalBultos: number;
  totalKg: number;
};

function exportarPDF(
  guias: GuiaSavean[],
  desde: string,
  hasta: string,
  stats: StatsReporte,
  label: string,
  especiesFiltro: string[] = [],
) {
  const total      = guias.length;
  const verificadas = stats.byEstado['verificada'] ?? 0;
  const pendientes  = stats.byEstado['pendiente']  ?? 0;
  const denegadas   = stats.byEstado['denegada']   ?? 0;
  const vencidas    = stats.byEstado['vencida']    ?? 0;
  const tasaVerif   = total > 0 ? Math.round((verificadas / total) * 100) : 0;

  const barrerasOrdenadas = Object.entries(stats.byBarrera)
    .sort((a, b) => b[1].verificadas - a[1].verificadas);
  const especiesRanking = Object.entries(stats.byEspecie)
    .sort((a, b) => b[1].guias - a[1].guias)
    .slice(0, 10);
  const destinosTop = Object.entries(stats.byDestino)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const generadoEn = new Date().toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const filaBarreras = barrerasOrdenadas.map(([bar, d]) => {
    const tasa = d.total > 0 ? Math.round((d.verificadas / d.total) * 100) : 0;
    return `<tr>
      <td>${bar}</td>
      <td style="text-align:center;color:#16a34a;font-weight:700">${d.verificadas}</td>
      <td style="text-align:center">${d.total}</td>
      <td style="text-align:center;font-weight:700;color:${tasa >= 80 ? '#16a34a' : tasa >= 50 ? '#ea580c' : '#dc2626'}">${tasa}%</td>
      <td style="text-align:right">${d.bultos > 0 ? d.bultos.toLocaleString('es-AR') : '-'}</td>
      <td style="text-align:right">${d.kg > 0 ? d.kg.toLocaleString('es-AR') : '-'}</td>
    </tr>`;
  }).join('');

  const filaEspecies = especiesRanking.map(([esp, d], idx) => `<tr>
    <td>${idx + 1}. ${esp}</td>
    <td style="text-align:center">${d.guias}</td>
    <td style="text-align:right">${d.bultos > 0 ? d.bultos.toLocaleString('es-AR') : '-'}</td>
    <td style="text-align:right">${d.kg > 0 ? d.kg.toLocaleString('es-AR') : '-'}</td>
  </tr>`).join('');

  const filaDestinos = destinosTop.map(([dest, n]) => `<tr>
    <td>${dest}</td>
    <td style="text-align:center;font-weight:700">${n}</td>
  </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Reporte SAVEAN — ${label}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #111; padding: 24px 32px; }
    h1 { font-size: 18px; font-weight: 800; color: #ea580c; }
    h2 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
         color: #374151; margin: 20px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; border-bottom: 2px solid #ea580c; padding-bottom: 12px; }
    .header-left { }
    .header-right { text-align: right; color: #6b7280; font-size: 10px; line-height: 1.6; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 4px; }
    .kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; }
    .kpi .val { font-size: 22px; font-weight: 800; line-height: 1; }
    .kpi .lbl { font-size: 10px; color: #6b7280; margin-top: 3px; }
    .kpi.green { background:#f0fdf4; border-color:#bbf7d0; }  .kpi.green .val { color:#16a34a; }
    .kpi.orange { background:#fff7ed; border-color:#fed7aa; } .kpi.orange .val { color:#ea580c; }
    .kpi.red    { background:#fef2f2; border-color:#fecaca; } .kpi.red .val { color:#dc2626; }
    .kpi.blue   { background:#eff6ff; border-color:#bfdbfe; } .kpi.blue .val { color:#1d4ed8; }
    .kpi.gray   { background:#f9fafb; border-color:#e5e7eb; } .kpi.gray .val { color:#374151; }
    .kpis2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    th { background: #f3f4f6; text-align: left; padding: 6px 8px; font-weight: 700; color: #374151; }
    td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; color: #1f2937; }
    tr:last-child td { border-bottom: none; }
    .footer { margin-top: 28px; border-top: 1px solid #e5e7eb; padding-top: 8px;
              color: #9ca3af; font-size: 9px; text-align: center; }
    @media print {
      body { padding: 16px 20px; }
      @page { margin: 1cm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>SAVEAN — Reporte de Guías</h1>
      <p style="color:#6b7280;margin-top:4px;font-size:10px">Agencia de Calidad San Juan</p>
      ${especiesFiltro.length > 0
        ? `<p style="margin-top:6px;background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:3px 8px;font-size:9px;color:#c2410c;display:inline-block"><strong>Productos:</strong> ${especiesFiltro.join(' · ')}</p>`
        : ''}
    </div>
    <div class="header-right">
      <p><strong>Período:</strong> ${desde} al ${hasta}</p>
      <p><strong>Generado:</strong> ${generadoEn}</p>
      <p><strong>Total guías:</strong> ${total}</p>
    </div>
  </div>

  <h2>Resumen general</h2>
  <div class="kpis">
    <div class="kpi gray">  <div class="val">${total}</div>        <div class="lbl">Emitidas</div></div>
    <div class="kpi green"> <div class="val">${verificadas}</div>  <div class="lbl">Verificadas</div></div>
    <div class="kpi orange"><div class="val">${pendientes}</div>   <div class="lbl">Pendientes</div></div>
    <div class="kpi red">   <div class="val">${denegadas}</div>    <div class="lbl">Denegadas</div></div>
  </div>
  <div class="kpis" style="margin-top:8px">
    <div class="kpi gray"><div class="val">${vencidas}</div>      <div class="lbl">Vencidas</div></div>
    <div class="kpi blue"><div class="val">${tasaVerif}%</div>    <div class="lbl">Tasa verificación</div></div>
    ${stats.totalBultos > 0 ? `<div class="kpi blue"><div class="val">${stats.totalBultos.toLocaleString('es-AR')}</div><div class="lbl">Bultos totales</div></div>` : '<div></div>'}
    ${stats.totalKg > 0    ? `<div class="kpi blue"><div class="val">${stats.totalKg.toLocaleString('es-AR')}</div><div class="lbl">Kg totales</div></div>` : '<div></div>'}
  </div>

  ${barrerasOrdenadas.length > 0 ? `
  <h2>Verificadas por barrera</h2>
  <table>
    <thead><tr>
      <th>Barrera</th>
      <th style="text-align:center">Verif.</th>
      <th style="text-align:center">Total</th>
      <th style="text-align:center">Tasa</th>
      <th style="text-align:right">Bultos</th>
      <th style="text-align:right">Kg</th>
    </tr></thead>
    <tbody>${filaBarreras}</tbody>
  </table>` : ''}

  ${especiesRanking.length > 0 ? `
  <h2>Productos más frecuentes</h2>
  <table>
    <thead><tr>
      <th>Especie / Producto</th>
      <th style="text-align:center">Guías</th>
      <th style="text-align:right">Bultos</th>
      <th style="text-align:right">Kg</th>
    </tr></thead>
    <tbody>${filaEspecies}</tbody>
  </table>` : ''}

  ${destinosTop.length > 0 ? `
  <h2>Principales destinos</h2>
  <table>
    <thead><tr>
      <th>Destino</th>
      <th style="text-align:center">Guías</th>
    </tr></thead>
    <tbody>${filaDestinos}</tbody>
  </table>` : ''}

  <div class="footer">Sistema SAVEAN — Agencia de Calidad San Juan &nbsp;|&nbsp; Reporte generado el ${generadoEn}</div>
</body>
</html>`;

  const ventana = window.open('', '_blank', 'width=900,height=700');
  if (!ventana) return;
  ventana.document.write(html);
  ventana.document.close();
  ventana.onload = () => { ventana.focus(); ventana.print(); };
}

// ── Gráfico de barras SVG ─────────────────────────────────────────────────────

type PuntoDato = { label: string; emitidas: number; verificadas: number };

function GraficoBarras({ datos }: { datos: PuntoDato[] }) {
  if (datos.length === 0) return null;
  const W = 600;
  const CHART_H = 80;
  const LABEL_H = 16;
  const TOTAL_H = CHART_H + LABEL_H;
  const maxVal = Math.max(...datos.map(d => d.emitidas), 1);
  const n = datos.length;
  const groupW = (W - 16) / n;
  const barW = Math.min(18, Math.max(3, groupW * 0.38));
  const mostrarLabels = n <= 32;

  return (
    <svg viewBox={`0 0 ${W} ${TOTAL_H}`} className="w-full" style={{ height: TOTAL_H + 4 }}>
      {datos.map((d, i) => {
        const gx = 8 + i * groupW;
        const cx = gx + groupW / 2;
        const ha = Math.max(2, (d.emitidas / maxVal) * CHART_H);
        const hb = d.verificadas > 0 ? Math.max(2, (d.verificadas / maxVal) * CHART_H) : 0;
        return (
          <g key={i}>
            {/* barra emitidas (naranja) */}
            <rect
              x={cx - barW - 1}
              y={CHART_H - ha}
              width={barW}
              height={ha}
              fill="#f97316"
              rx="1.5"
            />
            {/* barra verificadas (verde) */}
            {hb > 0 && (
              <rect
                x={cx + 1}
                y={CHART_H - hb}
                width={barW}
                height={hb}
                fill="#22c55e"
                rx="1.5"
              />
            )}
            {mostrarLabels && (
              <text
                x={cx}
                y={TOTAL_H - 2}
                textAnchor="middle"
                fontSize="7.5"
                fill="#9ca3af"
              >
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function SaveanReportes() {
  const { guias } = useSavean();
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [customDesde, setCustomDesde] = useState(isoPrimerMes());
  const [customHasta, setCustomHasta] = useState(isoHoy());
  const [especiesFiltro, setEspeciesFiltro] = useState<string[]>([]);

  const [desde, hasta] = useMemo((): [string, string] => {
    const hoy = isoHoy();
    if (periodo === 'semana') return [isoLunes(), hoy];
    if (periodo === 'mes')    return [isoPrimerMes(), hoy];
    if (periodo === 'año')    return [isoPrimerAnio(), hoy];
    return [customDesde, customHasta];
  }, [periodo, customDesde, customHasta]);

  const guiasFiltradas = useMemo(
    () => guias.filter(g => {
      const f = g.fechaEmision.slice(0, 10);
      return f >= desde && f <= hasta;
    }),
    [guias, desde, hasta],
  );

  // Especies disponibles en el período seleccionado (para el selector)
  const especiesDisponibles = useMemo(() => {
    const set = new Set<string>();
    for (const g of guiasFiltradas)
      for (const item of g.items)
        if (item.especie) set.add(item.especie);
    return [...set].sort();
  }, [guiasFiltradas]);

  const toggleEspecie = (esp: string) =>
    setEspeciesFiltro(prev =>
      prev.includes(esp) ? prev.filter(e => e !== esp) : [...prev, esp]
    );

  const stats = useMemo(() => {
    const byEstado: Record<string, number> = {};
    const byBarrera: Record<string, { total: number; verificadas: number; kg: number; bultos: number }> = {};
    const byEspecie: Record<string, { guias: number; bultos: number; kg: number }> = {};
    const byDestino: Record<string, number> = {};
    let totalBultos = 0;
    let totalKg = 0;
    let totalGuias = 0;

    const filtroActivo = especiesFiltro.length > 0;
    const filtroSet = new Set(especiesFiltro);

    for (const g of guiasFiltradas) {
      const items = filtroActivo
        ? g.items.filter(i => filtroSet.has(i.especie || ''))
        : g.items;

      if (filtroActivo && items.length === 0) continue;

      totalGuias++;
      byEstado[g.estado] = (byEstado[g.estado] ?? 0) + 1;

      const bar = g.barrieraNombre ?? 'Sin asignar';
      if (!byBarrera[bar]) byBarrera[bar] = { total: 0, verificadas: 0, kg: 0, bultos: 0 };
      byBarrera[bar].total++;
      if (g.estado === 'verificada') byBarrera[bar].verificadas++;

      const destRaw = g.destinoTipo === 'externo'
        ? (g.destinoPais ?? 'Exterior')
        : (g.destinoProvincia ?? 'Mercado Interno');
      byDestino[destRaw] = (byDestino[destRaw] ?? 0) + 1;

      for (const item of items) {
        const esp = item.especie || 'Sin especificar';
        if (!byEspecie[esp]) byEspecie[esp] = { guias: 0, bultos: 0, kg: 0 };
        byEspecie[esp].guias++;
        const bq = Number(item.cantidadBultos ?? 0);
        const kg = Number(item.cantidadKg ?? 0);
        byEspecie[esp].bultos += bq;
        byEspecie[esp].kg += kg;
        byBarrera[bar].bultos += bq;
        byBarrera[bar].kg += kg;
        totalBultos += bq;
        totalKg += kg;
      }
    }

    return { byEstado, byBarrera, byEspecie, byDestino, totalBultos, totalKg, totalGuias };
  }, [guiasFiltradas, especiesFiltro]);

  // ── Tendencia agrupada ──
  const tendencia = useMemo((): PuntoDato[] => {
    const spanMs = new Date(hasta).getTime() - new Date(desde).getTime();
    const spanDias = spanMs / (1000 * 60 * 60 * 24);
    const porMes = periodo === 'año' || (periodo === 'custom' && spanDias > 90);

    const filtroSet = new Set(especiesFiltro);
    const filtroActivo = especiesFiltro.length > 0;

    const grupos: Record<string, { emitidas: number; verificadas: number }> = {};
    for (const g of guiasFiltradas) {
      if (filtroActivo && !g.items.some(i => filtroSet.has(i.especie || ''))) continue;
      const key = porMes ? g.fechaEmision.slice(0, 7) : g.fechaEmision.slice(0, 10);
      if (!grupos[key]) grupos[key] = { emitidas: 0, verificadas: 0 };
      grupos[key].emitidas++;
      if (g.estado === 'verificada') grupos[key].verificadas++;
    }
    return Object.entries(grupos).sort().map(([k, v]) => ({
      label: porMes ? k.slice(5) : k.slice(8),
      ...v,
    }));
  }, [guiasFiltradas, periodo, desde, hasta, especiesFiltro]);

  // ── Derivados ──
  const total = stats.totalGuias;
  const verificadas = stats.byEstado['verificada'] ?? 0;
  const pendientes  = stats.byEstado['pendiente'] ?? 0;
  const denegadas   = stats.byEstado['denegada'] ?? 0;
  const vencidas    = stats.byEstado['vencida'] ?? 0;
  const tasaVerif   = total > 0 ? Math.round((verificadas / total) * 100) : 0;

  const especiesRanking = Object.entries(stats.byEspecie)
    .sort((a, b) => b[1].kg > 0 ? b[1].kg - a[1].kg : b[1].guias - a[1].guias)
    .slice(0, 10);
  const maxEsp = especiesRanking[0]?.[1].guias ?? 1;

  const barrerasOrdenadas = Object.entries(stats.byBarrera)
    .sort((a, b) => b[1].verificadas - a[1].verificadas);

  const destinosTop = Object.entries(stats.byDestino)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const TABS: { key: Periodo; label: string }[] = [
    { key: 'semana', label: 'Esta semana' },
    { key: 'mes',    label: 'Este mes' },
    { key: 'año',    label: 'Este año' },
    { key: 'custom', label: 'Personalizado' },
  ];

  const labelExport: Record<Periodo, string> = {
    semana: 'semana-actual',
    mes:    'mes-actual',
    año:    'anio-actual',
    custom: `${customDesde}_${customHasta}`,
  };

  return (
    <div className="space-y-5 text-sm max-w-5xl">

      {/* ── Selector de período ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-2 mb-3">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setPeriodo(t.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition ${
                periodo === t.key
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {periodo === 'custom' ? (
          <div className="flex flex-wrap gap-3 items-end pt-2 border-t border-gray-100">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Desde</label>
              <input
                type="date" value={customDesde}
                onChange={e => setCustomDesde(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hasta</label>
              <input
                type="date" value={customHasta}
                onChange={e => setCustomHasta(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400">{desde} → {hasta}</p>
        )}
      </div>

      {/* ── Filtro por producto/especie ── */}
      {especiesDisponibles.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Filtrar por producto</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {especiesFiltro.length === 0
                  ? 'Mostrando todos los productos'
                  : `Filtrando: ${especiesFiltro.join(', ')}`}
              </p>
            </div>
            {especiesFiltro.length > 0 && (
              <button
                onClick={() => setEspeciesFiltro([])}
                className="text-xs text-orange-500 hover:text-orange-700 font-semibold underline"
              >
                Limpiar filtro
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {especiesDisponibles.map(esp => {
              const activo = especiesFiltro.includes(esp);
              return (
                <button
                  key={esp}
                  onClick={() => toggleEspecie(esp)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                    activo
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                  }`}
                >
                  {esp}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Sin datos ── */}
      {total === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center shadow-sm">
          <p className="text-gray-400 font-semibold text-base mb-1">
            {especiesFiltro.length > 0
              ? `Sin guías con ${especiesFiltro.join(', ')} en este período`
              : 'Sin datos para este período'}
          </p>
          <p className="text-gray-400 text-xs">Probá con otro período o un rango de fechas más amplio.</p>
        </div>
      )}

      {total > 0 && (
        <>
          {/* ── Banner de filtro activo ── */}
          {especiesFiltro.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs text-orange-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
              Reporte filtrado por: {especiesFiltro.join(' · ')}
            </div>
          )}

          {/* ── KPIs ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Emitidas',     value: total,        color: 'text-gray-700  bg-gray-50    border-gray-200' },
              { label: 'Verificadas',  value: verificadas,  color: 'text-green-700 bg-green-50   border-green-200' },
              { label: 'Tasa verif.',  value: `${tasaVerif}%`, color: 'text-blue-700  bg-blue-50    border-blue-200' },
              { label: 'Pendientes',   value: pendientes,   color: 'text-orange-700 bg-orange-50  border-orange-200' },
              { label: 'Denegadas',    value: denegadas,    color: 'text-red-700   bg-red-50     border-red-200' },
              { label: 'Vencidas',     value: vencidas,     color: 'text-gray-500  bg-gray-50    border-gray-200' },
            ].map(kpi => (
              <div key={kpi.label} className={`rounded-xl border p-3 ${kpi.color}`}>
                <p className="text-xl font-extrabold leading-none">{kpi.value}</p>
                <p className="text-xs font-medium mt-1">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* ── Bultos y Kg ── */}
          {(stats.totalBultos > 0 || stats.totalKg > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {stats.totalBultos > 0 && (
                <div className="rounded-xl border bg-blue-50 text-blue-700 border-blue-200 p-4">
                  <p className="text-3xl font-extrabold leading-none">{fmtNum(stats.totalBultos)}</p>
                  <p className="text-xs font-medium mt-1.5">
                    Bultos totales
                    <span className="ml-2 text-blue-400 font-normal">{stats.totalBultos.toLocaleString('es-AR')}</span>
                  </p>
                </div>
              )}
              {stats.totalKg > 0 && (
                <div className="rounded-xl border bg-purple-50 text-purple-700 border-purple-200 p-4">
                  <p className="text-3xl font-extrabold leading-none">{fmtNum(stats.totalKg)}</p>
                  <p className="text-xs font-medium mt-1.5">
                    Kg totales
                    <span className="ml-2 text-purple-400 font-normal">{stats.totalKg.toLocaleString('es-AR')}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Tendencia ── */}
          {tendencia.length > 1 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-orange-500" />
                  <span className="font-bold text-gray-700 text-xs uppercase tracking-wide">
                    Tendencia {periodo === 'año' || (periodo === 'custom' && tendencia.length <= 12 && tendencia[0]?.label.length === 2) ? 'mensual' : 'diaria'}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-2.5 rounded-sm bg-orange-500 inline-block" />
                    Emitidas
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-2.5 rounded-sm bg-green-500 inline-block" />
                    Verificadas
                  </span>
                </div>
              </div>
              <GraficoBarras datos={tendencia} />
            </div>
          )}

          {/* ── Por barrera + Top especies ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Verificadas por barrera */}
            {barrerasOrdenadas.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={14} className="text-orange-500" />
                  <span className="font-bold text-gray-700 text-xs uppercase tracking-wide">
                    Verificadas por barrera
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-gray-500 pb-1.5 font-semibold pr-2">Barrera</th>
                        <th className="text-right text-gray-500 pb-1.5 font-semibold px-2">Verif.</th>
                        <th className="text-right text-gray-500 pb-1.5 font-semibold px-2">Total</th>
                        <th className="text-right text-gray-500 pb-1.5 font-semibold pl-2">Tasa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {barrerasOrdenadas.map(([bar, d]) => {
                        const tasa = d.total > 0 ? Math.round((d.verificadas / d.total) * 100) : 0;
                        return (
                          <tr key={bar} className="hover:bg-orange-50 transition-colors">
                            <td className="py-2 text-gray-800 pr-2 max-w-[120px] truncate">{bar}</td>
                            <td className="py-2 text-right font-bold text-green-700 px-2">{d.verificadas}</td>
                            <td className="py-2 text-right text-gray-500 px-2">{d.total}</td>
                            <td className="py-2 text-right pl-2">
                              <span className={`font-semibold ${tasa >= 80 ? 'text-green-600' : tasa >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                                {tasa}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {barrerasOrdenadas.some(([, d]) => d.kg > 0) && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Kg por barrera</p>
                    {barrerasOrdenadas.filter(([, d]) => d.kg > 0).map(([bar, d]) => {
                      const maxKg = Math.max(...barrerasOrdenadas.map(([, x]) => x.kg), 1);
                      return (
                        <div key={bar} className="mb-1.5">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-gray-700 truncate max-w-[130px]">{bar}</span>
                            <span className="text-gray-500 ml-2">{fmtNum(d.kg)} kg</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-400 rounded-full"
                              style={{ width: `${(d.kg / maxKg) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Top especies / productos */}
            {especiesRanking.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Package size={14} className="text-orange-500" />
                  <span className="font-bold text-gray-700 text-xs uppercase tracking-wide">
                    Productos más frecuentes
                  </span>
                </div>
                <div className="space-y-3">
                  {especiesRanking.map(([esp, d], idx) => (
                    <div key={esp}>
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className="text-gray-800 font-medium flex items-center gap-1.5">
                          {idx === 0 && (
                            <span className="text-orange-500 font-bold text-xs leading-none">★</span>
                          )}
                          {esp}
                        </span>
                        <span className="text-xs text-gray-400 shrink-0 ml-2">
                          {d.guias} guía{d.guias !== 1 ? 's' : ''}
                          {d.bultos > 0 && ` · ${fmtNum(d.bultos)} bultos`}
                          {d.kg > 0 && ` · ${fmtNum(d.kg)} kg`}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${idx === 0 ? 'bg-orange-500' : 'bg-orange-300'}`}
                          style={{ width: `${(d.guias / maxEsp) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Top destinos ── */}
          {destinosTop.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 size={14} className="text-orange-500" />
                <span className="font-bold text-gray-700 text-xs uppercase tracking-wide">Principales destinos</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {destinosTop.map(([dest, n], idx) => (
                  <div
                    key={dest}
                    className={`rounded-lg p-3 border ${
                      idx === 0
                        ? 'bg-orange-50 border-orange-200 text-orange-700'
                        : 'bg-gray-50 border-gray-100 text-gray-700'
                    }`}
                  >
                    <p className="font-extrabold text-xl leading-none">{n}</p>
                    <p className="text-xs mt-0.5 truncate" title={dest}>{dest}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Exportar ── */}
          {(() => {
            const filtroSet = new Set(especiesFiltro);
            const guiasExportar = especiesFiltro.length > 0
              ? guiasFiltradas.filter(g => g.items.some(i => filtroSet.has(i.especie || '')))
              : guiasFiltradas;
            const labelFinal = especiesFiltro.length > 0
              ? `${labelExport[periodo]}-${especiesFiltro.join('-')}`
              : labelExport[periodo];
            return (
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => exportarPDF(guiasExportar, desde, hasta, stats, labelFinal, especiesFiltro)}
                  className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                >
                  <FileText size={13} />
                  Exportar PDF
                </button>
                <button
                  onClick={() => exportarCSV(guiasExportar, labelFinal)}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                >
                  <Download size={13} />
                  Exportar CSV {guiasExportar.length !== guiasFiltradas.length && `(${guiasExportar.length} guías)`}
                </button>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
