import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SaveanProvider } from './context/SaveanContext';
import { SaveanInspector } from './components/SaveanInspector';
import { SaveanFormulario } from './components/SaveanFormulario';
import { SaveanAdmin } from './components/SaveanAdmin';
import { LogOut, Shield, BarChart2, Plus, User } from 'lucide-react';

// ─── Inspector app (barreristas) ────────────────────────────────────────────
type SeccionInspector = 'guias' | 'nueva' | 'perfil';

function InspectorApp() {
  const { usuario, logout } = useAuth();
  const [seccion, setSeccion] = useState<SeccionInspector>('guias');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-tight">SAVEAN · Inspector</h1>
                <p className="text-xs text-gray-400">Control fitosanitario en barreras</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 hidden sm:block">{usuario?.nombre}</span>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition text-sm"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex gap-6">
            {(
              [
                { key: 'guias', label: 'Panel de Guías', icon: <Shield size={15} /> },
                { key: 'nueva', label: 'Nueva Guía', icon: <Plus size={15} /> },
                { key: 'perfil', label: 'Mi Perfil', icon: <User size={15} /> },
              ] as { key: SeccionInspector; label: string; icon: JSX.Element }[]
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setSeccion(t.key)}
                className={`flex items-center gap-1.5 px-1 py-3.5 border-b-2 font-medium text-sm transition ${
                  seccion === t.key
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-7 sm:px-6">
        {seccion === 'guias' && <SaveanInspector />}
        {seccion === 'nueva' && (
          <SaveanFormulario onVolver={() => setSeccion('guias')} />
        )}
        {seccion === 'perfil' && <PerfilView rolLabel="Inspector Fitosanitario (Barrerista)" />}
      </main>
    </div>
  );
}

// ─── Admin app (empleados de la agencia) ────────────────────────────────────
type SeccionAdmin = 'panel' | 'nueva' | 'perfil';

function AdminApp() {
  const { usuario, logout } = useAuth();
  const [seccion, setSeccion] = useState<SeccionAdmin>('panel');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl flex items-center justify-center flex-shrink-0">
                <BarChart2 size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-tight">SAVEAN · Administración</h1>
                <p className="text-xs text-gray-400">Agencia de Calidad San Juan</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 hidden sm:block">{usuario?.nombre}</span>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition text-sm"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6">
            {(
              [
                { key: 'panel', label: 'Panel Admin', icon: <BarChart2 size={15} /> },
                { key: 'nueva', label: 'Nueva Guía', icon: <Plus size={15} /> },
                { key: 'perfil', label: 'Mi Perfil', icon: <User size={15} /> },
              ] as { key: SeccionAdmin; label: string; icon: JSX.Element }[]
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setSeccion(t.key)}
                className={`flex items-center gap-1.5 px-1 py-3.5 border-b-2 font-medium text-sm transition ${
                  seccion === t.key
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-7 sm:px-6 lg:px-8">
        {seccion === 'panel' && <SaveanAdmin />}
        {seccion === 'nueva' && (
          <SaveanFormulario onVolver={() => setSeccion('panel')} />
        )}
        {seccion === 'perfil' && <PerfilView rolLabel="Administrador · Agencia de Calidad" />}
      </main>
    </div>
  );
}

// ─── Perfil view (shared) ────────────────────────────────────────────────────
function PerfilView({ rolLabel }: { rolLabel: string }) {
  const { usuario } = useAuth();
  return (
    <div className="max-w-md space-y-6">
      <div className="flex items-center gap-4">
        <div className="bg-orange-100 p-3 rounded-xl">
          <User size={26} className="text-orange-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Mi Perfil</h2>
          <p className="text-sm text-gray-400">Información de tu cuenta</p>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        {[
          { label: 'Nombre', value: usuario?.nombre },
          { label: 'Email', value: usuario?.email },
          { label: 'Rol', value: rolLabel },
          { label: 'Sistema', value: 'SAVEAN · Guía de Origen Digital' },
        ].map((f) => (
          <div key={f.label}>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{f.label}</p>
            <p className="font-semibold text-gray-900">{f.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Entry point ─────────────────────────────────────────────────────────────
function SaveanAppContent() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'admin';
  return esAdmin ? <AdminApp /> : <InspectorApp />;
}

export function SaveanApp() {
  return (
    <SaveanProvider>
      <SaveanAppContent />
    </SaveanProvider>
  );
}
