import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SaveanProvider } from './context/SaveanContext';
import { SaveanInspector } from './components/SaveanInspector';
import { SaveanFormulario } from './components/SaveanFormulario';
import { SaveanAdmin } from './components/SaveanAdmin';
import { SaveanInformes } from './components/SaveanInformes';
import { SaveanUsuarios } from './components/SaveanUsuarios';
import { SaveanConfiguracion } from './components/SaveanConfiguracion';
import { SaveanEntrada } from './components/SaveanEntrada';
import { AdminEntradas } from './components/AdminEntradas';
import { AdminPlanillas } from './components/AdminPlanillas';
import { SaveanSanidad } from './components/SaveanSanidad';
import { SaveanPuntoControl } from './components/SaveanPuntoControl';
import {
  LogOut, Shield, BarChart2, Plus, User, FileBarChart,
  ArrowDownToLine, ArrowUpFromLine, ClipboardList, Truck, Settings,
} from 'lucide-react';

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
type SeccionAdmin = 'guias' | 'nueva' | 'informes' | 'entradas' | 'planillas' | 'usuarios' | 'configuracion' | 'perfil';

function SidebarItem({
  icon, label, active, onClick, accent,
}: {
  icon: JSX.Element;
  label: string;
  active: boolean;
  onClick: () => void;
  accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition mb-0.5 text-left ${
        active
          ? `${accent ?? 'bg-white/15 text-white'}`
          : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
      }`}
    >
      <span className="flex-shrink-0">{icon}</span>
      {label}
    </button>
  );
}

function AdminApp() {
  const { usuario, logout } = useAuth();
  const [seccion, setSeccion] = useState<SeccionAdmin>('guias');

  const labelSeccion: Record<SeccionAdmin, string> = {
    guias:     'Panel Salida · Guías de Origen',
    nueva:     'Panel Salida · Nueva Guía',
    informes:  'Panel Salida · Informes',
    entradas:  'Panel Entrada · Entradas a la Provincia',
    planillas:      'Panel Entrada · Planillas de Control',
    usuarios:       'Usuarios',
    configuracion:  'Configuración',
    perfil:         'Mi Perfil',
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-gray-900 flex-shrink-0 h-14 flex items-center px-5 justify-between">
        <div className="flex items-center gap-4">
          <div className="border-r border-gray-700 pr-4">
            <p className="text-gray-400 text-[10px] uppercase tracking-widest font-medium leading-none">
              Agencia de Calidad San Juan
            </p>
            <p className="text-white text-sm font-bold mt-0.5">SAVEAN</p>
          </div>
          <span className="text-gray-500 text-xs hidden md:block">{labelSeccion[seccion]}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-300 text-xs font-semibold hidden sm:block">{usuario?.nombre}</span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition text-xs font-medium"
          >
            <LogOut size={13} /> Salir
          </button>
        </div>
      </header>

      {/* ── Cuerpo: sidebar + contenido ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Sidebar ── */}
        <aside className="w-52 bg-gray-900 flex flex-col flex-shrink-0 overflow-y-auto">

          {/* Panel Entrada */}
          <div className="px-3 pt-5 pb-3">
            <div className="flex items-center gap-2 px-2 mb-1">
              <ArrowDownToLine size={11} className="text-teal-400" />
              <p className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">Panel Entrada</p>
            </div>
            <p className="text-[9px] text-gray-500 px-2 mb-3 leading-relaxed">
              Ingresos a la provincia
            </p>
            <SidebarItem
              icon={<Truck size={14} />}
              label="Entradas"
              active={seccion === 'entradas'}
              onClick={() => setSeccion('entradas')}
              accent="bg-teal-500/20 text-teal-300"
            />
            <SidebarItem
              icon={<ClipboardList size={14} />}
              label="Planillas de Control"
              active={seccion === 'planillas'}
              onClick={() => setSeccion('planillas')}
              accent="bg-teal-500/20 text-teal-300"
            />
          </div>

          {/* Divisor */}
          <div className="mx-4 border-t border-gray-700/60" />

          {/* Panel Salida */}
          <div className="px-3 pt-4 pb-3">
            <div className="flex items-center gap-2 px-2 mb-1">
              <ArrowUpFromLine size={11} className="text-orange-400" />
              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Panel Salida</p>
            </div>
            <p className="text-[9px] text-gray-500 px-2 mb-3 leading-relaxed">
              Egreso de mercadería
            </p>
            <SidebarItem
              icon={<BarChart2 size={14} />}
              label="Panel de Guías"
              active={seccion === 'guias'}
              onClick={() => setSeccion('guias')}
              accent="bg-orange-500/20 text-orange-300"
            />
            <SidebarItem
              icon={<Plus size={14} />}
              label="Nueva Guía"
              active={seccion === 'nueva'}
              onClick={() => setSeccion('nueva')}
              accent="bg-orange-500/20 text-orange-300"
            />
            <SidebarItem
              icon={<FileBarChart size={14} />}
              label="Informes"
              active={seccion === 'informes'}
              onClick={() => setSeccion('informes')}
              accent="bg-orange-500/20 text-orange-300"
            />
          </div>

          {/* ── Configuración, Usuarios y Perfil al fondo ── */}
          <div className="mt-auto border-t border-gray-700/60 mx-4" />
          <div className="px-3 py-3">
            <SidebarItem
              icon={<Settings size={14} />}
              label="Configuración"
              active={seccion === 'configuracion'}
              onClick={() => setSeccion('configuracion')}
              accent="bg-sky-500/20 text-sky-300"
            />
            <SidebarItem
              icon={<User size={14} />}
              label="Mi Perfil"
              active={seccion === 'perfil'}
              onClick={() => setSeccion('perfil')}
              accent="bg-white/15 text-white"
            />
          </div>
        </aside>

        {/* ── Contenido principal ── */}
        <main className="flex-1 overflow-y-auto bg-gray-100">
          <div className="max-w-7xl mx-auto px-5 py-6 lg:px-8">
            {seccion === 'guias'     && <SaveanAdmin />}
            {seccion === 'nueva'     && <SaveanFormulario onVolver={() => setSeccion('guias')} />}
            {seccion === 'informes'  && <SaveanInformes />}
            {seccion === 'entradas'  && <AdminEntradas />}
            {seccion === 'planillas' && <AdminPlanillas />}
            {seccion === 'usuarios'       && <SaveanUsuarios />}
            {seccion === 'configuracion'  && <SaveanConfiguracion />}
            {seccion === 'perfil'         && <PerfilView rolLabel="Director · Agencia de Calidad San Juan" />}
          </div>
        </main>

      </div>
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
function SaveanAppContent({ rolOverride }: { rolOverride?: string }) {
  const { usuario } = useAuth();
  const rol = rolOverride ?? usuario?.rol;
  if (rol === 'admin' || rol === 'dev') return <AdminApp />;
  if (rol === 'sanidad') return <SaveanSanidad />;
  return <InspectorApp />;
}

export function SaveanApp({ rolOverride }: { rolOverride?: string } = {}) {
  const { usuario } = useAuth();
  const rol = rolOverride ?? usuario?.rol;
  if (rol === 'punto_control') return <SaveanPuntoControl />;
  return (
    <SaveanProvider>
      <SaveanAppContent rolOverride={rolOverride} />
    </SaveanProvider>
  );
}
