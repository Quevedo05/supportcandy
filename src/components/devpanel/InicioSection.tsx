import { useState, useEffect, useRef } from 'react';
import {
  Users, Ticket, MessageSquare, MapPin, FileText,
  RefreshCw, CheckCircle2, AlertCircle, Circle,
  Trash2, Plus, ChevronLeft, ChevronRight,
} from 'lucide-react';

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface Resumen {
  usuarios: number;
  tickets: number;
  feedbackNoLeido: number;
  barreras: number;
  guiasPendientes: number;
}

interface Tarea {
  id: string;
  texto: string;
  hecha: boolean;
  creadaEn: string;
}

// ── Hook de tareas con localStorage ───────────────────────────────────────────

function useTareas() {
  const [tareas, setTareas] = useState<Tarea[]>(() => {
    try {
      const saved = localStorage.getItem('devpanel_tareas');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('devpanel_tareas', JSON.stringify(tareas));
  }, [tareas]);

  function agregar(texto: string) {
    const t = texto.trim();
    if (!t) return;
    setTareas(prev => [{ id: Date.now().toString(), texto: t, hecha: false, creadaEn: new Date().toISOString() }, ...prev]);
  }

  function toggleHecha(id: string) {
    setTareas(prev => prev.map(t => t.id === id ? { ...t, hecha: !t.hecha } : t));
  }

  function eliminar(id: string) {
    setTareas(prev => prev.filter(t => t.id !== id));
  }

  return { tareas, agregar, toggleHecha, eliminar };
}

// ── Calendario ─────────────────────────────────────────────────────────────────

function MiniCalendar() {
  const [viendoMes, setViendoMes] = useState(() => new Date());
  const hoy = new Date();

  const anio = viendoMes.getFullYear();
  const mes  = viendoMes.getMonth();
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();

  const primerDia = new Date(anio, mes, 1).getDay();
  const offsetLunes = primerDia === 0 ? 6 : primerDia - 1;

  const celdas: (number | null)[] = [];
  for (let i = 0; i < offsetLunes; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d);
  while (celdas.length % 7 !== 0) celdas.push(null);

  const esHoyMes = mes === hoy.getMonth() && anio === hoy.getFullYear();
  const nombreMes = viendoMes.toLocaleDateString('es-AR', { month: 'long' });

  function irAlHoy() {
    setViendoMes(new Date());
  }

  return (
    <div>
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setViendoMes(new Date(anio, mes - 1))}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition">
          <ChevronLeft size={15} />
        </button>
        <button
          onClick={irAlHoy}
          className="text-[13px] font-[500] text-gray-700 capitalize hover:text-violet-600 transition">
          {nombreMes} {anio}
        </button>
        <button
          onClick={() => setViendoMes(new Date(anio, mes + 1))}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition">
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 text-center text-[11px] font-[500] text-gray-400 mb-1">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
          <span key={d} className="py-1">{d}</span>
        ))}
      </div>

      {/* Celdas */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {celdas.map((dia, i) => {
          const esHoy = dia !== null && esHoyMes && dia === hoy.getDate();
          const esFinde = ((i % 7) === 5 || (i % 7) === 6);
          return (
            <div key={i} className="flex items-center justify-center h-8">
              {dia !== null && (
                <span className={`
                  w-7 h-7 flex items-center justify-center rounded-full text-[12.5px] transition
                  ${esHoy
                    ? 'bg-violet-600 text-white font-[600]'
                    : esFinde
                      ? 'text-gray-400'
                      : 'text-gray-700 hover:bg-gray-100 cursor-default'
                  }
                `}>
                  {dia}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── StatCard ───────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  chip?: string;
  chipCls?: string;
  loading: boolean;
}

function StatCard({ label, value, icon, chip, chipCls, loading }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)] flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="w-9 h-9 rounded-[10px] bg-violet-50 text-violet-600 flex items-center justify-center flex-none">
          {icon}
        </span>
        {chip && (
          <span className={`px-2 py-0.5 rounded-[3px] text-[11.5px] font-[400] ${chipCls}`}>{chip}</span>
        )}
      </div>
      <div>
        {loading ? (
          <div className="h-8 w-16 bg-gray-100 rounded-[4px] animate-pulse" />
        ) : (
          <p className="text-[28px] font-medium leading-none tracking-[-0.02em] text-gray-900">{value}</p>
        )}
        <p className="text-[13px] text-gray-400 mt-1">{label}</p>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export function InicioSection({ nombre, apiUrl, token }: { nombre: string; apiUrl: string; token: string | null }) {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [apiOk, setApiOk] = useState<boolean | null>(null);

  const { tareas, agregar, toggleHecha, eliminar } = useTareas();
  const [nuevaTarea, setNuevaTarea] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function cargar() {
      setCargando(true); setError('');
      try {
        const health = await fetch(`${apiUrl.replace('/api', '')}/api/health`).then(r => r.ok);
        if (!cancelled) setApiOk(health);

        const res = await fetch(`${apiUrl}/sistema/resumen`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!cancelled) {
          if (res.ok) setResumen(await res.json());
          else setError(`Error ${res.status}`);
        }
      } catch {
        if (!cancelled) { setApiOk(false); setError('Sin conexión al servidor'); }
      } finally {
        if (!cancelled) setCargando(false);
      }
    }

    cargar();
    return () => { cancelled = true; };
  }, [apiUrl, token]);

  function handleAgregarTarea() {
    if (!nuevaTarea.trim()) return;
    agregar(nuevaTarea);
    setNuevaTarea('');
    inputRef.current?.focus();
  }

  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';

  const tareasPendientes = tareas.filter(t => !t.hecha);
  const tareasHechas     = tareas.filter(t => t.hecha);

  return (
    <div>
      {/* Header */}
      <header className="mb-8">
        <p className="text-[13px] text-gray-400 mb-1">{saludo}</p>
        <h1 className="text-[32px] font-medium leading-tight tracking-[-0.03em] text-gray-900">{nombre}</h1>
        <p className="text-[14px] text-gray-400 mt-1.5">Panel de administración · Agencia de Calidad San Juan</p>
      </header>

      {/* Estado del servidor */}
      <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-[13px] mb-7 ${
        apiOk === null ? 'bg-gray-50 border-gray-100 text-gray-400' :
        apiOk ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'
      }`}>
        {apiOk === null
          ? <RefreshCw size={14} className="animate-spin flex-none" />
          : apiOk
            ? <CheckCircle2 size={14} className="flex-none" />
            : <AlertCircle size={14} className="flex-none" />
        }
        <span>
          {apiOk === null ? 'Verificando servidor…' :
           apiOk ? 'Servidor en línea · ' + new URL(apiUrl).hostname :
           'Servidor no disponible'}
        </span>
        {apiOk && (
          <span className="ml-auto font-mono text-[11.5px] text-green-600">
            {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-[13px] text-red-600 mb-5">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 mb-7" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(180px,100%), 1fr))' }}>
        <StatCard label="Usuarios activos"   value={resumen?.usuarios ?? 0}           icon={<Users size={18} />}        loading={cargando} />
        <StatCard label="Tickets abiertos"   value={resumen?.tickets ?? 0}            icon={<Ticket size={18} />}       loading={cargando} />
        <StatCard label="Feedback sin leer"  value={resumen?.feedbackNoLeido ?? 0}    icon={<MessageSquare size={18} />} loading={cargando}
          chip={resumen && resumen.feedbackNoLeido > 0 ? 'Pendiente' : undefined}
          chipCls="bg-red-50 text-red-600" />
        <StatCard label="Barreras activas"   value={resumen?.barreras ?? 0}           icon={<MapPin size={18} />}       loading={cargando} />
        <StatCard label="Guías pendientes"   value={resumen?.guiasPendientes ?? 0}    icon={<FileText size={18} />}     loading={cargando}
          chip={resumen && resumen.guiasPendientes > 0 ? 'En revisión' : undefined}
          chipCls="bg-amber-50 text-amber-600" />
      </div>

      {/* ── Calendario + Tareas ─────────────────────────────────────────────── */}
      <div className="grid gap-4 mb-7" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px,100%), 1fr))' }}>

        {/* Calendario */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
          <h2 className="text-[15px] font-medium mb-4 text-gray-700">Calendario</h2>
          <MiniCalendar />
          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 text-[12px] text-gray-400">
            <span className="w-5 h-5 rounded-full bg-violet-600 flex-none" />
            Hoy: {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>

        {/* Tareas */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-medium text-gray-700">Tareas</h2>
            {tareas.length > 0 && (
              <span className="text-[12px] text-gray-400">
                {tareasPendientes.length} pendiente{tareasPendientes.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Input nueva tarea */}
          <div className="flex gap-2 mb-4">
            <input
              ref={inputRef}
              value={nuevaTarea}
              onChange={e => setNuevaTarea(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAgregarTarea()}
              placeholder="Nueva tarea…"
              className="flex-1 h-9 border border-gray-200 rounded-xl px-3 text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
            />
            <button
              onClick={handleAgregarTarea}
              disabled={!nuevaTarea.trim()}
              className="w-9 h-9 bg-violet-600 hover:bg-violet-700 text-white rounded-xl flex items-center justify-center transition disabled:opacity-40">
              <Plus size={15} />
            </button>
          </div>

          {/* Lista */}
          <div className="flex flex-col gap-1 flex-1 overflow-y-auto max-h-64">
            {tareas.length === 0 && (
              <p className="text-[13px] text-gray-400 text-center py-6">Sin tareas aún</p>
            )}

            {/* Pendientes */}
            {tareasPendientes.map(t => (
              <div key={t.id} className="flex items-center gap-2.5 px-1 py-1.5 rounded-xl hover:bg-gray-50 group transition">
                <button onClick={() => toggleHecha(t.id)} className="flex-none text-gray-300 hover:text-violet-500 transition">
                  <Circle size={17} />
                </button>
                <span className="flex-1 text-[13px] text-gray-800 leading-snug">{t.texto}</span>
                <button onClick={() => eliminar(t.id)} className="flex-none text-transparent group-hover:text-gray-300 hover:!text-red-400 transition">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {/* Hechas */}
            {tareasHechas.length > 0 && (
              <>
                {tareasPendientes.length > 0 && <div className="my-1 border-t border-gray-50" />}
                {tareasHechas.map(t => (
                  <div key={t.id} className="flex items-center gap-2.5 px-1 py-1.5 rounded-xl hover:bg-gray-50 group transition opacity-50">
                    <button onClick={() => toggleHecha(t.id)} className="flex-none text-violet-500 transition">
                      <CheckCircle2 size={17} />
                    </button>
                    <span className="flex-1 text-[13px] text-gray-400 leading-snug line-through">{t.texto}</span>
                    <button onClick={() => eliminar(t.id)} className="flex-none text-transparent group-hover:text-gray-300 hover:!text-red-400 transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Info del sistema */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
        <h2 className="text-[15px] font-medium mb-3 text-gray-700">Sistema</h2>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-[13px] text-gray-500">
          <span>Frontend: React 18 + Vite 5</span>
          <span>Backend: Node.js + Express</span>
          <span>DB: MySQL</span>
          <span>Deploy: Nginx · Ubuntu</span>
        </div>
      </div>
    </div>
  );
}
