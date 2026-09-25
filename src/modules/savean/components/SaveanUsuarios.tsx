import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Plus, Trash2, RefreshCw, KeyRound, X, Check } from 'lucide-react';

const API_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:3000/api';
function getToken() { return localStorage.getItem('sc_token') || ''; }

const btnPrimary = 'flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold px-4 py-1.5 rounded transition whitespace-nowrap';
const btnDanger  = 'flex items-center gap-1 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold px-3 py-1 rounded transition';
const inputCls   = 'flex-1 min-w-24 border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-400';

interface SaveanUser {
  usuarioId: string;
  nombre: string;
  email: string;
  username: string;
  rol: string;
  activo: boolean;
}

function getUsername(u: SaveanUser) {
  return (u.username || u.email).replace(/@.*$/, '');
}

function ResetPasswordRow({ usuarioId, onDone }: { usuarioId: string; onDone: () => void }) {
  const [pass, setPass]       = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');
  const [ok, setOk]           = useState(false);

  const handleReset = async () => {
    if (pass.length < 4) { setErr('Mínimo 4 caracteres.'); return; }
    setLoading(true); setErr('');
    try {
      const res = await fetch(`${API_URL}/savean/usuarios/${usuarioId}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ password: pass }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setErr(d.error || 'Error al cambiar contraseña.'); return;
      }
      setOk(true);
      setTimeout(onDone, 1200);
    } catch {
      setErr('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  if (ok) return (
    <td colSpan={4} className="px-3 py-2 text-green-700 text-xs font-semibold">
      ✓ Contraseña actualizada
    </td>
  );

  return (
    <td colSpan={4} className="px-3 py-2">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          type="password"
          placeholder="Nueva contraseña"
          value={pass}
          onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleReset()}
          className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-gray-400 w-44"
        />
        <button
          onClick={handleReset}
          disabled={loading}
          className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-300 text-white text-xs font-semibold px-3 py-1 rounded transition"
        >
          <Check size={11} /> {loading ? '...' : 'Guardar'}
        </button>
        <button onClick={onDone} className="text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
        {err && <span className="text-red-600 text-xs">{err}</span>}
      </div>
    </td>
  );
}

export function SaveanUsuarios() {
  const { usuario } = useAuth();

  const [users, setUsers]         = useState<SaveanUser[]>([]);
  const [loading, setLoading]     = useState(true);
  const [err, setErr]             = useState('');
  const [form, setForm]           = useState({ nombre: '', username: '', password: '' });
  const [guardando, setGuardando] = useState(false);
  const [resetId, setResetId]     = useState<string | null>(null);

  const cargar = () => {
    setLoading(true); setErr('');
    fetch(`${API_URL}/savean/usuarios`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => setUsers(data.usuarios ?? []))
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Error al cargar usuarios'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const handleAgregar = async () => {
    if (!form.nombre.trim() || !form.username.trim() || !form.password.trim()) {
      setErr('Todos los campos son obligatorios.'); return;
    }
    if (form.password.length < 4) { setErr('La contraseña debe tener al menos 4 caracteres.'); return; }
    setGuardando(true); setErr('');
    try {
      const res = await fetch(`${API_URL}/savean/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ nombre: form.nombre.trim(), username: form.username.trim(), password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? 'Error al crear el inspector.'); return; }
      setUsers(prev => [...prev, data]);
      setForm({ nombre: '', username: '', password: '' });
    } catch {
      setErr('Error de conexión.');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (usuarioId: string) => {
    setErr('');
    try {
      const res = await fetch(`${API_URL}/savean/usuarios/${usuarioId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setErr(d.error || 'No se pudo eliminar el usuario.'); return;
      }
      setUsers(prev => prev.filter(u => u.usuarioId !== usuarioId));
    } catch {
      setErr('Error de conexión.');
    }
  };

  const inspectores = users.filter(u => u.rol !== 'admin');
  const directores  = users.filter(u => u.rol === 'admin');

  return (
    <div className="space-y-5 text-sm">

      {/* Agregar nuevo inspector */}
      <div>
        <p className="text-xs text-gray-500 mb-2 font-medium">Agregar nuevo inspector</p>
        <div className="flex flex-wrap gap-2">
          <input
            type="text" placeholder="Nombre completo"
            value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
            className={inputCls}
          />
          <input
            type="text" placeholder="Usuario"
            value={form.username}
            onChange={e => {
              let v = e.target.value.toLowerCase().replace(/\s/g, '').replace(/@.*$/, '');
              setForm({ ...form, username: v });
            }}
            className={inputCls}
          />
          <input
            type="password" placeholder="Contraseña"
            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
            className={inputCls}
          />
          <button onClick={handleAgregar} disabled={guardando} className={btnPrimary}>
            <Plus size={12} /> {guardando ? 'Guardando...' : 'Agregar'}
          </button>
        </div>
        {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
      </div>

      {/* Lista */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-500 font-medium">
            Inspectores ({inspectores.length}) · Directores ({directores.length})
          </p>
          <button onClick={cargar} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition">
            <RefreshCw size={11} /> Actualizar
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-gray-400 py-2">Cargando...</p>
        ) : users.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">Sin usuarios registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-gray-200">
              <thead className="bg-gray-50">
                <tr className="text-gray-500 border-b border-gray-200">
                  <th className="text-left px-3 py-2 font-semibold">Nombre</th>
                  <th className="text-left px-3 py-2 font-semibold">Usuario</th>
                  <th className="text-left px-3 py-2 font-semibold">Rol</th>
                  <th className="text-left px-3 py-2 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  resetId === u.usuarioId ? (
                    <tr key={u.usuarioId} className="bg-gray-50 border-b border-gray-100">
                      <ResetPasswordRow usuarioId={u.usuarioId} onDone={() => setResetId(null)} />
                    </tr>
                  ) : (
                    <tr key={u.usuarioId} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 text-gray-800 font-medium">{u.nombre}</td>
                      <td className="px-3 py-2 text-gray-500 font-mono">{getUsername(u)}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          u.rol === 'admin' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {u.rol === 'admin' ? 'Director' : 'Inspector'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {u.usuarioId !== usuario?.usuarioId && (
                            <button
                              onClick={() => setResetId(u.usuarioId)}
                              className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold px-3 py-1 rounded transition"
                            >
                              <KeyRound size={11} /> Contraseña
                            </button>
                          )}
                          {u.usuarioId !== usuario?.usuarioId && u.rol !== 'admin' && (
                            <button onClick={() => handleEliminar(u.usuarioId)} className={btnDanger}>
                              <Trash2 size={11} /> Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
