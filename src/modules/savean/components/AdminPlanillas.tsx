import { useState, useEffect } from 'react';
import { useSavean } from '../context/SaveanContext';
import { ClipboardList, Filter, X, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const API_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:3000/api';
function getToken() { return localStorage.getItem('sc_token') || ''; }

function hoy() { return new Date().toISOString().slice(0, 10); }
function ayer(fecha: string) {
  const d = new Date(fecha + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
function manana(fecha: string) {
  const d = new Date(fecha + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
function fmtFechaLabel(s: string) {
  if (s === hoy()) return 'Hoy';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

interface EntradaPlanilla {
  id: string;
  tipoVehiculo: 'auto' | 'colectivo' | 'camion';
  patente: string;
  procedencia: string;
  decomisokKg?: number | null;
  decomisokFruta?: string | null;
  inspectorNombre: string;
  ingresoId?: string | null;
  fechaHora: string;
}

interface Planilla {
  id: string;
  barreraId: string;
  barreraNombre: string;
  fecha: string;
  horaInicio: string;
  horaCierre?: string | null;
  estado: 'abierta' | 'cerrada';
  serie: string;
  numeroSerie: number;
  entradas: EntradaPlanilla[];
  autosCount?: number;
  colectivosCount?: number;
  camionesCount?: number;
  totalCount?: number;
  conActaCount?: number;
}

function fmtHora(s: string) {
  if (!s) return '—';
  return s.slice(0, 5);
}

const TIPO_ICON: Record<string, string> = { auto: '🚗', colectivo: '🚌', camion: '🚛' };

// ─── Descarga del PDF de una planilla ─────────────────────────────────────────

async function descargarPlanillaPdf(id: string, barreraNombre: string, fecha: string) {
  const res = await fetch(`${API_URL}/savean/entrada/planillas/${id}/pdf`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Error al generar el PDF');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Planilla-${barreraNombre}-${fecha}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Fila de la tabla ─────────────────────────────────────────────────────────

function FilaPlanilla({
  planilla,
  onAbrir,
  descargando,
  onDescargar,
}: {
  planilla: Planilla;
  onAbrir: (id: string) => void;
  descargando: boolean;
  onDescargar: (e: React.MouseEvent) => void;
}) {
  const autos      = planilla.autosCount      ?? 0;
  const colectivos = planilla.colectivosCount ?? 0;
  const camiones   = planilla.camionesCount   ?? 0;
  const total      = planilla.totalCount      ?? 0;

  return (
    <tr
      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
      onClick={() => onAbrir(planilla.id)}
    >
      <td className="px-4 py-2.5 text-xs text-gray-700">{planilla.barreraNombre}</td>
      <td className="px-3 py-2.5 text-xs text-gray-500">
        {fmtHora(planilla.horaInicio)} — {planilla.horaCierre ? fmtHora(planilla.horaCierre) : 'en curso'}
      </td>
      <td className="px-3 py-2.5 text-xs text-center">{autos}</td>
      <td className="px-3 py-2.5 text-xs text-center">{colectivos}</td>
      <td className="px-3 py-2.5 text-xs text-center">{camiones}</td>
      <td className="px-3 py-2.5 text-xs text-center font-semibold text-gray-700">{total}</td>
      <td className="px-3 py-2.5">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          planilla.estado === 'abierta'
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-500'
        }`}>
          {planilla.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
        </span>
      </td>
      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
        <button
          onClick={onDescargar}
          disabled={descargando}
          title="Descargar planilla en PDF"
          className="flex items-center gap-1 text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 rounded-lg transition disabled:opacity-50"
        >
          {descargando
            ? <Loader2 size={12} className="animate-spin" />
            : <Download size={12} />
          }
          PDF
        </button>
      </td>
    </tr>
  );
}

// ─── Detalle de una planilla ───────────────────────────────────────────────────

function DetallePlanilla({
  planilla,
  onCerrar,
}: {
  planilla: Planilla;
  onCerrar: () => void;
}) {
  const [descargando, setDescargando] = useState(false);
  const [errDescarga, setErrDescarga] = useState('');

  const autos      = planilla.entradas.filter(e => e.tipoVehiculo === 'auto').length;
  const colectivos = planilla.entradas.filter(e => e.tipoVehiculo === 'colectivo').length;
  const camiones   = planilla.entradas.filter(e => e.tipoVehiculo === 'camion').length;

  const handleDescargar = async () => {
    setDescargando(true);
    setErrDescarga('');
    try {
      await descargarPlanillaPdf(planilla.id, planilla.barreraNombre, planilla.fecha);
    } catch {
      setErrDescarga('No se pudo generar el PDF.');
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra superior */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={onCerrar} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
            <ChevronLeft size={15} /> Volver
          </button>
          <h3 className="text-base font-bold text-gray-900">
            {planilla.barreraNombre} — {fmtFechaLabel(planilla.fecha)}
          </h3>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            planilla.estado === 'abierta' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {planilla.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {errDescarga && <p className="text-xs text-red-500">{errDescarga}</p>}
          <button
            onClick={handleDescargar}
            disabled={descargando}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
          >
            {descargando
              ? <Loader2 size={14} className="animate-spin" />
              : <Download size={14} />
            }
            {descargando ? 'Generando...' : 'Descargar PDF'}
          </button>
        </div>
      </div>

      {/* Totales */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: '🚗', label: 'Autos',      n: autos },
          { icon: '🚌', label: 'Colectivos', n: colectivos },
          { icon: '🚛', label: 'Camiones',   n: camiones },
          { icon: '📋', label: 'Con acta',   n: planilla.entradas.filter(e => e.ingresoId).length },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-lg">{s.icon}</p>
            <p className="text-xl font-bold text-gray-900">{s.n}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-500 flex gap-4">
        <span>Hora inicio: <strong>{fmtHora(planilla.horaInicio)}</strong></span>
        {planilla.horaCierre && <span>Hora cierre: <strong>{fmtHora(planilla.horaCierre)}</strong></span>}
        <span>Serie {planilla.serie} — N° {String(planilla.numeroSerie).padStart(8, '0')}</span>
      </div>

      {/* Tabla de entradas */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-gray-500 font-semibold uppercase tracking-wide">
              <th className="text-left px-4 py-2">#</th>
              <th className="text-left px-3 py-2">Tipo</th>
              <th className="text-left px-3 py-2">Patente</th>
              <th className="text-left px-3 py-2">Procedencia</th>
              <th className="text-left px-3 py-2">Decomiso</th>
              <th className="text-left px-3 py-2">Inspector</th>
              <th className="text-left px-3 py-2">Hora</th>
              <th className="text-center px-3 py-2">Acta</th>
            </tr>
          </thead>
          <tbody>
            {planilla.entradas.map((e, i) => (
              <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                <td className="px-3 py-2">{TIPO_ICON[e.tipoVehiculo]} {e.tipoVehiculo}</td>
                <td className="px-3 py-2 font-mono font-semibold">{e.patente}</td>
                <td className="px-3 py-2 text-gray-600">{e.procedencia}</td>
                <td className="px-3 py-2 text-orange-700">
                  {e.decomisokKg
                    ? `${e.decomisokKg} kg${e.decomisokFruta ? ` · ${e.decomisokFruta}` : ''}`
                    : '—'}
                </td>
                <td className="px-3 py-2 text-gray-500">{e.inspectorNombre}</td>
                <td className="px-3 py-2 text-gray-400">
                  {new Date(e.fechaHora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-3 py-2 text-center">
                  {e.ingresoId
                    ? <span className="text-green-600 font-bold">✓</span>
                    : <span className="text-gray-300">—</span>}
                </td>
              </tr>
            ))}
            {planilla.entradas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                  Sin registros en esta planilla.
                </td>
              </tr>
            )}
          </tbody>
          {planilla.entradas.length > 0 && (
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr className="font-bold text-gray-700">
                <td colSpan={3} className="px-4 py-2">TOTALES</td>
                <td className="px-3 py-2">{autos} autos · {colectivos} colec. · {camiones} cam.</td>
                <td colSpan={4} className="px-3 py-2">{planilla.entradas.length} vehículos</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ─── Panel principal ──────────────────────────────────────────────────────────

export function AdminPlanillas() {
  const { barreras } = useSavean();

  const [planillas, setPlanillas]     = useState<Planilla[]>([]);
  const [detalle, setDetalle]         = useState<Planilla | null>(null);
  const [cargando, setCargando]       = useState(true);
  const [err, setErr]                 = useState('');

  // Por defecto: hoy
  const [filtroFecha, setFiltroFecha]     = useState(hoy);
  const [filtroBarrera, setFiltroBarrera] = useState('');

  // Descarga por fila
  const [descargandoId, setDescargandoId] = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true);
    setErr('');
    try {
      const params = new URLSearchParams();
      params.set('fecha', filtroFecha);
      if (filtroBarrera) params.set('barreraId', filtroBarrera);
      const res = await fetch(`${API_URL}/savean/entrada/planillas?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) { setErr('Error al cargar.'); return; }
      setPlanillas(await res.json());
    } catch { setErr('Error de conexión.'); }
    finally { setCargando(false); }
  };

  const abrirDetalle = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/savean/entrada/planillas/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return;
      setDetalle(await res.json());
    } catch { /* silencioso */ }
  };

  const handleDescargarFila = async (e: React.MouseEvent, planilla: Planilla) => {
    e.stopPropagation();
    setDescargandoId(planilla.id);
    try {
      await descargarPlanillaPdf(planilla.id, planilla.barreraNombre, planilla.fecha);
    } catch {
      alert('No se pudo generar el PDF.');
    } finally {
      setDescargandoId(null);
    }
  };

  useEffect(() => { cargar(); }, [filtroFecha, filtroBarrera]);

  if (detalle) {
    return <DetallePlanilla planilla={detalle} onCerrar={() => setDetalle(null)} />;
  }

  const esHoy = filtroFecha === hoy();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ClipboardList size={18} className="text-gray-600" />
        <h2 className="text-base font-bold text-gray-900">Planillas de Control Diario</h2>
      </div>

      {/* Selector de día */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-3">
          <Filter size={13} /> Filtros
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Navegador de día */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFiltroFecha(ayer(filtroFecha))}
              className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-600 transition"
              title="Día anterior"
            >
              <ChevronLeft size={15} />
            </button>
            <div className="relative">
              <input
                type="date"
                max={hoy()}
                value={filtroFecha}
                onChange={e => setFiltroFecha(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 pr-24"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 pointer-events-none">
                {fmtFechaLabel(filtroFecha)}
              </span>
            </div>
            <button
              onClick={() => setFiltroFecha(manana(filtroFecha))}
              disabled={esHoy}
              className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-600 transition disabled:opacity-30 disabled:cursor-not-allowed"
              title="Día siguiente"
            >
              <ChevronRight size={15} />
            </button>
            {!esHoy && (
              <button
                onClick={() => setFiltroFecha(hoy())}
                className="text-xs px-3 py-1.5 bg-gray-900 hover:bg-gray-700 text-white rounded-lg transition font-semibold"
              >
                Hoy
              </button>
            )}
          </div>

          {/* Filtro barrera */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">Barrera:</label>
            <select
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
              value={filtroBarrera}
              onChange={e => setFiltroBarrera(e.target.value)}
            >
              <option value="">Todas</option>
              {barreras.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
            {filtroBarrera && (
              <button onClick={() => setFiltroBarrera('')} className="text-gray-400 hover:text-gray-700">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla */}
      {cargando && <div className="text-center py-12 text-sm text-gray-400">Cargando planillas...</div>}
      {err && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{err}</div>}

      {!cargando && !err && (
        planillas.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400">
            <ClipboardList size={32} className="mx-auto mb-3 text-gray-300" />
            No hay planillas para {esHoy ? 'hoy' : fmtFechaLabel(filtroFecha)}.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {planillas.length} planilla{planillas.length !== 1 ? 's' : ''} — {esHoy ? 'hoy' : fmtFechaLabel(filtroFecha)}
              </p>
              <p className="text-xs text-gray-400">
                Total: {planillas.reduce((s, p) => s + (p.totalCount ?? 0), 0)} vehículos
              </p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                  <th className="text-left px-4 py-2.5">Barrera</th>
                  <th className="text-left px-3 py-2.5">Horario</th>
                  <th className="text-center px-3 py-2.5">Autos</th>
                  <th className="text-center px-3 py-2.5">Colectivos</th>
                  <th className="text-center px-3 py-2.5">Camiones</th>
                  <th className="text-center px-3 py-2.5">Total</th>
                  <th className="px-3 py-2.5">Estado</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {planillas.map(p => (
                  <FilaPlanilla
                    key={p.id}
                    planilla={p}
                    onAbrir={abrirDetalle}
                    descargando={descargandoId === p.id}
                    onDescargar={e => handleDescargarFila(e, p)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
