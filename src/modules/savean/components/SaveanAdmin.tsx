import { useState, useEffect } from 'react';
import { useSavean } from '../context/SaveanContext';
import { GuiaDetalle } from './SaveanInspector';
import { GuiaSavean } from '../types/savean';
import {
  MapPin, RefreshCw, Clock, FileText, Shield, Eye,
  ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react';

// Extrae fecha local YYYY-MM-DD sin depender de UTC
function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Convierte cualquier ISO (timestamp o fecha sola) a fecha local YYYY-MM-DD
function localDateOf(iso: string) {
  if (!iso) return '';
  if (iso.length === 10) return iso; // ya es YYYY-MM-DD, no hay que convertir
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatFechaCorta(iso: string) {
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  const mes = d.toLocaleDateString('es-AR', { month: 'short' }).toUpperCase();
  return `${String(d.getDate()).padStart(2, '0')}/${mes}/${String(d.getFullYear()).slice(2)}`;
}

function mesLabel() {
  return new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    .replace(/^./, c => c.toUpperCase());
}

// ─── KPI card — toda la card es clickeable, sin texto "Ver listado" ──────────
function KPI({ label, value, color = 'gray', onClick }: { label: string; value: number | string; color?: string; onClick?: () => void }) {
  const top: Record<string, string> = {
    orange: 'border-t-2 border-orange-500', green: 'border-t-2 border-green-500',
    red:    'border-t-2 border-red-500',    yellow: 'border-t-2 border-amber-400',
    gray:   'border-t-2 border-gray-300',   blue:   'border-t-2 border-blue-500',
  };
  const num: Record<string, string> = {
    orange: 'text-gray-900', green: 'text-green-700', red: 'text-red-700',
    yellow: 'text-amber-700', gray: 'text-gray-400', blue: 'text-blue-700',
  };
  return (
    <div
      className={`bg-white border border-gray-200 ${top[color] ?? top.gray} p-4 ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''} transition`}
      onClick={onClick}
    >
      <p className={`text-3xl font-bold leading-none ${num[color] ?? num.gray}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-2 font-medium uppercase tracking-wide leading-tight">{label}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 px-4 py-3 text-center">
      <p className="text-xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

function SectionHeader({ title, badge, icon }: { title: string; badge?: number | string; icon?: JSX.Element }) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
      {icon && <span className="text-gray-500">{icon}</span>}
      <h3 className="font-semibold text-gray-600 text-xs uppercase tracking-wider">{title}</h3>
      {badge != null && (
        <span className="ml-1 bg-gray-700 text-white text-xs font-bold px-2 py-0.5 rounded">{badge}</span>
      )}
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const cls: Record<string, string> = {
    pendiente: 'bg-amber-100 text-amber-800', verificada: 'bg-green-100 text-green-800',
    denegada: 'bg-red-100 text-red-800',      vencida: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${cls[estado] ?? 'bg-gray-100 text-gray-600'}`}>
      {estado}
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function SaveanAdmin() {
  const { guias, barreras } = useSavean();

  const [guiaVista, setGuiaVista]                 = useState<GuiaSavean | null>(null);
  const [kpiModal, setKpiModal]                   = useState<{ title: string; guias: GuiaSavean[] } | null>(null);
  const [fechaFiltro, setFechaFiltro]             = useState(hoyISO());
  const [busquedaPendientes, setBusquedaPendientes] = useState('');
  const [verTodasGuias, setVerTodasGuias]         = useState(false);
  const [verTodasPendientes, setVerTodasPendientes] = useState(false);
  const [ultimaAct, setUltimaAct]                 = useState(() => new Date());

  useEffect(() => { setUltimaAct(new Date()); }, [guias]);

  // ── KPIs (basados en fecha local) ─────────────────────────────────────────
  const hoy = hoyISO();

  const guiasEmitidasHoy     = guias.filter(g => localDateOf(g.fechaEmision) === hoy);
  const guiasVerificadasHoy  = guias.filter(g => g.estado === 'verificada' && localDateOf(g.fechaVerificacion ?? '') === hoy);
  const guiasPendientesAhora = guias.filter(g => g.estado === 'pendiente');
  const guiasDenegadasHoy    = guias.filter(g => g.estado === 'denegada' && localDateOf(g.fechaVerificacion ?? '') === hoy);
  const guiasVencidas        = guias.filter(g => g.estado === 'vencida');

  const emitidasHoy     = guiasEmitidasHoy.length;
  const verificadasHoy  = guiasVerificadasHoy.length;
  const pendientesAhora = guiasPendientesAhora.length;
  const denegadasHoy    = guiasDenegadasHoy.length;
  const vencidasTotal   = guiasVencidas.length;

  // ── Mes ──────────────────────────────────────────────────────────────────
  const mesActual      = hoy.slice(0, 7);
  const guiasMes       = guias.filter(g => localDateOf(g.fechaEmision).slice(0, 7) === mesActual);
  const emitidasMes    = guiasMes.length;
  const verificadasMes = guiasMes.filter(g => g.estado === 'verificada').length;
  const pendientesMes  = guiasMes.filter(g => g.estado === 'pendiente').length;
  const denegadasMes   = guiasMes.filter(g => g.estado === 'denegada').length;
  const tasaVerifMes   = emitidasMes > 0 ? Math.round(verificadasMes / emitidasMes * 100) : 0;

  // ── Personal activo por fecha seleccionada (unifica barreristas + inspectores) ──
  const guiasFecha = guias.filter(g => localDateOf(g.fechaVerificacion ?? '') === fechaFiltro);
  const personalActivo = [...new Set(guiasFecha.filter(g => g.inspectorUsuario).map(g => g.inspectorUsuario!))].map(usr => {
    const ug = guiasFecha.filter(g => g.inspectorUsuario === usr);
    const barreraId = ug[ug.length - 1]?.barreraId;
    return {
      usuario:     usr,
      nombre:      ug[0]?.inspectorNombre ?? usr,
      barrera:     barreras.find(b => b.id === barreraId)?.nombre ?? '—',
      verificadas: ug.filter(g => g.estado === 'verificada').length,
      denegadas:   ug.filter(g => g.estado === 'denegada').length,
    };
  });

  // ── Barreras por fecha (sin columnas Emit. ni Pend.) ─────────────────────
  const barrerasStats = barreras.map(b => {
    const bg = guiasFecha.filter(g => g.barreraId === b.id);
    return {
      nombre:      b.nombre,
      verificadas: bg.filter(g => g.estado === 'verificada').length,
      denegadas:   bg.filter(g => g.estado === 'denegada').length,
    };
  });

  // ── Registro de verificaciones de hoy ────────────────────────────────────
  const registroHoy = guias
    .filter(g => localDateOf(g.fechaVerificacion ?? '') === hoy)
    .sort((a, b) => new Date(b.fechaVerificacion!).getTime() - new Date(a.fechaVerificacion!).getTime());

  // ── Últimas guías emitidas ────────────────────────────────────────────────
  const ultimasGuias   = [...guias].sort((a, b) => new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime());
  const guiasMostradas = verTodasGuias ? ultimasGuias : ultimasGuias.slice(0, 5);

  // ── Pendientes con alerta de vencimiento ─────────────────────────────────
  const pendientes = guias
    .filter(g => g.estado === 'pendiente')
    .filter(g => {
      if (!busquedaPendientes) return true;
      const q = busquedaPendientes.toLowerCase();
      return g.numero.toLowerCase().includes(q) || g.remitenteNombre.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime());

  const pendientesMostradas = verTodasPendientes ? pendientes : pendientes.slice(0, 5);
  const vencenHoy = pendientes.filter(g => localDateOf(g.fechaVencimiento) === hoy).length;

  // ── Tendencia últimos 30 días ─────────────────────────────────────────────
  const diasTendencia = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const tendencia = diasTendencia.map(dia => ({
    dia,
    emitidas:    guias.filter(g => localDateOf(g.fechaEmision) === dia).length,
    verificadas: guias.filter(g => localDateOf(g.fechaVerificacion ?? '') === dia).length,
  }));
  const maxTend = Math.max(...tendencia.map(d => Math.max(d.emitidas, d.verificadas)), 1);

  // ── Vencidas por remitente ────────────────────────────────────────────────
  const vencidasPorRemitente = guiasVencidas.reduce<Record<string, number>>((acc, g) => {
    acc[g.remitenteNombre] = (acc[g.remitenteNombre] ?? 0) + 1;
    return acc;
  }, {});
  const rankingVencidas = Object.entries(vencidasPorRemitente).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const openGuiaFromModal = (g: GuiaSavean) => { setKpiModal(null); setGuiaVista(g); };

  if (guiaVista) return <GuiaDetalle guia={guiaVista} onVolver={() => setGuiaVista(null)} abiertaPorQR={true} />;

  return (
    <div className="space-y-4 text-sm">

      {/* ── BARRA DE FECHA + TIMESTAMP ── */}
      <div className="bg-white border border-gray-200 px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="text-gray-500 font-medium text-xs uppercase tracking-wide">Fecha:</span>
        <input
          type="date"
          value={fechaFiltro}
          onChange={e => setFechaFiltro(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
        <button
          onClick={() => setFechaFiltro(hoyISO())}
          className="flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold px-4 py-1.5 rounded transition whitespace-nowrap"
        >
          <RefreshCw size={12} /> Hoy
        </button>
        <span className="text-xs text-gray-400 ml-auto">
          Actualización cada 30s · última: {ultimaAct.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>

      {/* ── KPIs — 5 cols, rojo solo si > 0 ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-0 border border-gray-200 divide-x divide-gray-200">
        <KPI label="Emitidas hoy"    value={emitidasHoy}     color="blue"                              onClick={() => setKpiModal({ title: 'Emitidas hoy', guias: guiasEmitidasHoy })} />
        <KPI label="Verificadas hoy" value={verificadasHoy}  color="green"                             onClick={() => setKpiModal({ title: 'Verificadas hoy', guias: guiasVerificadasHoy })} />
        <KPI label="Pendientes"      value={pendientesAhora} color="yellow"                            onClick={() => setKpiModal({ title: 'Pendientes ahora', guias: guiasPendientesAhora })} />
        <KPI label="Denegadas hoy"   value={denegadasHoy}    color={denegadasHoy > 0 ? 'red' : 'gray'} onClick={() => setKpiModal({ title: 'Denegadas hoy', guias: guiasDenegadasHoy })} />
        <KPI label="Vencidas"        value={vencidasTotal}   color="gray"                              onClick={() => setKpiModal({ title: 'Vencidas', guias: guiasVencidas })} />
      </div>

      {/* ── STATS DEL MES + TASA ── */}
      <div className="bg-white border border-gray-200 px-4 py-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">{mesLabel()}</p>
        <div className="grid grid-cols-5 gap-0 divide-x divide-gray-200 border border-gray-200">
          <MiniStat label="Emitidas"    value={emitidasMes} />
          <MiniStat label="Verificadas" value={verificadasMes} />
          <MiniStat label="Pendientes"  value={pendientesMes} />
          <MiniStat label="Denegadas"   value={denegadasMes} />
          <MiniStat label="Tasa verif." value={`${tasaVerifMes}%`} />
        </div>
      </div>

      {/* ── TENDENCIA 30 DÍAS ── */}
      <div className="bg-white border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
          <h3 className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Tendencia — últimos 30 días</h3>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block" />Emitidas</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />Verificadas</span>
          </div>
        </div>
        <svg viewBox="0 0 500 60" className="w-full" style={{ height: '60px' }}>
          {tendencia.map((d, i) => {
            const slotW = 500 / tendencia.length;
            const bW = Math.max(Math.floor(slotW) - 2, 2);
            const x  = i * slotW + 1;
            const hE = d.emitidas    > 0 ? Math.max((d.emitidas    / maxTend) * 58, 2) : 0;
            const hV = d.verificadas > 0 ? Math.max((d.verificadas / maxTend) * 58, 2) : 0;
            return (
              <g key={d.dia}>
                <rect x={x}           y={60 - hE} width={bW / 2} height={hE} fill="#60a5fa" />
                <rect x={x + bW / 2}  y={60 - hV} width={bW / 2} height={hV} fill="#22c55e" />
              </g>
            );
          })}
        </svg>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{new Date(Date.now() - 29 * 86400000).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}</span>
          <span>hoy</span>
        </div>
      </div>

      {/* ── ACTIVIDAD — 2 cols ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Izquierda: personal activo (barreristas + inspectores unificado) */}
        <div className="bg-white border border-gray-200 p-4">
          <SectionHeader title={`Personal activo — ${formatFecha(fechaFiltro)}`} badge={personalActivo.length} icon={<Shield size={14} />} />
          {personalActivo.length === 0 ? (
            <p className="text-gray-400 text-xs py-2">Sin actividad en la fecha seleccionada.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b">
                  <th className="text-left pb-1 font-medium">Nombre</th>
                  <th className="text-left pb-1 font-medium">Barrera</th>
                  <th className="text-center pb-1 font-medium">Verif.</th>
                  <th className="text-center pb-1 font-medium">Deneg.</th>
                </tr>
              </thead>
              <tbody>
                {personalActivo.map(p => (
                  <tr key={p.usuario} className="border-b border-gray-50">
                    <td className="py-1.5 font-semibold text-gray-800">{p.nombre}</td>
                    <td className="py-1.5 text-gray-500">{p.barrera}</td>
                    <td className="py-1.5 text-center font-bold text-green-700">{p.verificadas}</td>
                    <td className={`py-1.5 text-center font-bold ${p.denegadas > 0 ? 'text-red-600' : 'text-gray-400'}`}>{p.denegadas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Derecha: barreras + verificaciones hoy */}
        <div className="space-y-4">

          <div className="bg-white border border-gray-200 p-4">
            <SectionHeader title={`Barreras — ${formatFecha(fechaFiltro)}`} icon={<MapPin size={14} />} />
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b">
                  <th className="text-left pb-1 font-medium">Barrera</th>
                  <th className="text-center pb-1 font-medium">Verif.</th>
                  <th className="text-center pb-1 font-medium">Deneg.</th>
                </tr>
              </thead>
              <tbody>
                {barrerasStats.map(b => (
                  <tr key={b.nombre} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-700 font-medium">{b.nombre}</td>
                    <td className="py-1.5 text-center text-green-700 font-semibold">{b.verificadas || 0}</td>
                    <td className={`py-1.5 text-center font-semibold ${b.denegadas > 0 ? 'text-red-600' : 'text-gray-400'}`}>{b.denegadas || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <SectionHeader title="Verificaciones de hoy" badge={registroHoy.length} icon={<Clock size={14} />} />
            {registroHoy.length === 0 ? (
              <p className="text-gray-400 text-xs py-2">Sin verificaciones hoy.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b">
                      <th className="text-left pb-1 font-medium">N° Guía</th>
                      <th className="text-left pb-1 font-medium">Hora</th>
                      <th className="text-left pb-1 font-medium">Barrera</th>
                      <th className="pb-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {registroHoy.map(g => (
                      <tr key={g.id} className="border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer" onClick={() => setGuiaVista(g)}>
                        <td className="py-1.5 font-mono font-semibold text-gray-800">{g.numero}</td>
                        <td className="py-1.5 text-gray-500 font-mono">
                          {new Date(g.fechaVerificacion!).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-1.5 text-gray-500">{barreras.find(b => b.id === g.barreraId)?.nombre ?? '—'}</td>
                        <td className="py-1.5 text-right pr-1"><Eye size={12} className="text-gray-400" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── GUÍAS — 2 cols ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Últimas guías emitidas */}
        <div className="bg-white border border-gray-200 p-4">
          <SectionHeader title="Últimas guías emitidas" icon={<FileText size={14} />} />
          {ultimasGuias.length === 0 ? (
            <p className="text-gray-400 text-xs py-2">Sin guías registradas.</p>
          ) : (
            <>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b">
                    <th className="text-left pb-1 font-medium">N° Guía</th>
                    <th className="text-left pb-1 font-medium">Estado</th>
                    <th className="text-left pb-1 font-medium">Remitente</th>
                    <th className="pb-1" />
                  </tr>
                </thead>
                <tbody>
                  {guiasMostradas.map(g => (
                    <tr key={g.id} className="border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer" onClick={() => setGuiaVista(g)}>
                      <td className="py-1.5 font-mono font-semibold text-gray-800">{g.numero}</td>
                      <td className="py-1.5"><EstadoBadge estado={g.estado} /></td>
                      <td className="py-1.5 text-gray-600">{g.remitenteNombre}</td>
                      <td className="py-1.5 text-right pr-1"><Eye size={12} className="text-gray-400" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!verTodasGuias && ultimasGuias.length > 5 && (
                <button onClick={() => setVerTodasGuias(true)} className="mt-3 text-xs text-gray-500 hover:text-gray-800 font-medium flex items-center gap-1">
                  <ChevronDown size={12} /> Ver todas ({ultimasGuias.length})
                </button>
              )}
              {verTodasGuias && (
                <button onClick={() => setVerTodasGuias(false)} className="mt-3 text-xs text-gray-500 hover:text-gray-800 font-medium flex items-center gap-1">
                  <ChevronUp size={12} /> Ver menos
                </button>
              )}
            </>
          )}
        </div>

        {/* Guías pendientes con alerta de vencimiento */}
        <div className="bg-white border border-gray-200 p-4">
          <SectionHeader title="Guías pendientes" badge={pendientesAhora} icon={<Clock size={14} />} />
          {vencenHoy > 0 && (
            <div className="mb-3 bg-amber-50 border border-amber-200 rounded px-3 py-2 text-xs text-amber-800 font-medium flex items-center gap-1.5">
              <AlertTriangle size={13} />
              {vencenHoy} guía{vencenHoy !== 1 ? 's' : ''} vence{vencenHoy !== 1 ? 'n' : ''} hoy
            </div>
          )}
          <input
            type="text"
            value={busquedaPendientes}
            onChange={e => setBusquedaPendientes(e.target.value)}
            placeholder="Buscar guía o remitente..."
            className="w-full mb-3 border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          {pendientes.length === 0 ? (
            <p className="text-gray-400 text-xs py-2">No hay guías pendientes.</p>
          ) : (
            <>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b">
                    <th className="text-left pb-1 font-medium">N° Guía</th>
                    <th className="text-left pb-1 font-medium">Remitente</th>
                    <th className="text-left pb-1 font-medium">Venc.</th>
                    <th className="pb-1" />
                  </tr>
                </thead>
                <tbody>
                  {pendientesMostradas.map(g => {
                    const venceHoy = localDateOf(g.fechaVencimiento) === hoy;
                    return (
                      <tr
                        key={g.id}
                        className={`border-b hover:bg-gray-50 transition cursor-pointer ${venceHoy ? 'bg-amber-50' : 'border-gray-50'}`}
                        onClick={() => setGuiaVista(g)}
                      >
                        <td className="py-1.5 font-mono font-semibold text-gray-800">{g.numero}</td>
                        <td className="py-1.5 text-gray-600">{g.remitenteNombre}</td>
                        <td className={`py-1.5 font-medium ${venceHoy ? 'text-amber-700' : 'text-gray-500'}`}>
                          {formatFechaCorta(g.fechaVencimiento)}
                        </td>
                        <td className="py-1.5 text-right pr-1"><Eye size={12} className="text-gray-400" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!verTodasPendientes && pendientes.length > 5 && (
                <button onClick={() => setVerTodasPendientes(true)} className="mt-3 text-xs text-gray-500 hover:text-gray-800 font-medium flex items-center gap-1">
                  <ChevronDown size={12} /> Ver todas ({pendientes.length})
                </button>
              )}
              {verTodasPendientes && (
                <button onClick={() => setVerTodasPendientes(false)} className="mt-3 text-xs text-gray-500 hover:text-gray-800 font-medium flex items-center gap-1">
                  <ChevronUp size={12} /> Ver menos
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── VENCIDAS POR REMITENTE ── */}
      {guiasVencidas.length > 0 && (
        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
            <span className="text-gray-500"><AlertTriangle size={14} /></span>
            <h3 className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Vencidas por remitente</h3>
            <span className="ml-1 bg-gray-700 text-white text-xs font-bold px-2 py-0.5 rounded">{guiasVencidas.length}</span>
            <span className="ml-auto text-xs text-gray-400">
              {guias.length > 0 ? ((guiasVencidas.length / guias.length) * 100).toFixed(1) : 0}% del total emitido
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {rankingVencidas.map(([nombre, count]) => (
              <button
                key={nombre}
                onClick={() => setKpiModal({ title: `Vencidas — ${nombre}`, guias: guiasVencidas.filter(g => g.remitenteNombre === nombre) })}
                className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded px-3 py-2 text-xs transition text-left"
              >
                <span className="text-gray-700 truncate mr-2">{nombre}</span>
                <span className="font-bold text-gray-900 flex-shrink-0">{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL KPI ── */}
      {kpiModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-16 px-4" onClick={() => setKpiModal(null)}>
          <div className="bg-white shadow-xl w-full max-w-2xl max-h-[75vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">{kpiModal.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{kpiModal.guias.length} guía{kpiModal.guias.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setKpiModal(null)} className="text-gray-400 hover:text-gray-700 text-xl font-bold leading-none">×</button>
            </div>
            {kpiModal.guias.length === 0 ? (
              <p className="text-gray-400 text-sm px-5 py-6">No hay guías en esta categoría.</p>
            ) : (
              <div className="overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                    <tr className="text-gray-400">
                      <th className="text-left px-5 py-2 font-medium">N° Guía</th>
                      <th className="text-left px-3 py-2 font-medium">Estado</th>
                      <th className="text-left px-3 py-2 font-medium">Remitente</th>
                      <th className="text-left px-3 py-2 font-medium">Inspector</th>
                      <th className="text-left px-3 py-2 font-medium">Fecha emisión</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {kpiModal.guias.map(g => (
                      <tr key={g.id} className="border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer" onClick={() => openGuiaFromModal(g)}>
                        <td className="px-5 py-2 font-mono font-semibold text-gray-800">{g.numero}</td>
                        <td className="px-3 py-2"><EstadoBadge estado={g.estado} /></td>
                        <td className="px-3 py-2 text-gray-700">{g.remitenteNombre}</td>
                        <td className="px-3 py-2 text-gray-500">{g.inspectorNombre ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-400">{formatFecha(g.fechaEmision)}</td>
                        <td className="px-3 py-2 text-right"><Eye size={12} className="text-gray-400" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
