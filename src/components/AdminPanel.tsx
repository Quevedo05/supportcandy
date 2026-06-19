import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Plus, Trash2, Eye, EyeOff, Users, FileText, Mail, CheckCircle2, ClipboardList, ShieldCheck } from 'lucide-react';
import { FormulariosPanel } from './FormulariosPanel';

const ESTADOS_TICKET = [
  'Solicitud inicial',
  'Revisión de documentación',
  'Veraz',
  'Comité de análisis',
  'Contrato',
  'Simulador',
  'Firma de contrato',
  'Certificación de firma',
  'Transferencia',
  'Seguimiento de verificable',
  'Cerrado',
] as const;

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
  const apiUrl = (import.meta.env as Record<string, string>).VITE_API_URL;
  const [usuariosDB, setUsuariosDB] = useState<UsuarioDB[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [seccionActiva, setSeccionActiva] = useState<'usuarios' | 'formularios'>('usuarios');
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    rol: 'contribuidor' as 'admin' | 'contribuidor' | 'inspector',
    modulo: 'tickets' as 'tickets' | 'savean',
  });
  const [erroresForm, setErroresForm] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [invitacionEnviada, setInvitacionEnviada] = useState(false);
  const [modalEstados, setModalEstados] = useState<{ usuarioId: string; nombre: string; estados: string[] } | null>(null);
  const [guardandoEstados, setGuardandoEstados] = useState(false);

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
    setFormData({ nombre: '', email: '', rol: 'contribuidor', modulo: 'tickets' });
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
        body: JSON.stringify({ nombre: formData.nombre.trim(), email: formData.email.trim(), rol: formData.rol, modulo: formData.modulo }),
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

  const handleToggleEditarDatos = async (usuarioId: string) => {
    const token = localStorage.getItem('sc_token');
    await fetch(`${apiUrl}/usuarios/${usuarioId}/toggle-editar-datos`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchUsuarios();
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
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Módulo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Rol</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Edición de datos</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {usuariosDB.map((u) => (
              <tr key={u.usuarioId} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">{u.nombre}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      u.modulo === 'savean'
                        ? 'bg-cyan-100 text-cyan-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {u.modulo === 'savean' ? 'Savean' : 'Tickets'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      u.rol === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : u.rol === 'inspector'
                          ? 'bg-cyan-100 text-cyan-800'
                          : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {u.rol === 'admin' ? 'Supervisor' : u.rol === 'inspector' ? 'Inspector' : 'Operativo'}
                  </span>
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
          </tbody>
        </table>

        {!cargandoUsuarios && usuariosDB.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No hay usuarios creados aún</p>
          </div>
        )}
        {cargandoUsuarios && (
          <div className="text-center py-12 text-gray-400">
            <p>Cargando usuarios...</p>
          </div>
        )}
      </div>

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
                    onChange={(e) => setFormData({ ...formData, modulo: e.target.value as 'tickets' | 'savean', rol: e.target.value === 'savean' ? 'inspector' : 'contribuidor' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="tickets">Tickets (Portal de Créditos)</option>
                    <option value="savean">Savean (Control Fitosanitario)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                  <select
                    value={formData.rol}
                    onChange={(e) => setFormData({ ...formData, rol: e.target.value as 'admin' | 'contribuidor' | 'inspector' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {formData.modulo === 'tickets' ? (
                      <>
                        <option value="contribuidor">Operativo</option>
                        <option value="admin">Supervisor</option>
                      </>
                    ) : (
                      <>
                        <option value="inspector">Inspector Fitosanitario</option>
                        <option value="admin">Director / Agencia</option>
                      </>
                    )}
                  </select>
                </div>

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
      ) : (
        <FormulariosPanel />
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
              {ESTADOS_TICKET.map((estado) => (
                <label key={estado} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalEstados.estados.includes(estado)}
                    onChange={(e) => {
                      const nuevos = e.target.checked
                        ? [...modalEstados.estados, estado]
                        : modalEstados.estados.filter((s) => s !== estado);
                      setModalEstados({ ...modalEstados, estados: nuevos });
                    }}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-800">{estado}</span>
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
    </div>
  );
}
