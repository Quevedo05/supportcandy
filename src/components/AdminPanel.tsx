import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFormularios } from '../context/FormulariosContext';
import { useEtapas, type Etapa } from '../context/EtapasContext';
import { X, Plus, Trash2, Eye, EyeOff, Users, FileText, Mail, CheckCircle2, ShieldCheck, KeyRound, Settings, ChevronUp, ChevronDown, Pencil } from 'lucide-react';
import { FormulariosPanel } from './FormulariosPanel';

const PALETA_COLORES = [
  { color: '#F97316', bg: '#FFF7ED', nombre: 'Naranja' },
  { color: '#EAB308', bg: '#FEFCE8', nombre: 'Amarillo' },
  { color: '#22C55E', bg: '#F0FDF4', nombre: 'Verde' },
  { color: '#06B6D4', bg: '#ECFEFF', nombre: 'Cyan' },
  { color: '#3B82F6', bg: '#EFF6FF', nombre: 'Azul' },
  { color: '#6366F1', bg: '#EEF2FF', nombre: 'Índigo' },
  { color: '#8B5CF6', bg: '#F5F3FF', nombre: 'Violeta' },
  { color: '#EC4899', bg: '#FDF2F8', nombre: 'Rosa' },
  { color: '#D946EF', bg: '#FDF4FF', nombre: 'Fucsia' },
  { color: '#14B8A6', bg: '#F0FDFA', nombre: 'Teal' },
  { color: '#F59E0B', bg: '#FFFBEB', nombre: 'Ámbar' },
  { color: '#EF4444', bg: '#FEF2F2', nombre: 'Rojo' },
  { color: '#6B7280', bg: '#F9FAFB', nombre: 'Gris' },
];

interface UsuarioDB {
  usuarioId: string;
  nombre: string;
  email: string;
  rol: string;
  modulo: string;
  activo: boolean;
  estadosAsignados: string[];
  puedeEditarDatos: boolean;
  creadoEn: string;
}

export function AdminPanel() {
  const { usuario } = useAuth();
  const { formularios } = useFormularios();
  const { etapas, recargar: recargarEtapas } = useEtapas();
  const apiUrl = (import.meta.env as Record<string, string>).VITE_API_URL;
  const [usuariosDB, setUsuariosDB] = useState<UsuarioDB[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [seccionActiva, setSeccionActiva] = useState<'usuarios' | 'formularios' | 'configuracion'>('usuarios');

  // ── Estado para la sección de etapas ──────────────────────────────────────
  const [modalEtapa, setModalEtapa] = useState<{
    modo: 'crear' | 'editar';
    etapa?: Etapa;
  } | null>(null);
  const [formEtapa, setFormEtapa] = useState({ nombre: '', colorIdx: 0, esCierre: false });
  const [guardandoEtapa, setGuardandoEtapa] = useState(false);
  const [errorEtapa, setErrorEtapa] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    rol: 'contribuidor' as 'admin' | 'contribuidor' | 'inspector' | 'supervisor',
    modulo: 'tickets' as 'tickets' | 'savean' | 'comite',
    formularioId: '',
  });
  const [erroresForm, setErroresForm] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [invitacionEnviada, setInvitacionEnviada] = useState(false);
  const [modalEstados, setModalEstados] = useState<{ usuarioId: string; nombre: string; estados: string[] } | null>(null);
  const [guardandoEstados, setGuardandoEstados] = useState(false);
  const [resetandoId, setResetandoId] = useState<string | null>(null);
  const [resetOkId, setResetOkId] = useState<string | null>(null);

  const fetchUsuarios = useCallback(async () => {
    const token = localStorage.getItem('sc_token');
    if (!token) { setCargandoUsuarios(false); return; }
    try {
      const res = await fetch(`${apiUrl}/usuarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsuariosDB(data.usuarios ?? []);
      }
    } finally {
      setCargandoUsuarios(false);
    }
  }, [apiUrl]);

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  const resetModal = () => {
    setFormData({ nombre: '', email: '', rol: 'contribuidor', modulo: 'tickets', formularioId: '' });
    setErroresForm({});
    setInvitacionEnviada(false);
    setMostrarModal(false);
  };

  const handleCreateUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    const errores: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.nombre.trim()) errores.nombre = 'El nombre es requerido';
    if (!formData.email.trim()) errores.email = 'El email es requerido';
    else if (!emailRegex.test(formData.email)) errores.email = 'El email no es válido';

    setErroresForm(errores);
    if (Object.keys(errores).length > 0) return;

    setEnviando(true);
    try {
      const token = localStorage.getItem('sc_token');
      const res = await fetch(`${apiUrl}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          email: formData.email.trim(),
          rol: formData.rol,
          modulo: formData.modulo,
          formularioId: formData.modulo === 'comite' ? formData.formularioId : undefined,
        }),
      });
      if (res.status === 409) { setErroresForm({ email: 'Este email ya está registrado' }); return; }
      if (!res.ok) { setErroresForm({ email: 'Error al crear el usuario. Intentá de nuevo.' }); return; }
      setInvitacionEnviada(true);
      fetchUsuarios();
    } catch {
      setErroresForm({ email: 'Error de conexión. Intentá de nuevo.' });
    } finally {
      setEnviando(false);
    }
  };

  const handleToggleActivo = async (usuarioId: string) => {
    const token = localStorage.getItem('sc_token');
    await fetch(`${apiUrl}/usuarios/${usuarioId}/toggle-activo`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchUsuarios();
  };

  const handleEliminar = async (usuarioId: string) => {
    const token = localStorage.getItem('sc_token');
    const res = await fetch(`${apiUrl}/usuarios/${usuarioId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 409) {
      const data = await res.json();
      alert(data.error);
      return;
    }
    fetchUsuarios();
  };

  const handleCambiarRol = async (usuarioId: string, nuevoRol: string) => {
    const token = localStorage.getItem('sc_token');
    await fetch(`${apiUrl}/usuarios/${usuarioId}/rol`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rol: nuevoRol }),
    });
    fetchUsuarios();
  };

  const handleToggleEditarDatos = async (usuarioId: string) => {
    const token = localStorage.getItem('sc_token');
    await fetch(`${apiUrl}/usuarios/${usuarioId}/toggle-editar-datos`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchUsuarios();
  };

  const handleResetearPassword = async (usuarioId: string) => {
    setResetandoId(usuarioId);
    try {
      const token = localStorage.getItem('sc_token');
      const res = await fetch(`${apiUrl}/usuarios/${usuarioId}/resetear-password`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setResetOkId(usuarioId);
        setTimeout(() => setResetOkId(null), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Error al resetear la contraseña');
      }
    } catch {
      alert('Error de conexión. Intentá de nuevo.');
    } finally {
      setResetandoId(null);
    }
  };

  const handleGuardarEstados = async () => {
    if (!modalEstados) return;
    setGuardandoEstados(true);
    const token = localStorage.getItem('sc_token');
    try {
      await fetch(`${apiUrl}/usuarios/${modalEstados.usuarioId}/estados-asignados`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ estados: modalEstados.estados }),
      });
      await fetchUsuarios();
      setModalEstados(null);
    } finally {
      setGuardandoEstados(false);
    }
  };

  // ── Handlers de etapas ────────────────────────────────────────────────────
  const abrirCrearEtapa = () => {
    setFormEtapa({ nombre: '', colorIdx: 0, esCierre: false });
    setErrorEtapa('');
    setModalEtapa({ modo: 'crear' });
  };

  const abrirEditarEtapa = (etapa: Etapa) => {
    const colorIdx = PALETA_COLORES.findIndex(p => p.color === etapa.color);
    setFormEtapa({ nombre: etapa.nombre, colorIdx: colorIdx >= 0 ? colorIdx : 0, esCierre: etapa.esCierre });
    setErrorEtapa('');
    setModalEtapa({ modo: 'editar', etapa });
  };

  const handleGuardarEtapa = async () => {
    if (!formEtapa.nombre.trim()) { setErrorEtapa('El nombre es requerido'); return; }
    setGuardandoEtapa(true);
    setErrorEtapa('');
    const token = localStorage.getItem('sc_token');
    const paleta = PALETA_COLORES[formEtapa.colorIdx];
    try {
      const body = { nombre: formEtapa.nombre.trim(), color: paleta.color, bgColor: paleta.bg, esCierre: formEtapa.esCierre };
      const res = await fetch(
        modalEtapa?.modo === 'editar'
          ? `${apiUrl}/config/etapas/${modalEtapa.etapa!.id}`
          : `${apiUrl}/config/etapas`,
        {
          method: modalEtapa?.modo === 'editar' ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorEtapa(data.error || 'Error al guardar');
        return;
      }
      await recargarEtapas();
      setModalEtapa(null);
    } finally {
      setGuardandoEtapa(false);
    }
  };

  const handleEliminarEtapa = async (etapa: Etapa) => {
    if (!confirm(`¿Eliminar la etapa "${etapa.nombre}"?`)) return;
    const token = localStorage.getItem('sc_token');
    const res = await fetch(`${apiUrl}/config/etapas/${etapa.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Error al eliminar');
      return;
    }
    await recargarEtapas();
  };

  const handleToggleActivaEtapa = async (etapa: Etapa) => {
    const token = localStorage.getItem('sc_token');
    await fetch(`${apiUrl}/config/etapas/${etapa.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ activa: !etapa.activa }),
    });
    await recargarEtapas();
  };

  const handleMoverEtapa = async (etapa: Etapa, direccion: 'arriba' | 'abajo') => {
    const ordenadas = [...etapas].sort((a, b) => a.orden - b.orden);
    const idx = ordenadas.findIndex(e => e.id === etapa.id);
    const swapIdx = direccion === 'arriba' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= ordenadas.length) return;

    const newOrden = ordenadas.map((e, i) => {
      if (i === idx) return { id: e.id, orden: ordenadas[swapIdx].orden };
      if (i === swapIdx) return { id: e.id, orden: ordenadas[idx].orden };
      return { id: e.id, orden: e.orden };
    });

    const token = localStorage.getItem('sc_token');
    await fetch(`${apiUrl}/config/etapas/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ orden: newOrden }),
    });
    await recargarEtapas();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-gradient-to-br from-indigo-600 to-blue-600 p-3 rounded-xl">
          <Users size={32} className="text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Panel de Administración</h2>
          <p className="text-sm text-gray-600">Gestiona usuarios, formularios y más</p>
        </div>
      </div>

      {/* Pestañas */}
      <div className="flex gap-2 border-b border-gray-200 mb-6">
        <button
          onClick={() => setSeccionActiva('usuarios')}
          className={`flex items-center gap-2 px-6 py-3 font-medium transition duration-200 border-b-2 ${
            seccionActiva === 'usuarios'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users size={20} />
          Usuarios
        </button>
        <button
          onClick={() => setSeccionActiva('formularios')}
          className={`flex items-center gap-2 px-6 py-3 font-medium transition duration-200 border-b-2 ${
            seccionActiva === 'formularios'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileText size={20} />
          Formularios
        </button>
        <button
          onClick={() => setSeccionActiva('configuracion')}
          className={`flex items-center gap-2 px-6 py-3 font-medium transition duration-200 border-b-2 ${
            seccionActiva === 'configuracion'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Settings size={20} />
          Configuración
        </button>
      </div>

      {/* Contenido dinámico */}
      {seccionActiva === 'usuarios' ? (
        <>
          {/* Botón de nuevo usuario */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setMostrarModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition duration-200 shadow-lg hover:shadow-xl"
            >
              <Plus size={20} />
              Nuevo Usuario
            </button>
          </div>

          {/* Tabla de usuarios */}
      {(() => {
        const MODULOS_ORDEN = ['tickets', 'savean', 'comite'] as const;
        const MODULO_LABEL: Record<string, string> = { tickets: 'Tickets', savean: 'SAVEAN', comite: 'Comité' };
        const MODULO_COLOR: Record<string, string> = {
          tickets: 'bg-indigo-600',
          savean: 'bg-cyan-600',
          comite: 'bg-amber-500',
        };
        const ROLES_ORDEN = ['admin', 'supervisor', 'inspector', 'contribuidor'];
        const ROL_LABEL: Record<string, string> = { admin: 'Admin', supervisor: 'Supervisor', inspector: 'Inspector', contribuidor: 'Operativo' };

        const grupos = MODULOS_ORDEN
          .map(modulo => ({
            modulo,
            roles: ROLES_ORDEN
              .map(rol => ({ rol, usuarios: usuariosDB.filter(u => u.modulo === modulo && u.rol === rol) }))
              .filter(g => g.usuarios.length > 0),
          }))
          .filter(g => g.roles.length > 0);

        return (
          <div className="space-y-6">
            {grupos.map(({ modulo, roles }) => (
              <div key={modulo} className="bg-white rounded-lg shadow overflow-x-auto">
                <div className={`${MODULO_COLOR[modulo]} px-6 py-2.5 flex items-center gap-2`}>
                  <Users size={16} className="text-white" />
                  <span className="text-white font-semibold text-sm">Módulo {MODULO_LABEL[modulo]}</span>
                  <span className="ml-auto text-white/70 text-xs">{roles.reduce((acc, r) => acc + r.usuarios.length, 0)} usuarios</span>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Rol</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Edición de datos</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {roles.map(({ rol, usuarios }) => (
                      <>
                        <tr key={`header-${modulo}-${rol}`} className="bg-gray-50/80">
                          <td colSpan={6} className="px-6 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider border-t border-gray-200">
                            {ROL_LABEL[rol] ?? rol}
                          </td>
                        </tr>
                        {usuarios.map((u) => (
                          <tr key={u.usuarioId} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">{u.nombre}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                <td className="px-6 py-4 text-sm">
                  {u.modulo === 'tickets' && usuario?.usuarioId !== u.usuarioId ? (
                    <select
                      value={u.rol}
                      onChange={(e) => handleCambiarRol(u.usuarioId, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                        u.rol === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      <option value="contribuidor">Operativo</option>
                      <option value="admin">Supervisor</option>
                    </select>
                  ) : (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        u.rol === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : u.rol === 'supervisor'
                            ? 'bg-indigo-100 text-indigo-800'
                            : u.rol === 'inspector'
                              ? 'bg-cyan-100 text-cyan-800'
                              : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {u.rol === 'admin' ? 'Admin' : u.rol === 'supervisor' ? 'Supervisor' : u.rol === 'inspector' ? 'Inspector' : 'Operativo'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  {u.modulo === 'tickets' && u.rol === 'contribuidor' ? (
                    <button
                      onClick={() => handleToggleEditarDatos(u.usuarioId)}
                      title={u.puedeEditarDatos ? 'Revocar permiso de edición de datos' : 'Habilitar edición de datos'}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition ${
                        u.puedeEditarDatos
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      <ShieldCheck size={13} />
                      {u.puedeEditarDatos ? 'Habilitado' : 'Sin permiso'}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      u.activo
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActivo(u.usuarioId)}
                      disabled={usuario?.usuarioId === u.usuarioId}
                      className="p-1 text-gray-600 hover:text-blue-600 disabled:text-gray-300 transition"
                      title={u.activo ? 'Desactivar' : 'Activar'}
                    >
                      {u.activo ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                    <button
                      onClick={() => handleResetearPassword(u.usuarioId)}
                      disabled={resetandoId === u.usuarioId || u.modulo === 'savean'}
                      className={`p-1 transition disabled:text-gray-300 ${resetOkId === u.usuarioId ? 'text-green-600' : 'text-gray-600 hover:text-amber-600'}`}
                      title={u.modulo === 'savean' ? 'No aplica para usuarios SAVEAN' : 'Resetear contraseña (envía email al usuario)'}
                    >
                      <KeyRound size={18} />
                    </button>
                    <button
                      onClick={() => handleEliminar(u.usuarioId)}
                      disabled={usuario?.usuarioId === u.usuarioId}
                      className="p-1 text-gray-600 hover:text-red-600 disabled:text-gray-300 transition"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
                        </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            {!cargandoUsuarios && usuariosDB.length === 0 && (
              <div className="bg-white rounded-lg shadow text-center py-12 text-gray-500">
                <p>No hay usuarios creados aún</p>
              </div>
            )}
            {cargandoUsuarios && (
              <div className="bg-white rounded-lg shadow text-center py-12 text-gray-400">
                <p>Cargando usuarios...</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Modal de invitar usuario */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Invitar Usuario</h3>
              <button onClick={resetModal} className="text-gray-500 hover:text-gray-700 transition">
                <X size={24} />
              </button>
            </div>

            {invitacionEnviada ? (
              <div className="text-center py-4">
                <CheckCircle2 size={56} className="text-emerald-500 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-gray-900 mb-2">¡Invitación enviada!</h4>
                <p className="text-gray-600 text-sm mb-1">
                  Se envió un email a <strong>{formData.email}</strong> con el link de activación.
                </p>
                <p className="text-gray-500 text-xs mb-6">El link expira en 48 horas.</p>
                <button onClick={resetModal} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition">
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateUsuario} className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                  <Mail size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-700 text-xs">
                    El usuario recibirá un email con un link para crear su propia contraseña.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${erroresForm.nombre ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Juan Pérez"
                  />
                  {erroresForm.nombre && <p className="text-xs text-red-600 mt-1">{erroresForm.nombre}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${erroresForm.email ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="juan@agenciacalidad.gob.ar"
                  />
                  {erroresForm.email && <p className="text-xs text-red-600 mt-1">{erroresForm.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Módulo</label>
                  <select
                    value={formData.modulo}
                    onChange={(e) => {
                      const m = e.target.value as 'tickets' | 'savean' | 'comite';
                      setFormData({
                        ...formData,
                        modulo: m,
                        rol: m === 'savean' ? 'inspector' : 'contribuidor',
                        formularioId: '',
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="tickets">Tickets (Portal de Créditos)</option>
                    <option value="savean">Savean (Control Fitosanitario)</option>
                    <option value="comite">Comité de Análisis</option>
                  </select>
                </div>

                {formData.modulo === 'comite' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Programa asignado</label>
                    <select
                      value={formData.formularioId}
                      onChange={(e) => setFormData({ ...formData, formularioId: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${erroresForm.formularioId ? 'border-red-500' : 'border-gray-300'}`}
                    >
                      <option value="">Seleccioná un programa...</option>
                      {formularios.map((f) => (
                        <option key={f.id} value={f.id}>{f.programa}</option>
                      ))}
                    </select>
                    {erroresForm.formularioId && <p className="text-xs text-red-600 mt-1">{erroresForm.formularioId}</p>}
                  </div>
                )}

                {formData.modulo !== 'comite' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                    <select
                      value={formData.rol}
                      onChange={(e) => setFormData({ ...formData, rol: e.target.value as 'admin' | 'contribuidor' | 'inspector' | 'supervisor' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {formData.modulo === 'tickets' ? (
                        <>
                          <option value="contribuidor">Operativo</option>
                          <option value="supervisor">Supervisor (reportes)</option>
                          <option value="admin">Administrador</option>
                        </>
                      ) : (
                        <>
                          <option value="inspector">Inspector Fitosanitario</option>
                          <option value="admin">Director / Agencia</option>
                          <option value="sanidad">Sanidad (panel de ingresos)</option>
                        </>
                      )}
                    </select>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <button type="button" onClick={resetModal} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={enviando}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Mail size={16} />
                    {enviando ? 'Enviando...' : 'Enviar Invitación'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
        </>
      ) : seccionActiva === 'formularios' ? (
        <FormulariosPanel />
      ) : (
        /* ── SECCIÓN CONFIGURACIÓN ─────────────────────────────────────── */
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-indigo-600 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings size={16} className="text-white" />
                <span className="text-white font-semibold text-sm">Etapas del ticket</span>
                <span className="text-white/70 text-xs ml-2">{etapas.length} etapas</span>
              </div>
              <button
                onClick={abrirCrearEtapa}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition"
              >
                <Plus size={14} />
                Nueva etapa
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {[...etapas].sort((a, b) => a.orden - b.orden).map((etapa, idx, arr) => (
                <div key={etapa.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition">
                  {/* Color swatch */}
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 border border-black/10"
                    style={{ backgroundColor: etapa.color }}
                  />
                  {/* Nombre */}
                  <span className="flex-1 text-sm font-medium text-gray-800">{etapa.nombre}</span>
                  {/* Badges */}
                  <div className="flex items-center gap-2">
                    {etapa.esCierre && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">Cierre</span>
                    )}
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${etapa.activa ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {etapa.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  {/* Acciones */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoverEtapa(etapa, 'arriba')}
                      disabled={idx === 0}
                      className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition"
                      title="Subir"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      onClick={() => handleMoverEtapa(etapa, 'abajo')}
                      disabled={idx === arr.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition"
                      title="Bajar"
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button
                      onClick={() => handleToggleActivaEtapa(etapa)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition"
                      title={etapa.activa ? 'Desactivar' : 'Activar'}
                    >
                      {etapa.activa ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button
                      onClick={() => abrirEditarEtapa(etapa)}
                      className="p-1 text-gray-400 hover:text-indigo-600 transition"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleEliminarEtapa(etapa)}
                      disabled={etapa.esCierre}
                      className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-30 transition"
                      title={etapa.esCierre ? 'No se puede eliminar la etapa de cierre' : 'Eliminar'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {etapas.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">No hay etapas configuradas</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal asignación de etapas */}
      {modalEstados && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Etapas de {modalEstados.nombre}</h3>
              <button onClick={() => setModalEstados(null)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Seleccioná las etapas del ticket que maneja este usuario. Cuando se le asigne un ticket, se moverá a esa etapa automáticamente.</p>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {[...etapas].sort((a, b) => a.orden - b.orden).filter(e => e.activa).map((etapa) => (
                <label key={etapa.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalEstados.estados.includes(etapa.nombre)}
                    onChange={(e) => {
                      const nuevos = e.target.checked
                        ? [...modalEstados.estados, etapa.nombre]
                        : modalEstados.estados.filter((s) => s !== etapa.nombre);
                      setModalEstados({ ...modalEstados, estados: nuevos });
                    }}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: etapa.color }} />
                  <span className="text-sm text-gray-800">{etapa.nombre}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModalEstados(null)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm">
                Cancelar
              </button>
              <button onClick={handleGuardarEstados} disabled={guardandoEstados} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-lg transition text-sm">
                {guardandoEstados ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear/editar etapa */}
      {modalEtapa && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900">
                {modalEtapa.modo === 'crear' ? 'Nueva etapa' : 'Editar etapa'}
              </h3>
              <button onClick={() => setModalEtapa(null)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={formEtapa.nombre}
                  onChange={e => setFormEtapa({ ...formEtapa, nombre: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errorEtapa ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Ej: Estudio de mercado"
                />
                {errorEtapa && <p className="text-xs text-red-600 mt-1">{errorEtapa}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {PALETA_COLORES.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => setFormEtapa({ ...formEtapa, colorIdx: idx })}
                      title={p.nombre}
                      className={`w-8 h-8 rounded-full border-2 transition ${formEtapa.colorIdx === idx ? 'border-gray-900 scale-110' : 'border-transparent hover:border-gray-400'}`}
                      style={{ backgroundColor: p.color }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: PALETA_COLORES[formEtapa.colorIdx].color }} />
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium border"
                    style={{
                      color: PALETA_COLORES[formEtapa.colorIdx].color,
                      backgroundColor: PALETA_COLORES[formEtapa.colorIdx].bg,
                      borderColor: PALETA_COLORES[formEtapa.colorIdx].color + '55',
                    }}
                  >
                    {formEtapa.nombre || 'Vista previa'}
                  </span>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formEtapa.esCierre}
                  onChange={e => setFormEtapa({ ...formEtapa, esCierre: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Es etapa de cierre</span>
                  <p className="text-xs text-gray-500">Cuando un ticket llega a esta etapa se marca como cerrado. Solo puede haber una.</p>
                </div>
              </label>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setModalEtapa(null)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button
                onClick={handleGuardarEtapa}
                disabled={guardandoEtapa}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg transition"
              >
                {guardandoEtapa ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
