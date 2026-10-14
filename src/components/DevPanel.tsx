import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEtapas } from '../context/EtapasContext';
import {
  LogOut, Plus, Trash2, CheckCircle2, Clock, Users, Shield, Code2,
  ToggleLeft, ToggleRight, X, AlertCircle, RefreshCw, ArrowLeft,
  Ticket, Leaf, KeyRound, FileText, TreePine, Stethoscope, MapPin,
  MessageCircle, Lightbulb, Trash, LayoutDashboard, Eye, ChevronRight,
} from 'lucide-react';

const TicketsApp = lazy(() => import('./TicketsApp').then(m => ({ default: m.TicketsApp })));
const SaveanApp  = lazy(() => import('../modules/savean/SaveanApp').then(m => ({ default: m.SaveanApp })));

const API_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:3000/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UsuarioAPI {
  usuarioId: string; nombre: string; email: string;
  rol: string; modulo: string; activo: boolean;
  pendiente: boolean; estadosAsignados: string[]; creadoEn: string;
}

type Seccion = 'inicio' | 'usuarios' | 'modulos' | 'feedback';
type Vista = 'panel' | 'tickets' | 'savean' | 'savean-inspector' | 'savean-sanidad' | 'savean-punto-control';
type ModuloForm = 'tickets' | 'savean';
type ModuloTab = 'tickets' | 'savean' | 'comite';

interface RolDef {
  value: string; label: string; descripcion: string;
  clases: { bg: string; text: string; border: string; dot: string };
  icono: JSX.Element;
}

const ROLES_DEF: Record<ModuloTab, RolDef[]> = {
  tickets: [
    { value: 'admin', label: 'Administrador', descripcion: 'Ve todos los tickets sin importar la etapa. Puede crear, editar y cerrar tickets, gestionar usuarios y configurar el flujo completo de trabajo.', clases: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-400' }, icono: <Shield size={14} /> },
    { value: 'contribuidor', label: 'Contribuidor', descripcion: 'Solo accede a los tickets en las etapas que le fueron asignadas. Diseñado para especialistas de cada área del proceso.', clases: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-400' }, icono: <FileText size={14} /> },
  ],
  savean: [
    { value: 'admin', label: 'Director / Agencia', descripcion: 'Control total de SAVEAN. Crea y aprueba guías, accede a informes y planillas de barreras, y gestiona a los inspectores.', clases: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-400' }, icono: <Shield size={14} /> },
    { value: 'inspector', label: 'Inspector Barrerista', descripcion: 'Opera en campo desde las barreras. Registra entradas de vehículos y crea guías de origen para la mercadería.', clases: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' }, icono: <TreePine size={14} /> },
    { value: 'sanidad', label: 'Sanidad', descripcion: 'Accede únicamente al panel de ingresos del área de sanidad. Vista restringida para el control fitosanitario.', clases: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-400' }, icono: <Stethoscope size={14} /> },
    { value: 'punto_control', label: 'Punto de Control', descripcion: 'Opera en el punto de control interno (Ruta 215). Recibe los transportes cárnicos y marca su estado.', clases: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-400' }, icono: <MapPin size={14} /> },
  ],
  comite: [
    { value: 'contribuidor', label: 'Miembro del Comité', descripcion: 'Accede al formulario de análisis de su programa específico (CASEMI, etc.). Cada miembro está vinculado a un solo programa.', clases: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-400' }, icono: <FileText size={14} /> },
  ],
};

const MODULO_TABS: { key: ModuloTab; label: string; desc: string }[] = [
  { key: 'tickets', label: 'Tickets',  desc: 'Gestión de trámites y solicitudes' },
  { key: 'savean',  label: 'SAVEAN',   desc: 'Guías de Origen · Control fitosanitario' },
  { key: 'comite',  label: 'Comité',   desc: 'Análisis de programas (CASEMI, etc.)' },
];

const ROLES_FORM: Record<ModuloForm, { value: string; label: string }[]> = {
  tickets: [
    { value: 'admin', label: 'Administrador (ve todo)' },
    { value: 'contribuidor', label: 'Contribuidor (por etapas)' },
  ],
  savean: [
    { value: 'admin', label: 'Director / Agencia' },
    { value: 'inspector', label: 'Inspector Barrerista' },
    { value: 'sanidad', label: 'Sanidad (panel de ingresos)' },
    { value: 'punto_control', label: 'Punto de Control (Ruta 215)' },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function saludo() {
  const h = new Date().getHours();
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

async function apiCall<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = localStorage.getItem('sc_token');
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as any).error || `Error ${res.status}`); }
  if (res.status === 204) return {} as T;
  return res.json();
}

// ─── Overlay de vista de módulo ───────────────────────────────────────────────

function VistaOverlay({ titulo, color, onVolver, children }: {
  titulo: string; color: string; onVolver: () => void; children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className={`fixed top-0 left-0 right-0 z-50 ${color} text-white px-4 py-2.5 flex items-center gap-4 shadow-lg`}>
        <button onClick={onVolver} className="flex items-center gap-1.5 text-sm font-semibold hover:opacity-80 transition">
          <ArrowLeft size={15} /> Volver al Panel Dev
        </button>
        <span className="text-xs opacity-60 border-l border-white/30 pl-4">Vista: {titulo}</span>
      </div>
      <div className="pt-10">{children}</div>
    </div>
  );
}

// ─── Tarjeta de usuario ───────────────────────────────────────────────────────

function UsuarioCard({ usuario, rolDef, onToggle, toggling, onEliminar, eliminando, confirmDelete, onConfirmDelete, onCancelDelete, onResetPassword, reseteando }: {
  usuario: UsuarioAPI; rolDef: RolDef;
  onToggle: (id: string) => void; toggling: string | null;
  onEliminar: (id: string) => void; eliminando: string | null;
  confirmDelete: string | null; onConfirmDelete: (id: string) => void; onCancelDelete: () => void;
  onResetPassword: (id: string) => void; reseteando: string | null;
}) {
  const id = usuario.usuarioId;

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition shadow-sm">
      <div className="flex-shrink-0">
        {usuario.pendiente
          ? <div className="w-2 h-2 rounded-full bg-amber-400" title="Pendiente de activación" />
          : usuario.activo
            ? <div className="w-2 h-2 rounded-full bg-emerald-500" title="Activo" />
            : <div className="w-2 h-2 rounded-full bg-gray-300" title="Inactivo" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm truncate">{usuario.nombre}</p>
        <p className="text-xs text-gray-400 font-mono truncate">{usuario.email}</p>
        {usuario.pendiente && (
          <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1"><Clock size={10} /> Pendiente de activación</p>
        )}
        {usuario.modulo === 'tickets' && usuario.rol === 'contribuidor' && usuario.estadosAsignados.length > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">Etapas: {usuario.estadosAsignados.join(' · ')}</p>
        )}
      </div>
      <p className="text-xs text-gray-300 hidden lg:block flex-shrink-0">
        {new Date(usuario.creadoEn).toLocaleDateString('es-AR')}
      </p>
      <div className="flex items-center gap-1 flex-shrink-0">
        {!usuario.pendiente && (
          <button onClick={() => onResetPassword(id)} disabled={reseteando === id}
            title="Resetear contraseña"
            className="p-1.5 rounded-lg text-gray-300 hover:text-amber-500 hover:bg-amber-50 transition disabled:opacity-50">
            <KeyRound size={13} />
          </button>
        )}
        {!usuario.pendiente && (
          <button onClick={() => onToggle(id)} disabled={toggling === id}
            title={usuario.activo ? 'Desactivar acceso' : 'Activar acceso'}
            className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition disabled:opacity-50">
            {toggling === id
              ? <RefreshCw size={13} className="animate-spin" />
              : usuario.activo ? <ToggleRight size={14} className="text-emerald-500" /> : <ToggleLeft size={14} className="text-gray-400" />
            }
          </button>
        )}
        {confirmDelete === id ? (
          <div className="flex items-center gap-1">
            <button onClick={() => onEliminar(id)} disabled={eliminando === id}
              className="text-xs px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg transition font-semibold disabled:opacity-50">
              {eliminando === id ? '...' : 'Confirmar'}
            </button>
            <button onClick={onCancelDelete} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg transition">No</button>
          </div>
        ) : (
          <button onClick={() => onConfirmDelete(id)} title="Eliminar usuario"
            className="p-1.5 rounded-lg text-gray-200 hover:text-red-500 hover:bg-red-50 transition">
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Sección por rol ──────────────────────────────────────────────────────────

function RolSection({ rolDef, usuarios, onToggle, toggling, onEliminar, eliminando, confirmDelete, onConfirmDelete, onCancelDelete, onResetPassword, reseteando }: {
  rolDef: RolDef; usuarios: UsuarioAPI[];
  onToggle: (id: string) => void; toggling: string | null;
  onEliminar: (id: string) => void; eliminando: string | null;
  confirmDelete: string | null; onConfirmDelete: (id: string) => void; onCancelDelete: () => void;
  onResetPassword: (id: string) => void; reseteando: string | null;
}) {
  const { clases } = rolDef;
  return (
    <div className="mb-5">
      <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${clases.border} ${clases.bg} mb-2.5`}>
        <span className={`mt-0.5 flex-shrink-0 ${clases.text}`}>{rolDef.icono}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-bold text-sm ${clases.text}`}>{rolDef.label}</h3>
            <span className="text-xs text-gray-400">{usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{rolDef.descripcion}</p>
        </div>
      </div>
      {usuarios.length === 0
        ? <p className="text-xs text-gray-400 italic pl-4 pb-1">Sin usuarios con este rol todavía.</p>
        : <div className="space-y-1.5 pl-2">
            {usuarios.map(u => (
              <UsuarioCard key={u.usuarioId} usuario={u} rolDef={rolDef}
                onToggle={onToggle} toggling={toggling}
                onEliminar={onEliminar} eliminando={eliminando}
                confirmDelete={confirmDelete} onConfirmDelete={onConfirmDelete} onCancelDelete={onCancelDelete}
                onResetPassword={onResetPassword} reseteando={reseteando} />
            ))}
          </div>
      }
    </div>
  );
}

// ─── Usuarios por módulo ──────────────────────────────────────────────────────

function UsuariosPorModulo({ usuarios, onToggle, toggling, onEliminar, eliminando, confirmDelete, onConfirmDelete, onCancelDelete, onResetPassword, reseteando }: {
  usuarios: UsuarioAPI[];
  onToggle: (id: string) => void; toggling: string | null;
  onEliminar: (id: string) => void; eliminando: string | null;
  confirmDelete: string | null; onConfirmDelete: (id: string) => void; onCancelDelete: () => void;
  onResetPassword: (id: string) => void; reseteando: string | null;
}) {
  const [tabActivo, setTabActivo] = useState<ModuloTab>('tickets');
  const conteo = (m: ModuloTab) => usuarios.filter(u => u.modulo === m).length;
  const usuariosTab = usuarios.filter(u => u.modulo === tabActivo);

  return (
    <div>
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-5 w-fit">
        {MODULO_TABS.map(t => (
          <button key={t.key} onClick={() => setTabActivo(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              tabActivo === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              tabActivo === t.key ? 'bg-violet-100 text-violet-700' : 'bg-gray-200 text-gray-500'
            }`}>{conteo(t.key)}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 mb-4">{MODULO_TABS.find(t => t.key === tabActivo)?.desc}</p>
      {usuariosTab.length === 0
        ? <div className="text-center py-10 text-gray-400 text-sm">No hay usuarios en este módulo todavía.</div>
        : ROLES_DEF[tabActivo].map(rolDef => (
            <RolSection key={rolDef.value} rolDef={rolDef}
              usuarios={usuariosTab.filter(u => u.rol === rolDef.value)}
              onToggle={onToggle} toggling={toggling}
              onEliminar={onEliminar} eliminando={eliminando}
              confirmDelete={confirmDelete} onConfirmDelete={onConfirmDelete} onCancelDelete={onCancelDelete}
              onResetPassword={onResetPassword} reseteando={reseteando} />
          ))
      }
    </div>
  );
}

// ─── NAV items ────────────────────────────────────────────────────────────────

const NAV: { key: Seccion; label: string; icon: JSX.Element }[] = [
  { key: 'inicio',    label: 'Inicio',    icon: <LayoutDashboard size={16} /> },
  { key: 'usuarios',  label: 'Usuarios',  icon: <Users size={16} /> },
  { key: 'modulos',   label: 'Módulos',   icon: <Eye size={16} /> },
  { key: 'feedback',  label: 'Feedback',  icon: <MessageCircle size={16} /> },
];

// ─── DevPanel ─────────────────────────────────────────────────────────────────

export function DevPanel() {
  const { usuario, logout } = useAuth();
  const { etapasActivas } = useEtapas();
  const [seccion, setSeccion] = useState<Seccion>('inicio');
  const [vista, setVista] = useState<Vista>('panel');

  // Usuarios
  const [usuarios, setUsuarios] = useState<UsuarioAPI[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [form, setForm] = useState<{ nombre: string; email: string; modulo: ModuloForm; rol: string; etapas: string[] }>
    ({ nombre: '', email: '', modulo: 'tickets', rol: 'admin', etapas: [] });
  const [creando, setCreando] = useState(false);
  const [errForm, setErrForm] = useState('');
  const [exitoMsg, setExitoMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [reseteando, setReseteando] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState('');

  // Feedback
  const [feedbackItems, setFeedbackItems] = useState<{
    id: string; tipo: 'problema' | 'sugerencia'; mensaje: string;
    usuario_nombre: string; usuario_email: string; usuario_rol: string;
    usuario_modulo: string; leido: number; creado_en: string;
  }[]>([]);
  const [cargandoFeedback, setCargandoFeedback] = useState(false);
  const [feedbackFiltro, setFeedbackFiltro] = useState<'todos' | 'problema' | 'sugerencia'>('todos');

  const cargarFeedback = useCallback(async () => {
    setCargandoFeedback(true);
    try {
      const token = localStorage.getItem('sc_token') || '';
      const res = await fetch(`${API_URL}/feedback`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setFeedbackItems(d.feedback ?? []); }
    } catch { /* ignore */ } finally { setCargandoFeedback(false); }
  }, []);

  const marcarLeido = async (id: string) => {
    const token = localStorage.getItem('sc_token') || '';
    await fetch(`${API_URL}/feedback/${id}/leido`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    setFeedbackItems(prev => prev.map(f => f.id === id ? { ...f, leido: 1 } : f));
  };

  const eliminarFeedback = async (id: string) => {
    const token = localStorage.getItem('sc_token') || '';
    await fetch(`${API_URL}/feedback/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setFeedbackItems(prev => prev.filter(f => f.id !== id));
  };

  const cargarUsuarios = useCallback(async () => {
    setCargando(true); setErrorCarga('');
    try {
      const data = await apiCall<{ usuarios: UsuarioAPI[] }>('GET', '/usuarios');
      setUsuarios(data.usuarios.filter(u => u.rol !== 'dev'));
    } catch (e: any) { setErrorCarga(e.message || 'Error al cargar usuarios'); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => { cargarUsuarios(); cargarFeedback(); }, [cargarUsuarios, cargarFeedback]);

  const handleModuloChange = (m: ModuloForm) => setForm({ ...form, modulo: m, rol: ROLES_FORM[m][0].value, etapas: [] });
  const toggleEtapa = (e: string) => setForm(prev => ({ ...prev, etapas: prev.etapas.includes(e) ? prev.etapas.filter(x => x !== e) : [...prev.etapas, e] }));

  const handleCrear = async () => {
    setErrForm(''); setExitoMsg('');
    if (!form.nombre.trim()) { setErrForm('El nombre es obligatorio.'); return; }
    if (!form.email.includes('@')) { setErrForm('Email inválido.'); return; }
    if (form.modulo === 'tickets' && form.rol === 'contribuidor' && form.etapas.length === 0) { setErrForm('Seleccioná al menos una etapa para el contribuidor.'); return; }
    setCreando(true);
    try {
      await apiCall('POST', '/usuarios', { nombre: form.nombre.trim(), email: form.email.trim().toLowerCase(), modulo: form.modulo, rol: form.rol, ...(form.modulo === 'tickets' && form.rol === 'contribuidor' ? { estadosAsignados: form.etapas } : {}) });
      setExitoMsg(`Usuario creado. Invitación enviada a ${form.email.trim()}.`);
      setForm({ nombre: '', email: '', modulo: 'tickets', rol: 'admin', etapas: [] });
      await cargarUsuarios();
    } catch (e: any) { setErrForm(e.message || 'Error al crear usuario'); }
    finally { setCreando(false); }
  };

  const handleToggle = async (usuarioId: string) => {
    setToggling(usuarioId);
    try { await apiCall('PATCH', `/usuarios/${usuarioId}/toggle-activo`, {}); setUsuarios(prev => prev.map(u => u.usuarioId === usuarioId ? { ...u, activo: !u.activo } : u)); }
    catch (e: any) { alert(e.message); } finally { setToggling(null); }
  };

  const handleEliminar = async (usuarioId: string) => {
    setEliminando(usuarioId);
    try { await apiCall('DELETE', `/usuarios/${usuarioId}`); setUsuarios(prev => prev.filter(u => u.usuarioId !== usuarioId)); }
    catch (e: any) { alert(e.message); } finally { setEliminando(null); setConfirmDelete(null); }
  };

  const handleResetPassword = async (usuarioId: string) => {
    setReseteando(usuarioId); setResetMsg('');
    try { await apiCall('PATCH', `/usuarios/${usuarioId}/resetear-password`, {}); setResetMsg('Email de reseteo enviado.'); setTimeout(() => setResetMsg(''), 4000); }
    catch (e: any) { alert(e.message); } finally { setReseteando(null); }
  };

  // ── Overlays de módulos ──────────────────────────────────────────────────────
  const moduleFallback = <div className="min-h-screen bg-gray-50 flex items-center justify-center"><RefreshCw size={22} className="animate-spin text-gray-400" /></div>;

  if (vista === 'tickets')              return <VistaOverlay titulo="Sistema de Tickets"           color="bg-blue-700"    onVolver={() => setVista('panel')}><Suspense fallback={moduleFallback}><TicketsApp /></Suspense></VistaOverlay>;
  if (vista === 'savean')               return <VistaOverlay titulo="SAVEAN · Admin / Agencia"     color="bg-orange-700"  onVolver={() => setVista('panel')}><Suspense fallback={moduleFallback}><SaveanApp /></Suspense></VistaOverlay>;
  if (vista === 'savean-inspector')     return <VistaOverlay titulo="SAVEAN · Inspector"           color="bg-amber-700"   onVolver={() => setVista('panel')}><Suspense fallback={moduleFallback}><SaveanApp rolOverride="inspector" /></Suspense></VistaOverlay>;
  if (vista === 'savean-sanidad')       return <VistaOverlay titulo="SAVEAN · Sanidad"             color="bg-emerald-800" onVolver={() => setVista('panel')}><Suspense fallback={moduleFallback}><SaveanApp rolOverride="sanidad" /></Suspense></VistaOverlay>;
  if (vista === 'savean-punto-control') return <VistaOverlay titulo="SAVEAN · Punto de Control"   color="bg-red-800"     onVolver={() => setVista('panel')}><Suspense fallback={moduleFallback}><SaveanApp rolOverride="punto_control" /></Suspense></VistaOverlay>;

  // ── Datos para dashboard ─────────────────────────────────────────────────────
  const stats = {
    total:      usuarios.length,
    activos:    usuarios.filter(u => u.activo && !u.pendiente).length,
    pendientes: usuarios.filter(u => u.pendiente).length,
    feedbackNoLeido: feedbackItems.filter(f => !f.leido).length,
  };

  const feedbackVisibles = feedbackItems.filter(f => feedbackFiltro === 'todos' || f.tipo === feedbackFiltro);

  // ── Input / Select compartidos ───────────────────────────────────────────────
  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent bg-white';
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1.5';

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Sidebar ── */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col flex-shrink-0 shadow-sm">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Code2 size={16} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-gray-900 leading-none">Dev Panel</p>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-none">Agencia Calidad SJ</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(item => {
            const activo = seccion === item.key;
            const badge = item.key === 'feedback' && stats.feedbackNoLeido > 0 ? stats.feedbackNoLeido : null;
            return (
              <button
                key={item.key}
                onClick={() => setSeccion(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition text-left ${
                  activo
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <span className={activo ? 'text-violet-600' : 'text-gray-400'}>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {badge && (
                  <span className="bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
                {activo && <ChevronRight size={12} className="text-violet-400 flex-shrink-0" />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 border-t border-gray-100 pt-3 space-y-1">
          <div className="px-3 py-2">
            <p className="text-xs font-semibold text-gray-700 truncate">{usuario?.nombre}</p>
            <p className="text-[10px] text-gray-400 truncate">{usuario?.email}</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition"
          >
            <LogOut size={14} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Contenido principal ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">

          {/* ══ INICIO ══════════════════════════════════════════════════════════ */}
          {seccion === 'inicio' && (
            <div className="space-y-8">

              {/* Saludo */}
              <div>
                <h1 className="text-3xl font-black text-gray-900">
                  {saludo()}, Lucas.
                </h1>
                <p className="text-gray-400 mt-1 text-sm">
                  {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Usuarios totales',     value: stats.total,           icon: <Users size={18} />,          color: 'bg-violet-500', light: 'bg-violet-50 text-violet-700', onClick: () => setSeccion('usuarios') },
                  { label: 'Con acceso activo',    value: stats.activos,         icon: <CheckCircle2 size={18} />,   color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700', onClick: () => setSeccion('usuarios') },
                  { label: 'Pendientes de activar',value: stats.pendientes,      icon: <Clock size={18} />,          color: 'bg-amber-500', light: 'bg-amber-50 text-amber-700', onClick: () => setSeccion('usuarios') },
                  { label: 'Feedback sin leer',    value: stats.feedbackNoLeido, icon: <MessageCircle size={18} />, color: 'bg-red-500', light: 'bg-red-50 text-red-700', onClick: () => setSeccion('feedback') },
                ].map(k => (
                  <button key={k.label} onClick={k.onClick}
                    className="bg-white border border-gray-100 rounded-2xl p-5 text-left shadow-sm hover:shadow-md transition group">
                    <div className={`w-9 h-9 rounded-xl ${k.light} flex items-center justify-center mb-3 group-hover:scale-105 transition`}>
                      {k.icon}
                    </div>
                    <p className="text-2xl font-black text-gray-900">{k.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5 font-medium">{k.label}</p>
                  </button>
                ))}
              </div>

              {/* Accesos rápidos a módulos */}
              <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Vista rápida de módulos</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'tickets' as Vista,              label: 'Tickets — Admin',          desc: 'Vista completa del sistema de tickets', color: 'bg-blue-500', light: 'bg-blue-50 border-blue-100', text: 'text-blue-700', icon: <Ticket size={18} /> },
                    { key: 'savean' as Vista,               label: 'SAVEAN — Director',        desc: 'Panel administrativo de guías de origen', color: 'bg-orange-500', light: 'bg-orange-50 border-orange-100', text: 'text-orange-700', icon: <Leaf size={18} /> },
                    { key: 'savean-inspector' as Vista,     label: 'SAVEAN — Inspector',       desc: 'Vista del barrerista en campo', color: 'bg-amber-500', light: 'bg-amber-50 border-amber-100', text: 'text-amber-700', icon: <TreePine size={18} /> },
                    { key: 'savean-sanidad' as Vista,       label: 'SAVEAN — Sanidad',         desc: 'Panel de ingresos cárnicos y vegetales', color: 'bg-emerald-600', light: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', icon: <Stethoscope size={18} /> },
                    { key: 'savean-punto-control' as Vista, label: 'SAVEAN — Punto de Control', desc: 'Seguimiento de transportes en tránsito', color: 'bg-red-600', light: 'bg-red-50 border-red-100', text: 'text-red-700', icon: <MapPin size={18} /> },
                  ].map(m => (
                    <button key={m.key} onClick={() => setVista(m.key)}
                      className={`flex items-center gap-4 p-4 rounded-2xl border ${m.light} hover:shadow-md transition text-left group`}>
                      <div className={`w-10 h-10 rounded-xl ${m.color} flex items-center justify-center flex-shrink-0 text-white group-hover:scale-105 transition`}>
                        {m.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm ${m.text}`}>{m.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{m.desc}</p>
                      </div>
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback reciente */}
              {feedbackItems.filter(f => !f.leido).length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Feedback reciente sin leer</h2>
                    <button onClick={() => setSeccion('feedback')} className="text-xs text-violet-600 font-semibold hover:text-violet-800 transition">Ver todo</button>
                  </div>
                  <div className="space-y-2">
                    {feedbackItems.filter(f => !f.leido).slice(0, 3).map(f => (
                      <div key={f.id} className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm flex items-start gap-3">
                        <span className={`mt-0.5 flex-shrink-0 ${f.tipo === 'problema' ? 'text-red-500' : 'text-yellow-500'}`}>
                          {f.tipo === 'problema' ? <AlertCircle size={14} /> : <Lightbulb size={14} />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 leading-snug line-clamp-2">{f.mensaje}</p>
                          <p className="text-xs text-gray-400 mt-1">{f.usuario_nombre} · {f.usuario_rol} · {f.usuario_modulo}</p>
                        </div>
                        <button onClick={() => marcarLeido(f.id)} className="text-violet-400 hover:text-violet-600 transition flex-shrink-0 mt-0.5" title="Marcar como leído">
                          <CheckCircle2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ USUARIOS ════════════════════════════════════════════════════════ */}
          {seccion === 'usuarios' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-black text-gray-900">Usuarios</h1>
                <p className="text-gray-400 mt-1 text-sm">Creá y administrá cuentas del sistema.</p>
              </div>

              {/* Crear usuario */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center">
                    <Plus size={14} className="text-violet-600" />
                  </div>
                  <h2 className="font-bold text-gray-800 text-sm">Crear nuevo usuario</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className={labelCls}>Nombre completo</label>
                    <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Juan García" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="juan@agencia.gob.ar" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Sistema</label>
                    <select value={form.modulo} onChange={e => handleModuloChange(e.target.value as ModuloForm)} className={inputCls}>
                      <option value="tickets">Sistema de Tickets</option>
                      <option value="savean">SAVEAN — Guías de Origen</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Rol</label>
                    <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value, etapas: [] })} className={inputCls}>
                      {ROLES_FORM[form.modulo].map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                </div>

                {(() => {
                  const rolDef = ROLES_DEF[form.modulo]?.find(r => r.value === form.rol);
                  return rolDef ? (
                    <div className={`flex items-start gap-2.5 p-3 rounded-xl border ${rolDef.clases.border} ${rolDef.clases.bg} mb-4`}>
                      <span className={`mt-0.5 flex-shrink-0 ${rolDef.clases.text}`}>{rolDef.icono}</span>
                      <p className="text-xs text-gray-600 leading-relaxed">{rolDef.descripcion}</p>
                    </div>
                  ) : null;
                })()}

                {form.modulo === 'tickets' && form.rol === 'contribuidor' && (
                  <div className="mb-4 bg-violet-50 border border-violet-100 rounded-xl p-4">
                    <p className="text-xs text-violet-700 font-semibold mb-3 uppercase tracking-wide">Etapas del flujo asignadas</p>
                    <div className="flex flex-wrap gap-2">
                      {etapasActivas.map(e => {
                        const sel = form.etapas.includes(e.nombre);
                        return (
                          <button key={e.id} type="button" onClick={() => toggleEtapa(e.nombre)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition font-medium ${
                              sel ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600'
                            }`}>
                            {e.nombre}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {errForm && <p className="text-red-500 text-xs mb-3 flex items-center gap-1.5"><X size={12} /> {errForm}</p>}
                {exitoMsg && <p className="text-emerald-600 text-xs mb-3 flex items-center gap-1.5"><CheckCircle2 size={12} /> {exitoMsg}</p>}

                <button onClick={handleCrear} disabled={creando}
                  className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition shadow-sm">
                  <Plus size={15} />
                  {creando ? 'Creando...' : 'Crear usuario y enviar invitación'}
                </button>
              </div>

              {/* Lista usuarios */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Shield size={14} className="text-gray-500" />
                    </div>
                    <h2 className="font-bold text-gray-800 text-sm">Usuarios del sistema</h2>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{usuarios.length}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {resetMsg && <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 size={11} /> {resetMsg}</p>}
                    {errorCarga && <p className="text-xs text-red-500 flex items-center gap-1.5"><AlertCircle size={11} /> {errorCarga}</p>}
                    <button onClick={cargarUsuarios} className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-500 rounded-xl transition">
                      <RefreshCw size={12} className={cargando ? 'animate-spin' : ''} /> Recargar
                    </button>
                  </div>
                </div>
                {cargando
                  ? <div className="flex items-center justify-center py-12 text-gray-400"><RefreshCw size={20} className="animate-spin mr-2" /> Cargando...</div>
                  : <UsuariosPorModulo usuarios={usuarios} onToggle={handleToggle} toggling={toggling} onEliminar={handleEliminar} eliminando={eliminando} confirmDelete={confirmDelete} onConfirmDelete={setConfirmDelete} onCancelDelete={() => setConfirmDelete(null)} onResetPassword={handleResetPassword} reseteando={reseteando} />
                }
              </div>
            </div>
          )}

          {/* ══ MÓDULOS ═════════════════════════════════════════════════════════ */}
          {seccion === 'modulos' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-black text-gray-900">Módulos</h1>
                <p className="text-gray-400 mt-1 text-sm">Entrá a cualquier módulo con cualquier rol para ver exactamente lo que ve ese usuario.</p>
              </div>

              {[
                {
                  titulo: 'Sistema de Tickets',
                  desc: 'Gestión de trámites y solicitudes de la Agencia',
                  color: 'border-blue-100 bg-blue-50',
                  header: 'bg-blue-500',
                  vistas: [{ key: 'tickets' as Vista, label: 'Admin', icon: <Shield size={14} />, desc: 'Ve todos los tickets, gestiona usuarios y flujo completo' }],
                },
                {
                  titulo: 'SAVEAN — Guías de Origen',
                  desc: 'Control fitosanitario y cargas cárnicas / vegetales',
                  color: 'border-orange-100 bg-orange-50',
                  header: 'bg-orange-500',
                  vistas: [
                    { key: 'savean' as Vista,               label: 'Director / Admin',  icon: <Shield size={14} />,      desc: 'Control total: guías, informes, planillas, usuarios' },
                    { key: 'savean-inspector' as Vista,     label: 'Inspector Barrerista', icon: <TreePine size={14} />,   desc: 'Opera en barreras: entradas de vehículos y guías' },
                    { key: 'savean-sanidad' as Vista,       label: 'Sanidad',            icon: <Stethoscope size={14} />, desc: 'Panel de ingresos cárnicos y vegetales' },
                    { key: 'savean-punto-control' as Vista, label: 'Punto de Control',   icon: <MapPin size={14} />,      desc: 'Seguimiento de transportes en tránsito (Ruta 215)' },
                  ],
                },
              ].map(modulo => (
                <div key={modulo.titulo} className={`border ${modulo.color} rounded-2xl overflow-hidden`}>
                  <div className={`${modulo.header} px-5 py-3`}>
                    <p className="text-white font-bold text-sm">{modulo.titulo}</p>
                    <p className="text-white/70 text-xs mt-0.5">{modulo.desc}</p>
                  </div>
                  <div className="p-4 space-y-2">
                    {modulo.vistas.map(v => (
                      <button key={v.key} onClick={() => setVista(v.key)}
                        className="w-full flex items-center gap-4 p-3.5 bg-white rounded-xl border border-gray-100 hover:shadow-md transition group text-left">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-500 group-hover:bg-gray-200 transition">
                          {v.icon}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800 text-sm">{v.label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{v.desc}</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400 font-medium group-hover:text-gray-600 transition">
                          <Eye size={13} /> Ver
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══ FEEDBACK ════════════════════════════════════════════════════════ */}
          {seccion === 'feedback' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                    Feedback
                    {stats.feedbackNoLeido > 0 && (
                      <span className="text-sm bg-red-500 text-white font-black px-2.5 py-0.5 rounded-full">
                        {stats.feedbackNoLeido} nuevo{stats.feedbackNoLeido !== 1 ? 's' : ''}
                      </span>
                    )}
                  </h1>
                  <p className="text-gray-400 mt-1 text-sm">Mensajes enviados por los usuarios del sistema.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
                    {([
                      { key: 'todos', label: 'Todos' },
                      { key: 'problema', label: 'Problemas' },
                      { key: 'sugerencia', label: 'Sugerencias' },
                    ] as { key: typeof feedbackFiltro; label: string }[]).map(f => (
                      <button key={f.key} onClick={() => setFeedbackFiltro(f.key)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                          feedbackFiltro === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={cargarFeedback} className="flex items-center gap-1.5 text-xs px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-500 rounded-xl transition">
                    <RefreshCw size={12} className={cargandoFeedback ? 'animate-spin' : ''} /> Recargar
                  </button>
                </div>
              </div>

              {cargandoFeedback ? (
                <div className="flex items-center justify-center py-16 text-gray-400"><RefreshCw size={20} className="animate-spin mr-2" /> Cargando...</div>
              ) : feedbackVisibles.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-2xl py-16 text-center shadow-sm">
                  <MessageCircle size={32} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm font-medium">No hay mensajes{feedbackFiltro !== 'todos' ? ' de este tipo' : ''}.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {feedbackVisibles.map(f => (
                    <div key={f.id} className={`bg-white border rounded-2xl p-5 shadow-sm transition ${f.leido ? 'border-gray-100 opacity-70' : 'border-gray-200'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {f.tipo === 'problema'
                            ? <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full"><AlertCircle size={11} /> Problema</span>
                            : <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full"><Lightbulb size={11} /> Sugerencia</span>
                          }
                          <span className="text-sm font-semibold text-gray-800">{f.usuario_nombre}</span>
                          <span className="text-xs text-gray-400">{f.usuario_email}</span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400 capitalize">{f.usuario_rol}</span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">{f.usuario_modulo}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-300">
                            {new Date(f.creado_en).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                            {' '}
                            {new Date(f.creado_en).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {!f.leido && (
                            <button onClick={() => marcarLeido(f.id)} title="Marcar como leído"
                              className="text-violet-400 hover:text-violet-600 transition p-1 rounded-lg hover:bg-violet-50">
                              <CheckCircle2 size={15} />
                            </button>
                          )}
                          <button onClick={() => eliminarFeedback(f.id)} title="Eliminar"
                            className="text-gray-300 hover:text-red-500 transition p-1 rounded-lg hover:bg-red-50">
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                      <p className={`mt-3 text-sm leading-relaxed ${f.leido ? 'text-gray-400' : 'text-gray-700'}`}>{f.mensaje}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
