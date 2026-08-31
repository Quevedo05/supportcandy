import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useSavean } from '../context/SaveanContext';
import { GuiaDetalle } from './SaveanInspector';
import { GuiaSavean } from '../types/savean';
import {
  Users, MapPin, Plus, RefreshCw, Clock,
  FileText, Shield, Trash2, UserPlus, Eye,
  ChevronDown, ChevronUp,
} from 'lucide-react';

const API_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:3000/api';
function getToken() { return localStorage.getItem('sc_token') || ''; }

function hoyISO() { return new Date().toISOString().slice(0, 10); }

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatFechaCorta(iso: string) {
  const d = new Date(iso);
  const mes = d.toLocaleDateString('es-AR', { month: 'short' }).toUpperCase();
  return `${String(d.getDate()).padStart(2, '0')}/${mes}/${String(d.getFullYear()).slice(2)}`;
}

function mesLabel() {
  return new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    .replace(/^./, (c) => c.toUpperCase());
}

// ─── KPI card ────────────────────────────────────────────────────────────────
function KPI({ label, value, color = 'gray', onClick }: { label: string; value: number | string; color?: string; onClick?: () => void }) {
  const top: Record<string, string> = {
    orange: 'border-t-2 border-orange-500',
    green:  'border-t-2 border-green-500',
    red:    'border-t-2 border-red-500',
    yellow: 'border-t-2 border-amber-400',
    gray:   'border-t-2 border-gray-400',
    blue:   'border-t-2 border-blue-500',
  };
  const num: Record<string, string> = {
    orange: 'text-gray-900', green: 'text-green-700', red: 'text-red-700',
    yellow: 'text-amber-700', gray: 'text-gray-500', blue: 'text-blue-700',
  };
  return (
    <div
      className={`bg-white border border-gray-200 ${top[color] ?? top.gray} p-4 ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''} transition`}
      onClick={onClick}
    >
      <p className={`text-3xl font-bold leading-none ${num[color] ?? num.gray}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-2 font-medium uppercase tracking-wide leading-tight">{label}</p>
      {onClick && <p className="text-xs text-gray-400 mt-1.5">Ver listado →</p>}
    </div>
  );
}

// ─── Mini stat (mes) ─────────────────────────────────────────────────────────
function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 border border-gray-200 px-4 py-3 text-center">
      <p className="text-xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
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

// ─── Estado badge ─────────────────────────────────────────────────────────────
function EstadoBadge({ estado }: { estado: string }) {
  const cls: Record<string, string> = {
    pendiente: 'bg-amber-100 text-amber-800',
    verificada: 'bg-green-100 text-green-800',
    denegada: 'bg-red-100 text-red-800',
    vencida: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${cls[estado] ?? 'bg-gray-100 text-gray-600'}`}>
      {estado}
    </span>
  );
}

const btnPrimary = 'flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold px-4 py-1.5 rounded transition whitespace-nowrap';
const btnDanger  = 'flex items-center gap-1 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold px-3 py-1 rounded transition';
const inputCls   = 'flex-1 min-w-24 border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-400';

// ─── main component ───────────────────────────────────────────────────────────
interface SaveanUser {
  usuarioId: string;
  nombre: string;
  email: string;
  username: string;
  rol: string;
  activo: boolean;
}

export function SaveanAdmin() {
  const { usuario } = useAuth();
  const { guias, barreras, barreristas, agregarBarrerista, eliminarBarrerista } = useSavean();

  const [guiaVista, setGuiaVista]               = useState<GuiaSavean | null>(null);
  const [kpiModal, setKpiModal]                 = useState<{ title: string; guias: GuiaSavean[] } | null>(null);
  const [fechaFiltro, setFechaFiltro]           = useState(hoyISO());
  const [busquedaPendientes, setBusquedaPendientes] = useState('');
  const [verTodasGuias, setVerTodasGuias]       = useState(false);
  const [verTodasPendientes, setVerTodasPendientes] = useState(false);

  // Listas ocultas por defecto — solo aparecen al hacer clic en "Ver todos"
  const [verListaBarreristas, setVerListaBarreristas] = useState(false);
  const [verListaInspectores, setVerListaInspectores] = useState(false);

  const [tabGestion, setTabGestion]             = useState<'barreristas' | 'inspectores'>('barreristas');

  const [formBr, setFormBr]   = useState({ nombre: '', usuario: '', contrasena: '' });
  const [errBr, setErrBr]     = useState('');
  const [migrando, setMigrando] = useState(false);
  const [migResult, setMigResult] = useState<{
    total: number;
    creados: { nombre: string; usuario: string; contrasena?: string; reparado?: boolean }[];
    saltados: { nombre: string; usuario: string }[];
    errores: { nombre: string; usuario?: string; error: string }[];
  } | null>(null);

  const [saveanUsers, setSaveanUsers] = useState<SaveanUser[]>([]);
  const [formAdmin, setFormAdmin]     = useState({ nombre: '', username: '', password: '' });
  const [errAdmin, setErrAdmin]       = useState('');

  useEffect(() => {
    fetch(`${API_URL}/savean/usuarios`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => setSaveanUsers(data.usuarios ?? []))
      .catch((err: unknown) => {
        setErrAdmin(`No se pudieron cargar los inspectores: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      });
  }, []);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const hoy = hoyISO();
  const guiasEmitidasHoy    = guias.filter(g => g.fechaEmision.slice(0, 10) === hoy);
  const guiasVerificadasHoy = guias.filter(g => g.estado === 'verificada' && g.fechaVerificacion?.slice(0, 10) === hoy);
  const guiasPendientesAhora = guias.filter(g => g.estado === 'pendiente');
  const guiasDenegadasHoy   = guias.filter(g => g.estado === 'denegada' && g.fechaVerificacion?.slice(0, 10) === hoy);
  const guiasVencidas       = guias.filter(g => g.estado === 'vencida');

  const totalGuias      = guias.length;
  const emitidasHoy     = guiasEmitidasHoy.length;
  const verificadasHoy  = guiasVerificadasHoy.length;
  const pendientesAhora = guiasPendientesAhora.length;
  const denegadasHoy    = guiasDenegadasHoy.length;
  const vencidasTotal   = guiasVencidas.length;

  // ── Mes ──────────────────────────────────────────────────────────────────
  const mesActual      = hoy.slice(0, 7);
  const guiasMes       = guias.filter(g => g.fechaEmision.slice(0, 7) === mesActual);
  const emitidasMes    = guiasMes.length;
  const verificadasMes = guiasMes.filter(g => g.estado === 'verificada').length;
  const pendientesMes  = guiasMes.filter(g => g.estado === 'pendiente').length;
  const denegadasMes   = guiasMes.filter(g => g.estado === 'denegada').length;

  // ── Barreristas con sesión hoy ────────────────────────────────────────────
  const sesionesHoy = [...new Set(
    guias.filter(g => g.fechaVerificacion?.slice(0, 10) === hoy && g.inspectorUsuario).map(g => g.inspectorUsuario!)
  )].map(usr => {
    const guiasUsr = guias.filter(g => g.fechaVerificacion?.slice(0, 10) === hoy && g.inspectorUsuario === usr);
    const barreraId = guiasUsr[guiasUsr.length - 1]?.barreraId;
    return {
      usuario: usr,
      nombre: guiasUsr[0]?.inspectorNombre ?? usr,
      guias: guiasUsr.length,
      barrera: barreras.find(b => b.id === barreraId)?.nombre ?? '—',
    };
  });

  // ── Inspectores por fecha ─────────────────────────────────────────────────
  const guiasFecha = guias.filter(g => g.fechaVerificacion?.slice(0, 10) === fechaFiltro);
  const inspFecha  = [...new Set(guiasFecha.filter(g => g.inspectorUsuario).map(g => g.inspectorUsuario!))].map(usr => {
    const ug = guiasFecha.filter(g => g.inspectorUsuario === usr);
    return {
      usuario: usr,
      nombre: ug[0]?.inspectorNombre ?? usr,
      verificadas: ug.filter(g => g.estado === 'verificada').length,
      denegadas:   ug.filter(g => g.estado === 'denegada').length,
    };
  });

  // ── Barreras por fecha ────────────────────────────────────────────────────
  const barrerasStats = barreras.map(b => {
    const bg = guiasFecha.filter(g => g.barreraId === b.id);
    return {
      nombre:      b.nombre,
      emitidas:    guias.filter(g => g.barreraId === b.id && g.fechaEmision.slice(0, 10) === fechaFiltro).length,
      verificadas: bg.filter(g => g.estado === 'verificada').length,
      denegadas:   bg.filter(g => g.estado === 'denegada').length,
      pendientes:  guias.filter(g => g.barreraId === b.id && g.estado === 'pendiente').length,
    };
  });

  // ── Registro hoy ──────────────────────────────────────────────────────────
  const registroHoy = guias
    .filter(g => g.fechaVerificacion?.slice(0, 10) === hoy)
    .sort((a, b) => new Date(b.fechaVerificacion!).getTime() - new Date(a.fechaVerificacion!).getTime());

  // ── Últimas guías ─────────────────────────────────────────────────────────
  const ultimasGuias    = [...guias].sort((a, b) => new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime());
  const guiasMostradas  = verTodasGuias ? ultimasGuias : ultimasGuias.slice(0, 5);

  // ── Pendientes ────────────────────────────────────────────────────────────
  const pendientes = guias
    .filter(g => g.estado === 'pendiente')
    .filter(g => {
      if (!busquedaPendientes) return true;
      const q = busquedaPendientes.toLowerCase();
      return g.numero.toLowerCase().includes(q) || g.remitenteNombre.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime());
  const pendientesMostradas = verTodasPendientes ? pendientes : pendientes.slice(0, 5);

  // ── Barreristas activos ───────────────────────────────────────────────────
  const barreristasActivos = barreristas.filter(b => b.activo);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleAddBarrerista = async () => {
    if (!formBr.nombre.trim() || !formBr.usuario.trim()) { setErrBr('Nombre y usuario son obligatorios.'); return; }
    if (!formBr.contrasena.trim() || formBr.contrasena.length < 4) { setErrBr('La contraseña debe tener al menos 4 caracteres.'); return; }
    try {
      await agregarBarrerista({ nombre: formBr.nombre.trim(), usuario: formBr.usuario.trim().toLowerCase(), contrasena: formBr.contrasena, activo: true });
      setFormBr({ nombre: '', usuario: '', contrasena: '' });
      setErrBr('');
    } catch (err: any) {
      setErrBr(err?.message || 'Error al crear el barrerista.');
    }
  };

  const handleMigrarInspectores = async () => {
    setMigrando(true); setMigResult(null); setErrBr('');
    try {
      const res = await fetch(`${API_URL}/savean/barreristas/migrar-inspectores`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) { setErrBr(data?.error ?? `Error del servidor (${res.status}).`); return; }
      setMigResult({ total: data.total ?? 0, creados: data.creados ?? [], saltados: data.saltados ?? [], errores: data.errores ?? [] });
    } catch {
      setErrBr('Error de conexión al migrar.');
    } finally {
      setMigrando(false);
    }
  };

  const handleAddInspector = async () => {
    if (!formAdmin.nombre.trim() || !formAdmin.username.trim() || !formAdmin.password.trim()) {
      setErrAdmin('Todos los campos son obligatorios.'); return;
    }
    try {
      const res = await fetch(`${API_URL}/savean/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ nombre: formAdmin.nombre.trim(), username: formAdmin.username.trim(), password: formAdmin.password }),
      });
      const data = await res.json();
      if (!res.ok) { setErrAdmin(data.error ?? 'Error al crear usuario.'); return; }
      setSaveanUsers(prev => [...prev, data]);
      setFormAdmin({ nombre: '', username: '', password: '' });
      setErrAdmin('');
    } catch {
      setErrAdmin('Error de conexión.');
    }
  };

  const handleDeleteUser = async (usuarioId: string) => {
    try {
      const res = await fetch(`${API_URL}/savean/usuarios/${usuarioId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({})) as { error?: string };
        setErrAdmin(errBody.error || 'No se pudo eliminar el usuario.'); return;
      }
      setSaveanUsers(prev => prev.filter(u => u.usuarioId !== usuarioId));
    } catch {
      setErrAdmin('Error de conexión al eliminar el usuario.');
    }
  };

  const openGuiaFromModal = (g: GuiaSavean) => { setKpiModal(null); setGuiaVista(g); };

  if (guiaVista) return <GuiaDetalle guia={guiaVista} onVolver={() => setGuiaVista(null)} />;

  return (
    <div className="space-y-4 text-sm">
      <>

      {/* ── BARRA DE FECHA ── */}
      <div className="bg-white border border-gray-200 px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="text-gray-500 font-medium text-xs uppercase tracking-wide">Fecha:</span>
        <input
          type="date"
          value={fechaFiltro}
          onChange={e => setFechaFiltro(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
        <button onClick={() => setFechaFiltro(hoyISO())} className={btnPrimary}>
          <RefreshCw size={12} /> Hoy
        </button>
        <span className="text-xs text-gray-400">Actualización automática cada 30s</span>
      </div>

      {/* ── KPIs — 6 cols ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-0 border border-gray-200 divide-x divide-gray-200">
        <KPI label="Total guías"      value={totalGuias}      color="orange" onClick={() => setKpiModal({ title: 'Total de guías', guias })} />
        <KPI label="Emitidas hoy"     value={emitidasHoy}     color="blue"   onClick={() => setKpiModal({ title: 'Emitidas hoy', guias: guiasEmitidasHoy })} />
        <KPI label="Verificadas hoy"  value={verificadasHoy}  color="green"  onClick={() => setKpiModal({ title: 'Verificadas hoy', guias: guiasVerificadasHoy })} />
        <KPI label="Pendientes"       value={pendientesAhora} color="yellow" onClick={() => setKpiModal({ title: 'Pendientes ahora', guias: guiasPendientesAhora })} />
        <KPI label="Denegadas hoy"    value={denegadasHoy}    color="red"    onClick={() => setKpiModal({ title: 'Denegadas hoy', guias: guiasDenegadasHoy })} />
        <KPI label="Vencidas"         value={vencidasTotal}   color="gray"   onClick={() => setKpiModal({ title: 'Vencidas', guias: guiasVencidas })} />
      </div>

      {/* ── STATS DEL MES ── */}
      <div className="bg-white border border-gray-200 px-4 py-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">{mesLabel()}</p>
        <div className="grid grid-cols-4 gap-0 divide-x divide-gray-200 border border-gray-200">
          <MiniStat label="Emitidas"   value={emitidasMes} />
          <MiniStat label="Verificadas" value={verificadasMes} />
          <MiniStat label="Pendientes" value={pendientesMes} />
          <MiniStat label="Denegadas"  value={denegadasMes} />
        </div>
      </div>

      {/* ── ACTIVIDAD — 2 cols ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Izquierda: barreristas sesión hoy + inspectores por fecha */}
        <div className="space-y-4">

          <div className="bg-white border border-gray-200 p-4">
            <SectionHeader title="Barreristas activos hoy" badge={sesionesHoy.length} icon={<Shield size={14} />} />
            {sesionesHoy.length === 0 ? (
              <p className="text-gray-400 text-xs py-2">Sin barreristas activos hoy.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b">
                    <th className="text-left pb-1 font-medium">Nombre</th>
                    <th className="text-left pb-1 font-medium">Barrera</th>
                    <th className="text-center pb-1 font-medium">Guías</th>
                  </tr>
                </thead>
                <tbody>
                  {sesionesHoy.map(s => (
                    <tr key={s.usuario} className="border-b border-gray-50">
                      <td className="py-1.5 font-semibold text-gray-800">{s.nombre}</td>
                      <td className="py-1.5 text-gray-500">{s.barrera}</td>
                      <td className="py-1.5 text-center font-bold text-gray-700">{s.guias}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <SectionHeader title={`Inspectores — ${formatFecha(fechaFiltro)}`} icon={<Shield size={14} />} />
            {inspFecha.length === 0 ? (
              <p className="text-gray-400 text-xs py-2">Sin actividad en la fecha seleccionada.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b">
                    <th className="text-left pb-1 font-medium">Inspector</th>
                    <th className="text-center pb-1 font-medium">Verif.</th>
                    <th className="text-center pb-1 font-medium">Deneg.</th>
                  </tr>
                </thead>
                <tbody>
                  {inspFecha.map(i => (
                    <tr key={i.usuario} className="border-b border-gray-50">
                      <td className="py-1.5">
                        <p className="font-semibold text-gray-800">{i.nombre}</p>
                        <p className="text-gray-400 text-xs">{i.usuario}</p>
                      </td>
                      <td className="py-1.5 text-center font-bold text-green-700">{i.verificadas}</td>
                      <td className="py-1.5 text-center font-bold text-red-600">{i.denegadas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Derecha: barreras por fecha + registro hoy */}
        <div className="space-y-4">

          <div className="bg-white border border-gray-200 p-4">
            <SectionHeader title={`Barreras — ${formatFecha(fechaFiltro)}`} icon={<MapPin size={14} />} />
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b">
                  <th className="text-left pb-1 font-medium">Barrera</th>
                  <th className="text-center pb-1 font-medium">Emit.</th>
                  <th className="text-center pb-1 font-medium">Verif.</th>
                  <th className="text-center pb-1 font-medium">Deneg.</th>
                  <th className="text-center pb-1 font-medium">Pend.</th>
                </tr>
              </thead>
              <tbody>
                {barrerasStats.map(b => (
                  <tr key={b.nombre} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-700 font-medium">{b.nombre}</td>
                    <td className="py-1.5 text-center text-gray-600">{b.emitidas || 0}</td>
                    <td className="py-1.5 text-center text-green-700 font-semibold">{b.verificadas || 0}</td>
                    <td className="py-1.5 text-center text-red-600 font-semibold">{b.denegadas || 0}</td>
                    <td className="py-1.5 text-center text-gray-400">{b.pendientes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <SectionHeader title="Registro de barreras — hoy" badge={registroHoy.length} icon={<Clock size={14} />} />
            {registroHoy.length === 0 ? (
              <p className="text-gray-400 text-xs py-2">Sin verificaciones hoy.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b">
                      <th className="text-left pb-1 font-medium">N° Guía</th>
                      <th className="text-left pb-1 font-medium">Estado</th>
                      <th className="text-left pb-1 font-medium">Inspector</th>
                      <th className="pb-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {registroHoy.map(g => (
                      <tr key={g.id} className="border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer" onClick={() => setGuiaVista(g)}>
                        <td className="py-1.5 font-mono font-semibold text-gray-800">{g.numero}</td>
                        <td className="py-1.5"><EstadoBadge estado={g.estado} /></td>
                        <td className="py-1.5 text-gray-500">{g.inspectorNombre ?? '—'}</td>
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

        {/* Últimas guías */}
        <div className="bg-white border border-gray-200 p-4">
          <SectionHeader title="Últimas guías procesadas" icon={<FileText size={14} />} />
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
            </>
          )}
        </div>

        {/* Guías pendientes */}
        <div className="bg-white border border-gray-200 p-4">
          <SectionHeader title="Guías pendientes" badge={pendientesAhora} icon={<Clock size={14} />} />
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
                  {pendientesMostradas.map(g => (
                    <tr key={g.id} className="border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer" onClick={() => setGuiaVista(g)}>
                      <td className="py-1.5 font-mono font-semibold text-gray-800">{g.numero}</td>
                      <td className="py-1.5 text-gray-600">{g.remitenteNombre}</td>
                      <td className="py-1.5 text-gray-500">{formatFechaCorta(g.fechaVencimiento)}</td>
                      <td className="py-1.5 text-right pr-1"><Eye size={12} className="text-gray-400" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!verTodasPendientes && pendientes.length > 5 && (
                <button onClick={() => setVerTodasPendientes(true)} className="mt-3 text-xs text-gray-500 hover:text-gray-800 font-medium flex items-center gap-1">
                  <ChevronDown size={12} /> Ver todas ({pendientes.length})
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── GESTIÓN — tabbed ── */}
      <div className="bg-white border border-gray-200">

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setTabGestion('barreristas')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide transition border-b-2 -mb-px ${
              tabGestion === 'barreristas'
                ? 'border-gray-800 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <Users size={13} /> Barreristas
            <span className="ml-1 bg-gray-200 text-gray-600 text-xs px-1.5 py-0.5 rounded font-bold">{barreristasActivos.length}</span>
          </button>
          <button
            onClick={() => setTabGestion('inspectores')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide transition border-b-2 -mb-px ${
              tabGestion === 'inspectores'
                ? 'border-gray-800 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <UserPlus size={13} /> Inspectores
            <span className="ml-1 bg-gray-200 text-gray-600 text-xs px-1.5 py-0.5 rounded font-bold">{saveanUsers.length}</span>
          </button>
        </div>

        <div className="p-4">

          {/* ── Tab: Barreristas ── */}
          {tabGestion === 'barreristas' && (
            <div className="space-y-4">

              {/* Migración masiva */}
              <div className="border border-gray-200 p-3 bg-gray-50">
                <p className="text-xs text-gray-700 font-semibold mb-1">Crear cuentas de inspector para barreristas existentes</p>
                <p className="text-xs text-gray-500 mb-2">Asigna acceso al sistema a cada barrerista usando su usuario como contraseña inicial.</p>
                <button
                  onClick={handleMigrarInspectores}
                  disabled={migrando}
                  className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-300 text-white text-xs font-semibold px-4 py-1.5 rounded transition"
                >
                  {migrando ? 'Creando cuentas...' : '⚡ Crear cuentas para todos'}
                </button>
                {migResult && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-gray-600">
                      Total: <strong>{migResult.total}</strong> · Creados: <strong className="text-green-700">{migResult.creados.length}</strong> · Ya tenían cuenta: <strong>{migResult.saltados.length}</strong>
                      {migResult.errores.length > 0 && <> · <strong className="text-red-600">{migResult.errores.length} con error</strong></>}
                    </p>
                    {migResult.creados.length > 0 && (
                      <div className="bg-white border border-green-200 rounded p-2 max-h-40 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead><tr className="text-gray-400 border-b"><th className="text-left pb-1">Nombre</th><th className="text-left pb-1">Usuario</th><th className="text-left pb-1">Contraseña inicial</th></tr></thead>
                          <tbody>
                            {migResult.creados.map(c => (
                              <tr key={c.usuario} className="border-b border-gray-50">
                                <td className="py-1 text-gray-800">{c.nombre}</td>
                                <td className="py-1 font-mono text-gray-600">{c.usuario}</td>
                                <td className="py-1 font-mono text-gray-800 font-semibold">{c.reparado ? '(sin cambio)' : c.contrasena}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {migResult.errores.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded p-2 max-h-32 overflow-y-auto space-y-1">
                        {migResult.errores.map((e, i) => (
                          <p key={i} className="text-xs text-red-700"><strong>{e.nombre}</strong>: {e.error}</p>
                        ))}
                      </div>
                    )}
                    {migResult.total === 0 && (
                      <p className="text-xs text-amber-700 font-semibold">⚠ No se encontraron barreristas en la base de datos.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Formulario agregar */}
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">Agregar nuevo barrerista</p>
                <div className="flex flex-wrap gap-2">
                  <input type="text" placeholder="Nombre completo" value={formBr.nombre} onChange={e => setFormBr({ ...formBr, nombre: e.target.value })} className={inputCls} />
                  <input type="text" placeholder="Usuario" value={formBr.usuario} onChange={e => setFormBr({ ...formBr, usuario: e.target.value.toLowerCase().replace(/\s/g, '') })} className={inputCls} />
                  <input type="password" placeholder="Contraseña" value={formBr.contrasena} onChange={e => setFormBr({ ...formBr, contrasena: e.target.value })} className={inputCls} />
                  <button onClick={handleAddBarrerista} className={btnPrimary}><Plus size={12} /> Agregar</button>
                </div>
                {errBr && <p className="text-xs text-red-600 mt-1">{errBr}</p>}
              </div>

              {/* Lista — oculta por defecto */}
              <div>
                <button
                  onClick={() => setVerListaBarreristas(v => !v)}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition"
                >
                  {verListaBarreristas ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  {verListaBarreristas ? 'Ocultar lista' : `Ver todos los barreristas (${barreristasActivos.length})`}
                </button>

                {verListaBarreristas && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-xs border border-gray-200">
                      <thead className="bg-gray-50">
                        <tr className="text-gray-500 border-b border-gray-200">
                          <th className="text-left px-3 py-2 font-semibold">Nombre</th>
                          <th className="text-left px-3 py-2 font-semibold">Usuario</th>
                          <th className="text-left px-3 py-2 font-semibold">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {barreristasActivos.map((b, i) => (
                          <tr key={b.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-2 text-gray-800 font-medium">{b.nombre}</td>
                            <td className="px-3 py-2 text-gray-500 font-mono">{b.usuario}</td>
                            <td className="px-3 py-2">
                              <button onClick={async () => { try { await eliminarBarrerista(b.id); } catch (err: unknown) { setErrBr(err instanceof Error ? err.message : 'No se pudo eliminar.'); }}} className={btnDanger}>
                                <Trash2 size={11} /> Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Inspectores ── */}
          {tabGestion === 'inspectores' && (
            <div className="space-y-4">

              {/* Formulario agregar */}
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">Agregar nuevo inspector (acceso con usuario y contraseña)</p>
                <div className="flex flex-wrap gap-2">
                  <input type="text" placeholder="Nombre completo" value={formAdmin.nombre} onChange={e => setFormAdmin({ ...formAdmin, nombre: e.target.value })} className={inputCls} />
                  <input type="text" placeholder="Nombre de usuario" value={formAdmin.username} onChange={e => setFormAdmin({ ...formAdmin, username: e.target.value.toLowerCase().replace(/\s/g, '') })} className={inputCls} />
                  <input type="password" placeholder="Contraseña" value={formAdmin.password} onChange={e => setFormAdmin({ ...formAdmin, password: e.target.value })} className={inputCls} />
                  <button onClick={handleAddInspector} className={btnPrimary}><Plus size={12} /> Agregar</button>
                </div>
                {errAdmin && <p className="text-xs text-red-600 mt-1">{errAdmin}</p>}
              </div>

              {/* Lista — oculta por defecto */}
              <div>
                <button
                  onClick={() => setVerListaInspectores(v => !v)}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition"
                >
                  {verListaInspectores ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  {verListaInspectores ? 'Ocultar lista' : `Ver todos los inspectores (${saveanUsers.length})`}
                </button>

                {verListaInspectores && (
                  <div className="mt-3 overflow-x-auto">
                    {saveanUsers.length === 0 ? (
                      <p className="text-gray-400 text-xs py-2">Sin inspectores registrados.</p>
                    ) : (
                      <table className="w-full text-xs border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr className="text-gray-500 border-b border-gray-200">
                            <th className="text-left px-3 py-2 font-semibold">Nombre</th>
                            <th className="text-left px-3 py-2 font-semibold">Usuario</th>
                            <th className="text-left px-3 py-2 font-semibold">Rol</th>
                            <th className="text-left px-3 py-2 font-semibold">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {saveanUsers.map((u, i) => (
                            <tr key={u.usuarioId} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-3 py-2 text-gray-800 font-medium">{u.nombre}</td>
                              <td className="px-3 py-2 text-gray-500 font-mono">{u.username || u.email.replace('@savean.local', '')}</td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${u.rol === 'admin' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'}`}>
                                  {u.rol === 'admin' ? 'Director' : 'Inspector'}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                {u.usuarioId !== usuario?.usuarioId && (
                                  <button onClick={() => handleDeleteUser(u.usuarioId)} className={btnDanger}>
                                    <Trash2 size={11} /> Eliminar
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

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

      </>
    </div>
  );
}
