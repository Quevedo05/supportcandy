import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { TicketsApp } from './TicketsApp';
import { SaveanApp } from '../modules/savean/SaveanApp';
import {
  LogOut, Plus, Trash2, CheckCircle2, Clock,
  Users, Shield, Code2, ToggleLeft, ToggleRight, X,
  AlertCircle, RefreshCw, ArrowLeft, Ticket, Leaf,
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

const ROLES_POR_MODULO: Record<ModuloForm, { value: string; label: string }[]> = {
  tickets: [
    { value: 'admin',       label: 'Administrador (ve todo)' },
    { value: 'contribuidor', label: 'Contribuidor (por etapas)' },
  ],
  savean: [
    { value: 'admin',     label: 'Director / Agencia' },
    { value: 'inspector', label: 'Inspector Barrerista' },
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

// ─── Wrappers de vista con barra de retorno ────────────────────────────────

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
      <div className="pt-10">
        {children}
      </div>
    </div>
  );
}

// ─── Badges ──────────────────────────────────────────────────────────────────

function ModuloBadge({ modulo }: { modulo: string }) {
  const cfg: Record<string, string> = {
    savean:  'bg-orange-500/20 text-orange-300 border-orange-500/30',
    tickets: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    comite:  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  };
  const labels: Record<string, string> = { savean: 'SAVEAN', tickets: 'Tickets', comite: 'Comité' };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${cfg[modulo] ?? 'bg-slate-700 text-slate-300 border-slate-600'}`}>
      {labels[modulo] ?? modulo}
    </span>
  );
}

function RolBadge({ rol }: { rol: string }) {
  const labels: Record<string, string> = {
    admin: 'Admin', contribuidor: 'Contribuidor', inspector: 'Inspector',
    supervisor: 'Supervisor', dev: 'Dev', operativo: 'Operativo',
  };
  return <span className="text-xs text-slate-400">{labels[rol] ?? rol}</span>;
}

// ─── Main DevPanel ────────────────────────────────────────────────────────────

export function DevPanel() {
  const { usuario, logout } = useAuth();
  const [vista, setVista] = useState<Vista>('panel');

  // Usuarios
  const [usuarios, setUsuarios] = useState<UsuarioAPI[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');

  // Filtro
  const [filtroModulo, setFiltroModulo] = useState<string>('todos');

  // Formulario crear usuario
  const [form, setForm] = useState<{
    nombre: string; email: string;
    modulo: ModuloForm; rol: string; etapas: string[];
  }>({ nombre: '', email: '', modulo: 'tickets', rol: 'admin', etapas: [] });
  const [creando, setCreando] = useState(false);
  const [errForm, setErrForm] = useState('');
  const [exitoMsg, setExitoMsg] = useState('');

  // Confirmar eliminación
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

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
    setForm({ ...form, modulo: m, rol: ROLES_POR_MODULO[m][0].value, etapas: [] });
  };

  const toggleEtapa = (e: string) => {
    setForm(prev => ({
      ...prev,
      etapas: prev.etapas.includes(e)
        ? prev.etapas.filter(x => x !== e)
        : [...prev.etapas, e],
    }));
  };

  const handleCrear = async () => {
    setErrForm('');
    setExitoMsg('');
    if (!form.nombre.trim())          { setErrForm('El nombre es obligatorio.');      return; }
    if (!form.email.includes('@'))    { setErrForm('Email inválido.');                return; }
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

  // ── Vistas de módulos ────────────────────────────────────────────────────
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

  // ── Filtro de tabla ──────────────────────────────────────────────────────
  const listaFiltrada = filtroModulo === 'todos'
    ? usuarios
    : usuarios.filter(u => u.modulo === filtroModulo);

  const stats = {
    total:    usuarios.length,
    activos:  usuarios.filter(u => u.activo && !u.pendiente).length,
    pendiente: usuarios.filter(u => u.pendiente).length,
  };

  // ── Panel principal ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* ── Header ── */}
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-violet-600 p-2 rounded-lg">
              <Code2 size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-tight">Panel de Desarrollador</h1>
              <p className="text-xs text-slate-400">Sistema de Gestión — Agencia Calidad San Juan</p>
            </div>
          </div>

          {/* ── Accesos rápidos a módulos ── */}
          <div className="flex items-center gap-2">
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
            <div className="w-px h-6 bg-slate-700 mx-1" />
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
            { label: 'Usuarios totales', value: stats.total,    color: 'bg-violet-600' },
            { label: 'Con acceso activo', value: stats.activos,  color: 'bg-emerald-600' },
            { label: 'Pendientes de activar', value: stats.pendiente, color: 'bg-amber-500' },
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
                {ROLES_POR_MODULO[form.modulo].map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

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

        {/* ── Tabla de usuarios ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-violet-400" />
              <h2 className="font-bold text-white text-sm uppercase tracking-wide">Usuarios del sistema</h2>
            </div>
            <div className="flex items-center gap-3">
              {/* Filtro por módulo */}
              <select
                value={filtroModulo}
                onChange={e => setFiltroModulo(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
              >
                <option value="todos">Todos los módulos</option>
                <option value="tickets">Tickets</option>
                <option value="savean">SAVEAN</option>
                <option value="comite">Comité</option>
              </select>
              <button
                onClick={cargarUsuarios}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
              >
                <RefreshCw size={12} className={cargando ? 'animate-spin' : ''} />
                Recargar
              </button>
            </div>
          </div>

          {errorCarga && (
            <div className="mx-6 my-4 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <AlertCircle size={15} /> {errorCarga}
            </div>
          )}

          {cargando ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={20} className="animate-spin text-slate-500" />
              <span className="ml-2 text-sm text-slate-500">Cargando usuarios...</span>
            </div>
          ) : listaFiltrada.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-10">
              {filtroModulo === 'todos' ? 'No hay usuarios creados aún.' : `No hay usuarios en ${filtroModulo}.`}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-slate-800 uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-medium">Usuario</th>
                    <th className="text-left px-5 py-3 font-medium">Sistema / Rol</th>
                    <th className="text-left px-5 py-3 font-medium">Estado</th>
                    <th className="text-left px-5 py-3 font-medium">Alta</th>
                    <th className="text-left px-5 py-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {listaFiltrada.map(u => (
                    <tr key={u.usuarioId} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                      <td className="px-5 py-3">
                        <p className="font-medium text-white">{u.nombre}</p>
                        <p className="text-xs text-slate-400 font-mono">{u.email}</p>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <ModuloBadge modulo={u.modulo} />
                          <RolBadge rol={u.rol} />
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {u.pendiente ? (
                          <span className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                            <Clock size={11} /> Pendiente activación
                          </span>
                        ) : u.activo ? (
                          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                            <CheckCircle2 size={11} /> Activo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <X size={11} /> Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        {new Date(u.creadoEn).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {/* Toggle activo (solo usuarios activados) */}
                          {!u.pendiente && (
                            <button
                              onClick={() => handleToggle(u.usuarioId)}
                              disabled={toggling === u.usuarioId}
                              title={u.activo ? 'Desactivar' : 'Activar'}
                              className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition font-medium disabled:opacity-50"
                            >
                              {u.activo
                                ? <ToggleRight size={13} className="text-emerald-400" />
                                : <ToggleLeft size={13} />}
                              {toggling === u.usuarioId ? '...' : u.activo ? 'Activo' : 'Inactivo'}
                            </button>
                          )}

                          {/* Eliminar */}
                          {confirmDelete === u.usuarioId ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEliminar(u.usuarioId)}
                                disabled={eliminando === u.usuarioId}
                                className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition font-semibold disabled:opacity-50"
                              >
                                {eliminando === u.usuarioId ? '...' : 'Confirmar'}
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded-md transition"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(u.usuarioId)}
                              className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-700 hover:bg-red-800 text-slate-400 hover:text-red-300 rounded-md transition"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
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
