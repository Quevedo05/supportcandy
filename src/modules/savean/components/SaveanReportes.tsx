import { useState, useMemo } from 'react';
import { useSavean } from '../context/SaveanContext';
import { GuiaSavean } from '../types/savean';
import { Download, TrendingUp, MapPin, Package, BarChart2 } from 'lucide-react';

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

function exportarCSV(guias: GuiaSavean[], label: string) {
  const headers = [
    'Número', 'Estado', 'Fecha Emisión', 'Fecha Verificación',
    'Remitente', 'RENSPA', 'Especies', 'Total Bultos', 'Total Kg',
    'Barrera', 'Inspector', 'Destino',
  ];
  const rows = guias.map(g => {
    const especies = [...new Set(g.items.map(i => i.especie).filter(Boolean))].join(' / ');
    const totalBultos = g.items.reduce((s, i) => s + (Number(i.cantidadBultos) || 0), 0);
    const totalKg = g.items.reduce((s, i) => s + (Number(i.cantidadKg) || 0), 0);
    const destino = g.destinoTipo === 'externo'
      ? (g.destinoPais ?? g.destinoPuntoSalida ?? 'Exterior')
      : (g.destinoProvincia ?? g.destinoMercadoInterno ?? 'Mercado Interno');
    return [
      g.numero, g.estado,
      g.fechaEmision.slice(0, 10),
      g.fechaVerificacion?.slice(0, 10) ?? '',
      g.remitenteNombre, g.remitenteRenspa ?? '',
      especies, totalBultos || '', totalKg || '',
      g.barrieraNombre ?? '', g.inspectorNombre ?? '', destino,
    ];
  });
  const csv = [headers, ...rows]
    .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte-savean-${label}-${isoHoy()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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

  const stats = useMemo(() => {
    const byEstado: Record<string, number> = {};
    const byBarrera: Record<string, { total: number; verificadas: number; kg: number; bultos: number }> = {};
    const byEspecie: Record<string, { guias: number; bultos: number; kg: number }> = {};
    const byDestino: Record<string, number> = {};
    let totalBultos = 0;
    let totalKg = 0;

    for (const g of guiasFiltradas) {
      byEstado[g.estado] = (byEstado[g.estado] ?? 0) + 1;

      const bar = g.barrieraNombre ?? 'Sin asignar';
      if (!byBarrera[bar]) byBarrera[bar] = { total: 0, verificadas: 0, kg: 0, bultos: 0 };
      byBarrera[bar].total++;
      if (g.estado === 'verificada') byBarrera[bar].verificadas++;

      const destRaw = g.destinoTipo === 'externo'
        ? (g.destinoPais ?? 'Exterior')
        : (g.destinoProvincia ?? 'Mercado Interno');
      byDestino[destRaw] = (byDestino[destRaw] ?? 0) + 1;

      for (const item of g.items) {
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

    return { byEstado, byBarrera, byEspecie, byDestino, totalBultos, totalKg };
  }, [guiasFiltradas]);

  // ── Tendencia agrupada ──
  const tendencia = useMemo((): PuntoDato[] => {
    const spanMs = new Date(hasta).getTime() - new Date(desde).getTime();
    const spanDias = spanMs / (1000 * 60 * 60 * 24);
    const porMes = periodo === 'año' || (periodo === 'custom' && spanDias > 90);

    const grupos: Record<string, { emitidas: number; verificadas: number }> = {};
    for (const g of guiasFiltradas) {
      const key = porMes ? g.fechaEmision.slice(0, 7) : g.fechaEmision.slice(0, 10);
      if (!grupos[key]) grupos[key] = { emitidas: 0, verificadas: 0 };
      grupos[key].emitidas++;
      if (g.estado === 'verificada') grupos[key].verificadas++;
    }
    return Object.entries(grupos).sort().map(([k, v]) => ({
      label: porMes ? k.slice(5) : k.slice(8),  // MM o DD
      ...v,
    }));
  }, [guiasFiltradas, periodo, desde, hasta]);

  // ── Derivados ──
  const total = guiasFiltradas.length;
  const verificadas = stats.byEstado['verificada'] ?? 0;
  const pendientes  = stats.byEstado['pendiente'] ?? 0;
  const denegadas   = stats.byEstado['denegada'] ?? 0;
  const vencidas    = stats.byEstado['vencida'] ?? 0;
  const tasaVerif   = total > 0 ? Math.round((verificadas / total) * 100) : 0;

  const especiesRanking = Object.entries(stats.byEspecie)
    .sort((a, b) => b[1].guias - a[1].guias)
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

      {/* ── Sin datos ── */}
      {total === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center shadow-sm">
          <p className="text-gray-400 font-semibold text-base mb-1">Sin datos para este período</p>
          <p className="text-gray-400 text-xs">Probá con otro período o un rango de fechas más amplio.</p>
        </div>
      )}

      {total > 0 && (
        <>
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
          <div className="flex justify-end">
            <button
              onClick={() => exportarCSV(guiasFiltradas, labelExport[periodo])}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
            >
              <Download size={13} />
              Exportar {guiasFiltradas.length} guías a CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
}
