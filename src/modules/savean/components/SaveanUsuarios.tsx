import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useSavean } from '../context/SaveanContext';
import { Users, Plus, UserPlus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

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

export function SaveanUsuarios() {
  const { usuario } = useAuth();
  const { barreristas, agregarBarrerista, eliminarBarrerista } = useSavean();

  const [tab, setTab]                           = useState<'barreristas' | 'inspectores'>('barreristas');
  const [verListaBr, setVerListaBr]             = useState(false);
  const [verListaInsp, setVerListaInsp]         = useState(false);

  const [formBr, setFormBr]     = useState({ nombre: '', usuario: '', contrasena: '' });
  const [errBr, setErrBr]       = useState('');
  const [migrando, setMigrando] = useState(false);
  const [migResult, setMigResult] = useState<{
    total: number;
    creados: { nombre: string; usuario: string; contrasena?: string; reparado?: boolean }[];
    saltados: { nombre: string; usuario: string }[];
    errores: { nombre: string; usuario?: string; error: string }[];
  } | null>(null);

  const [saveanUsers, setSaveanUsers] = useState<SaveanUser[]>([]);
  const [formAdmin, setFormAdmin]     = useState({ nombre: '', username: '', password: '' });
  const [errAdmin, setErrAdmin]       = useState('');

  useEffect(() => {
    fetch(`${API_URL}/savean/usuarios`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => setSaveanUsers(data.usuarios ?? []))
      .catch((err: unknown) => setErrAdmin(`No se pudieron cargar los inspectores: ${err instanceof Error ? err.message : 'Error desconocido'}`));
  }, []);

  const barreristasActivos = barreristas.filter(b => b.activo);

  const handleAddBarrerista = async () => {
    if (!formBr.nombre.trim() || !formBr.usuario.trim()) { setErrBr('Nombre y usuario son obligatorios.'); return; }
    if (!formBr.contrasena.trim() || formBr.contrasena.length < 4) { setErrBr('La contraseña debe tener al menos 4 caracteres.'); return; }
    try {
      await agregarBarrerista({ nombre: formBr.nombre.trim(), usuario: formBr.usuario.trim().toLowerCase(), contrasena: formBr.contrasena, activo: true });
      setFormBr({ nombre: '', usuario: '', contrasena: '' });
      setErrBr('');
    } catch (err: any) {
      setErrBr(err?.message || 'Error al crear el barrerista.');
    }
  };

  const handleMigrar = async () => {
    if (!window.confirm('Esta acción creará cuentas de acceso para todos los barreristas que aún no tengan una. ¿Continuar?')) return;
    setMigrando(true); setMigResult(null); setErrBr('');
    try {
      const res = await fetch(`${API_URL}/savean/barreristas/migrar-inspectores`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) { setErrBr(data?.error ?? `Error del servidor (${res.status}).`); return; }
      setMigResult({ total: data.total ?? 0, creados: data.creados ?? [], saltados: data.saltados ?? [], errores: data.errores ?? [] });
    } catch {
      setErrBr('Error de conexión al migrar.');
    } finally {
      setMigrando(false);
    }
  };

  const handleAddInspector = async () => {
    if (!formAdmin.nombre.trim() || !formAdmin.username.trim() || !formAdmin.password.trim()) {
      setErrAdmin('Todos los campos son obligatorios.'); return;
    }
    try {
      const res = await fetch(`${API_URL}/savean/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ nombre: formAdmin.nombre.trim(), username: formAdmin.username.trim(), password: formAdmin.password }),
      });
      const data = await res.json();
      if (!res.ok) { setErrAdmin(data.error ?? 'Error al crear usuario.'); return; }
      setSaveanUsers(prev => [...prev, data]);
      setFormAdmin({ nombre: '', username: '', password: '' });
      setErrAdmin('');
    } catch {
      setErrAdmin('Error de conexión.');
    }
  };

  const handleDeleteUser = async (usuarioId: string) => {
    try {
      const res = await fetch(`${API_URL}/savean/usuarios/${usuarioId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({})) as { error?: string };
        setErrAdmin(errBody.error || 'No se pudo eliminar el usuario.'); return;
      }
      setSaveanUsers(prev => prev.filter(u => u.usuarioId !== usuarioId));
    } catch {
      setErrAdmin('Error de conexión al eliminar el usuario.');
    }
  };

  return (
    <div className="space-y-4 text-sm">
      <div className="bg-white border border-gray-200">

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {([
            { key: 'barreristas' as const, label: 'Barreristas', icon: <Users size={13} />, count: barreristasActivos.length },
            { key: 'inspectores' as const, label: 'Inspectores',  icon: <UserPlus size={13} />, count: saveanUsers.length },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide transition border-b-2 -mb-px ${
                tab === t.key ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.icon}{t.label}
              <span className="ml-1 bg-gray-200 text-gray-600 text-xs px-1.5 py-0.5 rounded font-bold">{t.count}</span>
            </button>
          ))}
        </div>

        <div className="p-4">

          {/* ── Tab: Barreristas ── */}
          {tab === 'barreristas' && (
            <div className="space-y-4">

              <div className="border border-gray-200 p-3 bg-gray-50 rounded">
                <p className="text-xs text-gray-700 font-semibold mb-1">Crear cuentas de inspector para barreristas existentes</p>
                <p className="text-xs text-gray-500 mb-2">Asigna acceso al sistema usando el nombre de usuario como contraseña inicial.</p>
                <button onClick={handleMigrar} disabled={migrando}
                  className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-300 text-white text-xs font-semibold px-4 py-1.5 rounded transition">
                  {migrando ? 'Creando cuentas...' : '⚡ Crear cuentas para todos'}
                </button>
                {migResult && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-gray-600">
                      Total: <strong>{migResult.total}</strong> · Creados: <strong className="text-green-700">{migResult.creados.length}</strong> · Ya tenían: <strong>{migResult.saltados.length}</strong>
                      {migResult.errores.length > 0 && <> · <strong className="text-red-600">{migResult.errores.length} con error</strong></>}
                    </p>
                    {migResult.creados.length > 0 && (
                      <div className="bg-white border border-green-200 rounded p-2 max-h-40 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead><tr className="text-gray-400 border-b"><th className="text-left pb-1">Nombre</th><th className="text-left pb-1">Usuario</th><th className="text-left pb-1">Contraseña inicial</th></tr></thead>
                          <tbody>
                            {migResult.creados.map(c => (
                              <tr key={c.usuario} className="border-b border-gray-50">
                                <td className="py-1 text-gray-800">{c.nombre}</td>
                                <td className="py-1 font-mono text-gray-600">{c.usuario}</td>
                                <td className="py-1 font-mono text-gray-800 font-semibold">{c.reparado ? '(sin cambio)' : c.contrasena}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {migResult.errores.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded p-2 max-h-32 overflow-y-auto space-y-1">
                        {migResult.errores.map((e, i) => (
                          <p key={i} className="text-xs text-red-700"><strong>{e.nombre}</strong>: {e.error}</p>
                        ))}
                      </div>
                    )}
                    {migResult.total === 0 && (
                      <p className="text-xs text-amber-700 font-semibold">⚠ No se encontraron barreristas en la base de datos.</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">Agregar nuevo barrerista</p>
                <div className="flex flex-wrap gap-2">
                  <input type="text" placeholder="Nombre completo" value={formBr.nombre} onChange={e => setFormBr({ ...formBr, nombre: e.target.value })} className={inputCls} />
                  <input type="text" placeholder="Usuario" value={formBr.usuario} onChange={e => setFormBr({ ...formBr, usuario: e.target.value.toLowerCase().replace(/\s/g, '') })} className={inputCls} />
                  <input type="password" placeholder="Contraseña" value={formBr.contrasena} onChange={e => setFormBr({ ...formBr, contrasena: e.target.value })} className={inputCls} />
                  <button onClick={handleAddBarrerista} className={btnPrimary}><Plus size={12} /> Agregar</button>
                </div>
                {errBr && <p className="text-xs text-red-600 mt-1">{errBr}</p>}
              </div>

              <div>
                <button onClick={() => setVerListaBr(v => !v)}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition">
                  {verListaBr ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  {verListaBr ? 'Ocultar lista' : `Ver todos los barreristas (${barreristasActivos.length})`}
                </button>
                {verListaBr && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-xs border border-gray-200">
                      <thead className="bg-gray-50">
                        <tr className="text-gray-500 border-b border-gray-200">
                          <th className="text-left px-3 py-2 font-semibold">Nombre</th>
                          <th className="text-left px-3 py-2 font-semibold">Usuario</th>
                          <th className="text-left px-3 py-2 font-semibold">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {barreristasActivos.map((b, i) => (
                          <tr key={b.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-2 text-gray-800 font-medium">{b.nombre}</td>
                            <td className="px-3 py-2 text-gray-500 font-mono">{b.usuario}</td>
                            <td className="px-3 py-2">
                              <button onClick={async () => { try { await eliminarBarrerista(b.id); } catch (err: unknown) { setErrBr(err instanceof Error ? err.message : 'No se pudo eliminar.'); }}} className={btnDanger}>
                                <Trash2 size={11} /> Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Inspectores ── */}
          {tab === 'inspectores' && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">Agregar nuevo inspector (acceso con usuario y contraseña)</p>
                <div className="flex flex-wrap gap-2">
                  <input type="text" placeholder="Nombre completo" value={formAdmin.nombre} onChange={e => setFormAdmin({ ...formAdmin, nombre: e.target.value })} className={inputCls} />
                  <input type="text" placeholder="Nombre de usuario" value={formAdmin.username} onChange={e => setFormAdmin({ ...formAdmin, username: e.target.value.toLowerCase().replace(/\s/g, '') })} className={inputCls} />
                  <input type="password" placeholder="Contraseña" value={formAdmin.password} onChange={e => setFormAdmin({ ...formAdmin, password: e.target.value })} className={inputCls} />
                  <button onClick={handleAddInspector} className={btnPrimary}><Plus size={12} /> Agregar</button>
                </div>
                {errAdmin && <p className="text-xs text-red-600 mt-1">{errAdmin}</p>}
              </div>

              <div>
                <button onClick={() => setVerListaInsp(v => !v)}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition">
                  {verListaInsp ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  {verListaInsp ? 'Ocultar lista' : `Ver todos los inspectores (${saveanUsers.length})`}
                </button>
                {verListaInsp && (
                  <div className="mt-3 overflow-x-auto">
                    {saveanUsers.length === 0 ? (
                      <p className="text-gray-400 text-xs py-2">Sin inspectores registrados.</p>
                    ) : (
                      <table className="w-full text-xs border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr className="text-gray-500 border-b border-gray-200">
                            <th className="text-left px-3 py-2 font-semibold">Nombre</th>
                            <th className="text-left px-3 py-2 font-semibold">Usuario</th>
                            <th className="text-left px-3 py-2 font-semibold">Rol</th>
                            <th className="text-left px-3 py-2 font-semibold">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {saveanUsers.map((u, i) => (
                            <tr key={u.usuarioId} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-3 py-2 text-gray-800 font-medium">{u.nombre}</td>
                              <td className="px-3 py-2 text-gray-500 font-mono">{u.username || u.email.replace('@savean.local', '')}</td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${u.rol === 'admin' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'}`}>
                                  {u.rol === 'admin' ? 'Director' : 'Inspector'}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                {u.usuarioId !== usuario?.usuarioId && (
                                  <button onClick={() => handleDeleteUser(u.usuarioId)} className={btnDanger}>
                                    <Trash2 size={11} /> Eliminar
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
