import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { TicketsApp } from './TicketsApp';
import { SaveanApp } from '../modules/savean/SaveanApp';
import {
  LogOut, Plus, Trash2, CheckCircle2, Clock,
  Users, Shield, Code2, ToggleLeft, ToggleRight, X,
  AlertCircle, RefreshCw, ArrowLeft, Ticket, Leaf,
  KeyRound, FileText, TreePine, Stethoscope,
} from 'lucide-react';

const API_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:3000/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UsuarioAPI {
  usuarioId: string;
  nombre: string;
  email: string;
  rol: string;
  modulo: string;
  activo: boolean;
  pendiente: boolean;
  estadosAsignados: string[];
  creadoEn: string;
}

type Vista = 'panel' | 'tickets' | 'savean';
type ModuloForm = 'tickets' | 'savean';
type ModuloTab = 'tickets' | 'savean' | 'comite';

// ─── Definición de módulos y roles ────────────────────────────────────────────

interface RolDef {
  value: string;
  label: string;
  descripcion: string;
  // Clases Tailwind estáticas por rol (necesario para que el compilador las incluya)
  clases: { bg: string; text: string; border: string; dot: string };
  icono: JSX.Element;
}

const ROLES_DEF: Record<ModuloTab, RolDef[]> = {
  tickets: [
    {
      value: 'admin',
      label: 'Administrador',
      descripcion:
        'Ve todos los tickets sin importar la etapa. Puede crear, editar y cerrar tickets, gestionar usuarios y configurar el flujo completo de trabajo.',
      clases: { bg: 'bg-violet-500/15', text: 'text-violet-300', border: 'border-violet-500/30', dot: 'bg-violet-400' },
      icono: <Shield size={14} />,
    },
    {
      value: 'contribuidor',
      label: 'Contribuidor',
      descripcion:
        'Solo accede a los tickets en las etapas que le fueron asignadas. Diseñado para especialistas de cada área del proceso (Veraz, Contrato, Simulador, etc.).',
      clases: { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30', dot: 'bg-blue-400' },
      icono: <FileText size={14} />,
    },
  ],
  savean: [
    {
      value: 'admin',
      label: 'Director / Agencia',
      descripcion:
        'Control total de SAVEAN. Crea y aprueba guías, accede a informes y planillas de barreras, y gestiona a los inspectores.',
      clases: { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/30', dot: 'bg-orange-400' },
      icono: <Shield size={14} />,
    },
    {
      value: 'inspector',
      label: 'Inspector Barrerista',
      descripcion:
        'Opera en campo desde las barreras. Registra entradas de vehículos y crea guías de origen para la mercadería que sale de la provincia.',
      clases: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30', dot: 'bg-amber-400' },
      icono: <TreePine size={14} />,
    },
    {
      value: 'sanidad',
      label: 'Sanidad',
      descripcion:
        'Accede únicamente al panel de ingresos del área de sanidad. Vista restringida para el control fitosanitario de entradas a la provincia.',
      clases: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
      icono: <Stethoscope size={14} />,
    },
  ],
  comite: [
    {
      value: 'contribuidor',
      label: 'Miembro del Comité',
      descripcion:
        'Accede al formulario de análisis de su programa específico (CASEMI, etc.). Cada miembro está vinculado a un solo programa y solo ve ese formulario.',
      clases: { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30', dot: 'bg-purple-400' },
      icono: <FileText size={14} />,
    },
  ],
};

const MODULO_TABS: { key: ModuloTab; label: string; desc: string }[] = [
  { key: 'tickets', label: 'Tickets',  desc: 'Gestión de trámites y solicitudes' },
  { key: 'savean',  label: 'SAVEAN',   desc: 'Guías de Origen · Control fitosanitario' },
  { key: 'comite',  label: 'Comité',   desc: 'Análisis de programas (CASEMI, etc.)' },
];

const ROLES_FORM: Record<ModuloForm, { value: string; label: string }[]> = {
  tickets: [
    { value: 'admin',        label: 'Administrador (ve todo)' },
    { value: 'contribuidor', label: 'Contribuidor (por etapas)' },
  ],
  savean: [
    { value: 'admin',     label: 'Director / Agencia' },
    { value: 'inspector', label: 'Inspector Barrerista' },
    { value: 'sanidad',   label: 'Sanidad (panel de ingresos)' },
  ],
};

const ETAPAS_TICKETS = [
  'Solicitud inicial', 'Revisión de documentación', 'Veraz',
  'Comité de análisis', 'Contrato', 'Simulador',
  'Firma de contrato', 'Certificación de firma', 'Transferencia',
  'Seguimiento de verificable', 'Cerrado',
];

// ─── API helper ───────────────────────────────────────────────────────────────

async function apiCall<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = localStorage.getItem('sc_token');
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Error ${res.status}`);
  }
  if (res.status === 204) return {} as T;
  return res.json();
}

// ─── Wrapper de vista con barra de retorno ────────────────────────────────────

function VistaWrapper({ titulo, color, onVolver, children }: {
  titulo: string; color: string; onVolver: () => void; children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className={`fixed top-0 left-0 right-0 z-50 ${color} text-white px-4 py-2 flex items-center gap-4 shadow-lg`}>
        <button
          onClick={onVolver}
          className="flex items-center gap-1.5 text-sm font-semibold hover:opacity-80 transition"
        >
          <ArrowLeft size={15} /> Volver al Panel Dev
        </button>
        <span className="text-xs opacity-70 border-l border-white/30 pl-4">Viendo: {titulo}</span>
      </div>
      <div className="pt-10">{children}</div>
    </div>
  );
}

// ─── Tarjeta de usuario ───────────────────────────────────────────────────────

function UsuarioCard({
  usuario, rolDef,
  onToggle, toggling,
  onEliminar, eliminando, confirmDelete, onConfirmDelete, onCancelDelete,
  onResetPassword, reseteando,
}: {
  usuario: UsuarioAPI;
  rolDef: RolDef;
  onToggle: (id: string) => void;
  toggling: string | null;
  onEliminar: (id: string) => void;
  eliminando: string | null;
  confirmDelete: string | null;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  onResetPassword: (id: string) => void;
  reseteando: string | null;
}) {
  const { clases } = rolDef;
  const id = usuario.usuarioId;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${clases.border} bg-slate-900/60 hover:bg-slate-800/60 transition`}>
      {/* Dot de estado */}
      <div className="flex-shrink-0">
        {usuario.pendiente ? (
          <div className="w-2 h-2 rounded-full bg-amber-400" title="Pendiente de activación" />
        ) : usuario.activo ? (
          <div className="w-2 h-2 rounded-full bg-emerald-400" title="Activo" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-slate-600" title="Inactivo" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm truncate">{usuario.nombre}</p>
        <p className="text-xs text-slate-400 font-mono truncate">{usuario.email}</p>
        {usuario.pendiente && (
          <p className="text-xs text-amber-400 mt-0.5 flex items-center gap-1">
            <Clock size={10} /> Pendiente de activación
          </p>
        )}
        {usuario.modulo === 'tickets' && usuario.rol === 'contribuidor' && usuario.estadosAsignados.length > 0 && (
          <p className="text-xs text-slate-500 mt-0.5">
            Etapas: {usuario.estadosAsignados.join(' · ')}
          </p>
        )}
      </div>

      {/* Fecha */}
      <p className="text-xs text-slate-600 hidden lg:block flex-shrink-0">
        {new Date(usuario.creadoEn).toLocaleDateString('es-AR')}
      </p>

      {/* Acciones */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Reset password */}
        {!usuario.pendiente && (
          <button
            onClick={() => onResetPassword(id)}
            disabled={reseteando === id}
            title="Resetear contraseña (envía email)"
            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-300 hover:bg-slate-700 transition disabled:opacity-50"
          >
            <KeyRound size={13} />
          </button>
        )}

        {/* Toggle activo */}
        {!usuario.pendiente && (
          <button
            onClick={() => onToggle(id)}
            disabled={toggling === id}
            title={usuario.activo ? 'Desactivar acceso' : 'Activar acceso'}
            className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition font-medium disabled:opacity-50"
          >
            {toggling === id
              ? <RefreshCw size={11} className="animate-spin" />
              : usuario.activo
                ? <ToggleRight size={13} className="text-emerald-400" />
                : <ToggleLeft size={13} className="text-slate-500" />
            }
          </button>
        )}

        {/* Eliminar */}
        {confirmDelete === id ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEliminar(id)}
              disabled={eliminando === id}
              className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-semibold disabled:opacity-50"
            >
              {eliminando === id ? '...' : 'Confirmar'}
            </button>
            <button
              onClick={onCancelDelete}
              className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded-lg transition"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => onConfirmDelete(id)}
            title="Eliminar usuario"
            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-slate-700 transition"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Sección de rol ───────────────────────────────────────────────────────────

function RolSection({
  rolDef, usuarios,
  onToggle, toggling,
  onEliminar, eliminando, confirmDelete, onConfirmDelete, onCancelDelete,
  onResetPassword, reseteando,
}: {
  rolDef: RolDef;
  usuarios: UsuarioAPI[];
  onToggle: (id: string) => void;
  toggling: string | null;
  onEliminar: (id: string) => void;
  eliminando: string | null;
  confirmDelete: string | null;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  onResetPassword: (id: string) => void;
  reseteando: string | null;
}) {
  const { clases } = rolDef;

  return (
    <div className="mb-6">
      {/* Header del rol */}
      <div className={`flex items-start gap-3 p-4 rounded-xl border ${clases.border} ${clases.bg} mb-3`}>
        <div className={`mt-0.5 flex-shrink-0 ${clases.text}`}>
          {rolDef.icono}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-bold text-sm ${clases.text}`}>{rolDef.label}</h3>
            <span className="text-xs text-slate-500 font-mono">
              {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{rolDef.descripcion}</p>
        </div>
      </div>

      {/* Lista de usuarios */}
      {usuarios.length === 0 ? (
        <p className="text-xs text-slate-600 italic pl-4 pb-2">Sin usuarios con este rol todavía.</p>
      ) : (
        <div className="space-y-2 pl-2">
          {usuarios.map(u => (
            <UsuarioCard
              key={u.usuarioId}
              usuario={u}
              rolDef={rolDef}
              onToggle={onToggle}
              toggling={toggling}
              onEliminar={onEliminar}
              eliminando={eliminando}
              confirmDelete={confirmDelete}
              onConfirmDelete={onConfirmDelete}
              onCancelDelete={onCancelDelete}
              onResetPassword={onResetPassword}
              reseteando={reseteando}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Vista de usuarios por módulo ─────────────────────────────────────────────

function UsuariosPorModulo({
  usuarios,
  onToggle, toggling,
  onEliminar, eliminando, confirmDelete, onConfirmDelete, onCancelDelete,
  onResetPassword, reseteando,
}: {
  usuarios: UsuarioAPI[];
  onToggle: (id: string) => void;
  toggling: string | null;
  onEliminar: (id: string) => void;
  eliminando: string | null;
  confirmDelete: string | null;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  onResetPassword: (id: string) => void;
  reseteando: string | null;
}) {
  const [tabActivo, setTabActivo] = useState<ModuloTab>('tickets');

  const conteo = (m: ModuloTab) => usuarios.filter(u => u.modulo === m).length;
  const usuariosTab = usuarios.filter(u => u.modulo === tabActivo);

  return (
    <div>
      {/* Tabs de módulo */}
      <div className="flex gap-1 p-1 bg-slate-800/80 rounded-xl mb-6 flex-wrap">
        {MODULO_TABS.map(t => {
          const activo = tabActivo === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTabActivo(t.key)}
              className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
                activo
                  ? 'bg-slate-950 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <span>{t.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activo ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-400'
              }`}>
                {conteo(t.key)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Descripción del módulo activo */}
      <p className="text-xs text-slate-500 mb-5 px-1">
        {MODULO_TABS.find(t => t.key === tabActivo)?.desc}
      </p>

      {/* Grupos por rol */}
      {usuariosTab.length === 0 && ROLES_DEF[tabActivo].every(r => usuarios.filter(u => u.modulo === tabActivo && u.rol === r.value).length === 0) ? (
        <div className="text-center py-10 text-slate-600 text-sm">
          No hay usuarios en este módulo todavía.
        </div>
      ) : (
        ROLES_DEF[tabActivo].map(rolDef => (
          <RolSection
            key={rolDef.value}
            rolDef={rolDef}
            usuarios={usuariosTab.filter(u => u.rol === rolDef.value)}
            onToggle={onToggle}
            toggling={toggling}
            onEliminar={onEliminar}
            eliminando={eliminando}
            confirmDelete={confirmDelete}
            onConfirmDelete={onConfirmDelete}
            onCancelDelete={onCancelDelete}
            onResetPassword={onResetPassword}
            reseteando={reseteando}
          />
        ))
      )}
    </div>
  );
}

// ─── DevPanel principal ───────────────────────────────────────────────────────

export function DevPanel() {
  const { usuario, logout } = useAuth();
  const [vista, setVista] = useState<Vista>('panel');

  // Usuarios
  const [usuarios, setUsuarios] = useState<UsuarioAPI[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');

  // Formulario crear usuario
  const [form, setForm] = useState<{
    nombre: string; email: string;
    modulo: ModuloForm; rol: string; etapas: string[];
  }>({ nombre: '', email: '', modulo: 'tickets', rol: 'admin', etapas: [] });
  const [creando, setCreando] = useState(false);
  const [errForm, setErrForm] = useState('');
  const [exitoMsg, setExitoMsg] = useState('');

  // Acciones de usuario
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [reseteando, setReseteando] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState('');

  const cargarUsuarios = useCallback(async () => {
    setCargando(true);
    setErrorCarga('');
    try {
      const data = await apiCall<{ usuarios: UsuarioAPI[] }>('GET', '/usuarios');
      setUsuarios(data.usuarios.filter(u => u.rol !== 'dev'));
    } catch (e: any) {
      setErrorCarga(e.message || 'Error al cargar usuarios');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarUsuarios(); }, [cargarUsuarios]);

  const handleModuloChange = (m: ModuloForm) => {
    setForm({ ...form, modulo: m, rol: ROLES_FORM[m][0].value, etapas: [] });
  };

  const toggleEtapa = (e: string) => {
    setForm(prev => ({
      ...prev,
      etapas: prev.etapas.includes(e) ? prev.etapas.filter(x => x !== e) : [...prev.etapas, e],
    }));
  };

  const handleCrear = async () => {
    setErrForm('');
    setExitoMsg('');
    if (!form.nombre.trim()) { setErrForm('El nombre es obligatorio.'); return; }
    if (!form.email.includes('@')) { setErrForm('Email inválido.'); return; }
    if (form.modulo === 'tickets' && form.rol === 'contribuidor' && form.etapas.length === 0) {
      setErrForm('Seleccioná al menos una etapa para el contribuidor.'); return;
    }

    setCreando(true);
    try {
      await apiCall('POST', '/usuarios', {
        nombre: form.nombre.trim(),
        email:  form.email.trim().toLowerCase(),
        modulo: form.modulo,
        rol:    form.rol,
        ...(form.modulo === 'tickets' && form.rol === 'contribuidor'
          ? { estadosAsignados: form.etapas } : {}),
      });
      setExitoMsg(`Usuario creado. Se envió el link de activación a ${form.email.trim()}.`);
      setForm({ nombre: '', email: '', modulo: 'tickets', rol: 'admin', etapas: [] });
      await cargarUsuarios();
    } catch (e: any) {
      setErrForm(e.message || 'Error al crear usuario');
    } finally {
      setCreando(false);
    }
  };

  const handleToggle = async (usuarioId: string) => {
    setToggling(usuarioId);
    try {
      await apiCall('PATCH', `/usuarios/${usuarioId}/toggle-activo`, {});
      setUsuarios(prev =>
        prev.map(u => u.usuarioId === usuarioId ? { ...u, activo: !u.activo } : u)
      );
    } catch (e: any) {
      alert(e.message);
    } finally {
      setToggling(null);
    }
  };

  const handleEliminar = async (usuarioId: string) => {
    setEliminando(usuarioId);
    try {
      await apiCall('DELETE', `/usuarios/${usuarioId}`);
      setUsuarios(prev => prev.filter(u => u.usuarioId !== usuarioId));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setEliminando(null);
      setConfirmDelete(null);
    }
  };

  const handleResetPassword = async (usuarioId: string) => {
    setReseteando(usuarioId);
    setResetMsg('');
    try {
      await apiCall('PATCH', `/usuarios/${usuarioId}/resetear-password`, {});
      setResetMsg('Se envió el email de reseteo de contraseña.');
      setTimeout(() => setResetMsg(''), 4000);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setReseteando(null);
    }
  };

  // ── Vistas de módulos ────────────────────────────────────────────────────────
  if (vista === 'tickets') {
    return (
      <VistaWrapper titulo="Sistema de Tickets" color="bg-blue-700" onVolver={() => setVista('panel')}>
        <TicketsApp />
      </VistaWrapper>
    );
  }
  if (vista === 'savean') {
    return (
      <VistaWrapper titulo="SAVEAN · Guías de Origen" color="bg-orange-700" onVolver={() => setVista('panel')}>
        <SaveanApp />
      </VistaWrapper>
    );
  }

  const stats = {
    total:     usuarios.length,
    activos:   usuarios.filter(u => u.activo && !u.pendiente).length,
    pendientes: usuarios.filter(u => u.pendiente).length,
  };

  // ── Panel principal ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* ── Header ── */}
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bg-violet-600 p-2 rounded-lg">
              <Code2 size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-tight">Panel de Desarrollador</h1>
              <p className="text-xs text-slate-400">Sistema de Gestión — Agencia Calidad San Juan</p>
            </div>
          </div>

          {/* Accesos rápidos a módulos */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setVista('tickets')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
            >
              <Ticket size={15} /> Tickets
            </button>
            <button
              onClick={() => setVista('savean')}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition"
            >
              <Leaf size={15} /> SAVEAN
            </button>
            <div className="w-px h-6 bg-slate-700 hidden sm:block" />
            <span className="text-xs text-slate-500 hidden sm:block">{usuario?.email}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition"
            >
              <LogOut size={14} /> Salir
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Usuarios totales',       value: stats.total,     color: 'bg-violet-600' },
            { label: 'Con acceso activo',       value: stats.activos,   color: 'bg-emerald-600' },
            { label: 'Pendientes de activar',   value: stats.pendientes, color: 'bg-amber-500' },
          ].map(k => (
            <div key={k.label} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
              <div className={`${k.color} p-2.5 rounded-lg flex-shrink-0`}>
                <Users size={18} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-white">{k.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{k.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Formulario crear usuario ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Plus size={16} className="text-violet-400" />
            <h2 className="font-bold text-white text-sm uppercase tracking-wide">Crear nuevo usuario</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Nombre completo</label>
              <input
                type="text" value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                placeholder="Juan García"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Email</label>
              <input
                type="email" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="juan@agencia.gob.ar"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Sistema</label>
              <select
                value={form.modulo}
                onChange={e => handleModuloChange(e.target.value as ModuloForm)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                <option value="tickets">Sistema de Tickets</option>
                <option value="savean">SAVEAN — Guías de Origen</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Rol</label>
              <select
                value={form.rol}
                onChange={e => setForm({ ...form, rol: e.target.value, etapas: [] })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                {ROLES_FORM[form.modulo].map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Descripción del rol seleccionado */}
          {(() => {
            const rolDef = ROLES_DEF[form.modulo]?.find(r => r.value === form.rol);
            return rolDef ? (
              <div className={`flex items-start gap-2 p-3 rounded-lg border ${rolDef.clases.border} ${rolDef.clases.bg} mb-4`}>
                <span className={`mt-0.5 flex-shrink-0 ${rolDef.clases.text}`}>{rolDef.icono}</span>
                <p className="text-xs text-slate-300 leading-relaxed">{rolDef.descripcion}</p>
              </div>
            ) : null;
          })()}

          {/* Etapas (solo tickets contribuidor) */}
          {form.modulo === 'tickets' && form.rol === 'contribuidor' && (
            <div className="mb-4 bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <p className="text-xs text-violet-300 font-semibold mb-3 uppercase tracking-wide">
                Etapas del flujo que maneja este usuario
              </p>
              <div className="flex flex-wrap gap-2">
                {ETAPAS_TICKETS.map(e => {
                  const sel = form.etapas.includes(e);
                  return (
                    <button
                      key={e} type="button" onClick={() => toggleEtapa(e)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition font-medium ${
                        sel
                          ? 'bg-violet-600/30 border-violet-500 text-violet-200'
                          : 'bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {e}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {errForm && (
            <p className="text-red-400 text-xs mb-3 flex items-center gap-1.5">
              <X size={12} /> {errForm}
            </p>
          )}
          {exitoMsg && (
            <p className="text-emerald-400 text-xs mb-3 flex items-center gap-1.5">
              <CheckCircle2 size={12} /> {exitoMsg}
            </p>
          )}

          <button
            onClick={handleCrear} disabled={creando}
            className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
          >
            <Plus size={15} />
            {creando ? 'Creando...' : 'Crear usuario y enviar email de activación'}
          </button>
        </div>

        {/* ── Usuarios por módulo ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-violet-400" />
              <h2 className="font-bold text-white text-sm uppercase tracking-wide">Usuarios del sistema</h2>
            </div>
            <div className="flex items-center gap-3">
              {resetMsg && (
                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={11} /> {resetMsg}
                </p>
              )}
              {errorCarga && (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <AlertCircle size={11} /> {errorCarga}
                </p>
              )}
              <button
                onClick={cargarUsuarios}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
              >
                <RefreshCw size={12} className={cargando ? 'animate-spin' : ''} />
                Recargar
              </button>
            </div>
          </div>

          {cargando ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={20} className="animate-spin text-slate-500" />
              <span className="ml-2 text-sm text-slate-500">Cargando usuarios...</span>
            </div>
          ) : (
            <UsuariosPorModulo
              usuarios={usuarios}
              onToggle={handleToggle}
              toggling={toggling}
              onEliminar={handleEliminar}
              eliminando={eliminando}
              confirmDelete={confirmDelete}
              onConfirmDelete={setConfirmDelete}
              onCancelDelete={() => setConfirmDelete(null)}
              onResetPassword={handleResetPassword}
              reseteando={reseteando}
            />
          )}
        </div>

      </div>
    </div>
  );
}
