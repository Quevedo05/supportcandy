import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Plus, Trash2, RefreshCw, KeyRound, X, Check, Shield, QrCode, Activity, Truck } from 'lucide-react';

const API_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:3000/api';
function getToken() { return localStorage.getItem('sc_token') || ''; }

const inputCls = 'flex-1 min-w-24 border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-400';

type RolId = 'admin' | 'inspector' | 'sanidad' | 'punto_control';

const ROLES = [
  {
    id: 'admin' as RolId,
    label: 'Administrador',
    badge: 'bg-gray-900 text-white',
    Icon: Shield,
    description: 'Acceso total al sistema SAVEAN. Gestiona usuarios, barreras, configuración y todos los paneles operativos.',
    secciones: ['Inicio', 'Salida', 'Entrada', 'Configuración'],
  },
  {
    id: 'inspector' as RolId,
    label: 'Inspector',
    badge: 'bg-gray-200 text-gray-800',
    Icon: QrCode,
    description: 'Opera en barreras fitosanitarias. Escanea guías de tránsito mediante QR, verifica y deniega el ingreso de transportes.',
    secciones: ['Salida · Panel de Guías'],
  },
  {
    id: 'sanidad' as RolId,
    label: 'Sanidad',
    badge: 'bg-gray-200 text-gray-800',
    Icon: Activity,
    description: 'Gestiona y registra actas de ingreso de productos cárnicos y vegetales. Accede a informes sanitarios y PDFs de control.',
    secciones: ['Entrada · Cárnicos', 'Entrada · Vegetales'],
  },
  {
    id: 'punto_control' as RolId,
    label: 'Punto de Control',
    badge: 'bg-gray-200 text-gray-800',
    Icon: Truck,
    description: 'Monitorea transportes en tránsito. Gestiona movimientos en puntos de control y accede a actas cárnicas asociadas.',
    secciones: ['Punto de Control · En Tránsito'],
  },
];

function getRolConfig(rol: string) {
  return ROLES.find(r => r.id === rol) ?? ROLES[1];
}

interface SaveanUser {
  usuarioId: string;
  nombre: string;
  email: string;
  username: string;
  rol: string;
  activo: boolean;
}

// ── Inline: cambio de contraseña ───────────────────────────────────────────────
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
      if (!res.ok) { const d = await res.json().catch(() => ({})) as { error?: string }; setErr(d.error || 'Error.'); return; }
      setOk(true);
      setTimeout(onDone, 1200);
    } catch { setErr('Error de conexión.'); }
    finally { setLoading(false); }
  };

  if (ok) return (
    <td colSpan={4} className="px-3 py-2 text-green-700 text-xs font-semibold">✓ Contraseña actualizada</td>
  );

  return (
    <td colSpan={4} className="px-3 py-2">
      <div className="flex items-center gap-2 flex-wrap">
        <input autoFocus type="password" placeholder="Nueva contraseña"
          value={pass} onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleReset()}
          className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-gray-400 w-44"
        />
        <button onClick={handleReset} disabled={loading}
          className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-300 text-white text-xs font-semibold px-3 py-1 rounded transition">
          <Check size={11} /> {loading ? '...' : 'Guardar'}
        </button>
        <button onClick={onDone} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
        {err && <span className="text-red-600 text-xs">{err}</span>}
      </div>
    </td>
  );
}

// ── Inline: cambio de rol ──────────────────────────────────────────────────────
function ChangeRoleRow({ usuarioId, currentRol, onDone, onCancel }: {
  usuarioId: string; currentRol: string; onDone: (newRol: string) => void; onCancel: () => void;
}) {
  const [rol, setRol]         = useState<RolId>(currentRol as RolId);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');
  const [ok, setOk]           = useState(false);

  const handleSave = async () => {
    if (rol === currentRol) { onCancel(); return; }
    setLoading(true); setErr('');
    try {
      const res = await fetch(`${API_URL}/savean/usuarios/${usuarioId}/rol`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ rol }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})) as { error?: string }; setErr(d.error || 'Error.'); return; }
      setOk(true);
      setTimeout(() => onDone(rol), 1200);
    } catch { setErr('Error de conexión.'); }
    finally { setLoading(false); }
  };

  if (ok) return (
    <td colSpan={4} className="px-3 py-2 text-green-700 text-xs font-semibold">✓ Rol actualizado</td>
  );

  return (
    <td colSpan={4} className="px-3 py-2">
      <div className="flex items-center gap-2 flex-wrap">
        <select value={rol} onChange={e => setRol(e.target.value as RolId)}
          className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-gray-400">
          {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <button onClick={handleSave} disabled={loading}
          className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-300 text-white text-xs font-semibold px-3 py-1 rounded transition">
          <Check size={11} /> {loading ? '...' : 'Guardar'}
        </button>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
        {err && <span className="text-red-600 text-xs">{err}</span>}
      </div>
    </td>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export function SaveanUsuarios() {
  const { usuario } = useAuth();

  const [users, setUsers]         = useState<SaveanUser[]>([]);
  const [loading, setLoading]     = useState(true);
  const [err, setErr]             = useState('');
  const [form, setForm]           = useState({ nombre: '', username: '', password: '', email: '', rol: 'inspector' as RolId });
  const [guardando, setGuardando] = useState(false);
  const [inlineAction, setInlineAction] = useState<{ type: 'password' | 'rol'; id: string } | null>(null);

  const cargar = () => {
    setLoading(true); setErr('');
    fetch(`${API_URL}/savean/usuarios`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => setUsers(data.usuarios ?? []))
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Error al cargar usuarios'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const [modoCreacion, setModoCreacion] = useState<'inspector' | 'invitacion'>('inspector');

  const handleAgregar = async () => {
    if (!form.nombre.trim()) { setErr('El nombre es obligatorio.'); return; }
    if (modoCreacion === 'invitacion') {
      if (!form.email.trim()) { setErr('El email es obligatorio.'); return; }
    } else {
      if (!form.username.trim() || !form.password.trim()) { setErr('Usuario y contraseña son obligatorios.'); return; }
      if (form.password.length < 4) { setErr('La contraseña debe tener al menos 4 caracteres.'); return; }
    }
    setGuardando(true); setErr('');
    try {
      const payload = modoCreacion === 'invitacion'
        ? { nombre: form.nombre.trim(), email: form.email.trim(), rol: form.rol }
        : { nombre: form.nombre.trim(), username: form.username.trim(), password: form.password, rol: 'inspector' };
      const res = await fetch(`${API_URL}/savean/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? 'Error al crear el usuario.'); return; }
      setUsers(prev => [...prev, data]);
      setForm({ nombre: '', username: '', password: '', email: '', rol: form.rol });
    } catch { setErr('Error de conexión.'); }
    finally { setGuardando(false); }
  };

  const handleEliminar = async (usuarioId: string) => {
    setErr('');
    try {
      const res = await fetch(`${API_URL}/savean/usuarios/${usuarioId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})) as { error?: string }; setErr(d.error || 'No se pudo eliminar.'); return; }
      setUsers(prev => prev.filter(u => u.usuarioId !== usuarioId));
    } catch { setErr('Error de conexión.'); }
  };

  const handleRolUpdated = (usuarioId: string, newRol: string) => {
    setUsers(prev => prev.map(u => u.usuarioId === usuarioId ? { ...u, rol: newRol } : u));
    setInlineAction(null);
  };

  return (
    <div className="space-y-6 text-sm">

      {/* ── Tarjetas de roles del sistema ── */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Roles del sistema</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {ROLES.map(r => {
            const Icon = r.Icon;
            return (
              <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="bg-gray-100 rounded-lg p-2 shrink-0">
                    <Icon size={15} className="text-gray-600" />
                  </div>
                  <p className="font-bold text-sm text-gray-900">{r.label}</p>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{r.description}</p>
                <div className="flex flex-wrap gap-1">
                  {r.secciones.map(s => (
                    <span key={s} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Crear nuevo usuario ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

        {/* Toggle de modo */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => { setModoCreacion('inspector'); setErr(''); setForm(f => ({ ...f, email: '', rol: 'admin' as RolId })); }}
            className={`flex-1 py-2.5 text-xs font-semibold transition ${
              modoCreacion === 'inspector'
                ? 'bg-white text-gray-900 border-b-2 border-gray-900 -mb-px'
                : 'bg-gray-50 text-gray-400 hover:text-gray-600'
            }`}
          >
            Inspector (cuenta local)
          </button>
          <button
            onClick={() => { setModoCreacion('invitacion'); setErr(''); setForm(f => ({ ...f, username: '', password: '', rol: 'admin' as RolId })); }}
            className={`flex-1 py-2.5 text-xs font-semibold transition ${
              modoCreacion === 'invitacion'
                ? 'bg-white text-gray-900 border-b-2 border-gray-900 -mb-px'
                : 'bg-gray-50 text-gray-400 hover:text-gray-600'
            }`}
          >
            Invitar por email
          </button>
        </div>

        <div className="p-4 space-y-3">
          {modoCreacion === 'inspector' ? (
            <>
              <p className="text-xs text-gray-400">Crea una cuenta local para un inspector de barrera. El acceso es con nombre de usuario y contraseña.</p>
              <div className="flex flex-wrap gap-2">
                <input type="text" placeholder="Nombre completo"
                  value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                  className={inputCls}
                />
                <input type="text" placeholder="Usuario (sin @)"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '').replace(/@.*$/, '') })}
                  className={inputCls}
                />
                <input type="password" placeholder="Contraseña"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  className={inputCls}
                />
                <button onClick={handleAgregar} disabled={guardando}
                  className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold px-4 py-1.5 rounded transition whitespace-nowrap">
                  <Plus size={12} /> {guardando ? 'Guardando...' : 'Agregar inspector'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-400">Asigná el rol, ingresá el email y enviá la invitación. El usuario recibirá un link para crear su contraseña.</p>

              {/* Selector de rol — explícito dentro del formulario de invitación */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Rol a asignar</p>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.filter(r => r.id !== 'inspector').map(r => {
                    const Icon = r.Icon;
                    const selected = form.rol === r.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => setForm({ ...form, rol: r.id })}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition ${
                          selected
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        <Icon size={13} className={selected ? 'text-white' : 'text-gray-400'} />
                        <span className="text-xs font-semibold truncate">{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <input type="text" placeholder="Nombre completo"
                  value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                  className={inputCls}
                />
                <input type="email" placeholder="Email del usuario"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value.trim() })}
                  className={inputCls}
                />
                <button onClick={handleAgregar} disabled={guardando}
                  className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold px-4 py-1.5 rounded transition whitespace-nowrap">
                  <Plus size={12} /> {guardando ? 'Enviando...' : 'Enviar invitación'}
                </button>
              </div>
            </>
          )}

          {err && <p className="text-xs text-red-600">{err}</p>}
        </div>
      </div>

      {/* ── Lista de usuarios ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Usuarios registrados ({users.length})
          </p>
          <button onClick={cargar} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition">
            <RefreshCw size={11} /> Actualizar
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-gray-400 py-4">Cargando...</p>
        ) : users.length === 0 ? (
          <p className="text-xs text-gray-400 py-4">Sin usuarios registrados.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-gray-500">
                  <th className="text-left px-4 py-2.5 font-semibold">Nombre</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Usuario</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Rol</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => {
                  const rolConf = getRolConfig(u.rol);
                  const isSelf  = u.usuarioId === usuario?.usuarioId;
                  const editing = inlineAction?.id === u.usuarioId;

                  if (editing && inlineAction?.type === 'password') {
                    return (
                      <tr key={u.usuarioId} className="bg-amber-50 border-b border-amber-100">
                        <ResetPasswordRow usuarioId={u.usuarioId} onDone={() => setInlineAction(null)} />
                      </tr>
                    );
                  }

                  if (editing && inlineAction?.type === 'rol') {
                    return (
                      <tr key={u.usuarioId} className="bg-blue-50 border-b border-blue-100">
                        <ChangeRoleRow
                          usuarioId={u.usuarioId}
                          currentRol={u.rol}
                          onDone={(newRol) => handleRolUpdated(u.usuarioId, newRol)}
                          onCancel={() => setInlineAction(null)}
                        />
                      </tr>
                    );
                  }

                  return (
                    <tr key={u.usuarioId} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-4 py-2.5 text-gray-800 font-medium">
                        {u.nombre}
                        {isSelf && <span className="ml-2 text-[10px] text-gray-400 font-normal">(yo)</span>}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 font-mono">
                        {(u.username || u.email).replace(/@.*$/, '')}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${rolConf.badge}`}>
                          {rolConf.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {!isSelf && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setInlineAction({ type: 'password', id: u.usuarioId })}
                              className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded transition"
                              title="Cambiar contraseña"
                            >
                              <KeyRound size={11} /> Contraseña
                            </button>
                            <button
                              onClick={() => setInlineAction({ type: 'rol', id: u.usuarioId })}
                              className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded transition"
                              title="Cambiar rol"
                            >
                              <Shield size={11} /> Rol
                            </button>
                            {u.rol !== 'admin' && (
                              <button onClick={() => handleEliminar(u.usuarioId)}
                                className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold px-2.5 py-1 rounded transition"
                                title="Eliminar usuario"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
