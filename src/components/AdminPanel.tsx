import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Plus, Trash2, Eye, EyeOff, Users, FileText } from 'lucide-react';
import { FormulariosPanel } from './FormulariosPanel';

export function AdminPanel() {
  const { usuarios, crearUsuario, eliminarUsuario, toggleActivoUsuario, usuario } = useAuth();
  const [mostrarModal, setMostrarModal] = useState(false);
  const [seccionActiva, setSeccionActiva] = useState<'usuarios' | 'formularios'>('usuarios');
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'contribuidor' as 'admin' | 'contribuidor',
  });
  const [erroresForm, setErroresForm] = useState<Record<string, string>>({});

  const validarEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleCreateUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    const errores: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      errores.nombre = 'El nombre es requerido';
    }
    if (!formData.email.trim()) {
      errores.email = 'El email es requerido';
    } else if (!validarEmail(formData.email)) {
      errores.email = 'El email no es válido';
    } else if (usuarios.some((u) => u.email === formData.email)) {
      errores.email = 'Este email ya está registrado';
    }
    if (!formData.password.trim()) {
      errores.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      errores.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    setErroresForm(errores);

    if (Object.keys(errores).length === 0) {
      crearUsuario({
        nombre: formData.nombre,
        email: formData.email,
        password: formData.password,
        rol: formData.rol,
        activo: true,
      });

      setFormData({ nombre: '', email: '', password: '', rol: 'contribuidor' });
      setMostrarModal(false);
    }
  };

  const formatearFecha = (fecha: string): string => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
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
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Rol</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Fecha Creación</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">{u.nombre}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      u.rol === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {u.rol === 'admin' ? 'Administrador' : 'Contribuidor'}
                  </span>
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
                <td className="px-6 py-4 text-sm text-gray-600">{formatearFecha(u.creadoEn)}</td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleActivoUsuario(u.id)}
                      disabled={usuario?.usuarioId === u.id}
                      className="p-1 text-gray-600 hover:text-blue-600 disabled:text-gray-300 transition"
                      title={u.activo ? 'Desactivar' : 'Activar'}
                    >
                      {u.activo ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                    <button
                      onClick={() => eliminarUsuario(u.id)}
                      disabled={usuario?.usuarioId === u.id}
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

        {usuarios.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No hay usuarios creados aún</p>
          </div>
        )}
      </div>

      {/* Modal de crear usuario */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Nuevo Usuario</h3>
              <button
                onClick={() => {
                  setMostrarModal(false);
                  setErroresForm({});
                }}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateUsuario} className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    erroresForm.nombre ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Juan Pérez"
                />
                {erroresForm.nombre && (
                  <p className="text-xs text-red-600 mt-1">{erroresForm.nombre}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    erroresForm.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="juan@agenciacalidad.gob.ar"
                />
                {erroresForm.email && (
                  <p className="text-xs text-red-600 mt-1">{erroresForm.email}</p>
                )}
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    erroresForm.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="••••••••"
                />
                {erroresForm.password && (
                  <p className="text-xs text-red-600 mt-1">{erroresForm.password}</p>
                )}
              </div>

              {/* Rol */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  value={formData.rol}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rol: e.target.value as 'admin' | 'contribuidor',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="contribuidor">Contribuidor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {/* Botones */}
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarModal(false);
                    setErroresForm({});
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                >
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      ) : (
        <FormulariosPanel />
      )}
    </div>
  );
}
