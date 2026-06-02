import { useState } from 'react';
import emailjs from '@emailjs/browser';
import { useAuth } from '../context/AuthContext';
import { Usuario } from '../types/auth';
import { EMAILJS_CONFIG } from '../config/emailjs';
import {
  LogOut, Plus, Copy, Mail, Trash2, CheckCircle2, Clock,
  Users, Shield, Code2, ToggleLeft, ToggleRight, X,
  AlertCircle, Settings,
} from 'lucide-react';

// ─── Ticket stages — must match TicketEstado in AgenciaCalidadDashboard ──────
const ETAPAS_TICKETS: { value: string; label: string; desc: string }[] = [
  { value: 'Solicitud inicial',          label: 'Solicitud inicial',          desc: 'Tickets recién ingresados' },
  { value: 'Revisión de documentación',  label: 'Revisión de documentación',  desc: 'Verificación de documentos adjuntos' },
  { value: 'Veraz',                      label: 'Veraz',                      desc: 'Consulta al sistema Veraz' },
  { value: 'Comité de análisis',         label: 'Comité de análisis',         desc: 'Evaluación por comité' },
  { value: 'Contrato',                   label: 'Contrato',                   desc: 'Generación del contrato' },
  { value: 'Simulador',                  label: 'Simulador',                  desc: 'Simulación del crédito' },
  { value: 'Firma de contrato',          label: 'Firma de contrato',          desc: 'Firma del beneficiario' },
  { value: 'Certificación de firma',     label: 'Certificación de firma',     desc: 'Certificación notarial' },
  { value: 'Transferencia',             label: 'Transferencia',              desc: 'Acreditación del monto' },
  { value: 'Seguimiento de verificable', label: 'Seguimiento de verificable', desc: 'Seguimiento posterior' },
  { value: 'Cerrado',                    label: 'Cerrado',                    desc: 'Tramitación finalizada' },
];

const emailjsConfigurado =
  EMAILJS_CONFIG.serviceId !== 'REEMPLAZAR_CON_SERVICE_ID' &&
  EMAILJS_CONFIG.templateId !== 'REEMPLAZAR_CON_TEMPLATE_ID' &&
  EMAILJS_CONFIG.publicKey !== 'REEMPLAZAR_CON_PUBLIC_KEY';

// ─── helpers ─────────────────────────────────────────────────────────────────
function activationUrl(token: string) {
  return `${window.location.origin}${window.location.pathname}?activar=${token}`;
}

function rolLabel(rol: string, modulo: string) {
  if (modulo === 'savean') return rol === 'admin' ? 'Director / Agencia' : 'Inspector Barrerista';
  return rol === 'admin' ? 'Administrador Tickets' : 'Usuario Tickets';
}

function etapasLabel(etapas?: string[]): string {
  if (!etapas?.length) return '';
  return etapas
    .map(e => ETAPAS_TICKETS.find(t => t.value === e)?.label ?? e)
    .join(', ');
}

async function enviarEmailActivacion(u: Usuario, token: string): Promise<'ok' | 'sin-config' | 'error'> {
  if (!emailjsConfigurado) return 'sin-config';

  const sistemaLabel = u.modulo === 'savean' ? 'SAVEAN — Guías de Origen' : 'Sistema de Tickets';
  const etapas = etapasLabel(u.etapasAsignadas);

  try {
    await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      {
        to_name: u.nombre,
        to_email: u.email,
        activation_link: activationUrl(token),
        sistema_label: sistemaLabel,
        rol_label: rolLabel(u.rol, u.modulo),
        etapas_label: etapas ? `Etapas asignadas: ${etapas}` : '',
      },
      EMAILJS_CONFIG.publicKey,
    );
    return 'ok';
  } catch {
    return 'error';
  }
}

function mailtoFallback(u: Usuario, token: string): string {
  const link = activationUrl(token);
  const sistemaLabel = u.modulo === 'savean' ? 'SAVEAN — Guías de Origen' : 'Sistema de Tickets';
  const etapas = etapasLabel(u.etapasAsignadas);
  const subject = encodeURIComponent('Acceso al Sistema de Gestión — Agencia Calidad San Juan');
  const body = encodeURIComponent(
    `Hola ${u.nombre},\n\n` +
    `Se ha creado tu acceso al Sistema de Gestión de la Agencia de Calidad San Juan.\n\n` +
    `Para activar tu cuenta y crear tu contraseña, ingresá al siguiente enlace:\n\n` +
    `${link}\n\n` +
    `Tu email de acceso es: ${u.email}\n` +
    `Sistema asignado: ${sistemaLabel}\n` +
    `Rol: ${rolLabel(u.rol, u.modulo)}\n` +
    (etapas ? `Etapas asignadas: ${etapas}\n` : '') +
    `\nSi tenés algún problema, contactá al administrador del sistema.\n\n` +
    `Agencia de Calidad San Juan`,
  );
  return `mailto:${u.email}?subject=${subject}&body=${body}`;
}

const ROL_OPTIONS: Record<string, { value: string; label: string }[]> = {
  tickets: [
    { value: 'admin',       label: 'Administrador' },
    { value: 'contribuidor', label: 'Contribuidor (por etapas)' },
  ],
  savean: [
    { value: 'admin',     label: 'Director / Agencia' },
    { value: 'inspector', label: 'Inspector Barrerista' },
  ],
};

// ─── main ─────────────────────────────────────────────────────────────────────
export function DevPanel() {
  const { usuario, usuarios, logout, crearInvitado, eliminarUsuario, toggleActivoUsuario } = useAuth();

  const [form, setForm] = useState({
    nombre: '', email: '',
    modulo: 'tickets' as 'tickets' | 'savean',
    rol: 'contribuidor',
    etapasAsignadas: [] as string[],
  });
  const [errForm, setErrForm] = useState('');
  const [envioEstado, setEnvioEstado] = useState<Record<string, 'sending' | 'ok' | 'sin-config' | 'error'>>({});
  const [copiado, setCopiado] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const listaUsuarios = usuarios.filter(u => u.rol !== 'dev');
  const pendientes  = listaUsuarios.filter(u => !u.activado).length;
  const activos     = listaUsuarios.filter(u => u.activado && u.activo).length;

  const handleModuloChange = (m: 'tickets' | 'savean') => {
    setForm({ ...form, modulo: m, rol: ROL_OPTIONS[m][0].value, etapasAsignadas: [] });
  };

  const toggleEtapa = (e: string) => {
    setForm(prev => ({
      ...prev,
      etapasAsignadas: prev.etapasAsignadas.includes(e)
        ? prev.etapasAsignadas.filter(x => x !== e)
        : [...prev.etapasAsignadas, e],
    }));
  };

  const handleCrear = async () => {
    setErrForm('');
    if (!form.nombre.trim())                       { setErrForm('El nombre es obligatorio.');     return; }
    if (!form.email.includes('@'))                 { setErrForm('Email inválido.');                return; }
    if (usuarios.some(u => u.email === form.email.trim())) { setErrForm('Email ya registrado.'); return; }
    if (form.modulo === 'tickets' && form.rol === 'contribuidor' && form.etapasAsignadas.length === 0) {
      setErrForm('Seleccioná al menos una etapa para el contribuidor.');
      return;
    }

    const token = crearInvitado({
      nombre: form.nombre.trim(),
      email:  form.email.trim(),
      modulo: form.modulo,
      rol:    form.rol as Usuario['rol'],
      etapasAsignadas: form.modulo === 'tickets' && form.rol === 'contribuidor'
        ? form.etapasAsignadas
        : undefined,
    });

    // Find the newly created user to get their full info for the email
    const nuevoUsuario = usuarios.find(u => u.tokenActivacion === token) ?? {
      nombre: form.nombre.trim(), email: form.email.trim(),
      modulo: form.modulo, rol: form.rol as Usuario['rol'],
      etapasAsignadas: form.etapasAsignadas,
    } as Usuario;

    // Send email
    setEnvioEstado(prev => ({ ...prev, [token]: 'sending' }));
    const resultado = await enviarEmailActivacion(nuevoUsuario, token);
    setEnvioEstado(prev => ({ ...prev, [token]: resultado }));

    setForm({ nombre: '', email: '', modulo: 'tickets', rol: 'contribuidor', etapasAsignadas: [] });
  };

  const copiarLink = (token: string, id: string) => {
    navigator.clipboard.writeText(activationUrl(token));
    setCopiado(id);
    setTimeout(() => setCopiado(null), 2000);
  };

  const handleEnviarMail = async (u: Usuario) => {
    if (!u.tokenActivacion) return;
    setEnvioEstado(prev => ({ ...prev, [u.id]: 'sending' }));
    const res = await enviarEmailActivacion(u, u.tokenActivacion);
    setEnvioEstado(prev => ({ ...prev, [u.id]: res }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* ── Header ── */}
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-violet-600 p-2 rounded-lg">
              <Code2 size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-tight">Panel de Desarrollador</h1>
              <p className="text-xs text-slate-400">Sistema de Gestión — Agencia Calidad San Juan</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* EmailJS status indicator */}
            <div className={`flex items-center gap-1.5 text-xs ${emailjsConfigurado ? 'text-emerald-400' : 'text-amber-400'}`}>
              <Settings size={12} />
              {emailjsConfigurado ? 'EmailJS activo' : 'EmailJS sin configurar'}
            </div>
            <span className="text-xs text-slate-500 hidden sm:block">{usuario?.email}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition"
            >
              <LogOut size={14} /> Salir
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ── EmailJS warning ── */}
        {!emailjsConfigurado && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3">
            <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-amber-300 font-semibold mb-1">EmailJS no configurado — los mails no se envían automáticamente</p>
              <p className="text-slate-400 text-xs">
                Editá <code className="bg-slate-900 px-1 rounded text-slate-300">src/config/emailjs.ts</code> con
                tus credenciales de emailjs.com. Mientras tanto usá el botón "mailto:" para enviar manualmente.
              </p>
            </div>
          </div>
        )}

        {/* ── KPIs ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Usuarios creados', value: listaUsuarios.length, color: 'bg-violet-600' },
            { label: 'Activos con acceso', value: activos, color: 'bg-emerald-600' },
            { label: 'Pendientes de activar', value: pendientes, color: 'bg-amber-500' },
          ].map(k => (
            <div key={k.label} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
              <div className={`${k.color} p-2.5 rounded-lg flex-shrink-0`}>
                <Users size={18} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-white">{k.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{k.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Create user form ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Plus size={16} className="text-violet-400" />
            <h2 className="font-bold text-white text-sm uppercase tracking-wide">Crear nuevo usuario</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Nombre completo</label>
              <input type="text" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                placeholder="Juan García"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                placeholder="juan@agencia.gob.ar"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Sistema</label>
              <select value={form.modulo} onChange={e => handleModuloChange(e.target.value as 'tickets' | 'savean')}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
                <option value="tickets">Sistema de Tickets</option>
                <option value="savean">SAVEAN — Guías de Origen</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Rol</label>
              <select value={form.rol} onChange={e => setForm({...form, rol: e.target.value, etapasAsignadas: []})}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
                {ROL_OPTIONS[form.modulo].map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Stage selector (only for tickets contributor) ── */}
          {form.modulo === 'tickets' && form.rol === 'contribuidor' && (
            <div className="mb-5 bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <p className="text-xs text-violet-300 font-semibold mb-3 uppercase tracking-wide">
                Etapas del flujo que maneja este usuario
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ETAPAS_TICKETS.map(e => {
                  const selected = form.etapasAsignadas.includes(e.value);
                  return (
                    <button
                      key={e.value}
                      type="button"
                      onClick={() => toggleEtapa(e.value)}
                      className={`text-left px-4 py-3 rounded-lg border transition ${
                        selected
                          ? 'bg-violet-600/30 border-violet-500 text-violet-200'
                          : 'bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className={`w-3 h-3 rounded-sm border-2 flex items-center justify-center ${selected ? 'bg-violet-500 border-violet-500' : 'border-slate-500'}`}>
                          {selected && <CheckCircle2 size={8} className="text-white" />}
                        </div>
                        <span className="text-xs font-semibold">{e.label}</span>
                      </div>
                      <p className="text-xs text-slate-500 ml-5">{e.desc}</p>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-3">
                💡 <strong className="text-slate-400">Diferencia entre roles:</strong> El
                <span className="text-blue-400"> Administrador</span> ve y gestiona todos los tickets sin
                restricción. El
                <span className="text-violet-400"> Contribuidor</span> solo ve los tickets de las etapas
                que tiene asignadas y puede avanzarlos a la siguiente etapa.
              </p>
            </div>
          )}

          {errForm && (
            <p className="text-red-400 text-xs mb-3 flex items-center gap-1.5">
              <X size={12} /> {errForm}
            </p>
          )}

          <button onClick={handleCrear}
            className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition">
            <Plus size={15} />
            Crear usuario
            {emailjsConfigurado ? ' y enviar mail' : ' (sin mail automático)'}
          </button>
        </div>

        {/* ── Users table ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
            <Shield size={16} className="text-violet-400" />
            <h2 className="font-bold text-white text-sm uppercase tracking-wide">Usuarios del sistema</h2>
          </div>

          {listaUsuarios.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-10">No hay usuarios creados aún.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-slate-800 uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-medium">Usuario</th>
                    <th className="text-left px-5 py-3 font-medium">Sistema / Rol</th>
                    <th className="text-left px-5 py-3 font-medium">Etapas</th>
                    <th className="text-left px-5 py-3 font-medium">Estado</th>
                    <th className="text-left px-5 py-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {listaUsuarios.map(u => (
                    <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                      <td className="px-5 py-3">
                        <p className="font-medium text-white">{u.nombre}</p>
                        <p className="text-xs text-slate-400 font-mono">{u.email}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold mr-2 ${
                          u.modulo === 'savean'
                            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {u.modulo === 'savean' ? 'SAVEAN' : 'Tickets'}
                        </span>
                        <span className="text-xs text-slate-400">{rolLabel(u.rol, u.modulo)}</span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400 max-w-48">
                        {u.etapasAsignadas?.length
                          ? <span className="text-violet-300">{etapasLabel(u.etapasAsignadas)}</span>
                          : <span className="text-slate-600">—</span>
                        }
                      </td>
                      <td className="px-5 py-3">
                        {!u.activado ? (
                          <span className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                            <Clock size={11} /> Pendiente
                          </span>
                        ) : u.activo ? (
                          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                            <CheckCircle2 size={11} /> Activo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <X size={11} /> Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 flex-wrap">

                          {/* Send email (pending users only) */}
                          {!u.activado && u.tokenActivacion && (
                            <>
                              {/* Copy link */}
                              <button onClick={() => copiarLink(u.tokenActivacion!, u.id)}
                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition font-medium ${
                                  copiado === u.id ? 'bg-emerald-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                                }`}>
                                {copiado === u.id ? <CheckCircle2 size={11} /> : <Copy size={11} />}
                                {copiado === u.id ? 'Copiado' : 'Link'}
                              </button>

                              {/* EmailJS send */}
                              {emailjsConfigurado ? (
                                <button
                                  onClick={() => handleEnviarMail(u)}
                                  disabled={envioEstado[u.id] === 'sending'}
                                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition font-medium ${
                                    envioEstado[u.id] === 'ok'
                                      ? 'bg-emerald-600 text-white'
                                      : envioEstado[u.id] === 'error'
                                      ? 'bg-red-700 text-white'
                                      : 'bg-violet-700 hover:bg-violet-600 text-white'
                                  }`}
                                >
                                  <Mail size={11} />
                                  {envioEstado[u.id] === 'sending' ? 'Enviando...'
                                    : envioEstado[u.id] === 'ok' ? 'Enviado ✓'
                                    : envioEstado[u.id] === 'error' ? 'Error'
                                    : 'Enviar mail'}
                                </button>
                              ) : (
                                /* Mailto fallback when EmailJS not configured */
                                <a href={mailtoFallback(u, u.tokenActivacion)}
                                  className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition font-medium">
                                  <Mail size={11} /> mailto:
                                </a>
                              )}
                            </>
                          )}

                          {/* Toggle active */}
                          {u.activado && (
                            <button onClick={() => toggleActivoUsuario(u.id)}
                              className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition font-medium">
                              {u.activo
                                ? <ToggleRight size={13} className="text-emerald-400" />
                                : <ToggleLeft size={13} />}
                              {u.activo ? 'Activo' : 'Inactivo'}
                            </button>
                          )}

                          {/* Delete */}
                          {confirmDelete === u.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => { eliminarUsuario(u.id); setConfirmDelete(null); }}
                                className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition font-semibold">
                                Confirmar
                              </button>
                              <button onClick={() => setConfirmDelete(null)}
                                className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded-md transition">
                                No
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDelete(u.id)}
                              className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-700 hover:bg-red-800 text-slate-400 hover:text-red-300 rounded-md transition">
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Pending links panel ── */}
        {listaUsuarios.some(u => !u.activado && u.tokenActivacion) && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={15} className="text-amber-400" />
              <h3 className="font-bold text-amber-300 text-sm">Links de activación pendientes</h3>
            </div>
            <div className="space-y-2">
              {listaUsuarios.filter(u => !u.activado && u.tokenActivacion).map(u => (
                <div key={u.id} className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-slate-300 font-medium w-36 truncate">{u.nombre}</span>
                  <code className="flex-1 text-xs bg-slate-900 text-slate-400 px-3 py-1.5 rounded-md font-mono truncate min-w-0">
                    {activationUrl(u.tokenActivacion!)}
                  </code>
                  <button onClick={() => copiarLink(u.tokenActivacion!, u.id)}
                    className={`flex-shrink-0 flex items-center gap-1 text-xs px-3 py-1.5 rounded-md transition font-medium ${
                      copiado === u.id ? 'bg-emerald-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    }`}>
                    {copiado === u.id ? <CheckCircle2 size={11} /> : <Copy size={11} />}
                    {copiado === u.id ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
