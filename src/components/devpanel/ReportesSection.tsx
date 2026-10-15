import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Download } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ResumenTotales {
  total: number;
  cerrados: number;
  abiertos: number;
  ultimos30dias: number;
}

interface EtapaRow    { etapa: string; total: number }
interface EstadoRow   { estado: string; total: number }
interface ProgramaRow { programa: string; total: number }
interface PrioridadRow { prioridad: string; total: number }

interface ResumenData {
  totales: ResumenTotales;
  porEtapa: EtapaRow[];
  porEstado: EstadoRow[];
  porPrograma: ProgramaRow[];
  porPrioridad: PrioridadRow[];
}

interface MesRow { mes: string; creados: number; cerrados: number }
interface PeriodoData { meses: MesRow[] }

interface AgenteRow { nombre: string; total: number; abiertos: number; cerrados: number }
interface AgentesData { agentes: AgenteRow[] }

interface Guia {
  id: string;
  estado: 'pendiente' | 'verificada' | 'denegada' | 'vencida';
  fechaEmision: string;
  destinoTipo: string;
  barrieraNombre?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function Bar({ value, max, color = 'bg-violet-500' }: { value: number; max: number; color?: string }) {
  const w = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${w}%` }} />
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
      <p className="text-[12px] text-gray-400 mb-1">{label}</p>
      <p className="text-[28px] font-medium leading-none tracking-[-0.02em] text-gray-900">{value}</p>
      {sub && <p className="text-[12px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

const PRIORITY_COLOR: Record<string, string> = {
  alta:           'bg-red-400',
  media:          'bg-amber-400',
  baja:           'bg-green-400',
  sin_prioridad:  'bg-gray-300',
};

const ESTADO_COLOR: Record<string, string> = {
  pendiente:   'bg-amber-50 text-amber-700',
  verificada:  'bg-green-50 text-green-700',
  denegada:    'bg-red-50 text-red-600',
  vencida:     'bg-gray-100 text-gray-500',
};

// ── Mini bar chart (periodo) ───────────────────────────────────────────────────

function MiniBarChart({ meses }: { meses: MesRow[] }) {
  if (!meses.length) return null;
  const maxVal = Math.max(...meses.map(m => Math.max(m.creados, m.cerrados)), 1);
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-medium">Tickets por mes (últimos 12 meses)</h3>
        <div className="flex items-center gap-3 text-[12px] text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-violet-500 inline-block" />Creados</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-300 inline-block" />Cerrados</span>
        </div>
      </div>
      <div className="flex items-end gap-1.5 h-28">
        {meses.map(m => {
          const hCreados  = maxVal ? Math.round((m.creados  / maxVal) * 100) : 0;
          const hCerrados = maxVal ? Math.round((m.cerrados / maxVal) * 100) : 0;
          const label = m.mes.slice(5); // MM
          return (
            <div key={m.mes} className="flex-1 flex flex-col items-center gap-0.5 group relative">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center bg-gray-900 text-white text-[11px] rounded px-1.5 py-1 whitespace-nowrap z-10 pointer-events-none">
                <span>{m.mes}</span>
                <span>↑ {m.creados} · ↓ {m.cerrados}</span>
              </div>
              <div className="w-full flex items-end gap-0.5">
                <div className="flex-1 bg-violet-500 rounded-t-[2px] transition-all duration-500" style={{ height: `${hCreados}%`, minHeight: m.creados ? 2 : 0 }} />
                <div className="flex-1 bg-gray-300 rounded-t-[2px] transition-all duration-500" style={{ height: `${hCerrados}%`, minHeight: m.cerrados ? 2 : 0 }} />
              </div>
              <span className="text-[10px] text-gray-400">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── AGENCIA tab ───────────────────────────────────────────────────────────────

function AgenciaTab({ apiUrl, token }: { apiUrl: string; token: string | null }) {
  const [resumen, setResumen]   = useState<ResumenData | null>(null);
  const [periodo, setPeriodo]   = useState<PeriodoData | null>(null);
  const [agentes, setAgentes]   = useState<AgentesData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [exporting, setExport]  = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [rRes, pRes, aRes] = await Promise.all([
        fetch(`${apiUrl}/reportes/resumen`,        { headers }),
        fetch(`${apiUrl}/reportes/por-periodo`,    { headers }),
        fetch(`${apiUrl}/reportes/por-agente`,     { headers }),
      ]);
      if (!rRes.ok) throw new Error(`Error ${rRes.status} al cargar resumen`);
      const [r, p, a] = await Promise.all([rRes.json(), pRes.json(), aRes.json()]);
      setResumen(r);
      setPeriodo(p);
      setAgentes(a);
    } catch (e: any) { setError(e.message || 'Error al cargar reportes'); }
    finally { setLoading(false); }
  }, [apiUrl, token]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    if (!token) return;
    setExport(true);
    try {
      const res = await fetch(`${apiUrl}/reportes/exportar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tickets_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { alert(e.message); }
    finally { setExport(false); }
  };

  if (loading && !resumen) {
    return <div className="py-16 flex justify-center"><RefreshCw size={18} className="animate-spin text-gray-300" /></div>;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        {error && <span className="text-sm text-red-500">{error}</span>}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={load} className="h-9 w-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleExport} disabled={exporting}
            className="h-9 px-3 rounded-xl border border-gray-200 flex items-center gap-2 text-[13px] text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Totales */}
      {resumen && (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px,100%), 1fr))' }}>
          <StatTile label="Total tickets"      value={resumen.totales.total} />
          <StatTile label="Abiertos"           value={resumen.totales.abiertos} />
          <StatTile label="Cerrados"           value={resumen.totales.cerrados} sub={`${pct(resumen.totales.cerrados, resumen.totales.total)}% del total`} />
          <StatTile label="Últimos 30 días"    value={resumen.totales.ultimos30dias} />
        </div>
      )}

      {/* Gráfico periodo */}
      {periodo && <MiniBarChart meses={periodo.meses} />}

      {/* Distribuciones */}
      {resumen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Por programa */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
            <h3 className="text-[14px] font-medium mb-3">Por programa</h3>
            <div className="flex flex-col gap-2">
              {resumen.porPrograma.slice(0, 8).map(p => (
                <div key={p.programa} className="flex items-center gap-3">
                  <span className="text-[12.5px] text-gray-600 w-32 truncate flex-none" title={p.programa}>{p.programa}</span>
                  <Bar value={p.total} max={resumen.totales.total} />
                  <span className="text-[12px] font-mono text-gray-400 w-8 text-right flex-none">{p.total}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Por etapa */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
            <h3 className="text-[14px] font-medium mb-3">Por etapa</h3>
            <div className="flex flex-col gap-2">
              {resumen.porEtapa.slice(0, 8).map(e => (
                <div key={e.etapa} className="flex items-center gap-3">
                  <span className="text-[12.5px] text-gray-600 w-32 truncate flex-none" title={e.etapa}>{e.etapa}</span>
                  <Bar value={e.total} max={resumen.porEtapa[0]?.total ?? 1} />
                  <span className="text-[12px] font-mono text-gray-400 w-8 text-right flex-none">{e.total}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Por prioridad */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
            <h3 className="text-[14px] font-medium mb-3">Por prioridad</h3>
            <div className="flex flex-col gap-2">
              {resumen.porPrioridad.map(p => (
                <div key={p.prioridad} className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 w-32 flex-none">
                    <span className={`w-2 h-2 rounded-full flex-none ${PRIORITY_COLOR[p.prioridad] ?? 'bg-gray-300'}`} />
                    <span className="text-[12.5px] text-gray-600 capitalize truncate">{p.prioridad.replace('_', ' ')}</span>
                  </span>
                  <Bar value={p.total} max={resumen.totales.total} color={PRIORITY_COLOR[p.prioridad] ?? 'bg-gray-300'} />
                  <span className="text-[12px] font-mono text-gray-400 w-8 text-right flex-none">{p.total}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Por agente */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
            <h3 className="text-[14px] font-medium mb-3">Por agente</h3>
            {!agentes || agentes.agentes.length === 0
              ? <p className="text-[13px] text-gray-400">Sin datos de agentes</p>
              : (
                <div className="flex flex-col gap-2">
                  {agentes.agentes.slice(0, 8).map(a => (
                    <div key={a.nombre} className="flex items-center gap-3">
                      <span className="text-[12.5px] text-gray-600 w-32 truncate flex-none" title={a.nombre}>{a.nombre}</span>
                      <Bar value={a.total} max={agentes.agentes[0]?.total ?? 1} />
                      <span className="text-[12px] font-mono text-gray-400 w-8 text-right flex-none">{a.total}</span>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ── SAVEAN tab ────────────────────────────────────────────────────────────────

function SaveanTab({ apiUrl, token }: { apiUrl: string; token: string | null }) {
  const [guias, setGuias] = useState<Guia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${apiUrl}/savean/guias`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = await res.json();
      setGuias(d.guias ?? []);
    } catch (e: any) { setError(e.message || 'Error al cargar'); }
    finally { setLoading(false); }
  }, [apiUrl, token]);

  useEffect(() => { load(); }, [load]);

  const total      = guias.length;
  const pendiente  = guias.filter(g => g.estado === 'pendiente').length;
  const verificada = guias.filter(g => g.estado === 'verificada').length;
  const denegada   = guias.filter(g => g.estado === 'denegada').length;
  const vencida    = guias.filter(g => g.estado === 'vencida').length;

  // Distribución por destino
  const porDestino: Record<string, number> = {};
  for (const g of guias) {
    porDestino[g.destinoTipo] = (porDestino[g.destinoTipo] ?? 0) + 1;
  }
  const destinoRows = Object.entries(porDestino)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // Distribución por barrera (verificadas)
  const porBarrera: Record<string, number> = {};
  for (const g of guias.filter(g => g.estado === 'verificada' && g.barrieraNombre)) {
    const k = g.barrieraNombre!;
    porBarrera[k] = (porBarrera[k] ?? 0) + 1;
  }
  const barreraRows = Object.entries(porBarrera)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Guías por mes (últimos 6)
  const porMes: Record<string, number> = {};
  for (const g of guias) {
    const mes = g.fechaEmision?.slice(0, 7) ?? 'Sin fecha';
    porMes[mes] = (porMes[mes] ?? 0) + 1;
  }
  const mesRows = Object.entries(porMes)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6);

  if (loading && guias.length === 0) {
    return <div className="py-16 flex justify-center"><RefreshCw size={18} className="animate-spin text-gray-300" /></div>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-end">
        {error && <span className="text-sm text-red-500 mr-auto">{error}</span>}
        <button onClick={load} className="h-9 w-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Totales */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(140px,100%), 1fr))' }}>
        <StatTile label="Total guías"   value={total} />
        <StatTile label="Pendientes"    value={pendiente}  sub={`${pct(pendiente,  total)}%`} />
        <StatTile label="Verificadas"   value={verificada} sub={`${pct(verificada, total)}%`} />
        <StatTile label="Denegadas"     value={denegada}   sub={`${pct(denegada,   total)}%`} />
        <StatTile label="Vencidas"      value={vencida}    sub={`${pct(vencida,    total)}%`} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Por estado visual */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
          <h3 className="text-[14px] font-medium mb-3">Distribución por estado</h3>
          <div className="flex flex-col gap-2">
            {[
              { key: 'verificada', label: 'Verificada', v: verificada },
              { key: 'pendiente',  label: 'Pendiente',  v: pendiente  },
              { key: 'vencida',    label: 'Vencida',    v: vencida    },
              { key: 'denegada',   label: 'Denegada',   v: denegada   },
            ].map(({ key, label, v }) => (
              <div key={key} className="flex items-center gap-3">
                <span className={`text-[11.5px] px-2 py-0.5 rounded-[3px] w-24 text-center flex-none ${ESTADO_COLOR[key] ?? 'bg-gray-50 text-gray-500'}`}>{label}</span>
                <Bar value={v} max={total} color={
                  key === 'verificada' ? 'bg-green-400' :
                  key === 'pendiente'  ? 'bg-amber-400' :
                  key === 'denegada'   ? 'bg-red-400'   : 'bg-gray-300'
                } />
                <span className="text-[12px] font-mono text-gray-400 w-8 text-right flex-none">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Por tipo de destino */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
          <h3 className="text-[14px] font-medium mb-3">Por tipo de destino</h3>
          <div className="flex flex-col gap-2">
            {destinoRows.length === 0
              ? <p className="text-[13px] text-gray-400">Sin datos</p>
              : destinoRows.map(([destino, n]) => (
                <div key={destino} className="flex items-center gap-3">
                  <span className="text-[12.5px] text-gray-600 w-32 truncate flex-none capitalize" title={destino}>{destino.replace(/_/g, ' ')}</span>
                  <Bar value={n} max={destinoRows[0]?.[1] ?? 1} />
                  <span className="text-[12px] font-mono text-gray-400 w-8 text-right flex-none">{n}</span>
                </div>
              ))
            }
          </div>
        </div>

        {/* Por barrera (verificadas) */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
          <h3 className="text-[14px] font-medium mb-1">Verificadas por barrera</h3>
          <p className="text-[12px] text-gray-400 mb-3">Solo guías verificadas</p>
          <div className="flex flex-col gap-2">
            {barreraRows.length === 0
              ? <p className="text-[13px] text-gray-400">Sin datos</p>
              : barreraRows.map(([barrera, n]) => (
                <div key={barrera} className="flex items-center gap-3">
                  <span className="text-[12.5px] text-gray-600 w-28 truncate flex-none" title={barrera}>{barrera}</span>
                  <Bar value={n} max={barreraRows[0]?.[1] ?? 1} color="bg-emerald-400" />
                  <span className="text-[12px] font-mono text-gray-400 w-8 text-right flex-none">{n}</span>
                </div>
              ))
            }
          </div>
        </div>

        {/* Por mes */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
          <h3 className="text-[14px] font-medium mb-3">Guías por mes (últimos 6)</h3>
          {mesRows.length === 0
            ? <p className="text-[13px] text-gray-400">Sin datos</p>
            : (
              <div className="flex items-end gap-1.5 h-24">
                {mesRows.map(([mes, n]) => {
                  const maxN = Math.max(...mesRows.map(r => r[1]), 1);
                  const h = Math.round((n / maxN) * 100);
                  return (
                    <div key={mes} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-[11px] rounded px-1.5 py-0.5 whitespace-nowrap z-10 pointer-events-none">
                        {mes}: {n}
                      </div>
                      <div className="w-full bg-violet-400 rounded-t-[2px] transition-all duration-500" style={{ height: `${h}%`, minHeight: n ? 4 : 0 }} />
                      <span className="text-[10px] text-gray-400">{mes.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}

// ── ReportesSection ───────────────────────────────────────────────────────────

export function ReportesSection({ apiUrl, token }: { apiUrl: string; token: string | null }) {
  const [tab, setTab] = useState<'agencia' | 'savean'>('agencia');

  return (
    <div>
      <h1 className="text-[30px] font-medium leading-tight tracking-[-0.025em] text-gray-900 mb-6">Reportes</h1>

      <div className="flex gap-2 mb-6">
        {(['agencia', 'savean'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`h-9 px-4 rounded-xl text-[13px] uppercase tracking-wide transition ${
              tab === t
                ? 'bg-violet-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'agencia' && <AgenciaTab apiUrl={apiUrl} token={token} />}
      {tab === 'savean'  && <SaveanTab  apiUrl={apiUrl} token={token} />}
    </div>
  );
}
