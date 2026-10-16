import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RefreshCw, MapPin, AlertCircle, ToggleLeft, ToggleRight, Plus, X } from 'lucide-react';

interface BarreraAPI {
  id: string;
  nombre: string;
  ruta?: string;
  kilometro?: string;
  departamento?: string;
  activa: boolean;
}

// Coordenadas reales de puntos de control en San Juan
const COORDS: Record<string, [number, number]> = {
  'Albardón':   [-31.35, -68.50],
  'Barreal':    [-31.64, -69.48],
  'Calingasta': [-31.32, -69.54],
  'Encon':      [-31.97, -67.73],
  'Encon Sur':  [-32.15, -67.73],
  'Huaco':      [-29.88, -68.58],
  'San Carlos': [-31.86, -68.47],
  'Talacasto':  [-31.11, -68.54],
  'Valdecito':  [-31.52, -67.88],
  'Vallecito':  [-31.62, -67.97],
  'Zonda':      [-31.57, -68.88],
};

function makeIcon(activa: boolean, selected: boolean): L.DivIcon {
  const size = selected ? 22 : 14;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${activa ? '#16a34a' : '#9ca3af'};
      border:2.5px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconAnchor: [size / 2, size / 2] as L.PointTuple,
  });
}

export function BarrerasSection({ apiUrl, token }: { apiUrl: string; token: string | null }) {
  const [barreras, setBarreras]   = useState<BarreraAPI[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState('');
  const [selected, setSelected]   = useState<string | null>(null);
  const [toggling, setToggling]   = useState<string | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [fNombre, setFNombre]     = useState('');
  const [fRuta, setFRuta]         = useState('');
  const [fKm, setFKm]             = useState('');
  const [fDept, setFDept]         = useState('');
  const [guardando, setGuardando] = useState(false);
  const [tab, setTab]             = useState<'mapa' | 'lista'>('mapa');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<L.Map | null>(null);
  const markersRef      = useRef<Map<string, L.Marker>>(new Map());

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

  // Inicializar mapa Leaflet una sola vez
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-31.0, -68.5],
      zoom: 7,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // Invalidar tamaño al cambiar a tab mapa
  useEffect(() => {
    if (tab === 'mapa') {
      const t = setTimeout(() => mapRef.current?.invalidateSize(), 80);
      return () => clearTimeout(t);
    }
  }, [tab]);

  // Actualizar marcadores cuando cambian barreras o selección
  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();

    barreras.forEach(b => {
      const coords = COORDS[b.nombre];
      if (!coords) return;
      const isSelected = selected === b.id;

      const marker = L.marker(coords, { icon: makeIcon(b.activa, isSelected) })
        .addTo(mapRef.current!)
        .on('click', () => setSelected(prev => prev === b.id ? null : b.id));

      if (isSelected) {
        marker.bindPopup(
          `<div style="font-family:system-ui;font-size:13px;line-height:1.7;min-width:140px">
            <strong style="font-size:14px">${b.nombre}</strong>
            ${b.ruta       ? `<br/><span style="color:#6b7280">Ruta:</span> ${b.ruta}` : ''}
            ${b.kilometro  ? `<br/><span style="color:#6b7280">Km:</span> ${b.kilometro}` : ''}
            ${b.departamento ? `<br/><span style="color:#6b7280">Dept:</span> ${b.departamento}` : ''}
            <br/><span style="color:${b.activa ? '#16a34a' : '#9ca3af'};font-weight:500">
              ${b.activa ? '● Activa' : '● Inactiva'}
            </span>
          </div>`,
          { offset: [0, -6] }
        ).openPopup();
      }

      markersRef.current.set(b.id, marker);
    });
  }, [barreras, selected]);

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

      {showForm && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-medium">Nueva barrera</h2>
            <button onClick={() => setShowForm(false)} className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 transition">
              <X size={16} />
            </button>
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
      ) : (
        <>
          {/* ── Mapa (siempre montado, oculto con display:none) ─── */}
          <div style={{ display: tab === 'mapa' ? 'flex' : 'none' }} className="flex-col lg:flex-row gap-4">
            <div className="flex-1 bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
              <div ref={mapContainerRef} style={{ height: '500px' }} />
              {barreras.filter(b => !COORDS[b.nombre]).length > 0 && (
                <p className="px-4 py-2 text-[11.5px] text-amber-600 border-t border-gray-50">
                  {barreras.filter(b => !COORDS[b.nombre]).length} barrera(s) sin coordenadas registradas
                </p>
              )}
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
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Estado</dt>
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
                  <p className="text-[12px] text-gray-400 mt-3">Clic en un marcador para ver detalles</p>
                  <div className="mt-4 pt-4 border-t border-gray-50">
                    <p className="text-[13px] text-gray-400">{activas.length} activas · {inactivas.length} inactivas</p>
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

          {/* ── Lista ──────────────────────────────────────────── */}
          {tab === 'lista' && (
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
          )}
        </>
      )}
    </div>
  );
}
