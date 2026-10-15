import { useState } from 'react';
import { Plus, Eye, EyeOff, KeyRound, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
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

// ── Agrupaciones por rol ───────────────────────────────────────────────────────

const SAVEAN_GRUPOS: GrupoRolDef[] = [
  { label: 'Directores / Admin',  filter: u => u.rol === 'admin' },
  { label: 'Inspectores',         filter: u => u.rol === 'inspector' },
  { label: 'Punto de Control',    filter: u => u.rol === 'punto_control' },
  { label: 'Sanidad',             filter: u => u.rol === 'sanidad' },
];

const AGENCIA_GRUPOS: GrupoRolDef[] = [
  { label: 'Administradores',   filter: u => u.rol === 'admin' },
  { label: 'Contribuidores',    filter: u => u.rol === 'contribuidor' },
  { label: 'Comité',            filter: u => u.modulo === 'comite' || u.rol === 'comite-contribuidor' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS: Record<string, string> = { active: 'Activo', pending: 'Pendiente', inactive: 'Inactivo' };
const DOT: Record<string, string>    = { active: 'bg-green-500', pending: 'bg-amber-400', inactive: 'bg-gray-400' };

function userStatus(u: UsuarioAPI): 'active' | 'pending' | 'inactive' {
  if (u.pendiente) return 'pending';
  if (u.activo)    return 'active';
  return 'inactive';
}

const GRID = 'minmax(190px,1.5fr) minmax(200px,1.2fr) minmax(160px,1fr) minmax(180px,1.2fr) 160px';

// ── Fila de usuario ───────────────────────────────────────────────────────────

function UsuarioRow({
  u, confirmId, revealed, tempPasswords,
  toggling, reseteando, eliminando,
  onToggle, onReset, onAskDelete, onConfirmDelete, onCancelDelete, onToggleReveal,
}: {
  u: UsuarioAPI;
  confirmId: string | null;
  revealed: Record<string, boolean>;
  tempPasswords: Record<string, string>;
  toggling: string | null; reseteando: string | null; eliminando: string | null;
  onToggle: (id: string) => void;
  onReset: (id: string) => void;
  onAskDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  onToggleReveal: (id: string) => void;
}) {
  const st          = userStatus(u);
  const isConfirming = confirmId === u.usuarioId;
  const shown       = !!revealed[u.usuarioId];
  const tempPw      = tempPasswords[u.usuarioId];
  const pwDisplay   = shown ? (tempPw ?? '••••••••') : '••••••••';

  return (
    <div role="row"
      className={`grid px-5 min-h-[64px] items-center border-t border-gray-100 ${isConfirming ? 'bg-red-50' : ''}`}
      style={{ gridTemplateColumns: GRID }}>

      {isConfirming ? (
        <div role="alertdialog" aria-label="Confirmar eliminación"
          className="col-span-5 flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="text-red-600 flex-none" />
            <span className="text-sm text-red-900">
              <strong>¿Eliminar a {u.nombre}?</strong> Esta acción no se puede deshacer.
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
      ) : (
        <>
          {/* Nombre + estado */}
          <div role="cell" className="py-2 flex flex-col gap-0.5">
            <span className="text-sm font-[500]">{u.nombre}</span>
            <span className="flex items-center gap-1.5 text-[12px] text-gray-400">
              <span className={`w-[9px] h-[9px] rounded-[1px] flex-none ${DOT[st]}`} />
              {STATUS[st]}
            </span>
          </div>
          {/* Email */}
          <div role="cell" className="py-2 font-mono text-[13px] text-gray-700 break-all">{u.email}</div>
          {/* Contraseña */}
          <div role="cell" className="py-2 flex items-center gap-1">
            <span className="font-mono text-[13px] tracking-[0.02em]">{pwDisplay}</span>
            {tempPw && (
              <button aria-label={shown ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={shown}
                onClick={() => onToggleReveal(u.usuarioId)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition">
                {shown ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            )}
          </div>
          {/* Etapas */}
          <div role="cell" className="py-2 flex flex-wrap gap-1">
            {u.estadosAsignados.length > 0
              ? u.estadosAsignados.map(e => (
                  <span key={e} className="px-2 py-0.5 rounded-[3px] bg-gray-100 text-gray-500 text-[12px]">{e}</span>
                ))
              : <span className="text-[13px] text-gray-300">—</span>
            }
          </div>
          {/* Acciones */}
          <div role="cell" className="py-2 flex items-center justify-end gap-0">
            {!u.pendiente && (
              <button role="switch" aria-checked={u.activo} disabled={toggling === u.usuarioId}
                aria-label={u.activo ? `Desactivar a ${u.nombre}` : `Activar a ${u.nombre}`}
                onClick={() => onToggle(u.usuarioId)}
                className="w-12 h-11 flex items-center justify-center disabled:opacity-50">
                <span className={`w-10 h-6 rounded-[4px] relative transition-colors ${u.activo ? 'bg-violet-600' : 'bg-gray-200'}`}>
                  <span className={`absolute top-[2px] w-5 h-5 rounded-[2px] bg-white shadow-sm transition-all ${u.activo ? 'left-[18px]' : 'left-[2px]'}`} />
                </span>
              </button>
            )}
            <button aria-label={`Resetear contraseña de ${u.nombre}`} disabled={reseteando === u.usuarioId}
              onClick={() => onReset(u.usuarioId)}
              className="w-11 h-11 rounded-xl flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition disabled:opacity-50">
              {reseteando === u.usuarioId ? <RefreshCw size={16} className="animate-spin" /> : <KeyRound size={16} />}
            </button>
            <button aria-label={`Eliminar a ${u.nombre}`}
              onClick={() => onAskDelete(u.usuarioId)}
              className="w-11 h-11 rounded-xl flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition">
              <Trash2 size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Tabla agrupada por rol ─────────────────────────────────────────────────────

function UsuariosTabla({
  usuarios, titulo, chipLabel, chipCls, grupos,
  onToggle, toggling,
  onReset, reseteando,
  onAskDelete, onConfirmDelete, onCancelDelete, confirmId, eliminando,
  revealed, onToggleReveal,
  tempPasswords,
}: {
  usuarios: UsuarioAPI[];
  titulo: string;
  chipLabel: string;
  chipCls: string;
  grupos: GrupoRolDef[];
  onToggle: (id: string) => void; toggling: string | null;
  onReset: (id: string) => void; reseteando: string | null;
  onAskDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  confirmId: string | null;
  eliminando: string | null;
  revealed: Record<string, boolean>;
  onToggleReveal: (id: string) => void;
  tempPasswords: Record<string, string>;
}) {
  const rowProps = { confirmId, revealed, tempPasswords, toggling, reseteando, eliminando, onToggle, onReset, onAskDelete, onConfirmDelete, onCancelDelete, onToggleReveal };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
      {/* Card header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-200 bg-white">
        <span className={`px-2 py-0.5 rounded-[3px] text-[11.5px] font-[400] ${chipCls}`}>{chipLabel}</span>
        <h3 className="text-[16px] font-medium">{titulo}</h3>
        <span className="ml-auto text-[13px] text-gray-400">{usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Tabla scrollable */}
      <div className="overflow-x-auto">
        <div role="table" aria-label={titulo} className="min-w-[860px]">

          {/* Column headers */}
          <div role="row"
            className="grid px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-[11px] font-[500] uppercase tracking-[0.06em] text-gray-400"
            style={{ gridTemplateColumns: GRID }}>
            <div role="columnheader">Nombre</div>
            <div role="columnheader">Email</div>
            <div role="columnheader">Contraseña</div>
            <div role="columnheader">Etapas</div>
            <div role="columnheader"><span className="sr-only">Acciones</span></div>
          </div>

          {/* Role groups */}
          {grupos.map(grupo => {
            const grupoUsers = usuarios.filter(grupo.filter);
            if (grupoUsers.length === 0) return null;
            return (
              <div key={grupo.label} role="rowgroup">
                {/* Group divider */}
                <div className="flex items-center gap-2.5 px-5 py-2 bg-gray-50/70 border-t border-gray-100">
                  <span className="text-[11px] font-[500] uppercase tracking-[0.07em] text-gray-400">{grupo.label}</span>
                  <span className="font-mono text-[11px] px-1.5 leading-5 rounded-[2px] bg-gray-100 text-gray-400">
                    {grupoUsers.length}
                  </span>
                </div>
                {/* User rows */}
                {grupoUsers.map(u => <UsuarioRow key={u.usuarioId} u={u} {...rowProps} />)}
              </div>
            );
          })}

          {/* Empty state */}
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

// ── Componente principal ───────────────────────────────────────────────────────

export function UsuariosSection({
  usuarios, cargando, errorCarga, onRecargar,
  onToggle, toggling,
  onEliminar, eliminando,
  onResetPassword, reseteando,
  onCrear,
}: {
  usuarios: UsuarioAPI[];
  cargando: boolean;
  errorCarga: string;
  onRecargar: () => void;
  onToggle: (id: string) => void; toggling: string | null;
  onEliminar: (id: string) => void; eliminando: string | null;
  onResetPassword: (id: string) => void; reseteando: string | null;
  onCrear: (data: { nombre: string; email: string; modulo: string; rol: string; etapas: string[] }) => Promise<string>;
}) {
  const { etapasActivas } = useEtapas();

  const [confirmId, setConfirmId]   = useState<string | null>(null);
  const [revealed, setRevealed]     = useState<Record<string, boolean>>({});
  const [tempPasswords]             = useState<Record<string, string>>({});

  // Formulario
  const [fNombre, setFNombre]     = useState('');
  const [fEmail, setFEmail]       = useState('');
  const [fPass, setFPass]         = useState('');
  const [fSistema, setFSistema]   = useState<'savean' | 'agencia'>('savean');
  const [fRol, setFRol]           = useState('inspector');
  const [fEtapas, setFEtapas]     = useState<string[]>([]);
  const [formErr, setFormErr]     = useState('');
  const [formOk, setFormOk]       = useState('');
  const [creando, setCreando]     = useState(false);

  const rolesOpts: Record<'savean' | 'agencia', { value: string; label: string }[]> = {
    savean:  [
      { value: 'inspector',     label: 'Inspector' },
      { value: 'sanidad',       label: 'Sanidad' },
      { value: 'punto_control', label: 'Punto de Control' },
      { value: 'admin',         label: 'Director / Admin' },
    ],
    agencia: [
      { value: 'admin',         label: 'Admin' },
      { value: 'contribuidor',  label: 'Contribuidor' },
    ],
  };

  const handleSistemaChange = (s: 'savean' | 'agencia') => {
    setFSistema(s);
    setFRol(rolesOpts[s][0].value);
    setFEtapas([]);
  };

  const handleCrear = async () => {
    setFormErr(''); setFormOk('');
    if (!fNombre.trim())          { setFormErr('El nombre es obligatorio.'); return; }
    if (!fEmail.includes('@'))    { setFormErr('Email inválido.'); return; }
    const moduloReal = fSistema === 'savean' ? 'savean' : 'tickets';
    if (moduloReal === 'tickets' && fRol === 'contribuidor' && fEtapas.length === 0) {
      setFormErr('Seleccioná al menos una etapa para el contribuidor.');
      return;
    }
    setCreando(true);
    try {
      const msg = await onCrear({ nombre: fNombre.trim(), email: fEmail.trim().toLowerCase(), modulo: moduloReal, rol: fRol, etapas: fEtapas });
      setFormOk(msg);
      setFNombre(''); setFEmail(''); setFPass(''); setFEtapas([]);
    } catch (e: any) {
      setFormErr(e.message || 'Error al crear usuario');
    } finally {
      setCreando(false);
    }
  };

  function toggleEtapa(e: string) {
    setFEtapas(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
  }

  // Partición por sistema
  const saveanUsers  = usuarios.filter(u => u.modulo === 'savean');
  const agenciaUsers = usuarios.filter(u => u.modulo === 'tickets' || u.modulo === 'comite');

  const countActive   = usuarios.filter(u =>  u.activo && !u.pendiente).length;
  const countPending  = usuarios.filter(u =>  u.pendiente).length;
  const countInactive = usuarios.filter(u => !u.activo && !u.pendiente).length;

  const inputCls = 'h-11 w-full border border-gray-200 rounded-xl px-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-600 bg-white';

  const tableProps = {
    confirmId,
    revealed,
    tempPasswords,
    toggling, onToggle,
    reseteando, onReset: onResetPassword,
    eliminando,
    onAskDelete:    (id: string) => setConfirmId(id),
    onConfirmDelete: (id: string) => { onEliminar(id); setConfirmId(null); },
    onCancelDelete: () => setConfirmId(null),
    onToggleReveal: (id: string) => setRevealed(prev => {
      const n = { ...prev };
      if (n[id]) delete n[id]; else n[id] = true;
      return n;
    }),
  };

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3 mb-7">
        <div>
          <h1 className="text-[30px] font-medium leading-tight tracking-[-0.025em] text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-1">{usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} en 2 sistemas</p>
        </div>
        <div className="flex items-center gap-4">
          <ul className="flex flex-wrap gap-4 text-[13px] text-gray-500">
            <li className="flex items-center gap-2"><span className="w-[9px] h-[9px] rounded-[1px] bg-green-500" /> Activo · {countActive}</li>
            <li className="flex items-center gap-2"><span className="w-[9px] h-[9px] rounded-[1px] bg-amber-400" /> Pendiente · {countPending}</li>
            <li className="flex items-center gap-2"><span className="w-[9px] h-[9px] rounded-[1px] bg-gray-400" /> Inactivo · {countInactive}</li>
          </ul>
          <button onClick={onRecargar}
            className="h-11 px-3.5 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition">
            <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} />
            Recargar
          </button>
        </div>
      </header>

      {/* ── Crear usuario ─────────────────────────────────────────────────── */}
      <section className="bg-white border border-gray-100 rounded-2xl p-6 mb-8 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-9 h-9 rounded-[12px] bg-violet-50 text-violet-700 flex items-center justify-center flex-none">
            <Plus size={18} />
          </span>
          <div>
            <h2 className="text-[18px] font-medium tracking-[-0.01em]">Nuevo usuario</h2>
            <p className="text-[13px] text-gray-400 mt-0.5">Se crea como pendiente y queda a la espera de activación.</p>
          </div>
        </div>

        <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px,100%), 1fr))' }}>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] text-gray-600" htmlFor="f-nombre">Nombre completo</label>
            <input id="f-nombre" className={inputCls} type="text" placeholder="Ej: Laura Gómez"
              value={fNombre} onChange={e => { setFNombre(e.target.value); setFormErr(''); setFormOk(''); }} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] text-gray-600" htmlFor="f-email">Email</label>
            <input id="f-email" className={inputCls} type="email" placeholder="Ej: lgomez@agencia.gob.ar"
              value={fEmail} onChange={e => { setFEmail(e.target.value); setFormErr(''); setFormOk(''); }} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] text-gray-600" htmlFor="f-pass">Contraseña</label>
            <input id="f-pass" className={`${inputCls} font-mono`} type="text" placeholder="Vacío = se genera sola"
              value={fPass} onChange={e => setFPass(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] text-gray-600" htmlFor="f-sistema">Sistema</label>
            <select id="f-sistema" className={inputCls} value={fSistema}
              onChange={e => handleSistemaChange(e.target.value as 'savean' | 'agencia')}>
              <option value="savean">SAVEAN</option>
              <option value="agencia">AGENCIA</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] text-gray-600" htmlFor="f-rol">Rol</label>
            <select id="f-rol" className={inputCls} value={fRol}
              onChange={e => { setFRol(e.target.value); setFEtapas([]); }}>
              {rolesOpts[fSistema].map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>

        {/* Etapas — solo Contribuidor de AGENCIA */}
        {fSistema === 'agencia' && fRol === 'contribuidor' && (
          <div className="mb-5">
            <p className="text-[13px] text-gray-600 mb-3">Etapas asignadas</p>
            <div className="flex flex-wrap gap-2">
              {etapasActivas.map(e => {
                const on = fEtapas.includes(e.nombre);
                return (
                  <button key={e.id} type="button" onClick={() => toggleEtapa(e.nombre)}
                    className={`h-11 px-3.5 border rounded-xl text-[13px] transition ${
                      on ? 'bg-violet-50 border-violet-300 text-violet-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {e.nombre}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3">
          {formErr && <span role="alert" className="text-[13px] text-red-600 mr-auto">{formErr}</span>}
          {formOk  && <span role="status" className="text-[13px] text-green-700 mr-auto">{formOk}</span>}
          <button onClick={handleCrear} disabled={creando}
            className="h-11 px-5 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-xl flex items-center gap-2 transition disabled:opacity-50">
            <Plus size={16} />
            {creando ? 'Creando…' : 'Crear usuario'}
          </button>
        </div>
      </section>

      {/* ── Estado de carga ───────────────────────────────────────────────── */}
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

      {/* ── Tablas por sistema ────────────────────────────────────────────── */}
      {!cargando && (
        <div className="flex flex-col gap-6">
          <UsuariosTabla
            usuarios={saveanUsers}
            titulo="SAVEAN"
            chipLabel="SAVEAN"
            chipCls="bg-orange-50 text-orange-700"
            grupos={SAVEAN_GRUPOS}
            {...tableProps}
          />
          <UsuariosTabla
            usuarios={agenciaUsers}
            titulo="Agencia de Calidad San Juan"
            chipLabel="AGENCIA"
            chipCls="bg-blue-50 text-blue-700"
            grupos={AGENCIA_GRUPOS}
            {...tableProps}
          />
        </div>
      )}
    </div>
  );
}
