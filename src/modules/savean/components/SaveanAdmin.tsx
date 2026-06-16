import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useSavean } from '../context/SaveanContext';
import {
  Users, MapPin, Plus, RefreshCw, Clock,
  FileText, Shield, Trash2, UserPlus,
} from 'lucide-react';

const API_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:3000/api';
function getToken() { return localStorage.getItem('sc_token') || ''; }

// ─── helpers ────────────────────────────────────────────────────────────────
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

// ─── small components ────────────────────────────────────────────────────────
function KPI({ label, value, color = 'orange' }: { label: string; value: number | string; color?: string }) {
  const border: Record<string, string> = {
    orange: 'border-l-4 border-orange-500', green: 'border-l-4 border-green-500',
    red: 'border-l-4 border-red-500', yellow: 'border-l-4 border-yellow-400',
    gray: 'border-l-4 border-gray-300', blue: 'border-l-4 border-blue-500',
  };
  const num: Record<string, string> = {
    orange: 'text-orange-600', green: 'text-green-600', red: 'text-red-600',
    yellow: 'text-yellow-600', gray: 'text-gray-500', blue: 'text-blue-600',
  };
  return (
    <div className={`bg-white rounded-lg p-4 ${border[color] ?? border.orange} shadow-sm`}>
      <p className={`text-3xl font-extrabold leading-none ${num[color] ?? num.orange}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1.5 font-medium">{label}</p>
    </div>
  );
}

function MiniKPI({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-center">
      <p className="text-2xl font-extrabold text-orange-700">{value}</p>
      <p className="text-xs text-orange-600 mt-0.5 font-medium leading-tight">{label}</p>
    </div>
  );
}

function SectionHeader({ title, badge, icon }: { title: string; badge?: number | string; icon?: JSX.Element }) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
      {icon && <span className="text-orange-500">{icon}</span>}
      <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">{title}</h3>
      {badge != null && (
        <span className="ml-1 bg-orange-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{badge}</span>
      )}
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const cls: Record<string, string> = {
    pendiente: 'bg-orange-100 text-orange-700 border border-orange-300',
    verificada: 'bg-green-100 text-green-700 border border-green-300',
    denegada: 'bg-red-100 text-red-700 border border-red-300',
    vencida: 'bg-gray-100 text-gray-500 border border-gray-300',
  };
  const label: Record<string, string> = {
    pendiente: 'pendiente', verificada: 'verificada', denegada: 'denegada', vencida: 'vencida',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls[estado] ?? 'bg-gray-100 text-gray-600'}`}>
      {label[estado] ?? estado}
    </span>
  );
}

const btnOrange = 'flex items-center justify-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-4 py-1.5 rounded-md transition whitespace-nowrap';
const btnRed = 'flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1 rounded-md transition';

// ─── main component ──────────────────────────────────────────────────────────
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

  const [fechaFiltro, setFechaFiltro] = useState(hoyISO());
  const [busquedaPendientes, setBusquedaPendientes] = useState('');
  const [verTodasGuias, setVerTodasGuias] = useState(false);
  const [verTodasPendientes, setVerTodasPendientes] = useState(false);
  const [verTodosBarreristas, setVerTodosBarreristas] = useState(false);

  const [formBr, setFormBr] = useState({ nombre: '', usuario: '', contrasena: '' });
  const [errBr, setErrBr] = useState('');

  const [saveanUsers, setSaveanUsers] = useState<SaveanUser[]>([]);
  const [formAdmin, setFormAdmin] = useState({ nombre: '', username: '', password: '' });
  const [errAdmin, setErrAdmin] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/savean/usuarios`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setSaveanUsers(data.usuarios ?? []))
      .catch(() => {});
  }, []);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const hoy = hoyISO();
  const totalGuias = guias.length;
  const emitidasHoy = guias.filter(g => g.fechaEmision.slice(0, 10) === hoy).length;
  const verificadasHoy = guias.filter(g => g.estado === 'verificada' && g.fechaVerificacion?.slice(0, 10) === hoy).length;
  const pendientesAhora = guias.filter(g => g.estado === 'pendiente').length;
  const denegadasHoy = guias.filter(g => g.estado === 'denegada' && g.fechaVerificacion?.slice(0, 10) === hoy).length;
  const vencidasHoy = guias.filter(g => g.estado === 'vencida').length;

  // ── Mes ──────────────────────────────────────────────────────────────────
  const mesActual = hoy.slice(0, 7);
  const guiasMes = guias.filter(g => g.fechaEmision.slice(0, 7) === mesActual);
  const emitidasMes = guiasMes.length;
  const verificadasMes = guiasMes.filter(g => g.estado === 'verificada').length;
  const pendientesMes = guiasMes.filter(g => g.estado === 'pendiente').length;
  const denegadasMes = guiasMes.filter(g => g.estado === 'denegada').length;

  // ── Barreristas con sesión hoy (inspectors who acted today) ──────────────
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
  const inspFecha = [...new Set(guiasFecha.filter(g => g.inspectorUsuario).map(g => g.inspectorUsuario!))].map(usr => {
    const ug = guiasFecha.filter(g => g.inspectorUsuario === usr);
    return {
      usuario: usr,
      nombre: ug[0]?.inspectorNombre ?? usr,
      verificadas: ug.filter(g => g.estado === 'verificada').length,
      denegadas: ug.filter(g => g.estado === 'denegada').length,
    };
  });

  // ── Barreras por fecha ────────────────────────────────────────────────────
  const barrerasStats = barreras.map(b => {
    const bg = guiasFecha.filter(g => g.barreraId === b.id);
    return {
      nombre: b.nombre,
      emitidas: guias.filter(g => g.barreraId === b.id && g.fechaEmision.slice(0, 10) === fechaFiltro).length,
      verificadas: bg.filter(g => g.estado === 'verificada').length,
      denegadas: bg.filter(g => g.estado === 'denegada').length,
      pendientes: guias.filter(g => g.barreraId === b.id && g.estado === 'pendiente').length,
    };
  });

  // ── Registro hoy ──────────────────────────────────────────────────────────
  const registroHoy = guias
    .filter(g => g.fechaVerificacion?.slice(0, 10) === hoy)
    .sort((a, b) => new Date(b.fechaVerificacion!).getTime() - new Date(a.fechaVerificacion!).getTime());

  // ── Últimas guías ─────────────────────────────────────────────────────────
  const ultimasGuias = [...guias].sort((a, b) => new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime());
  const guiasMostradas = verTodasGuias ? ultimasGuias : ultimasGuias.slice(0, 7);

  // ── Pendientes ────────────────────────────────────────────────────────────
  const pendientes = guias
    .filter(g => g.estado === 'pendiente')
    .filter(g => {
      if (!busquedaPendientes) return true;
      const q = busquedaPendientes.toLowerCase();
      return g.numero.toLowerCase().includes(q) || g.remitenteNombre.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime());
  const pendientesMostradas = verTodasPendientes ? pendientes : pendientes.slice(0, 7);

  // ── Barreristas activos ───────────────────────────────────────────────────
  const barreristasActivos = barreristas.filter(b => b.activo);
  const barreristaMostrados = verTodosBarreristas ? barreristasActivos : barreristasActivos.slice(0, 7);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleAddBarrerista = () => {
    if (!formBr.nombre.trim() || !formBr.usuario.trim()) { setErrBr('Nombre y usuario son obligatorios.'); return; }
    if (barreristas.some(b => b.usuario === formBr.usuario.trim())) { setErrBr('El usuario ya existe.'); return; }
    agregarBarrerista({ nombre: formBr.nombre.trim(), usuario: formBr.usuario.trim(), activo: true });
    setFormBr({ nombre: '', usuario: '', contrasena: '' });
    setErrBr('');
  };

  const handleAddInspector = async () => {
    if (!formAdmin.nombre.trim() || !formAdmin.username.trim() || !formAdmin.password.trim()) {
      setErrAdmin('Todos los campos son obligatorios.');
      return;
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
      await fetch(`${API_URL}/savean/usuarios/${usuarioId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setSaveanUsers(prev => prev.filter(u => u.usuarioId !== usuarioId));
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6 text-sm max-w-5xl">

      {/* ── 1. BANNER ── */}
      <div className="rounded-xl overflow-hidden shadow">
        <div className="bg-gradient-to-r from-orange-900 via-orange-700 to-orange-500 px-6 py-5">
          <p className="text-orange-200 text-xs font-semibold mb-1">Director</p>
          <h2 className="text-white text-xl font-extrabold tracking-wide">
            Panel de Administración — SAVEAN
          </h2>
          <p className="text-orange-200 text-xs mt-1">{usuario?.nombre}</p>
        </div>
      </div>

      {/* ── 2. DATE BAR ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <span className="text-gray-600 font-medium text-xs">Fecha:</span>
        <input
          type="date"
          value={fechaFiltro}
          onChange={e => setFechaFiltro(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <button onClick={() => setFechaFiltro(hoyISO())} className={btnOrange}>
          <RefreshCw size={12} /> Actualizar
        </button>
        <span className="text-xs text-gray-400 ml-1">Actualización automática cada 30s</span>
      </div>

      {/* ── 3. KPI ROW 1 ── */}
      <div className="grid grid-cols-3 gap-3">
        <KPI label="Total guías" value={totalGuias} color="orange" />
        <KPI label="Emitidas Hoy" value={emitidasHoy} color="blue" />
        <KPI label="Verificadas Hoy" value={verificadasHoy} color="green" />
      </div>

      {/* ── 4. KPI ROW 2 ── */}
      <div className="grid grid-cols-3 gap-3">
        <KPI label="Verificaciones Hechas" value={verificadasHoy} color="green" />
        <KPI label="Pendientes ahora" value={pendientesAhora} color="yellow" />
        <div className="grid grid-cols-2 gap-3 col-span-1">
          <KPI label="Denegadas Hoy" value={denegadasHoy} color="red" />
          <KPI label="Vencidas Hoy" value={vencidasHoy} color="gray" />
        </div>
      </div>

      {/* ── 5. GUÍAS DEL MES ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <SectionHeader title={`Guías del mes — ${mesLabel()}`} icon={<FileText size={15} />} />
        <div className="grid grid-cols-4 gap-3">
          <MiniKPI label="Emitidas este mes" value={emitidasMes} />
          <MiniKPI label="Verificadas este mes" value={verificadasMes} />
          <MiniKPI label="Pendientes para mes" value={pendientesMes} />
          <MiniKPI label="Denegadas este mes" value={denegadasMes} />
        </div>
      </div>

      {/* ── 6. BARRERISTAS CON SESIÓN HOY ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <SectionHeader
          title="Barreristas con sesión hoy"
          badge={sesionesHoy.length}
          icon={<Shield size={15} />}
        />
        {sesionesHoy.length === 0 ? (
          <p className="text-gray-400 text-xs py-3">Sin barreristas activos hoy.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sesionesHoy.map(s => (
              <div key={s.usuario} className="border border-orange-200 bg-orange-50 rounded-lg px-4 py-3">
                <p className="font-bold text-gray-900 text-sm">{s.nombre}</p>
                <div className="flex gap-4 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
                    Activo — {s.barrera}
                  </span>
                  <span>{s.guias} guía{s.guias !== 1 ? 's' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 7. INSPECTORES / BARRERAS POR FECHA ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Inspectores */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <SectionHeader title={`Inspectores — ${formatFecha(fechaFiltro)}`} icon={<Shield size={15} />} />
          {inspFecha.length === 0 ? (
            <p className="text-gray-400 text-xs py-3">Sin actividad en la fecha seleccionada.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b">
                  <th className="text-left pb-1 font-medium">Inspector</th>
                  <th className="text-center pb-1 font-medium">V</th>
                  <th className="text-center pb-1 font-medium">D</th>
                </tr>
              </thead>
              <tbody>
                {inspFecha.map(i => (
                  <tr key={i.usuario} className="border-b border-gray-50">
                    <td className="py-1.5">
                      <p className="font-semibold text-gray-800">{i.nombre}</p>
                      <p className="text-gray-400">{i.usuario}</p>
                    </td>
                    <td className="py-1.5 text-center font-bold text-green-600">{i.verificadas}</td>
                    <td className="py-1.5 text-center font-bold text-red-500">{i.denegadas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Barreras */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <SectionHeader title={`Barreras — ${formatFecha(fechaFiltro)}`} icon={<MapPin size={15} />} />
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b">
                <th className="text-left pb-1 font-medium">Barrera</th>
                <th className="text-center pb-1 font-medium">E</th>
                <th className="text-center pb-1 font-medium">V</th>
                <th className="text-center pb-1 font-medium">D</th>
                <th className="text-center pb-1 font-medium">Pen</th>
              </tr>
            </thead>
            <tbody>
              {barrerasStats.map(b => (
                <tr key={b.nombre} className="border-b border-gray-50">
                  <td className="py-1.5 text-gray-700 font-medium">{b.nombre}</td>
                  <td className="py-1.5 text-center text-gray-600">{b.emitidas || 0}</td>
                  <td className="py-1.5 text-center text-green-600 font-semibold">{b.verificadas || 0}</td>
                  <td className="py-1.5 text-center text-red-500 font-semibold">{b.denegadas || 0}</td>
                  <td className="py-1.5 text-center text-gray-400">{b.pendientes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 8. REGISTRO DE BARRERAS HOY ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <SectionHeader title="Registro de barreras — hoy" badge={registroHoy.length} icon={<Clock size={15} />} />
        {registroHoy.length === 0 ? (
          <p className="text-gray-400 text-xs py-2">Sin verificaciones Hoy.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b">
                  <th className="text-left pb-1 font-medium">N° Guía</th>
                  <th className="text-left pb-1 font-medium">Estado</th>
                  <th className="text-left pb-1 font-medium">Barrera</th>
                  <th className="text-left pb-1 font-medium">Inspector</th>
                </tr>
              </thead>
              <tbody>
                {registroHoy.map(g => (
                  <tr key={g.id} className="border-b border-gray-50">
                    <td className="py-1.5 font-mono font-semibold text-orange-700">{g.numero}</td>
                    <td className="py-1.5"><EstadoBadge estado={g.estado} /></td>
                    <td className="py-1.5 text-gray-600">{g.barrieraNombre ?? '—'}</td>
                    <td className="py-1.5 text-gray-600">{g.inspectorNombre ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 9. ÚLTIMAS GUÍAS PROCESADAS ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <SectionHeader title="Últimas guías procesadas" icon={<FileText size={15} />} />
        {ultimasGuias.length === 0 ? (
          <p className="text-gray-400 text-xs py-2">Sin guías registradas.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b">
                    <th className="text-left pb-1 font-medium">N° Guía</th>
                    <th className="text-left pb-1 font-medium">Estado</th>
                    <th className="text-left pb-1 font-medium">Remitente</th>
                    <th className="text-left pb-1 font-medium">Inspector</th>
                  </tr>
                </thead>
                <tbody>
                  {guiasMostradas.map(g => (
                    <tr key={g.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="py-1.5 font-mono font-semibold text-orange-700">{g.numero}</td>
                      <td className="py-1.5"><EstadoBadge estado={g.estado} /></td>
                      <td className="py-1.5 text-gray-700">{g.remitenteNombre}</td>
                      <td className="py-1.5 text-gray-500">{g.inspectorUsuario ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!verTodasGuias && ultimasGuias.length > 7 && (
              <button onClick={() => setVerTodasGuias(true)} className="mt-3 text-xs text-orange-600 hover:underline font-medium">
                ▶ Ver todas ({ultimasGuias.length})
              </button>
            )}
          </>
        )}
      </div>

      {/* ── 10. GUÍAS PENDIENTES ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <SectionHeader title="Guías pendientes" badge={pendientesAhora} icon={<Clock size={15} />} />
        <input
          type="text"
          value={busquedaPendientes}
          onChange={e => setBusquedaPendientes(e.target.value)}
          placeholder="Buscar por guía o remitente..."
          className="w-full mb-3 border border-gray-300 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        {pendientes.length === 0 ? (
          <p className="text-gray-400 text-xs py-2">No hay guías pendientes.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b">
                    <th className="text-left pb-1 font-medium">N° Guía</th>
                    <th className="text-left pb-1 font-medium">Remitente</th>
                    <th className="text-left pb-1 font-medium">Vencimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {pendientesMostradas.map(g => (
                    <tr key={g.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="py-1.5 font-mono font-semibold text-orange-700">{g.numero}</td>
                      <td className="py-1.5 text-gray-700">{g.remitenteNombre}</td>
                      <td className="py-1.5 text-gray-500">{formatFechaCorta(g.fechaVencimiento)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!verTodasPendientes && pendientes.length > 7 && (
              <button onClick={() => setVerTodasPendientes(true)} className="mt-3 text-xs text-orange-600 hover:underline font-medium">
                ▶ Ver todas ({pendientes.length})
              </button>
            )}
          </>
        )}
      </div>

      {/* ── 11. GESTIÓN DE BARRERISTAS ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <SectionHeader title="Gestión de Barreristas" icon={<Users size={15} />} />

        {/* Add form */}
        <p className="text-xs text-gray-500 mb-2 font-medium">Agregar nuevo barrerista</p>
        <div className="flex flex-wrap gap-2 mb-1">
          <input type="text" placeholder="Nombre" value={formBr.nombre} onChange={e => setFormBr({ ...formBr, nombre: e.target.value })}
            className="flex-1 min-w-28 border border-gray-300 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <input type="text" placeholder="Usuario" value={formBr.usuario} onChange={e => setFormBr({ ...formBr, usuario: e.target.value.toLowerCase() })}
            className="flex-1 min-w-24 border border-gray-300 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <input type="password" placeholder="Contraseña" value={formBr.contrasena} onChange={e => setFormBr({ ...formBr, contrasena: e.target.value })}
            className="flex-1 min-w-24 border border-gray-300 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <button onClick={handleAddBarrerista} className={btnOrange}>
            <Plus size={12} /> Agregar
          </button>
        </div>
        {errBr && <p className="text-xs text-red-500 mb-2">{errBr}</p>}

        {/* Table */}
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">Barreristas activos</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-orange-50">
                <tr className="text-gray-500">
                  <th className="text-left px-3 py-2 font-semibold border-b border-gray-200">Nombre</th>
                  <th className="text-left px-3 py-2 font-semibold border-b border-gray-200">Usuario</th>
                  <th className="text-left px-3 py-2 font-semibold border-b border-gray-200">Contraseña</th>
                  <th className="text-left px-3 py-2 font-semibold border-b border-gray-200">Acción</th>
                </tr>
              </thead>
              <tbody>
                {barreristaMostrados.map((b, i) => (
                  <tr key={b.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 text-gray-800 font-medium">{b.nombre}</td>
                    <td className="px-3 py-2 text-gray-500 font-mono">{b.usuario}</td>
                    <td className="px-3 py-2 text-gray-400 tracking-widest">••••••••</td>
                    <td className="px-3 py-2">
                      <button onClick={() => eliminarBarrerista(b.id)} className={btnRed}>
                        <Trash2 size={11} /> Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!verTodosBarreristas && barreristasActivos.length > 7 && (
            <button onClick={() => setVerTodosBarreristas(true)} className="mt-3 text-xs text-orange-600 hover:underline font-medium">
              ▶ Ver todos ({barreristasActivos.length})
            </button>
          )}
        </div>
      </div>

      {/* ── 12. GESTIÓN DE INSPECTORES ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <SectionHeader title="Gestión de Inspectores" icon={<UserPlus size={15} />} />

        {/* Add form */}
        <p className="text-xs text-gray-500 mb-2 font-medium">Agregar nuevo inspector (acceso con usuario y contraseña)</p>
        <div className="flex flex-wrap gap-2 mb-1">
          <input type="text" placeholder="Nombre completo" value={formAdmin.nombre} onChange={e => setFormAdmin({ ...formAdmin, nombre: e.target.value })}
            className="flex-1 min-w-28 border border-gray-300 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <input type="text" placeholder="Nombre de usuario" value={formAdmin.username} onChange={e => setFormAdmin({ ...formAdmin, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
            className="flex-1 min-w-28 border border-gray-300 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <input type="password" placeholder="Contraseña" value={formAdmin.password} onChange={e => setFormAdmin({ ...formAdmin, password: e.target.value })}
            className="flex-1 min-w-24 border border-gray-300 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <button onClick={handleAddInspector} className={btnOrange}>
            <Plus size={12} /> Agregar
          </button>
        </div>
        {errAdmin && <p className="text-xs text-red-500 mb-2">{errAdmin}</p>}

        {/* Table */}
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">Inspectores registrados</p>
          {saveanUsers.length === 0 ? (
            <p className="text-gray-400 text-xs py-2">Sin inspectores registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-orange-50">
                  <tr className="text-gray-500">
                    <th className="text-left px-3 py-2 font-semibold border-b border-gray-200">Nombre</th>
                    <th className="text-left px-3 py-2 font-semibold border-b border-gray-200">Usuario</th>
                    <th className="text-left px-3 py-2 font-semibold border-b border-gray-200">Rol</th>
                    <th className="text-left px-3 py-2 font-semibold border-b border-gray-200">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {saveanUsers.map((u, i) => (
                    <tr key={u.usuarioId} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 text-gray-800 font-medium">{u.nombre}</td>
                      <td className="px-3 py-2 text-gray-500 font-mono">{u.username || u.email.replace('@savean.local', '')}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${u.rol === 'admin' ? 'bg-orange-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                          {u.rol === 'admin' ? 'Director' : 'Inspector'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {u.usuarioId !== usuario?.usuarioId && (
                          <button onClick={() => handleDeleteUser(u.usuarioId)} className={btnRed}>
                            <Trash2 size={11} /> Eliminar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
