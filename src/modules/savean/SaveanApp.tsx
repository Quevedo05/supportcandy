import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SaveanProvider } from './context/SaveanContext';
import { useSavean } from './context/SaveanContext';
import { SaveanInspector } from './components/SaveanInspector';
import { SaveanFormulario } from './components/SaveanFormulario';
import { SaveanAdmin } from './components/SaveanAdmin';
import { SaveanInformes } from './components/SaveanInformes';
import { SaveanUsuarios } from './components/SaveanUsuarios';
import { SaveanConfiguracion } from './components/SaveanConfiguracion';
import { SaveanEntrada } from './components/SaveanEntrada';
// import { AdminEntradas } from './components/AdminEntradas'; // reservado para futuro uso
import { AdminPlanillas } from './components/AdminPlanillas';
import { SaveanSanidad, PanelIngresos } from './components/SaveanSanidad';
import { SaveanPuntoControl } from './components/SaveanPuntoControl';
import {
  LogOut, Shield, BarChart2, Plus, User,
  ArrowDownToLine, ArrowUpFromLine, ClipboardList, Settings, Menu, X, Home,
  Beef, Leaf, Ban, LayoutDashboard, ChevronRight, CheckCircle2, RefreshCw,
} from 'lucide-react';

// ─── Inspector app (barreristas) ────────────────────────────────────────────
type SeccionInspector = 'inicio' | 'guias' | 'nueva' | 'entrada' | 'nopagos' | 'perfil';

const MENU_INSPECTOR: {
  label: string;
  desc: string;
  icon: JSX.Element;
  key: SeccionInspector;
}[] = [
  { key: 'entrada',  label: 'Entrada a la Provincia', desc: 'Registrar vehículos que ingresan',    icon: <ArrowDownToLine size={18} /> },
  { key: 'guias',    label: 'Salida de la Provincia', desc: 'Verificar guías de origen',           icon: <ArrowUpFromLine size={18} /> },
  { key: 'nopagos',  label: 'Actas No Pagadas',        desc: 'Vehículos con arancel pendiente',    icon: <Ban size={18} /> },
];

function InicioInspector({
  nombreUsuario,
  onSelect,
}: {
  nombreUsuario: string;
  onSelect: (s: SeccionInspector) => void;
}) {
  const hora = new Date().getHours();
  const saludo = hora < 13 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="max-w-lg mx-auto space-y-6 pt-4">
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">{saludo}</p>
        <h2 className="text-xl font-bold text-gray-900 mt-0.5">{nombreUsuario}</h2>
        <p className="text-sm text-gray-400 mt-1">Sistema de Control Fitosanitario · SAVEAN</p>
      </div>

      <div>
        <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-3">Menú principal</p>
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
          {MENU_INSPECTOR.map((item) => (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition group"
            >
              <div className="flex items-center gap-4">
                <span className="text-gray-400 group-hover:text-gray-600 transition">{item.icon}</span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
              <ArrowUpFromLine size={14} className="text-gray-300 group-hover:text-gray-500 rotate-90 transition flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const NAV_INSPECTOR: { key: SeccionInspector; label: string; icon: JSX.Element }[] = [
  { key: 'inicio',   label: 'Inicio',            icon: <Home size={16} /> },
  { key: 'entrada',  label: 'Entrada Provincia',  icon: <ArrowDownToLine size={16} /> },
  { key: 'guias',    label: 'Salida / Guías',     icon: <ArrowUpFromLine size={16} /> },
  { key: 'nueva',    label: 'Nueva Guía',         icon: <Plus size={16} /> },
  { key: 'nopagos',  label: 'No Pagaron',         icon: <Ban size={16} /> },
  { key: 'perfil',   label: 'Mi Perfil',          icon: <User size={16} /> },
];

function InspectorApp() {
  const { usuario, logout } = useAuth();
  const [seccion, setSeccion] = useState<SeccionInspector>('inicio');
  const [drawerOpen, setDrawerOpen] = useState(false);

  function navegar(s: SeccionInspector) {
    setSeccion(s);
    setDrawerOpen(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Hamburguesa */}
              <button
                onClick={() => setDrawerOpen(true)}
                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition text-gray-600"
                aria-label="Abrir menú"
              >
                <Menu size={20} />
              </button>
              <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield size={16} className="text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900 leading-tight">SAVEAN · Inspector</h1>
                <p className="text-xs text-gray-400">Control fitosanitario</p>
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

      {/* ── Drawer overlay ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Drawer panel ── */}
      <div
        className={`fixed top-0 left-0 h-full w-64 z-50 bg-gray-900 flex flex-col shadow-2xl transition-transform duration-200 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">Inspector</p>
            <p className="text-white text-sm font-bold mt-0.5">SAVEAN</p>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-700 transition text-gray-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_INSPECTOR.map((item) => (
            <button
              key={item.key}
              onClick={() => navegar(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition text-left ${
                seccion === item.key
                  ? 'bg-orange-500/20 text-orange-300'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
              }`}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Drawer footer */}
        <div className="border-t border-gray-700 px-3 py-3">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* ── Contenido ── */}
      <main className="max-w-5xl mx-auto px-4 py-7 sm:px-6">
        {seccion === 'inicio' && (
          <InicioInspector
            nombreUsuario={usuario?.nombre ?? ''}
            onSelect={setSeccion}
          />
        )}
        {seccion === 'guias' && <SaveanInspector soloQR />}
        {seccion === 'nueva' && (
          <SaveanFormulario onVolver={() => setSeccion('guias')} />
        )}
        {seccion === 'entrada' && (
          <SaveanEntrada onVolver={() => setSeccion('inicio')} />
        )}
        {seccion === 'nopagos' && <NoPagosPanel />}
        {seccion === 'perfil' && <PerfilView rolLabel="Inspector Fitosanitario (Barrerista)" />}
      </main>
    </div>
  );
}

// ─── Admin app (empleados de la agencia) ────────────────────────────────────
type SeccionAdmin =
  | 'inicio'
  | 'guias' | 'nueva' | 'informes'
  | 'actas_carnicas' | 'actas_vegetales' | 'planillas' | 'no_pagos'
  | 'configuracion' | 'perfil';

function SidebarItem({
  icon, label, active, onClick, accent, sub,
}: {
  icon: JSX.Element;
  label: string;
  active: boolean;
  onClick: () => void;
  accent?: string;
  sub?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 rounded-lg text-xs font-medium transition mb-0.5 text-left ${
        sub ? 'pl-6 pr-3 py-1.5' : 'px-3 py-2'
      } ${
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

function SidebarGroup({
  icon, label, color, onClick, expanded,
}: {
  icon: JSX.Element; label: string; color?: string;
  onClick?: () => void; expanded?: boolean;
}) {
  const textCls = color ?? 'text-gray-400';
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-2 px-3 py-2.5 mt-2 border-t border-gray-700/50 hover:bg-white/5 transition-colors rounded-lg"
      >
        <span className={textCls}>{icon}</span>
        <p className={`text-[11px] font-semibold uppercase tracking-wider flex-1 text-left ${textCls}`}>{label}</p>
        <ChevronRight size={11} className={`text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2 px-3 pt-4 pb-1">
      <span className={textCls}>{icon}</span>
      <p className={`text-[10px] font-bold uppercase tracking-widest ${textCls}`}>{label}</p>
    </div>
  );
}

// ─── Panel de inicio del admin ────────────────────────────────────────────────
const INICIO_API = (import.meta.env as any).VITE_API_URL || 'http://localhost:3000/api';

function AdminInicio({ onNavegar }: { onNavegar: (s: SeccionAdmin) => void }) {
  const { barreras } = useSavean();

  const [stats, setStats] = useState({
    guiasPendientes: '—',
    ingresosHoy: '—',
    totalUsuarios: '—',
  });

  useEffect(() => {
    const token = localStorage.getItem('sc_token') || '';
    const hoy = new Date().toISOString().split('T')[0];

    fetch(`${INICIO_API}/savean/guias`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const n = (d.guias ?? []).filter((g: any) => g.estado === 'pendiente').length;
        setStats(s => ({ ...s, guiasPendientes: String(n) }));
      }).catch(() => {});

    fetch(`${INICIO_API}/savean/entrada/ingresos`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const hoyStr = hoy;
        const n = (d.ingresos ?? []).filter((i: any) => (i.fechaIngreso ?? i.creado_en ?? '').startsWith(hoyStr)).length;
        setStats(s => ({ ...s, ingresosHoy: String(n) }));
      }).catch(() => {});

    fetch(`${INICIO_API}/savean/usuarios`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setStats(s => ({ ...s, totalUsuarios: String((d.usuarios ?? []).length) }));
      }).catch(() => {});
  }, []);

  const barrerasActivas = barreras.filter(b => b.activa).length;

  const STAT_CARDS = [
    { label: 'Guías pendientes', value: stats.guiasPendientes, desc: 'en espera de verificación' },
    { label: 'Ingresos hoy',     value: stats.ingresosHoy,     desc: 'actas registradas en el día' },
    { label: 'Barreras activas', value: String(barrerasActivas), desc: 'puntos de control operativos' },
    { label: 'Usuarios',         value: stats.totalUsuarios,   desc: 'cuentas registradas en SAVEAN' },
  ];

  const ACCESOS = [
    { label: 'Panel de Guías',     desc: 'Gestionar guías de salida de la provincia', icon: <BarChart2 size={24} />, key: 'guias' as SeccionAdmin },
    { label: 'Actas Cárnicos',     desc: 'Registros de ingreso de productos cárnicos', icon: <Beef size={24} />,     key: 'actas_carnicas' as SeccionAdmin },
    { label: 'Actas Vegetales',    desc: 'Registros de ingreso de productos vegetales', icon: <Leaf size={24} />,    key: 'actas_vegetales' as SeccionAdmin },
    { label: 'Planillas de Control', desc: 'Planillas diarias de paso de vehículos',  icon: <ClipboardList size={24} />, key: 'planillas' as SeccionAdmin },
  ];

  return (
    <div className="space-y-8 max-w-4xl">

      {/* Encabezado */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Panel de administración</h2>
        <p className="text-sm text-gray-400 mt-0.5">Agencia de Calidad San Juan · SAVEAN</p>
      </div>

      {/* Estadísticas generales */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-3">Resumen general</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STAT_CARDS.map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-5 py-4 space-y-1">
              <p className="text-3xl font-bold text-gray-900 leading-none">{s.value}</p>
              <p className="text-xs font-semibold text-gray-700">{s.label}</p>
              <p className="text-[11px] text-gray-400 leading-snug">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Accesos rápidos */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-3">Accesos rápidos</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ACCESOS.map(item => (
            <button
              key={item.key}
              onClick={() => onNavegar(item.key)}
              className="flex flex-col items-center justify-center gap-3 p-6 bg-white border border-gray-200 rounded-xl hover:border-gray-400 hover:shadow-sm transition text-center group"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-gray-200 transition">
                <span className="text-gray-600">{item.icon}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── Configuración con sub-secciones ─────────────────────────────────────────
type TabConfig = 'barreras' | 'usuarios';

function AdminConfiguracion() {
  const [tab, setTab] = useState<TabConfig>('barreras');
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Configuración</h2>
        <p className="text-sm text-gray-400 mt-0.5">Gestión del sistema SAVEAN</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-200 p-1 rounded-xl w-fit">
        {([
          { key: 'barreras', label: 'Barreras' },
          { key: 'usuarios', label: 'Usuarios y Roles' },
        ] as { key: TabConfig; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'barreras' && <SaveanConfiguracion />}
      {tab === 'usuarios' && <SaveanUsuarios />}
    </div>
  );
}

// ─── Panel de No Pagos (compartido inspector y admin) ─────────────────────────
const NP_API = (import.meta.env as any).VITE_API_URL || 'http://localhost:3000/api';
const getNpToken = () => localStorage.getItem('sc_token') || '';

interface NoPagoItem {
  id: string;
  interesadoNombre: string | null;
  chasis: string | null;
  barreraNombre: string;
  montoNoPago: number | null;
  fechaHora: string;
  inspectorNombre: string;
}

function NoPagosPanel() {
  const [items, setItems]         = useState<NoPagoItem[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [pagandoId, setPagandoId] = useState<string | null>(null);
  const [lugar, setLugar]         = useState('');
  const [fecha, setFecha]         = useState('');
  const [err, setErr]             = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await fetch(`${NP_API}/savean/entrada/ingresos/no-pago`, {
        headers: { Authorization: `Bearer ${getNpToken()}` },
      });
      if (res.ok) setItems(await res.json());
    } catch { /* ignore */ } finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const iniciarPago = (id: string) => {
    setPagandoId(id);
    setLugar('');
    setFecha(new Date().toISOString().slice(0, 10));
    setErr('');
  };

  const confirmarPago = async (id: string) => {
    if (!lugar.trim()) { setErr('Ingresá el lugar donde pagó.'); return; }
    if (!fecha)        { setErr('Seleccioná el día del pago.'); return; }
    setGuardando(true); setErr('');
    try {
      const res = await fetch(`${NP_API}/savean/entrada/ingresos/${id}/pagar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getNpToken()}` },
        body: JSON.stringify({ pagoLugar: lugar.trim(), pagoFecha: fecha }),
      });
      if (res.ok) {
        setItems(prev => prev.filter(i => i.id !== id));
        setPagandoId(null);
      } else {
        const d = await res.json();
        setErr(d.error || 'Error al registrar el pago.');
      }
    } catch { setErr('Error de conexión.'); }
    finally { setGuardando(false); }
  };

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white';

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
        <RefreshCw size={18} className="animate-spin" />
        <span className="text-sm">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Actas No Pagadas</h2>
          <p className="text-sm text-gray-400 mt-0.5">Vehículos que no abonaron el arancel fitosanitario</p>
        </div>
        <button onClick={cargar} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 transition hover:bg-gray-50">
          <RefreshCw size={13} />
          Actualizar
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl text-center py-14 space-y-2">
          <CheckCircle2 size={36} className="text-green-500 mx-auto" />
          <p className="font-semibold text-gray-700">Sin actas pendientes</p>
          <p className="text-sm text-gray-400">Todos los aranceles están al día.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              {/* Datos del acta */}
              <div className="px-4 py-4 flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {item.interesadoNombre || 'Sin nombre registrado'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Chasis: <span className="font-mono font-semibold">{item.chasis || '—'}</span>
                    {' · '}
                    {item.barreraNombre}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(item.fechaHora).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {' · '}
                    Inspector: {item.inspectorNombre}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right space-y-2">
                  {item.montoNoPago != null && (
                    <p className="text-xl font-bold text-orange-600">${item.montoNoPago.toLocaleString('es-AR')}</p>
                  )}
                  {pagandoId !== item.id && (
                    <button
                      onClick={() => iniciarPago(item.id)}
                      className="block px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition"
                    >
                      Pagó ✓
                    </button>
                  )}
                </div>
              </div>

              {/* Formulario de pago */}
              {pagandoId === item.id && (
                <div className="border-t border-green-100 bg-green-50 px-4 py-4 space-y-3">
                  <p className="text-xs font-bold text-green-800 uppercase tracking-wide">Registrar pago</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Lugar donde pagó *</label>
                      <input
                        className={inputCls}
                        placeholder="Barrera Encon, Agencia Calidad…"
                        value={lugar}
                        onChange={e => setLugar(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Día del pago *</label>
                      <input
                        type="date"
                        className={inputCls}
                        value={fecha}
                        onChange={e => setFecha(e.target.value)}
                      />
                    </div>
                  </div>
                  {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</p>}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setPagandoId(null)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => confirmarPago(item.id)}
                      disabled={guardando}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
                    >
                      {guardando ? 'Guardando…' : 'Confirmar pago'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminNoPagos() {
  return <NoPagosPanel />;
}

function AdminApp() {
  const { usuario, logout } = useAuth();
  const { barreras } = useSavean();
  const [seccion, setSeccion] = useState<SeccionAdmin>('inicio');
  const [salidaOpen, setSalidaOpen] = useState(false);
  const [entradaOpen, setEntradaOpen] = useState(false);

  // Auto-expandir sección padre cuando se navega a un sub-ítem
  useEffect(() => {
    if (['guias', 'nueva', 'informes'].includes(seccion)) setSalidaOpen(true);
    if (['actas_carnicas', 'actas_vegetales', 'planillas', 'no_pagos'].includes(seccion)) setEntradaOpen(true);
  }, [seccion]);

  const labelSeccion: Record<SeccionAdmin, string> = {
    inicio:          'Inicio',
    guias:           'Salida · Panel de Guías',
    nueva:           'Salida · Nueva Guía',
    informes:        'Salida · Informes',
    actas_carnicas:  'Entrada · Actas Cárnicos',
    actas_vegetales: 'Entrada · Actas Vegetales',
    planillas:       'Entrada · Planillas de Control',
    no_pagos:        'Entrada · No Pagos',
    configuracion:   'Configuración',
    perfil:          'Mi Perfil',
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
        <aside className="w-52 bg-gray-900 flex flex-col flex-shrink-0">

          {/* Nav — scrollable, nunca empuja los botones del fondo */}
          <nav className="flex-1 overflow-y-auto px-3 pt-3 pb-2">

            {/* Inicio */}
            <SidebarItem
              icon={<LayoutDashboard size={14} />}
              label="Inicio"
              active={seccion === 'inicio'}
              onClick={() => setSeccion('inicio')}
              accent="bg-white/15 text-white"
            />

            {/* Salida */}
            <SidebarGroup
              icon={<ArrowUpFromLine size={11} />}
              label="Salida"
              onClick={() => setSalidaOpen(o => !o)}
              expanded={salidaOpen}
            />
            {salidaOpen && (
              <SidebarItem
                icon={<BarChart2 size={14} />}
                label="Panel de Guías"
                active={seccion === 'guias'}
                onClick={() => setSeccion('guias')}
                sub
              />
            )}

            {/* Entrada */}
            <SidebarGroup
              icon={<ArrowDownToLine size={11} />}
              label="Entrada"
              onClick={() => setEntradaOpen(o => !o)}
              expanded={entradaOpen}
            />
            {entradaOpen && (
              <>
                <SidebarItem
                  icon={<Beef size={14} />}
                  label="Actas Cárnicos"
                  active={seccion === 'actas_carnicas'}
                  onClick={() => setSeccion('actas_carnicas')}
                  sub
                />
                <SidebarItem
                  icon={<Leaf size={14} />}
                  label="Actas Vegetales"
                  active={seccion === 'actas_vegetales'}
                  onClick={() => setSeccion('actas_vegetales')}
                  sub
                />
                <SidebarItem
                  icon={<ClipboardList size={14} />}
                  label="Planillas"
                  active={seccion === 'planillas'}
                  onClick={() => setSeccion('planillas')}
                  sub
                />
                <SidebarItem
                  icon={<Ban size={14} />}
                  label="No Pagos"
                  active={seccion === 'no_pagos'}
                  onClick={() => setSeccion('no_pagos')}
                  sub
                />
              </>
            )}

            {/* Configuración — a continuación de Entrada */}
            <SidebarItem
              icon={<Settings size={14} />}
              label="Configuración"
              active={seccion === 'configuracion'}
              onClick={() => setSeccion('configuracion')}
            />
          </nav>

          {/* Fondo fijo — siempre visible, nunca se scrollea */}
          <div className="flex-shrink-0 border-t border-gray-700/60 px-3 py-3">
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
            {seccion === 'inicio'          && <AdminInicio onNavegar={setSeccion} />}
            {seccion === 'guias'           && <SaveanAdmin />}
            {seccion === 'nueva'           && <SaveanFormulario onVolver={() => setSeccion('guias')} />}
            {seccion === 'informes'        && <SaveanInformes />}
            {seccion === 'actas_carnicas'  && <PanelIngresos tipoProducto="carnico" barreras={barreras} />}
            {seccion === 'actas_vegetales' && <PanelIngresos tipoProducto="vegetal" barreras={barreras} />}
            {seccion === 'planillas'       && <AdminPlanillas />}
            {seccion === 'no_pagos'        && <AdminNoPagos />}
            {seccion === 'configuracion'   && <AdminConfiguracion />}
            {seccion === 'perfil'          && <PerfilView rolLabel="Director · Agencia de Calidad San Juan" />}
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
