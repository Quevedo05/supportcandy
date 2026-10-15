import { useState, useEffect } from 'react';
import { RefreshCw, MapPin, AlertCircle, ToggleLeft, ToggleRight, Plus, X } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BarreraAPI {
  id: string;
  nombre: string;
  ruta?: string;
  kilometro?: string;
  departamento?: string;
  activa: boolean;
}

// ── Posiciones en el SVG (x%, y% del viewBox 1000x1258.6) ────────────────────

const POS: Record<string, { x: number; y: number }> = {
  'Albardón':   { x: 55, y: 43 },
  'Barreal':    { x: 24, y: 40 },
  'Calingasta': { x: 19, y: 17 },
  'Encon':      { x: 72, y: 72 },
  'Encon Sur':  { x: 74, y: 76 },
  'Huaco':      { x: 46, y: 14 },
  'San Carlos': { x: 53, y: 63 },
  'Talacasto':  { x: 54, y: 46 },
  'Valdecito':  { x: 79, y: 50 },
  'Vallecito':  { x: 67, y: 55 },
  'Zonda':      { x: 51, y: 51 },
};

// ── SVG Departments ────────────────────────────────────────────────────────────

const DEPTS: { id: string; d: string }[] = [
  { id: 'iglesia',      d: 'M 66 0 L 129 0 L 129 130 L 66 130 Z' },
  { id: 'jachal',       d: 'M 129 0 L 280 0 L 280 130 L 129 130 Z' },
  { id: 'valle-fertil', d: 'M 620 230 L 1000 230 L 1000 600 L 620 600 Z' },
  { id: '25-de-mayo',   d: 'M 530 600 L 1000 600 L 1000 900 L 530 900 Z' },
  { id: 'caucete',      d: 'M 490 430 L 800 430 L 800 620 L 490 620 Z' },
  { id: 'capital',      d: 'M 370 420 L 540 420 L 540 560 L 370 560 Z' },
  { id: 'albardon',     d: 'M 400 330 L 580 330 L 580 440 L 400 440 Z' },
  { id: 'rivadavia',    d: 'M 540 350 L 700 350 L 700 470 L 540 470 Z' },
  { id: 'san-martin',   d: 'M 660 440 L 860 440 L 860 620 L 660 620 Z' },
  { id: 'sarmiento',    d: 'M 380 530 L 580 530 L 580 720 L 380 720 Z' },
  { id: 'calingasta',   d: 'M 66 130 L 300 130 L 300 580 L 66 580 Z' },
  { id: 'pocito',       d: 'M 330 540 L 460 540 L 460 650 L 330 650 Z' },
  { id: 'rawson',       d: 'M 450 490 L 600 490 L 600 600 L 450 600 Z' },
  { id: 'chimbas',      d: 'M 450 380 L 570 380 L 570 460 L 450 460 Z' },
  { id: 'santa-lucia',  d: 'M 395 460 L 490 460 L 490 530 L 395 530 Z' },
  { id: 'zonda',        d: 'M 300 480 L 410 480 L 410 570 L 300 570 Z' },
  { id: 'ullum',        d: 'M 240 380 L 370 380 L 370 490 L 240 490 Z' },
  { id: 'angaco',       d: 'M 590 380 L 700 380 L 700 470 L 590 470 Z' },
  { id: 'albiga',       d: 'M 280 130 L 450 130 L 450 380 L 280 380 Z' },
];

// ── Componente principal ───────────────────────────────────────────────────────

export function BarrerasSection({ apiUrl, token }: { apiUrl: string; token: string | null }) {
  const [barreras, setBarreras]     = useState<BarreraAPI[]>([]);
  const [cargando, setCargando]     = useState(true);
  const [error, setError]           = useState('');
  const [selected, setSelected]     = useState<string | null>(null);
  const [toggling, setToggling]     = useState<string | null>(null);
  const [showForm, setShowForm]     = useState(false);
  const [fNombre, setFNombre]       = useState('');
  const [fRuta, setFRuta]           = useState('');
  const [fKm, setFKm]               = useState('');
  const [fDept, setFDept]           = useState('');
  const [guardando, setGuardando]   = useState(false);
  const [tab, setTab]               = useState<'mapa' | 'lista'>('mapa');

  async function cargar() {
    setCargando(true); setError('');
    try {
      const res = await fetch(`${apiUrl}/savean/barreras/todas`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = await res.json();
      setBarreras(d.barreras ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  async function toggleActiva(b: BarreraAPI) {
    setToggling(b.id);
    try {
      const res = await fetch(`${apiUrl}/savean/barreras/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ activa: !b.activa }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const upd = await res.json();
      setBarreras(prev => prev.map(x => x.id === b.id ? { ...x, activa: upd.activa } : x));
    } catch (e: any) { alert(e.message); }
    finally { setToggling(null); }
  }

  async function crearBarrera() {
    if (!fNombre.trim()) return;
    setGuardando(true);
    try {
      const res = await fetch(`${apiUrl}/savean/barreras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ nombre: fNombre.trim(), ruta: fRuta || undefined, kilometro: fKm || undefined, departamento: fDept || undefined }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      await cargar();
      setShowForm(false); setFNombre(''); setFRuta(''); setFKm(''); setFDept('');
    } catch (e: any) { alert(e.message); }
    finally { setGuardando(false); }
  }

  useEffect(() => { cargar(); }, []);

  const activas   = barreras.filter(b => b.activa);
  const inactivas = barreras.filter(b => !b.activa);
  const sel       = barreras.find(b => b.id === selected) ?? null;

  const inputCls = 'h-10 w-full border border-gray-200 rounded-xl px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white';

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[30px] font-medium tracking-[-0.025em] text-gray-900">Barreras</h1>
          <p className="text-sm text-gray-500 mt-1">{activas.length} activas · {inactivas.length} inactivas</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={cargar} className="h-10 px-3.5 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition">
            <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} /> Recargar
          </button>
          <button onClick={() => setShowForm(v => !v)} className="h-10 px-3.5 bg-violet-600 hover:bg-violet-700 text-white text-[13px] rounded-xl flex items-center gap-2 transition">
            <Plus size={14} /> Nueva barrera
          </button>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 text-[13px] text-red-600 mb-4">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-medium">Nueva barrera</h2>
            <button onClick={() => setShowForm(false)} className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 transition"><X size={16} /></button>
          </div>
          <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(180px,100%), 1fr))' }}>
            <div>
              <label className="text-[12px] text-gray-500 mb-1 block">Nombre *</label>
              <input className={inputCls} placeholder="Ej: Los Berros" value={fNombre} onChange={e => setFNombre(e.target.value)} />
            </div>
            <div>
              <label className="text-[12px] text-gray-500 mb-1 block">Ruta</label>
              <input className={inputCls} placeholder="Ej: Ruta Nac. 40" value={fRuta} onChange={e => setFRuta(e.target.value)} />
            </div>
            <div>
              <label className="text-[12px] text-gray-500 mb-1 block">Kilómetro</label>
              <input className={inputCls} placeholder="Ej: km 1200" value={fKm} onChange={e => setFKm(e.target.value)} />
            </div>
            <div>
              <label className="text-[12px] text-gray-500 mb-1 block">Departamento</label>
              <input className={inputCls} placeholder="Ej: Sarmiento" value={fDept} onChange={e => setFDept(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={crearBarrera} disabled={guardando || !fNombre.trim()}
              className="h-10 px-5 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-xl transition disabled:opacity-50">
              {guardando ? 'Guardando…' : 'Crear barrera'}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white border border-gray-100 rounded-[14px] shadow-[0_1px_2px_rgba(17,24,39,0.04)] mb-5 w-fit">
        {(['mapa', 'lista'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 h-10 rounded-[10px] text-sm transition capitalize ${tab === t ? 'bg-violet-50 text-violet-700' : 'text-gray-500 hover:bg-gray-50'}`}>
            {t === 'mapa' ? 'Mapa' : 'Lista'}
          </button>
        ))}
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
          <RefreshCw size={18} className="animate-spin" /> Cargando barreras…
        </div>
      ) : tab === 'lista' ? (
        /* ── Lista ─────────────────────────────────────────────────────── */
        <div className="flex flex-col gap-3">
          {[...activas, ...inactivas].map(b => (
            <div key={b.id}
              className={`bg-white border rounded-2xl p-4 shadow-[0_1px_2px_rgba(17,24,39,0.04)] flex items-center gap-4 ${b.activa ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
              <span className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-none ${b.activa ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                <MapPin size={17} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-[500]">{b.nombre}</p>
                <p className="text-[12px] text-gray-400">
                  {[b.ruta, b.kilometro, b.departamento].filter(Boolean).join(' · ') || 'Sin datos de ubicación'}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded-[3px] text-[11.5px] flex-none ${b.activa ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {b.activa ? 'Activa' : 'Inactiva'}
              </span>
              <button onClick={() => toggleActiva(b)} disabled={toggling === b.id}
                aria-label={b.activa ? 'Desactivar' : 'Activar'}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition disabled:opacity-40">
                {toggling === b.id
                  ? <RefreshCw size={16} className="animate-spin" />
                  : b.activa ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} />
                }
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* ── Mapa ──────────────────────────────────────────────────────── */
        <div className="flex flex-col lg:flex-row gap-4">
          {/* SVG Map */}
          <div className="relative bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(17,24,39,0.04)] flex-1">
            <svg viewBox="0 0 1000 1258.6" className="w-full" preserveAspectRatio="xMidYMid meet">
              {/* Department fills */}
              {DEPTS.map(d => (
                <path key={d.id} d={d.d} fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
              ))}
              {/* Barrier pins */}
              {barreras.map(b => {
                const pos = POS[b.nombre];
                if (!pos) return null;
                const cx = pos.x / 100 * 1000;
                const cy = pos.y / 100 * 1258.6;
                const isSelected = selected === b.id;
                return (
                  <g key={b.id} onClick={() => setSelected(isSelected ? null : b.id)} style={{ cursor: 'pointer' }}>
                    <circle cx={cx} cy={cy} r={isSelected ? 18 : 14}
                      fill={b.activa ? '#16a34a' : '#9ca3af'} opacity="0.15" />
                    <circle cx={cx} cy={cy} r={isSelected ? 9 : 7}
                      fill={b.activa ? '#16a34a' : '#9ca3af'}
                      stroke="white" strokeWidth="2" />
                    {isSelected && (
                      <text x={cx} y={cy - 20} textAnchor="middle"
                        fontSize="28" fill="#1e293b" fontFamily="Inter, sans-serif" fontWeight="500">
                        {b.nombre}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
            <p className="absolute bottom-3 left-3 text-[11px] text-gray-400">Hacer clic en un pin para ver detalles</p>
          </div>

          {/* Panel lateral */}
          <div className="w-full lg:w-72 flex flex-col gap-3">
            {sel ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[16px] font-medium">{sel.nombre}</h3>
                  <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition">
                    <X size={14} />
                  </button>
                </div>
                <dl className="flex flex-col gap-2 text-[13px] mb-4">
                  {sel.ruta && <div className="flex justify-between"><dt className="text-gray-400">Ruta</dt><dd className="font-[500]">{sel.ruta}</dd></div>}
                  {sel.kilometro && <div className="flex justify-between"><dt className="text-gray-400">Kilómetro</dt><dd className="font-[500]">{sel.kilometro}</dd></div>}
                  {sel.departamento && <div className="flex justify-between"><dt className="text-gray-400">Departamento</dt><dd className="font-[500]">{sel.departamento}</dd></div>}
                  <div className="flex justify-between"><dt className="text-gray-400">Estado</dt>
                    <dd><span className={`px-2 py-0.5 rounded-[3px] text-[11.5px] ${sel.activa ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{sel.activa ? 'Activa' : 'Inactiva'}</span></dd>
                  </div>
                </dl>
                <button onClick={() => toggleActiva(sel)} disabled={toggling === sel.id}
                  className={`w-full h-10 rounded-xl text-sm transition disabled:opacity-50 ${
                    sel.activa ? 'border border-red-200 text-red-600 hover:bg-red-50' : 'bg-violet-600 hover:bg-violet-700 text-white'
                  }`}>
                  {toggling === sel.id ? 'Actualizando…' : sel.activa ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
                <h3 className="text-[14px] font-medium mb-3">Leyenda</h3>
                <ul className="flex flex-col gap-2 text-[13px]">
                  <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500 flex-none" /> Barrera activa</li>
                  <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gray-400 flex-none" /> Barrera inactiva</li>
                </ul>
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <p className="text-[13px] text-gray-400">{activas.length} activas · {inactivas.length} inactivas</p>
                  {barreras.filter(b => !POS[b.nombre]).length > 0 && (
                    <p className="text-[12px] text-amber-600 mt-1">
                      {barreras.filter(b => !POS[b.nombre]).length} sin posición en mapa
                    </p>
                  )}
                </div>
              </div>
            )}
            {/* Lista rápida */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
              {barreras.map(b => (
                <button key={b.id} onClick={() => setSelected(b.id === selected ? null : b.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-gray-50 last:border-0 hover:bg-gray-50 transition text-[13px] ${selected === b.id ? 'bg-violet-50' : ''}`}>
                  <span className={`w-2.5 h-2.5 rounded-[2px] flex-none ${b.activa ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={b.activa ? 'text-gray-800' : 'text-gray-400'}>{b.nombre}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
