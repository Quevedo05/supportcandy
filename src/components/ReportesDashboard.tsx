import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart2, Download, RefreshCw, Users, Clock, TrendingUp, FileText, ArrowLeft } from 'lucide-react';

const API = (import.meta.env as Record<string, string>).VITE_API_URL;

function authHeader(): HeadersInit {
  const token = localStorage.getItem('sc_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path: string, params?: Record<string, string>) {
  const url = new URL(`${API}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => { if (v) url.searchParams.set(k, v); });
  const res = await fetch(url.toString(), { headers: authHeader() });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

const ETAPAS = [
  'Solicitud inicial', 'Revisión de documentación', 'Documentación observada',
  'Veraz', 'Externo/ Comite de selección', 'Comité de análisis',
  'Contrato', 'Simulador', 'Firma de contrato', 'Certificación de firma',
  'Transferencia', 'Seguimiento de verificable', 'Seguimiento de cobranzas', 'Cerrado',
];

function ultimos12Meses(): { value: string; label: string }[] {
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const result = [];
  const hoy = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    result.push({ value, label: `${meses[d.getMonth()]} ${d.getFullYear()}` });
  }
  return result;
}

interface ResumenData {
  totales: { total: number; cerrados: number; abiertos: number; ultimos30dias: number };
  porEtapa: { etapa: string; total: number }[];
  porEstado: { estado: string; total: number }[];
  porPrograma: { programa: string; total: number }[];
  porPrioridad: { prioridad: string; total: number }[];
}

interface AgenteData { nombre: string; total: number; abiertos: number; cerrados: number }
interface PeriodoData { mes: string; creados: number; cerrados: number }
interface TiempoData {
  global: { promedioDias: number | null; minDias: number | null; maxDias: number | null; total: number };
  porPrograma: { programa: string; promedioDias: number; total: number }[];
  porEtapa: { etapa: string; promedioDias: number; promedioHoras: number; muestras: number }[];
}

const ESTADO_LABEL: Record<string, string> = {
  abierto: 'Abierto',
  en_progreso: 'En progreso',
  cerrado: 'Cerrado',
};

const ESTADO_COLOR: Record<string, string> = {
  abierto: 'bg-blue-100 text-blue-700',
  en_progreso: 'bg-amber-100 text-amber-700',
  cerrado: 'bg-green-100 text-green-700',
};

function Card({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">{children}</h2>;
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: (string | number | null)[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} className="px-4 py-6 text-center text-sm text-gray-400">Sin datos</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-gray-700">{cell ?? '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatMes(mes: string) {
  const [year, month] = mes.split('-');
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${meses[parseInt(month) - 1]} ${year}`;
}

export function ReportesDashboard({ onVolver }: { onVolver: () => void }) {
  const { logout } = useAuth();
  const [resumen, setResumen] = useState<ResumenData | null>(null);
  const [agentes, setAgentes] = useState<AgenteData[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoData[]>([]);
  const [tiempo, setTiempo] = useState<TiempoData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [filtros, setFiltros] = useState({ programa: '', mes: '', etapa: '' });

  const cargarTodo = useCallback(async (f = filtros) => {
    setCargando(true);
    setError(null);
    try {
      const p = { programa: f.programa, mes: f.mes, etapa: f.etapa };
      const [r, a, per, t] = await Promise.all([
        apiFetch('/reportes/resumen', p),
        apiFetch('/reportes/por-agente', p),
        apiFetch('/reportes/por-periodo', p),
        apiFetch('/reportes/tiempo-resolucion'),
      ]);
      setResumen(r);
      setAgentes(a.agentes);
      setPeriodos(per.meses);
      setTiempo(t);
    } catch {
      setError('No se pudieron cargar los reportes. Verificá tu conexión.');
    } finally {
      setCargando(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { cargarTodo(filtros); }, [filtros, cargarTodo]);

  const handleExportar = async () => {
    setExportando(true);
    try {
      const token = localStorage.getItem('sc_token');
      const res = await fetch(`${API}/reportes/exportar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tickets_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Error al exportar. Intentá de nuevo.');
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onVolver}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft size={16} />
              Volver
            </button>
            <div className="w-px h-5 bg-gray-200" />
            <div className="flex items-center gap-2">
              <BarChart2 size={18} className="text-blue-600" />
              <span className="font-semibold text-gray-800">Reportes y Estadísticas</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => cargarTodo(filtros)}
              disabled={cargando}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40"
            >
              <RefreshCw size={13} className={cargando ? 'animate-spin' : ''} />
              Actualizar
            </button>
            <button
              onClick={handleExportar}
              disabled={exportando || cargando}
              className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg px-3 py-1.5 font-medium transition-colors"
            >
              <Download size={13} />
              {exportando ? 'Exportando...' : 'Exportar CSV'}
            </button>
            <button
              onClick={logout}
              className="text-xs text-gray-400 hover:text-gray-600 ml-2 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Filtros */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filtrar:</span>

          <select
            value={filtros.programa}
            onChange={(e) => setFiltros((f) => ({ ...f, programa: e.target.value }))}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los programas</option>
            {(resumen?.porPrograma ?? []).filter((p) => p.programa !== 'Sin programa').map((p) => (
              <option key={p.programa} value={p.programa}>{p.programa}</option>
            ))}
          </select>

          <select
            value={filtros.mes}
            onChange={(e) => setFiltros((f) => ({ ...f, mes: e.target.value }))}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los meses</option>
            {ultimos12Meses().map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <select
            value={filtros.etapa}
            onChange={(e) => setFiltros((f) => ({ ...f, etapa: e.target.value }))}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las etapas</option>
            {ETAPAS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>

          {(filtros.programa || filtros.mes || filtros.etapa) && (
            <button
              onClick={() => setFiltros({ programa: '', mes: '', etapa: '' })}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {cargando ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <RefreshCw size={20} className="animate-spin mr-2" />
            Cargando datos...
          </div>
        ) : (
          <>
            {/* Cards resumen */}
            {resumen && (
              <section>
                <SectionTitle>Resumen general</SectionTitle>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card icon={FileText} label="Total tickets" value={resumen.totales.total} color="bg-blue-50 text-blue-600" />
                  <Card icon={TrendingUp} label="Abiertos" value={resumen.totales.abiertos} color="bg-amber-50 text-amber-600" />
                  <Card icon={FileText} label="Cerrados" value={resumen.totales.cerrados} color="bg-green-50 text-green-600" />
                  <Card icon={FileText} label="Últimos 30 días" value={resumen.totales.ultimos30dias} sub="tickets creados" color="bg-purple-50 text-purple-600" />
                </div>
              </section>
            )}

            {/* Por etapa y por estado */}
            {resumen && (
              <div className="grid md:grid-cols-2 gap-6">
                <section>
                  <SectionTitle>Tickets por etapa</SectionTitle>
                  <SimpleTable
                    headers={['Etapa', 'Cantidad']}
                    rows={resumen.porEtapa.map((r) => [r.etapa, r.total])}
                  />
                </section>
                <section>
                  <SectionTitle>Tickets por programa</SectionTitle>
                  <SimpleTable
                    headers={['Programa', 'Cantidad']}
                    rows={resumen.porPrograma.map((r) => [r.programa, r.total])}
                  />
                </section>
              </div>
            )}

            {/* Por período mensual */}
            <section>
              <SectionTitle>Tickets por mes (últimos 12 meses)</SectionTitle>
              <SimpleTable
                headers={['Mes', 'Creados', 'Cerrados', 'Pendientes']}
                rows={periodos.map((p) => [
                  formatMes(p.mes),
                  p.creados,
                  p.cerrados,
                  p.creados - p.cerrados,
                ])}
              />
            </section>

            {/* Por agente */}
            <section>
              <SectionTitle>
                <span className="flex items-center gap-2"><Users size={14} />Carga de trabajo por agente</span>
              </SectionTitle>
              <SimpleTable
                headers={['Agente', 'Total asignados', 'Abiertos', 'Cerrados']}
                rows={agentes.map((a) => [a.nombre, a.total, a.abiertos, a.cerrados])}
              />
            </section>

            {/* Tiempo de resolución */}
            {tiempo && (
              <section>
                <SectionTitle>
                  <span className="flex items-center gap-2"><Clock size={14} />Tiempo de resolución</span>
                </SectionTitle>

                {tiempo.global.total > 0 ? (
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <Card icon={Clock} label="Promedio global" value={`${tiempo.global.promedioDias ?? '—'} días`} sub={`${tiempo.global.total} tickets cerrados`} color="bg-blue-50 text-blue-600" />
                    <Card icon={Clock} label="Más rápido" value={`${tiempo.global.minDias ?? '—'} días`} color="bg-green-50 text-green-600" />
                    <Card icon={Clock} label="Más lento" value={`${tiempo.global.maxDias ?? '—'} días`} color="bg-red-50 text-red-600" />
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 mb-4">Aún no hay tickets cerrados para calcular tiempos.</p>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Por programa</p>
                    <SimpleTable
                      headers={['Programa', 'Promedio (días)', 'Tickets cerrados']}
                      rows={tiempo.porPrograma.map((r) => [r.programa, r.promedioDias, r.total])}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tiempo promedio en cada etapa</p>
                    {tiempo.porEtapa.length === 0 ? (
                      <div className="rounded-lg border border-gray-100 px-4 py-6 text-center text-sm text-gray-400 bg-white">
                        Los datos de tiempo por etapa se acumulan a partir de ahora. Aparecerán aquí a medida que los tickets avancen entre etapas.
                      </div>
                    ) : (
                      <SimpleTable
                        headers={['Etapa', 'Promedio', 'Muestras']}
                        rows={tiempo.porEtapa.map((r) => [
                          r.etapa,
                          r.promedioDias >= 1 ? `${r.promedioDias} días` : `${r.promedioHoras} hs`,
                          r.muestras,
                        ])}
                      />
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Por estado y prioridad */}
            {resumen && (
              <div className="grid md:grid-cols-2 gap-6">
                <section>
                  <SectionTitle>Por estado</SectionTitle>
                  <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                    {resumen.porEstado.map((r) => (
                      <div key={r.estado} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ESTADO_COLOR[r.estado] || 'bg-gray-100 text-gray-600'}`}>
                          {ESTADO_LABEL[r.estado] || r.estado}
                        </span>
                        <span className="font-bold text-gray-800">{r.total}</span>
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <SectionTitle>Por prioridad</SectionTitle>
                  <SimpleTable
                    headers={['Prioridad', 'Cantidad']}
                    rows={resumen.porPrioridad.map((r) => [r.prioridad, r.total])}
                  />
                </section>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
