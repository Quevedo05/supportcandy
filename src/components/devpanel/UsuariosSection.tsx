import { useState } from 'react';
import {
  Plus, Eye, EyeOff, KeyRound, Trash2, RefreshCw,
  AlertCircle, Copy, CheckCircle2,
} from 'lucide-react';
import { useEtapas } from '../../context/EtapasContext';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UsuarioAPI {
  usuarioId: string;
  nombre: string;
  email: string;
  rol: string;
  modulo: string;
  activo: boolean;
  pendiente: boolean;
  estadosAsignados: string[];
  creadoEn: string;
}

interface GrupoRolDef {
  label: string;
  filter: (u: UsuarioAPI) => boolean;
}

// ── Grupos por sistema ────────────────────────────────────────────────────────

const SAVEAN_GRUPOS: GrupoRolDef[] = [
  { label: 'Directores / Admin',  filter: u => u.rol === 'admin' },
  { label: 'Inspectores',         filter: u => u.rol === 'inspector' },
  { label: 'Punto de Control',    filter: u => u.rol === 'punto_control' },
  { label: 'Sanidad',             filter: u => u.rol === 'sanidad' },
];

const AGENCIA_GRUPOS: GrupoRolDef[] = [
  { label: 'Administradores',  filter: u => u.rol === 'admin' },
  { label: 'Supervisores',     filter: u => u.rol === 'supervisor' },
  { label: 'Contribuidores',   filter: u => u.rol === 'contribuidor' },
  { label: 'Comité',           filter: u => u.modulo === 'comite' || u.rol === 'comite-contribuidor' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROL_LABEL: Record<string, string> = {
  admin: 'Admin', inspector: 'Inspector', punto_control: 'Pto. Control',
  sanidad: 'Sanidad', contribuidor: 'Contribuidor', supervisor: 'Supervisor',
  'comite-contribuidor': 'Comité',
};

const STATUS: Record<string, string> = { active: 'Activo', pending: 'Pendiente', inactive: 'Inactivo' };
const DOT:    Record<string, string> = { active: 'bg-green-500', pending: 'bg-amber-400', inactive: 'bg-gray-400' };

function userStatus(u: UsuarioAPI): 'active' | 'pending' | 'inactive' {
  if (u.pendiente) return 'pending';
  if (u.activo)    return 'active';
  return 'inactive';
}

function displayUsuario(u: UsuarioAPI): string {
  if (u.email.endsWith('@savean.local')) return u.email.replace('@savean.local', '');
  return u.email;
}

function isLocalAccount(u: UsuarioAPI) {
  return u.email.endsWith('@savean.local');
}

// ── Acción row compartida ─────────────────────────────────────────────────────

function AccionesRow({
  u, colSpan, toggling, reseteando, eliminando,
  confirmId, onToggle, onReset, onAskDelete, onConfirmDelete, onCancelDelete,
}: {
  u: UsuarioAPI; colSpan: number;
  toggling: string | null; reseteando: string | null; eliminando: string | null;
  confirmId: string | null;
  onToggle: (id: string) => void;
  onReset: (id: string) => void;
  onAskDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
}) {
  if (confirmId === u.usuarioId) {
    return (
      <div className={`col-span-${colSpan} flex flex-wrap items-center justify-between gap-3 py-3`}>
        <div className="flex items-center gap-2.5">
          <AlertCircle size={16} className="text-red-600 flex-none" />
          <span className="text-sm text-red-900">
            <strong>¿Eliminar a {u.nombre}?</strong> No se puede deshacer.
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancelDelete}
            className="h-9 px-4 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button onClick={() => onConfirmDelete(u.usuarioId)} disabled={eliminando === u.usuarioId}
            className="h-9 px-4 bg-red-600 hover:bg-red-700 text-white text-sm rounded-xl transition disabled:opacity-50">
            {eliminando === u.usuarioId ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2 flex items-center justify-end gap-0">
      {!u.pendiente && (
        <button role="switch" aria-checked={u.activo} disabled={toggling === u.usuarioId}
          onClick={() => onToggle(u.usuarioId)}
          className="w-12 h-11 flex items-center justify-center disabled:opacity-50">
          <span className={`w-10 h-6 rounded-[4px] relative transition-colors ${u.activo ? 'bg-violet-600' : 'bg-gray-200'}`}>
            <span className={`absolute top-[2px] w-5 h-5 rounded-[2px] bg-white shadow-sm transition-all ${u.activo ? 'left-[18px]' : 'left-[2px]'}`} />
          </span>
        </button>
      )}
      <button disabled={reseteando === u.usuarioId} onClick={() => onReset(u.usuarioId)}
        className="w-11 h-11 rounded-xl flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition disabled:opacity-50">
        {reseteando === u.usuarioId ? <RefreshCw size={16} className="animate-spin" /> : <KeyRound size={16} />}
      </button>
      <button onClick={() => onAskDelete(u.usuarioId)}
        className="w-11 h-11 rounded-xl flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition">
        <Trash2 size={16} />
      </button>
    </div>
  );
}

// ── Fila SAVEAN ───────────────────────────────────────────────────────────────

const GRID_SAVEAN = 'minmax(170px,1.5fr) minmax(140px,1fr) 120px 100px 130px';

function UsuarioRowSavean({
  u, confirmId, toggling, reseteando, eliminando,
  onToggle, onReset, onAskDelete, onConfirmDelete, onCancelDelete,
}: {
  u: UsuarioAPI; confirmId: string | null;
  toggling: string | null; reseteando: string | null; eliminando: string | null;
  onToggle: (id: string) => void; onReset: (id: string) => void;
  onAskDelete: (id: string) => void; onConfirmDelete: (id: string) => void; onCancelDelete: () => void;
}) {
  const st = userStatus(u);
  const isConfirming = confirmId === u.usuarioId;

  return (
    <div role="row"
      className={`grid px-5 min-h-[58px] items-center border-t border-gray-100 ${isConfirming ? 'bg-red-50' : ''}`}
      style={{ gridTemplateColumns: GRID_SAVEAN }}>
      {isConfirming ? (
        <AccionesRow u={u} colSpan={5} {...{ confirmId, toggling, reseteando, eliminando, onToggle, onReset, onAskDelete, onConfirmDelete, onCancelDelete }} />
      ) : (
        <>
          <div className="py-2 flex flex-col gap-0.5">
            <span className="text-sm font-[500]">{u.nombre}</span>
            <span className="flex items-center gap-1.5 text-[12px] text-gray-400">
              <span className={`w-[9px] h-[9px] rounded-[1px] flex-none ${DOT[st]}`} />
              {STATUS[st]}
            </span>
          </div>
          <div className="py-2 font-mono text-[13px] text-gray-600">
            {displayUsuario(u)}
            {isLocalAccount(u) && (
              <span className="ml-1.5 text-[11px] text-gray-300">@savean.local</span>
            )}
          </div>
          <div className="py-2">
            <span className="text-[12px] px-2 py-0.5 rounded-[3px] bg-orange-50 text-orange-700">
              {ROL_LABEL[u.rol] ?? u.rol}
            </span>
          </div>
          <div className="py-2">
            <span className={`text-[12px] px-2 py-0.5 rounded-[3px] ${
              st === 'active'  ? 'bg-green-50 text-green-700' :
              st === 'pending' ? 'bg-amber-50 text-amber-700' :
                                 'bg-gray-100 text-gray-500'
            }`}>{STATUS[st]}</span>
          </div>
          <AccionesRow u={u} colSpan={5} {...{ confirmId, toggling, reseteando, eliminando, onToggle, onReset, onAskDelete, onConfirmDelete, onCancelDelete }} />
        </>
      )}
    </div>
  );
}

// ── Fila AGENCIA ──────────────────────────────────────────────────────────────

const GRID_AGENCIA = 'minmax(170px,1.5fr) minmax(190px,1.2fr) 110px minmax(150px,1fr) 100px 130px';

function UsuarioRowAgencia({
  u, confirmId, toggling, reseteando, eliminando,
  onToggle, onReset, onAskDelete, onConfirmDelete, onCancelDelete,
}: {
  u: UsuarioAPI; confirmId: string | null;
  toggling: string | null; reseteando: string | null; eliminando: string | null;
  onToggle: (id: string) => void; onReset: (id: string) => void;
  onAskDelete: (id: string) => void; onConfirmDelete: (id: string) => void; onCancelDelete: () => void;
}) {
  const st = userStatus(u);
  const isConfirming = confirmId === u.usuarioId;

  return (
    <div role="row"
      className={`grid px-5 min-h-[58px] items-center border-t border-gray-100 ${isConfirming ? 'bg-red-50' : ''}`}
      style={{ gridTemplateColumns: GRID_AGENCIA }}>
      {isConfirming ? (
        <AccionesRow u={u} colSpan={6} {...{ confirmId, toggling, reseteando, eliminando, onToggle, onReset, onAskDelete, onConfirmDelete, onCancelDelete }} />
      ) : (
        <>
          <div className="py-2 flex flex-col gap-0.5">
            <span className="text-sm font-[500]">{u.nombre}</span>
            <span className="flex items-center gap-1.5 text-[12px] text-gray-400">
              <span className={`w-[9px] h-[9px] rounded-[1px] flex-none ${DOT[st]}`} />
              {STATUS[st]}
            </span>
          </div>
          <div className="py-2 font-mono text-[13px] text-gray-600 break-all">{u.email}</div>
          <div className="py-2">
            <span className="text-[12px] px-2 py-0.5 rounded-[3px] bg-blue-50 text-blue-700">
              {ROL_LABEL[u.rol] ?? u.rol}
            </span>
          </div>
          <div className="py-2 flex flex-wrap gap-1">
            {u.estadosAsignados.length > 0
              ? u.estadosAsignados.map(e => (
                  <span key={e} className="px-1.5 py-0.5 rounded-[3px] bg-gray-100 text-gray-500 text-[11.5px]">{e}</span>
                ))
              : <span className="text-[13px] text-gray-300">—</span>
            }
          </div>
          <div className="py-2">
            <span className={`text-[12px] px-2 py-0.5 rounded-[3px] ${
              st === 'active'  ? 'bg-green-50 text-green-700' :
              st === 'pending' ? 'bg-amber-50 text-amber-700' :
                                 'bg-gray-100 text-gray-500'
            }`}>{STATUS[st]}</span>
          </div>
          <AccionesRow u={u} colSpan={6} {...{ confirmId, toggling, reseteando, eliminando, onToggle, onReset, onAskDelete, onConfirmDelete, onCancelDelete }} />
        </>
      )}
    </div>
  );
}

// ── Tabla genérica ────────────────────────────────────────────────────────────

function UsuariosTabla({
  usuarios, titulo, chipLabel, chipCls, grupos, tipo,
  onToggle, toggling, onReset, reseteando,
  onAskDelete, onConfirmDelete, onCancelDelete, confirmId, eliminando,
}: {
  usuarios: UsuarioAPI[];
  titulo: string; chipLabel: string; chipCls: string;
  grupos: GrupoRolDef[];
  tipo: 'savean' | 'agencia';
  onToggle: (id: string) => void; toggling: string | null;
  onReset: (id: string) => void; reseteando: string | null;
  onAskDelete: (id: string) => void; onConfirmDelete: (id: string) => void; onCancelDelete: () => void;
  confirmId: string | null; eliminando: string | null;
}) {
  const rowProps = { confirmId, toggling, reseteando, eliminando, onToggle, onReset, onAskDelete, onConfirmDelete, onCancelDelete };

  // usuarios que no caen en ningún grupo definido
  const clasificados = new Set(grupos.flatMap(g => usuarios.filter(g.filter).map(u => u.usuarioId)));
  const otros = usuarios.filter(u => !clasificados.has(u.usuarioId));

  const colHeaders = tipo === 'savean'
    ? ['Nombre', 'Usuario', 'Rol', 'Estado', '']
    : ['Nombre', 'Email', 'Rol', 'Etapas', 'Estado', ''];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-200">
        <span className={`px-2 py-0.5 rounded-[3px] text-[11.5px] ${chipCls}`}>{chipLabel}</span>
        <h3 className="text-[16px] font-medium">{titulo}</h3>
        <span className="ml-auto text-[13px] text-gray-400">
          {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div role="table" aria-label={titulo}
          className={tipo === 'savean' ? 'min-w-[700px]' : 'min-w-[860px]'}>

          {/* Column headers */}
          <div role="row"
            className="grid px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-[11px] font-[500] uppercase tracking-[0.06em] text-gray-400"
            style={{ gridTemplateColumns: tipo === 'savean' ? GRID_SAVEAN : GRID_AGENCIA }}>
            {colHeaders.map((h, i) => (
              <div key={i} role="columnheader">{h || <span className="sr-only">Acciones</span>}</div>
            ))}
          </div>

          {/* Grupos */}
          {grupos.map(grupo => {
            const miembros = usuarios.filter(grupo.filter);
            if (miembros.length === 0) return null;
            return (
              <div key={grupo.label} role="rowgroup">
                <div className="flex items-center gap-2 px-5 py-1.5 bg-gray-50/70 border-t border-gray-100">
                  <span className="text-[11px] font-[500] uppercase tracking-[0.07em] text-gray-400">{grupo.label}</span>
                  <span className="font-mono text-[11px] px-1.5 leading-5 rounded-[2px] bg-gray-100 text-gray-400">{miembros.length}</span>
                </div>
                {miembros.map(u =>
                  tipo === 'savean'
                    ? <UsuarioRowSavean  key={u.usuarioId} u={u} {...rowProps} />
                    : <UsuarioRowAgencia key={u.usuarioId} u={u} {...rowProps} />
                )}
              </div>
            );
          })}

          {/* Otros — usuarios sin grupo conocido */}
          {otros.length > 0 && (
            <div role="rowgroup">
              <div className="flex items-center gap-2 px-5 py-1.5 bg-amber-50/60 border-t border-amber-100">
                <span className="text-[11px] font-[500] uppercase tracking-[0.07em] text-amber-500">Sin clasificar</span>
                <span className="font-mono text-[11px] px-1.5 leading-5 rounded-[2px] bg-amber-100 text-amber-600">{otros.length}</span>
              </div>
              {otros.map(u =>
                tipo === 'savean'
                  ? <UsuarioRowSavean  key={u.usuarioId} u={u} {...rowProps} />
                  : <UsuarioRowAgencia key={u.usuarioId} u={u} {...rowProps} />
              )}
            </div>
          )}

          {usuarios.length === 0 && (
            <div className="px-5 py-10 text-center text-[14px] text-gray-400">
              No hay usuarios en este sistema todavía.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Card de credenciales (inspector recién creado) ────────────────────────────

function CredencialesCard({ creds, onClose }: { creds: { nombre: string; username: string; password: string }; onClose: () => void }) {
  const [copiedU, setCopiedU] = useState(false);
  const [copiedP, setCopiedP] = useState(false);
  const [showPass, setShowPass] = useState(false);

  function copy(text: string, setCopied: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 text-green-700">
          <CheckCircle2 size={18} />
          <span className="text-[15px] font-medium">Inspector creado · {creds.nombre}</span>
        </div>
        <button onClick={onClose} className="text-green-500 hover:text-green-700 text-[22px] leading-none">&times;</button>
      </div>
      <p className="text-[13px] text-green-600 mb-4">Compartí estas credenciales con el inspector para que pueda ingresar al sistema.</p>
      <div className="flex flex-wrap gap-3">
        {/* Usuario */}
        <div className="bg-white border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3 min-w-[220px]">
          <div className="flex-1">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Usuario</p>
            <p className="font-mono text-[15px] font-medium text-gray-900">{creds.username}</p>
          </div>
          <button onClick={() => copy(creds.username, setCopiedU)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition">
            {copiedU ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
          </button>
        </div>
        {/* Contraseña */}
        <div className="bg-white border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3 min-w-[220px]">
          <div className="flex-1">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Contraseña</p>
            <p className="font-mono text-[15px] font-medium text-gray-900">
              {showPass ? creds.password : '••••••••'}
            </p>
          </div>
          <button onClick={() => setShowPass(v => !v)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition">
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button onClick={() => copy(creds.password, setCopiedP)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition">
            {copiedP ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export function UsuariosSection({
  usuarios, cargando, errorCarga, onRecargar,
  onToggle, toggling,
  onEliminar, eliminando,
  onResetPassword, reseteando,
  apiUrl, token,
}: {
  usuarios: UsuarioAPI[];
  cargando: boolean;
  errorCarga: string;
  onRecargar: () => void;
  onToggle: (id: string) => void; toggling: string | null;
  onEliminar: (id: string) => void; eliminando: string | null;
  onResetPassword: (id: string) => void; reseteando: string | null;
  apiUrl: string;
  token: string | null;
}) {
  const { etapasActivas } = useEtapas();

  const [confirmId, setConfirmId] = useState<string | null>(null);

  // ── Formulario de creación ─────────────────────────────────────────────────

  // Sistema seleccionado en el form
  const [fSistema,   setFSistema]   = useState<'savean' | 'agencia'>('savean');
  // Para SAVEAN: rol del nuevo usuario
  const [fRolSavean, setFRolSavean] = useState<'inspector' | 'admin' | 'sanidad' | 'punto_control'>('inspector');
  // Campos compartidos
  const [fNombre,  setFNombre]  = useState('');
  // Para inspector SAVEAN: nombre de usuario (sin @savean.local)
  const [fUsuario, setFUsuario] = useState('');
  const [fPass,    setFPass]    = useState('');
  // Para otros (invitación por email)
  const [fEmail,   setFEmail]   = useState('');
  // Para AGENCIA
  const [fRolAg,   setFRolAg]   = useState<'admin' | 'contribuidor' | 'supervisor'>('contribuidor');
  const [fEtapas,  setFEtapas]  = useState<string[]>([]);
  // Estado del form
  const [formErr,  setFormErr]  = useState('');
  const [creando,  setCreando]  = useState(false);
  // Credenciales del último inspector creado
  const [lastCreds, setLastCreds] = useState<{ nombre: string; username: string; password: string } | null>(null);

  const isInspector = fSistema === 'savean' && fRolSavean === 'inspector';

  function clearForm() {
    setFNombre(''); setFUsuario(''); setFPass(''); setFEmail(''); setFEtapas([]); setFormErr('');
  }

  function handleSistemaChange(s: 'savean' | 'agencia') {
    setFSistema(s);
    clearForm();
    if (s === 'savean') setFRolSavean('inspector');
    else setFRolAg('contribuidor');
  }

  async function handleCrear() {
    setFormErr('');
    if (!fNombre.trim()) { setFormErr('El nombre es obligatorio.'); return; }

    if (fSistema === 'savean' && fRolSavean === 'inspector') {
      if (!fUsuario.trim()) { setFormErr('El nombre de usuario es obligatorio.'); return; }
      if (fPass.length < 4) { setFormErr('La contraseña debe tener al menos 4 caracteres.'); return; }
    } else {
      if (!fEmail.includes('@')) { setFormErr('El email no es válido.'); return; }
    }

    setCreando(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      if (fSistema === 'savean') {
        const body: Record<string, string> = { nombre: fNombre.trim(), rol: fRolSavean };
        if (fRolSavean === 'inspector') {
          body.username = fUsuario.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
          body.password = fPass;
        } else {
          body.email = fEmail.trim().toLowerCase();
        }
        const res = await fetch(`${apiUrl}/savean/usuarios`, { method: 'POST', headers, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) { setFormErr(data.error || `Error ${res.status}`); return; }

        if (fRolSavean === 'inspector') {
          setLastCreds({ nombre: fNombre.trim(), username: body.username, password: fPass });
        }
      } else {
        const body: Record<string, unknown> = {
          nombre: fNombre.trim(), email: fEmail.trim().toLowerCase(),
          modulo: 'tickets', rol: fRolAg,
          ...(fRolAg === 'contribuidor' ? { estadosAsignados: fEtapas } : {}),
        };
        const res = await fetch(`${apiUrl}/usuarios`, { method: 'POST', headers, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) { setFormErr(data.error || `Error ${res.status}`); return; }
      }

      clearForm();
      onRecargar();
    } catch (e: any) {
      setFormErr(e.message || 'Error de conexión');
    } finally {
      setCreando(false);
    }
  }

  function toggleEtapa(e: string) {
    setFEtapas(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
  }

  // ── Partición por sistema ──────────────────────────────────────────────────

  const saveanUsers  = usuarios.filter(u => u.modulo === 'savean');
  const agenciaUsers = usuarios.filter(u => u.modulo === 'tickets' || u.modulo === 'comite');

  const countActive   = usuarios.filter(u =>  u.activo && !u.pendiente).length;
  const countPending  = usuarios.filter(u =>  u.pendiente).length;
  const countInactive = usuarios.filter(u => !u.activo   && !u.pendiente).length;

  const inputCls = 'h-11 w-full border border-gray-200 rounded-xl px-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-600 bg-white';

  const tableProps = {
    confirmId,
    toggling, onToggle,
    reseteando, onReset: onResetPassword,
    eliminando,
    onAskDelete:    (id: string) => setConfirmId(id),
    onConfirmDelete: (id: string) => { onEliminar(id); setConfirmId(null); },
    onCancelDelete: () => setConfirmId(null),
  };

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-end justify-between gap-3 mb-7">
        <div>
          <h1 className="text-[30px] font-medium leading-tight tracking-[-0.025em] text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-1">
            {saveanUsers.length} SAVEAN · {agenciaUsers.length} Agencia
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ul className="flex flex-wrap gap-4 text-[13px] text-gray-500">
            <li className="flex items-center gap-2"><span className="w-[9px] h-[9px] rounded-[1px] bg-green-500" /> Activos · {countActive}</li>
            <li className="flex items-center gap-2"><span className="w-[9px] h-[9px] rounded-[1px] bg-amber-400" /> Pendientes · {countPending}</li>
            <li className="flex items-center gap-2"><span className="w-[9px] h-[9px] rounded-[1px] bg-gray-400" /> Inactivos · {countInactive}</li>
          </ul>
          <button onClick={onRecargar}
            className="h-11 px-3.5 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition">
            <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} /> Recargar
          </button>
        </div>
      </header>

      {/* ── Credenciales inspector recién creado ───────────────────────── */}
      {lastCreds && <CredencialesCard creds={lastCreds} onClose={() => setLastCreds(null)} />}

      {/* ── Formulario nuevo usuario ───────────────────────────────────── */}
      <section className="bg-white border border-gray-100 rounded-2xl p-6 mb-8 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-9 h-9 rounded-[12px] bg-violet-50 text-violet-700 flex items-center justify-center flex-none">
            <Plus size={18} />
          </span>
          <h2 className="text-[18px] font-medium tracking-[-0.01em]">Nuevo usuario</h2>
        </div>

        {/* Selector de sistema */}
        <div className="flex gap-2 mb-5">
          {(['savean', 'agencia'] as const).map(s => (
            <button key={s} type="button" onClick={() => handleSistemaChange(s)}
              className={`h-9 px-4 rounded-xl text-[13px] uppercase tracking-wide transition ${
                fSistema === s ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {s}
            </button>
          ))}
        </div>

        {/* ── SAVEAN ── */}
        {fSistema === 'savean' && (
          <>
            {/* Rol SAVEAN */}
            <div className="flex flex-wrap gap-2 mb-5">
              {([
                { value: 'inspector',     label: 'Inspector' },
                { value: 'sanidad',       label: 'Sanidad' },
                { value: 'punto_control', label: 'Punto de Control' },
                { value: 'admin',         label: 'Director / Admin' },
              ] as const).map(r => (
                <button key={r.value} type="button" onClick={() => { setFRolSavean(r.value); clearForm(); }}
                  className={`h-9 px-3.5 rounded-xl border text-[13px] transition ${
                    fRolSavean === r.value
                      ? 'bg-orange-50 border-orange-300 text-orange-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  {r.label}
                </button>
              ))}
            </div>

            {isInspector ? (
              <>
                <p className="text-[12.5px] text-gray-400 mb-4">
                  El inspector ingresa con usuario y contraseña. No necesita email.
                </p>
                <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(190px,100%), 1fr))' }}>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] text-gray-600">Nombre completo</label>
                    <input className={inputCls} type="text" placeholder="Ej: Mario Rodríguez"
                      value={fNombre} onChange={e => { setFNombre(e.target.value); setFormErr(''); }} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] text-gray-600">Nombre de usuario</label>
                    <input className={`${inputCls} font-mono`} type="text" placeholder="Ej: mrodriguez"
                      value={fUsuario} onChange={e => { setFUsuario(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '')); setFormErr(''); }} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] text-gray-600">Contraseña</label>
                    <input className={`${inputCls} font-mono`} type="text" placeholder="Mín. 4 caracteres"
                      value={fPass} onChange={e => { setFPass(e.target.value); setFormErr(''); }} />
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-[12.5px] text-gray-400 mb-4">
                  Se envía una invitación al email para que el usuario establezca su contraseña.
                </p>
                <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px,100%), 1fr))' }}>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] text-gray-600">Nombre completo</label>
                    <input className={inputCls} type="text" placeholder="Ej: Ana García"
                      value={fNombre} onChange={e => { setFNombre(e.target.value); setFormErr(''); }} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] text-gray-600">Email</label>
                    <input className={inputCls} type="email" placeholder="Ej: agarcia@agencia.gob.ar"
                      value={fEmail} onChange={e => { setFEmail(e.target.value); setFormErr(''); }} />
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ── AGENCIA ── */}
        {fSistema === 'agencia' && (
          <>
            <p className="text-[12.5px] text-gray-400 mb-4">
              Se envía una invitación al email para que el usuario establezca su contraseña.
            </p>
            <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(190px,100%), 1fr))' }}>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] text-gray-600">Nombre completo</label>
                <input className={inputCls} type="text" placeholder="Ej: Laura Gómez"
                  value={fNombre} onChange={e => { setFNombre(e.target.value); setFormErr(''); }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] text-gray-600">Email</label>
                <input className={inputCls} type="email" placeholder="Ej: lgomez@agencia.gob.ar"
                  value={fEmail} onChange={e => { setFEmail(e.target.value); setFormErr(''); }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] text-gray-600">Rol</label>
                <select className={inputCls} value={fRolAg} onChange={e => { setFRolAg(e.target.value as typeof fRolAg); setFEtapas([]); }}>
                  <option value="contribuidor">Contribuidor</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {/* Etapas — solo contribuidor */}
            {fRolAg === 'contribuidor' && (
              <div className="mb-5">
                <p className="text-[13px] text-gray-600 mb-3">Etapas asignadas</p>
                <div className="flex flex-wrap gap-2">
                  {etapasActivas.map(e => {
                    const on = fEtapas.includes(e.nombre);
                    return (
                      <button key={e.id} type="button" onClick={() => toggleEtapa(e.nombre)}
                        className={`h-9 px-3.5 border rounded-xl text-[13px] transition ${
                          on ? 'bg-violet-50 border-violet-300 text-violet-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}>
                        {e.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer del form */}
        <div className="flex flex-wrap items-center justify-end gap-3">
          {formErr && <span role="alert" className="text-[13px] text-red-600 mr-auto">{formErr}</span>}
          <button onClick={handleCrear} disabled={creando}
            className="h-11 px-5 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-xl flex items-center gap-2 transition disabled:opacity-50">
            <Plus size={16} />
            {creando ? 'Creando…' : isInspector ? 'Crear inspector' : 'Enviar invitación'}
          </button>
        </div>
      </section>

      {/* ── Estado de carga / error ────────────────────────────────────── */}
      {cargando && (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
          <RefreshCw size={18} className="animate-spin" /> Cargando usuarios…
        </div>
      )}
      {errorCarga && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2 mb-4">
          <AlertCircle size={16} /> {errorCarga}
          <button onClick={onRecargar} className="ml-auto text-xs underline">Reintentar</button>
        </div>
      )}

      {/* ── Tablas ────────────────────────────────────────────────────── */}
      {!cargando && (
        <div className="flex flex-col gap-6">
          <UsuariosTabla
            usuarios={saveanUsers} tipo="savean"
            titulo="SAVEAN" chipLabel="SAVEAN" chipCls="bg-orange-50 text-orange-700"
            grupos={SAVEAN_GRUPOS} {...tableProps}
          />
          <UsuariosTabla
            usuarios={agenciaUsers} tipo="agencia"
            titulo="Agencia de Calidad San Juan" chipLabel="AGENCIA" chipCls="bg-blue-50 text-blue-700"
            grupos={AGENCIA_GRUPOS} {...tableProps}
          />
        </div>
      )}
    </div>
  );
}
