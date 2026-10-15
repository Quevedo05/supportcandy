import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LogOut, Home, Activity, Users, BarChart3, MessageSquare,
  RefreshCw, ArrowLeft, Milestone, FileText, Clock, Search,
  MapPin, Heart, Flag, ClipboardList, Code2, Menu, X,
} from 'lucide-react';

import { InicioSection } from './devpanel/InicioSection';
import { SistemaSection } from './devpanel/SistemaSection';
import { UsuariosSection, type UsuarioAPI } from './devpanel/UsuariosSection';
import { BarrerasSection } from './devpanel/BarrerasSection';
import { FeedbackSection, type FeedbackItem } from './devpanel/FeedbackSection';
import { DocumentosSection } from './devpanel/DocumentosSection';
import { ReportesSection } from './devpanel/ReportesSection';

// ── Lazy module overlays ──────────────────────────────────────────────────────
const TicketsApp = lazy(() => import('./TicketsApp').then(m => ({ default: m.TicketsApp })));
const SaveanApp  = lazy(() => import('../modules/savean/SaveanApp').then(m => ({ default: m.SaveanApp })));

const API_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:3000/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type Seccion =
  | 'inicio' | 'sistema' | 'usuarios' | 'reportes' | 'feedback'
  | 'sv-barreras' | 'sv-documentos' | 'sv-fichar'
  | 'sv-inspectores' | 'sv-control' | 'sv-sanidad'
  | 'ag-estados' | 'ag-formularios';

type VistaOverlay = 'tickets' | 'savean' | 'savean-inspector' | 'savean-sanidad' | 'savean-punto-control';

// ── API helper ────────────────────────────────────────────────────────────────

async function apiCall<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = localStorage.getItem('sc_token');
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (res.status === 401) {
    window.dispatchEvent(new Event('sc:unauthorized'));
    const d = await res.json().catch(() => ({}));
    throw new Error((d as any).error || 'Sesión expirada');
  }
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as any).error || `Error ${res.status}`); }
  if (res.status === 204) return {} as T;
  return res.json();
}

// ── Vista Overlay ─────────────────────────────────────────────────────────────

function VistaOverlay({ titulo, color, onVolver, children }: {
  titulo: string; color: string; onVolver: () => void; children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className={`fixed top-0 left-0 right-0 z-50 ${color} text-white px-4 py-2.5 flex items-center gap-4 shadow-lg`}>
        <button onClick={onVolver} className="flex items-center gap-1.5 text-sm font-[400] hover:opacity-80 transition">
          <ArrowLeft size={15} /> Volver al DevPanel
        </button>
        <span className="text-xs opacity-60 border-l border-white/30 pl-4">Vista: {titulo}</span>
      </div>
      <div className="pt-10">{children}</div>
    </div>
  );
}

// ── Placeholder genérico ──────────────────────────────────────────────────────

function Placeholder({ eyebrow, title, icon }: { eyebrow?: string; title: string; icon?: React.ReactNode }) {
  return (
    <div>
      {eyebrow && <p className="text-[12px] font-[500] uppercase tracking-[0.08em] text-gray-400 mb-1">{eyebrow}</p>}
      <h1 className="text-[30px] font-medium leading-tight tracking-[-0.025em] text-gray-900 mb-7">{title}</h1>
      <div className="bg-white border border-gray-100 rounded-2xl p-12 flex flex-col items-center gap-3 text-center shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
        {icon && <span className="w-10 h-10 rounded-[12px] bg-orange-50 text-orange-600 flex items-center justify-center">{icon}</span>}
        <h2 className="text-[16px] font-medium">{title}</h2>
        <p className="text-[13px] text-gray-400">Contenido por definir.</p>
      </div>
    </div>
  );
}

// ── Panel SAVEAN (Inspectores / Control / Sanidad) ────────────────────────────

function PanelSavean({ titulo, onVer }: { titulo: string; onVer: () => void }) {
  return (
    <div>
      <p className="text-[12px] font-[500] uppercase tracking-[0.08em] text-gray-400 mb-1">SAVEAN · Paneles</p>
      <h1 className="text-[30px] font-medium leading-tight tracking-[-0.025em] text-gray-900 mb-7">{titulo}</h1>
      <div className="bg-white border border-gray-100 rounded-2xl p-10 flex flex-col items-center gap-4 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
        <p className="text-[14px] text-gray-500">Abrí el panel de {titulo} como usuario dev para ver y probar el sistema completo.</p>
        <button onClick={onVer}
          className="h-11 px-5 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-xl flex items-center gap-2 transition">
          <ArrowLeft size={16} className="rotate-180" /> Abrir panel de {titulo}
        </button>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

interface NavItem {
  key: Seccion;
  label: string;
  icon: React.ReactNode;
  indent?: number;
}

const NAV_ITEMS: (NavItem | { type: 'separator' } | { type: 'label'; text: string })[] = [
  { key: 'inicio',         label: 'Inicio',       icon: <Home size={18} /> },
  { key: 'sistema',        label: 'Sistema',      icon: <Activity size={18} /> },
  { key: 'usuarios',       label: 'Usuarios',     icon: <Users size={18} /> },
  { key: 'reportes',       label: 'Reportes',     icon: <BarChart3 size={18} /> },
  { type: 'separator' },
  { type: 'label', text: 'SAVEAN' },
  { key: 'sv-barreras',    label: 'Barreras',     icon: <Milestone size={16} />,     indent: 1 },
  { key: 'sv-documentos',  label: 'Documentos',   icon: <FileText size={16} />,      indent: 1 },
  { key: 'sv-fichar',      label: 'fichAr',       icon: <Clock size={16} />,         indent: 1 },
  { type: 'label', text: 'Paneles' },
  { key: 'sv-inspectores', label: 'Inspectores',  icon: <Search size={16} />,        indent: 2 },
  { key: 'sv-control',     label: 'Pto de control', icon: <MapPin size={16} />,      indent: 2 },
  { key: 'sv-sanidad',     label: 'Sanidad',      icon: <Heart size={16} />,         indent: 2 },
  { type: 'separator' },
  { type: 'label', text: 'AGENCIA' },
  { key: 'ag-estados',     label: 'Estados',      icon: <Flag size={16} />,          indent: 1 },
  { key: 'ag-formularios', label: 'Formularios',  icon: <ClipboardList size={16} />, indent: 1 },
  { type: 'separator' },
  { key: 'feedback',       label: 'Feedback',     icon: <MessageSquare size={18} /> },
];

function Sidebar({
  seccion, setSeccion, unread, nombre, onLogout, open, setOpen,
}: {
  seccion: Seccion;
  setSeccion: (s: Seccion) => void;
  unread: number;
  nombre: string;
  onLogout: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const handle = (key: Seccion) => { setSeccion(key); setOpen(false); try { window.scrollTo(0, 0); } catch {} };
  const initial = nombre.charAt(0).toUpperCase();

  return (
    <aside className={`flex-none flex flex-col bg-white border-r border-gray-100 transition-all ${open ? 'w-[220px]' : 'w-[220px] max-sm:hidden'}`}
      style={{ width: 220 }}>
      {/* Head */}
      <div className="flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-[4px] bg-violet-600 text-white flex items-center justify-center flex-none">
            <Code2 size={18} />
          </span>
          <div className="leading-[1.2]">
            <p className="text-[15px] font-[500] tracking-[-0.01em]">DevPanel</p>
            <p className="text-[12px] text-gray-400">Calidad San Juan</p>
          </div>
        </div>
        <button type="button" aria-label="Cerrar menú" onClick={() => setOpen(false)}
          className="sm:hidden w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500">
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav aria-label="Principal" className="flex-1 flex flex-col gap-1 px-3 py-2 overflow-y-auto">
        {NAV_ITEMS.map((item, idx) => {
          if ('type' in item) {
            if (item.type === 'separator') {
              return <div key={idx} className="h-px bg-gray-100 my-2.5 mx-1" role="separator" />;
            }
            if (item.type === 'label') {
              const indent = item.text === 'Paneles' ? 'pl-5' : 'pl-3';
              return (
                <span key={idx} className={`${indent} py-1 text-[11px] font-[500] uppercase tracking-[0.08em] text-gray-400`}>
                  {item.text}
                </span>
              );
            }
          }
          const nav = item as NavItem;
          const active = seccion === nav.key;
          const pl = nav.indent === 2 ? 'pl-9' : nav.indent === 1 ? 'pl-5' : 'pl-3';
          return (
            <button key={nav.key} type="button" aria-current={active ? 'page' : undefined}
              onClick={() => handle(nav.key)}
              className={[
                `w-full flex items-center gap-3 ${pl} pr-3 rounded-xl text-sm font-[400] min-h-[44px] transition text-left`,
                active
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
              ].join(' ')}>
              <span className={active ? 'text-violet-600' : 'text-gray-400'}>{nav.icon}</span>
              <span className="flex-1">{nav.label}</span>
              {nav.key === 'feedback' && unread > 0 && (
                <span className="bg-red-600 text-white text-[11px] font-[500] min-w-[20px] h-5 px-1.5 rounded-[3px] flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-gray-100 flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-[4px] bg-violet-100 text-violet-700 text-[14px] font-[500] flex items-center justify-center flex-none">
          {initial}
        </span>
        <div className="flex-1 min-w-0 leading-[1.25]">
          <p className="text-sm">{nombre}</p>
          <p className="text-[12px] text-gray-400">Desarrollador</p>
        </div>
        <button type="button" aria-label="Cerrar sesión" onClick={onLogout}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}

// ── DevPanel ──────────────────────────────────────────────────────────────────

export function DevPanel() {
  const { usuario, logout } = useAuth();
  const [seccion, setSeccion] = useState<Seccion>('inicio');
  const [navOpen, setNavOpen] = useState(false);
  const [vistaOverlay, setVistaOverlay] = useState<VistaOverlay | null>(null);

  // ── Usuarios ─────────────────────────────────────────────────────────────
  const [usuarios, setUsuarios] = useState<UsuarioAPI[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [reseteando, setReseteando] = useState<string | null>(null);

  const cargarUsuarios = useCallback(async () => {
    setCargando(true); setErrorCarga('');
    try {
      const data = await apiCall<{ usuarios: UsuarioAPI[] }>('GET', '/usuarios');
      setUsuarios(data.usuarios.filter(u => u.rol !== 'dev'));
    } catch (e: any) {
      setErrorCarga(e.message || 'Error al cargar usuarios');
    } finally {
      setCargando(false);
    }
  }, []);

  const handleToggle = async (id: string) => {
    setToggling(id);
    try {
      await apiCall('PATCH', `/usuarios/${id}/toggle-activo`, {});
      setUsuarios(prev => prev.map(u => u.usuarioId === id ? { ...u, activo: !u.activo } : u));
    } catch (e: any) { alert(e.message); }
    finally { setToggling(null); }
  };

  const handleEliminar = async (id: string) => {
    setEliminando(id);
    try {
      await apiCall('DELETE', `/usuarios/${id}`);
      setUsuarios(prev => prev.filter(u => u.usuarioId !== id));
    } catch (e: any) { alert(e.message); }
    finally { setEliminando(null); }
  };

  const handleReset = async (id: string) => {
    setReseteando(id);
    try {
      await apiCall('PATCH', `/usuarios/${id}/resetear-password`, {});
    } catch (e: any) { alert(e.message); }
    finally { setReseteando(null); }
  };

  const handleCrear = async (data: { nombre: string; email: string; modulo: string; rol: string; etapas: string[] }) => {
    await apiCall('POST', '/usuarios', {
      nombre: data.nombre,
      email: data.email,
      modulo: data.modulo,
      rol: data.rol,
      ...(data.modulo === 'tickets' && data.rol === 'contribuidor' ? { estadosAsignados: data.etapas } : {}),
    });
    await cargarUsuarios();
    return `${data.nombre} fue creado y quedó pendiente de activación.`;
  };

  // ── Feedback ─────────────────────────────────────────────────────────────
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [cargandoFeedback, setCargandoFeedback] = useState(false);

  const cargarFeedback = useCallback(async () => {
    setCargandoFeedback(true);
    try {
      const token = localStorage.getItem('sc_token') || '';
      const res = await fetch(`${API_URL}/feedback`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setFeedbackItems(d.feedback ?? []); }
    } catch { /* ignore */ }
    finally { setCargandoFeedback(false); }
  }, []);

  const handleMarcarLeido = async (id: string) => {
    const token = localStorage.getItem('sc_token') || '';
    await fetch(`${API_URL}/feedback/${id}/leido`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    setFeedbackItems(prev => prev.map(f => f.id === id ? { ...f, leido: 1 } : f));
  };

  const handleEliminarFeedback = async (id: string) => {
    const token = localStorage.getItem('sc_token') || '';
    await fetch(`${API_URL}/feedback/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setFeedbackItems(prev => prev.filter(f => f.id !== id));
  };

  useEffect(() => { cargarUsuarios(); cargarFeedback(); }, [cargarUsuarios, cargarFeedback]);

  // ── Overlays de módulos ───────────────────────────────────────────────────
  const moduleFallback = (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <RefreshCw size={22} className="animate-spin text-gray-400" />
    </div>
  );

  if (vistaOverlay === 'tickets')
    return <VistaOverlay titulo="Sistema de Tickets" color="bg-blue-700" onVolver={() => setVistaOverlay(null)}><Suspense fallback={moduleFallback}><TicketsApp /></Suspense></VistaOverlay>;
  if (vistaOverlay === 'savean')
    return <VistaOverlay titulo="SAVEAN · Admin" color="bg-orange-700" onVolver={() => setVistaOverlay(null)}><Suspense fallback={moduleFallback}><SaveanApp /></Suspense></VistaOverlay>;
  if (vistaOverlay === 'savean-inspector')
    return <VistaOverlay titulo="SAVEAN · Inspector" color="bg-amber-700" onVolver={() => setVistaOverlay(null)}><Suspense fallback={moduleFallback}><SaveanApp rolOverride="inspector" /></Suspense></VistaOverlay>;
  if (vistaOverlay === 'savean-sanidad')
    return <VistaOverlay titulo="SAVEAN · Sanidad" color="bg-emerald-800" onVolver={() => setVistaOverlay(null)}><Suspense fallback={moduleFallback}><SaveanApp rolOverride="sanidad" /></Suspense></VistaOverlay>;
  if (vistaOverlay === 'savean-punto-control')
    return <VistaOverlay titulo="SAVEAN · Punto de Control" color="bg-red-800" onVolver={() => setVistaOverlay(null)}><Suspense fallback={moduleFallback}><SaveanApp rolOverride="punto_control" /></Suspense></VistaOverlay>;

  const unreadCount = feedbackItems.filter(f => !f.leido).length;
  const nombre = usuario?.nombre ?? 'Lucas';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="font-serif font-light min-h-screen bg-[#f9fafb] flex" style={{ fontFamily: "'Source Serif 4', system-ui, sans-serif", fontWeight: 300 }}>
      {/* Mobile overlay */}
      {navOpen && (
        <div className="fixed inset-0 bg-black/20 z-30 sm:hidden" onClick={() => setNavOpen(false)} />
      )}

      {/* Sidebar mobile */}
      <div className={`fixed inset-y-0 left-0 z-40 sm:hidden transition-transform ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar seccion={seccion} setSeccion={setSeccion} unread={unreadCount} nombre={nombre} onLogout={logout} open={navOpen} setOpen={setNavOpen} />
      </div>

      {/* Sidebar desktop */}
      <div className="hidden sm:flex flex-none">
        <Sidebar seccion={seccion} setSeccion={setSeccion} unread={unreadCount} nombre={nombre} onLogout={logout} open={true} setOpen={() => {}} />
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Mobile header */}
        <div className="sm:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
          <button type="button" aria-label="Abrir menú" onClick={() => setNavOpen(true)}
            className="w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500">
            <Menu size={18} />
          </button>
          <span className="text-[15px] font-[500]">DevPanel</span>
        </div>

        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-8">
          {/* ── Inicio ── */}
          {seccion === 'inicio' && <InicioSection nombre={nombre} apiUrl={API_URL} token={localStorage.getItem('sc_token')} />}

          {/* ── Sistema ── */}
          {seccion === 'sistema' && <SistemaSection activo={seccion === 'sistema'} apiUrl={API_URL} token={localStorage.getItem('sc_token')} />}

          {/* ── Usuarios ── */}
          {seccion === 'usuarios' && (
            <UsuariosSection
              usuarios={usuarios}
              cargando={cargando}
              errorCarga={errorCarga}
              onRecargar={cargarUsuarios}
              onToggle={handleToggle} toggling={toggling}
              onEliminar={handleEliminar} eliminando={eliminando}
              onResetPassword={handleReset} reseteando={reseteando}
              onCrear={handleCrear}
            />
          )}

          {/* ── Reportes ── */}
          {seccion === 'reportes' && <ReportesSection apiUrl={API_URL} token={localStorage.getItem('sc_token')} />}

          {/* ── SAVEAN: Barreras ── */}
          {seccion === 'sv-barreras' && <BarrerasSection apiUrl={API_URL} token={localStorage.getItem('sc_token')} />}

          {/* ── SAVEAN: Documentos ── */}
          {seccion === 'sv-documentos' && <DocumentosSection apiUrl={API_URL} token={localStorage.getItem('sc_token')} />}

          {/* ── SAVEAN: fichAr ── */}
          {seccion === 'sv-fichar' && <Placeholder eyebrow="SAVEAN" title="fichAr" icon={<Clock size={18} />} />}

          {/* ── SAVEAN Paneles ── */}
          {seccion === 'sv-inspectores' && (
            <PanelSavean titulo="Inspectores"      onVer={() => setVistaOverlay('savean-inspector')} />
          )}
          {seccion === 'sv-control' && (
            <PanelSavean titulo="Punto de control" onVer={() => setVistaOverlay('savean-punto-control')} />
          )}
          {seccion === 'sv-sanidad' && (
            <PanelSavean titulo="Sanidad"          onVer={() => setVistaOverlay('savean-sanidad')} />
          )}

          {/* ── AGENCIA ── */}
          {seccion === 'ag-estados' && <Placeholder eyebrow="AGENCIA" title="Estados" icon={<Flag size={18} />} />}
          {seccion === 'ag-formularios' && <Placeholder eyebrow="AGENCIA" title="Formularios" icon={<ClipboardList size={18} />} />}

          {/* ── Feedback ── */}
          {seccion === 'feedback' && (
            <FeedbackSection
              items={feedbackItems}
              cargando={cargandoFeedback}
              onMarcarLeido={handleMarcarLeido}
              onEliminar={handleEliminarFeedback}
              onRecargar={cargarFeedback}
            />
          )}
        </div>
      </main>
    </div>
  );
}

