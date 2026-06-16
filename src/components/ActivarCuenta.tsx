import { useState, useEffect } from 'react';
import { CheckCircle2, Lock, Eye, EyeOff, AlertCircle, Building2, Loader2 } from 'lucide-react';
import { RolSistema, Modulo } from '../types/auth';

interface UsuarioPendiente {
  nombre: string;
  email: string;
  rol: RolSistema;
  modulo: Modulo;
}

interface Props {
  token: string;
}

export function ActivarCuenta({ token }: Props) {
  const apiUrl = (import.meta.env as Record<string, string>).VITE_API_URL;

  const [usuarioPendiente, setUsuarioPendiente] = useState<UsuarioPendiente | null | 'invalid' | 'expired'>(null);
  const [pass, setPass] = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState('');
  const [activado, setActivado] = useState(false);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    async function fetchInvitacion() {
      try {
        const res = await fetch(`${apiUrl}/auth/invitacion/${token}`);
        if (res.status === 410) { setUsuarioPendiente('expired'); return; }
        if (!res.ok) { setUsuarioPendiente('invalid'); return; }
        const data = await res.json();
        setUsuarioPendiente({ nombre: data.nombre, email: data.email, rol: data.rol, modulo: data.modulo });
      } catch {
        setUsuarioPendiente('invalid');
      }
    }
    fetchInvitacion();
  }, [token, apiUrl]);

  const handleActivar = async () => {
    setErr('');
    if (pass.length < 6) { setErr('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (pass !== passConfirm) { setErr('Las contraseñas no coinciden.'); return; }

    setProcesando(true);
    try {
      const res = await fetch(`${apiUrl}/auth/activar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: pass }),
      });

      if (res.status === 404) { setErr('Token inválido o ya utilizado.'); return; }
      if (res.status === 410) { setErr('El link expiró. Pedile al administrador que te reenvíe la invitación.'); return; }
      if (!res.ok) { setErr('Error al activar la cuenta. Intentá de nuevo.'); return; }

      const data = await res.json();
      localStorage.setItem('sc_token', data.token);
      localStorage.setItem('sc_sesion', JSON.stringify({
        usuarioId: data.usuario.usuarioId,
        email: data.usuario.email,
        nombre: data.usuario.nombre,
        rol: data.usuario.rol,
        modulo: data.usuario.modulo ?? 'tickets',
      }));

      setActivado(true);
      setTimeout(() => {
        window.location.replace(window.location.pathname);
      }, 1500);
    } catch {
      setErr('Error de conexión. Intentá de nuevo.');
    } finally {
      setProcesando(false);
    }
  };

  if (usuarioPendiente === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 size={32} className="text-violet-400 animate-spin" />
      </div>
    );
  }

  if (usuarioPendiente === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
          <AlertCircle size={48} className="text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Link expirado</h2>
          <p className="text-gray-500 text-sm">
            Este link de activación expiró. Contactá al administrador para que te reenvíe la invitación.
          </p>
        </div>
      </div>
    );
  }

  if (usuarioPendiente === 'invalid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Link inválido</h2>
          <p className="text-gray-500 text-sm">
            Este link de activación ya fue utilizado o no es válido. Contactá al administrador.
          </p>
        </div>
      </div>
    );
  }

  if (activado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
          <CheckCircle2 size={56} className="text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">¡Cuenta activada!</h2>
          <p className="text-gray-500 text-sm mb-4">
            Tu contraseña fue creada correctamente. Estás siendo redirigido...
          </p>
          <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-medium">
            <Loader2 size={16} className="animate-spin" />
            Ingresando al sistema...
          </div>
        </div>
      </div>
    );
  }

  const u = usuarioPendiente;
  const sistemaLabel = u.modulo === 'savean' ? 'SAVEAN — Guías de Origen' : 'Sistema de Tickets';
  const rolLabel =
    u.modulo === 'savean'
      ? u.rol === 'admin' ? 'Director / Agencia' : 'Inspector Barrerista'
      : u.rol === 'admin' ? 'Administrador' : 'Usuario';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl overflow-hidden">

          <div className="bg-gradient-to-r from-slate-800 to-violet-900 px-8 py-10">
            <div className="flex items-center justify-center mb-5">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur">
                <Building2 size={32} className="text-white" />
              </div>
            </div>
            <h1 className="text-center text-2xl font-bold text-white mb-1">
              Activá tu cuenta
            </h1>
            <p className="text-center text-sm text-slate-300">
              Agencia de Calidad San Juan
            </p>
          </div>

          <div className="px-8 py-8 space-y-5">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">Nombre</span>
                <span className="text-sm font-semibold text-slate-800">{u.nombre}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">Email</span>
                <span className="text-sm font-mono text-slate-700">{u.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">Sistema</span>
                <span className="text-sm font-semibold text-violet-700">{sistemaLabel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">Rol</span>
                <span className="text-sm text-slate-700">{rolLabel}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Crear contraseña
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3.5 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-9 pr-10 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Confirmar contraseña
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3.5 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={passConfirm}
                  onChange={(e) => setPassConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleActivar()}
                  placeholder="Repetí tu contraseña"
                  className="w-full pl-9 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition text-sm"
                />
              </div>
            </div>

            {err && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                <AlertCircle size={15} /> {err}
              </div>
            )}

            <button
              onClick={handleActivar}
              disabled={procesando}
              className="w-full bg-gradient-to-r from-slate-800 to-violet-700 hover:from-slate-700 hover:to-violet-600 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition shadow-lg flex items-center justify-center gap-2"
            >
              {procesando ? (
                <><Loader2 size={16} className="animate-spin" /> Activando...</>
              ) : (
                <><CheckCircle2 size={16} /> Activar cuenta y entrar</>
              )}
            </button>
          </div>

          <div className="bg-slate-50 px-8 py-3 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-400">© 2024 Agencia Calidad San Juan · Ministerio de Producción</p>
          </div>
        </div>
      </div>
    </div>
  );
}
