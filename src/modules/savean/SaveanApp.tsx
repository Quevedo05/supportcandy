import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SaveanProvider } from './context/SaveanContext';
import { SaveanInspector } from './components/SaveanInspector';
import { SaveanFormularioBuilder } from './components/SaveanFormularioBuilder';
import { LogOut, FileText, Settings, User } from 'lucide-react';

type SeccionSavean = 'declaraciones' | 'formulario' | 'perfil';

function SaveanAppContent() {
  const { usuario, logout } = useAuth();
  const [seccionActual, setSeccionActual] = useState<SeccionSavean>('declaraciones');
  const [mostrandoFormulario, setMostrandoFormulario] = useState(false);

  const handleGuardarFormulario = () => {
    setMostrandoFormulario(false);
    setSeccionActual('declaraciones');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="https://www.agenciacalidad.gob.ar/sites/default/files/logo_agencia.png"
                alt="Agencia de Calidad"
                className="h-10"
              />
              <div>
                <h1 className="text-lg font-bold text-gray-900">Sistema Savean</h1>
                <p className="text-xs text-gray-600">Control Fitosanitario en Barreras</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              type="button"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* NavBar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <button
              onClick={() => {
                setSeccionActual('declaraciones');
                setMostrandoFormulario(false);
              }}
              className={`px-1 py-4 border-b-2 font-medium text-sm transition ${
                seccionActual === 'declaraciones' && !mostrandoFormulario
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <FileText className="inline mr-2" size={18} />
              Declaraciones
            </button>

            <button
              onClick={() => setMostrandoFormulario(true)}
              className={`px-1 py-4 border-b-2 font-medium text-sm transition ${
                mostrandoFormulario
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <Settings className="inline mr-2" size={18} />
              Configurar Formulario
            </button>

            <button
              onClick={() => {
                setSeccionActual('perfil');
                setMostrandoFormulario(false);
              }}
              className={`px-1 py-4 border-b-2 font-medium text-sm transition ${
                seccionActual === 'perfil' && !mostrandoFormulario
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <User className="inline mr-2" size={18} />
              Mi Perfil
            </button>
          </div>
        </div>
      </nav>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {mostrandoFormulario ? (
          <SaveanFormularioBuilder
            onGuardar={handleGuardarFormulario}
            onCancelar={() => setMostrandoFormulario(false)}
          />
        ) : seccionActual === 'declaraciones' ? (
          <SaveanInspector />
        ) : seccionActual === 'perfil' ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-gradient-to-br from-gray-600 to-gray-700 p-3 rounded-xl">
                <User size={32} className="text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Mi Perfil</h2>
                <p className="text-sm text-gray-600">Información de tu cuenta</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-md">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500">Nombre</p>
                  <p className="text-lg font-semibold text-gray-900">{usuario?.nombre}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-lg font-semibold text-gray-900">{usuario?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Rol</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {usuario?.rol === 'inspector' ? 'Inspector Fitosanitario' : usuario?.rol}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Módulo</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {usuario?.modulo === 'savean' ? 'Savean' : usuario?.modulo}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export function SaveanApp() {
  return (
    <SaveanProvider>
      <SaveanAppContent />
    </SaveanProvider>
  );
}
