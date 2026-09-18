import { useState, useEffect } from 'react';
import { useSavean } from '../context/SaveanContext';
import { SaveanUsuarios } from './SaveanUsuarios';
import { MapPin, Users, Plus, Eye, EyeOff } from 'lucide-react';

const API_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:3000/api';
function getToken() { return localStorage.getItem('sc_token') || ''; }

const inputCls = 'flex-1 min-w-28 border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-400';
const btnPrimary = 'flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold px-4 py-1.5 rounded transition whitespace-nowrap';

interface BarreraAdmin {
  id: string;
  nombre: string;
  departamento?: string;
  activa: boolean;
}

export function SaveanConfiguracion() {
  const { agregarBarrera } = useSavean();
  const [tab, setTab] = useState<'barreras' | 'usuarios'>('barreras');

  const [barreras, setBarreras] = useState<BarreraAdmin[]>([]);
  const [loadingBarreras, setLoadingBarreras] = useState(true);
  const [errBarreras, setErrBarreras] = useState('');
  const [form, setForm] = useState({ nombre: '', departamento: '' });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (tab !== 'barreras') return;
    setLoadingBarreras(true);
    fetch(`${API_URL}/savean/barreras/todas`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => setBarreras(data.barreras ?? []))
      .catch((err: unknown) => setErrBarreras(err instanceof Error ? err.message : 'Error al cargar barreras'))
      .finally(() => setLoadingBarreras(false));
  }, [tab]);

  const handleAgregar = async () => {
    if (!form.nombre.trim()) { setErrBarreras('El nombre es obligatorio.'); return; }
    setGuardando(true);
    setErrBarreras('');
    try {
      await agregarBarrera({ nombre: form.nombre.trim(), departamento: form.departamento.trim() || undefined, activa: true });
      // Recargar lista completa
      const r = await fetch(`${API_URL}/savean/barreras/todas`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await r.json();
      setBarreras(data.barreras ?? []);
      setForm({ nombre: '', departamento: '' });
    } catch (err: any) {
      setErrBarreras(err?.message || 'Error al agregar barrera.');
    } finally {
      setGuardando(false);
    }
  };

  const toggleActiva = async (b: BarreraAdmin) => {
    try {
      const res = await fetch(`${API_URL}/savean/barreras/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ activa: !b.activa }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})) as { error?: string }; setErrBarreras(d.error || 'Error al actualizar.'); return; }
      const updated: BarreraAdmin = await res.json();
      setBarreras(prev => prev.map(x => x.id === updated.id ? updated : x));
    } catch {
      setErrBarreras('Error de conexión.');
    }
  };

  const activas   = barreras.filter(b => b.activa);
  const inactivas = barreras.filter(b => !b.activa);

  return (
    <div className="space-y-4 text-sm">
      <div className="bg-white border border-gray-200">

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {([
            { key: 'barreras' as const, label: 'Barreras', icon: <MapPin size={13} />, count: activas.length },
            { key: 'usuarios' as const, label: 'Usuarios', icon: <Users size={13} />, count: null },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide transition border-b-2 -mb-px ${
                tab === t.key ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.icon}{t.label}
              {t.count !== null && (
                <span className="ml-1 bg-gray-200 text-gray-600 text-xs px-1.5 py-0.5 rounded font-bold">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4">

          {/* ── Tab: Barreras ── */}
          {tab === 'barreras' && (
            <div className="space-y-5">

              {/* Agregar nueva */}
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">Agregar nueva barrera</p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text" placeholder="Nombre de la barrera *"
                    value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                    className={inputCls}
                  />
                  <input
                    type="text" placeholder="Departamento (opcional)"
                    value={form.departamento} onChange={e => setForm({ ...form, departamento: e.target.value })}
                    className={inputCls}
                  />
                  <button onClick={handleAgregar} disabled={guardando} className={btnPrimary}>
                    <Plus size={12} /> {guardando ? 'Guardando...' : 'Agregar'}
                  </button>
                </div>
                {errBarreras && <p className="text-xs text-red-600 mt-1">{errBarreras}</p>}
              </div>

              {/* Lista */}
              {loadingBarreras ? (
                <p className="text-xs text-gray-400">Cargando barreras...</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr className="text-gray-500 border-b border-gray-200">
                        <th className="text-left px-3 py-2 font-semibold">Nombre</th>
                        <th className="text-left px-3 py-2 font-semibold">Departamento</th>
                        <th className="text-left px-3 py-2 font-semibold">Estado</th>
                        <th className="text-left px-3 py-2 font-semibold">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activas.map((b, i) => (
                        <tr key={b.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2 text-gray-800 font-medium">{b.nombre}</td>
                          <td className="px-3 py-2 text-gray-500">{b.departamento || '—'}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">Activa</span>
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => toggleActiva(b)}
                              className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold px-3 py-1 rounded transition"
                            >
                              <EyeOff size={11} /> Desactivar
                            </button>
                          </td>
                        </tr>
                      ))}
                      {inactivas.map((b, i) => (
                        <tr key={b.id} className={(activas.length + i) % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2 text-gray-400 font-medium">{b.nombre}</td>
                          <td className="px-3 py-2 text-gray-400">{b.departamento || '—'}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-500">Inactiva</span>
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => toggleActiva(b)}
                              className="flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded transition"
                            >
                              <Eye size={11} /> Activar
                            </button>
                          </td>
                        </tr>
                      ))}
                      {barreras.length === 0 && (
                        <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-400">Sin barreras registradas.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Usuarios ── */}
          {tab === 'usuarios' && <SaveanUsuarios />}

        </div>
      </div>
    </div>
  );
}
