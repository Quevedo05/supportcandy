import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Building2 } from 'lucide-react';

export function LoginPage() {
  const { login, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setLocalError(error || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Contenedor principal */}
      <div className="relative z-10 w-full max-w-md">
        {/* Card de login */}
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl overflow-hidden">
          {/* Header corporativo */}
          <div className="bg-gradient-to-r from-slate-800 to-blue-900 px-8 py-12">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur">
                <Building2 size={32} className="text-white" />
              </div>
            </div>
            <h1 className="text-center text-2xl font-bold text-white mb-2">
              Agencia Calidad
            </h1>
            <p className="text-center text-sm text-blue-100">
              San Juan - Sistema de Gestión de Tickets
            </p>
          </div>

          {/* Contenido del formulario */}
          <div className="px-8 py-10">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-3">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-3.5 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu.email@agenciacalidad.gob.ar"
                    className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-3">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-3.5 text-slate-400" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Errores */}
              {localError && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
                  ⚠️ {localError}
                </div>
              )}

              {/* Botón */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-slate-800 to-blue-900 hover:from-slate-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 mt-6 shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Iniciando sesión...
                  </span>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>
            </form>

            {/* Información de demo */}
            <div className="mt-8 pt-8 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                Credenciales de Demostración
              </p>
              <div className="space-y-3 text-sm">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-slate-600">
                    <span className="font-semibold">Email:</span>{' '}
                    <code className="bg-white px-2 py-1 rounded text-slate-700 font-mono">
                      admin@agenciacalidad.gob.ar
                    </code>
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-slate-600">
                    <span className="font-semibold">Contraseña:</span>{' '}
                    <code className="bg-white px-2 py-1 rounded text-slate-700 font-mono">
                      admin123
                    </code>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 px-8 py-4 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-600">
              © 2024 Agencia Calidad San Juan • Ministerio de Producción
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
