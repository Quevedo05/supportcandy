import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SaveanProvider } from './context/SaveanContext';
import { SaveanInspector } from './components/SaveanInspector';
import { SaveanFormulario } from './components/SaveanFormulario';
import { SaveanAdmin } from './components/SaveanAdmin';
import { SaveanInformes } from './components/SaveanInformes';
import { SaveanUsuarios } from './components/SaveanUsuarios';
import { SaveanEntrada } from './components/SaveanEntrada';
import { AdminEntradas } from './components/AdminEntradas';
import { AdminPlanillas } from './components/AdminPlanillas';
import { LogOut, Shield, BarChart2, Plus, User, FileBarChart, Users, ArrowDownToLine, ArrowUpFromLine, ClipboardList } from 'lucide-react';

// ─── Inspector app (barreristas) ────────────────────────────────────────────
type SeccionInspector = 'inicio' | 'guias' | 'nueva' | 'entrada' | 'perfil';

function InicioInspector({ onEntrada, onSalida }: { onEntrada: () => void; onSalida: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-700 uppercase tracking-widest">Seleccioná el tipo de operación</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        <button
          onClick={onEntrada}
          className="flex flex-col items-center gap-5 bg-white border border-gray-300 hover:border-gray-500 hover:shadow-sm rounded-lg p-10 transition group"
        >
          <div className="w-14 h-14 bg-gray-100 group-hover:bg-gray-200 rounded flex items-center justify-center transition">
            <ArrowDownToLine size={28} className="text-gray-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-800 uppercase tracking-wide">Entrada</p>
            <p className="text-xs text-gray-400 mt-1">Vehículo que ingresa a la provincia</p>
          </div>
        </button>

        <button
          onClick={onSalida}
          className="flex flex-col items-center gap-5 bg-white border border-gray-300 hover:border-gray-500 hover:shadow-sm rounded-lg p-10 transition group"
        >
          <div className="w-14 h-14 bg-gray-100 group-hover:bg-gray-200 rounded flex items-center justify-center transition">
            <ArrowUpFromLine size={28} className="text-gray-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-800 uppercase tracking-wide">Salida</p>
            <p className="text-xs text-gray-400 mt-1">Guía de origen para vehículo que sale</p>
          </div>
        </button>
      </div>
    </div>
  );
}

function InspectorApp() {
  const { usuario, logout } = useAuth();
  const [seccion, setSeccion] = useState<SeccionInspector>('inicio');

  return (
    <div className="min-h-screen bg-gray-50">
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

      {seccion !== 'inicio' && (
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex gap-6">
              {(
                [
                  { key: 'inicio',  label: 'Inicio',           icon: <Shield size={15} /> },
                  { key: 'guias',   label: 'Panel de Guías',   icon: <Shield size={15} /> },
                  { key: 'nueva',   label: 'Nueva Guía',       icon: <Plus size={15} /> },
                  { key: 'entrada', label: 'Entrada Provincia', icon: <ArrowDownToLine size={15} /> },
                  { key: 'perfil',  label: 'Mi Perfil',        icon: <User size={15} /> },
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
      )}

      <main className="max-w-5xl mx-auto px-4 py-7 sm:px-6">
        {seccion === 'inicio' && (
          <InicioInspector
            onEntrada={() => setSeccion('entrada')}
            onSalida={() => setSeccion('guias')}
          />
        )}
        {seccion === 'guias' && <SaveanInspector />}
        {seccion === 'nueva' && (
          <SaveanFormulario onVolver={() => setSeccion('guias')} />
        )}
        {seccion === 'entrada' && (
          <SaveanEntrada onVolver={() => setSeccion('inicio')} />
        )}
        {seccion === 'perfil' && <PerfilView rolLabel="Inspector Fitosanitario (Barrerista)" />}
      </main>
    </div>
  );
}

// ─── Admin app (empleados de la agencia) ────────────────────────────────────
type SeccionAdmin = 'panel' | 'nueva' | 'informes' | 'entradas' | 'planillas' | 'usuarios' | 'perfil';

const TABS_ADMIN: { key: SeccionAdmin; label: string; icon: JSX.Element }[] = [
  { key: 'panel',     label: 'Panel',       icon: <BarChart2 size={14} /> },
  { key: 'nueva',     label: 'Nueva Guía',  icon: <Plus size={14} /> },
  { key: 'informes',  label: 'Informes',    icon: <FileBarChart size={14} /> },
  { key: 'entradas',  label: 'Entradas',    icon: <ArrowDownToLine size={14} /> },
  { key: 'planillas', label: 'Planillas',   icon: <ClipboardList size={14} /> },
  { key: 'usuarios',  label: 'Usuarios',    icon: <Users size={14} /> },
  { key: 'perfil',    label: 'Mi Perfil',   icon: <User size={14} /> },
];

function AdminApp() {
  const { usuario, logout } = useAuth();
  const [seccion, setSeccion] = useState<SeccionAdmin>('panel');

  return (
    <div className="min-h-screen bg-gray-100">

      {/* ── Header full-width ── */}
      <header className="bg-gray-900 w-full">
        <div className="w-full px-6 lg:px-10 flex items-center justify-between h-14">
          <div className="flex items-center gap-5">
            <div className="border-r border-gray-700 pr-5">
              <p className="text-gray-400 text-xs uppercase tracking-widest font-medium leading-none">Agencia de Calidad San Juan</p>
              <p className="text-white text-sm font-bold mt-0.5">SAVEAN</p>
            </div>
            <p className="text-gray-400 text-xs hidden sm:block">Sistema de Guías de Origen</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-white text-xs font-semibold leading-none">{usuario?.nombre}</p>
            </div>
            <div className="w-px h-6 bg-gray-700 hidden sm:block" />
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition text-xs font-medium"
            >
              <LogOut size={13} /> Salir
            </button>
          </div>
        </div>
      </header>

      {/* ── Nav full-width ── */}
      <nav className="bg-gray-800 w-full border-b border-gray-700">
        <div className="w-full px-6 lg:px-10 flex">
          {TABS_ADMIN.map(t => (
            <button
              key={t.key}
              onClick={() => setSeccion(t.key)}
              className={`flex items-center gap-1.5 px-5 py-3 border-b-2 font-semibold text-xs uppercase tracking-wide transition ${
                seccion === t.key
                  ? 'border-white text-white bg-gray-700'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Contenido ── */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-10">
        {seccion === 'panel'     && <SaveanAdmin />}
        {seccion === 'nueva'     && <SaveanFormulario onVolver={() => setSeccion('panel')} />}
        {seccion === 'informes'  && <SaveanInformes />}
        {seccion === 'entradas'  && <AdminEntradas />}
        {seccion === 'planillas' && <AdminPlanillas />}
        {seccion === 'usuarios'  && <SaveanUsuarios />}
        {seccion === 'perfil'    && <PerfilView rolLabel="Director · Agencia de Calidad San Juan" />}
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
  if (usuario?.rol === 'admin') return <AdminApp />;
  return <InspectorApp />;
}

export function SaveanApp() {
  return (
    <SaveanProvider>
      <SaveanAppContent />
    </SaveanProvider>
  );
}
