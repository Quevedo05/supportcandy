import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, Send } from 'lucide-react';

const SOL_API = (import.meta.env as any).VITE_API_URL || 'http://localhost:3000/api';
const getSolToken = () => localStorage.getItem('sc_token') || '';

type EstadoSolicitud = 'pendiente' | 'en_proceso' | 'resuelta';
type TipoSolicitud   = 'insumos' | 'otra';

interface Solicitud {
  id: string;
  usuarioNombre: string;
  barrNombre: string;
  tipo: TipoSolicitud;
  descripcion: string;
  estado: EstadoSolicitud;
  creadoEn: string;
  resueltoEn: string | null;
  resueltoPor: string | null;
}

function EstadoBadge({ estado }: { estado: EstadoSolicitud }) {
  if (estado === 'pendiente')
    return <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full font-medium">Pendiente</span>;
  if (estado === 'en_proceso')
    return <span className="text-xs bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">En proceso</span>;
  return <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">Resuelta</span>;
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Vista inspector ──────────────────────────────────────────────────────────
export function InspectorSolicitudes() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [cargando, setCargando]       = useState(true);
  const [tipo, setTipo]               = useState<TipoSolicitud>('insumos');
  const [descripcion, setDescripcion] = useState('');
  const [enviando, setEnviando]       = useState(false);
  const [err, setErr]                 = useState('');
  const [ok, setOk]                   = useState('');

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await fetch(`${SOL_API}/savean/solicitudes`, {
        headers: { Authorization: `Bearer ${getSolToken()}` },
      });
      if (res.ok) setSolicitudes(await res.json());
    } catch { /* ignore */ } finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const enviar = async () => {
    if (!descripcion.trim()) { setErr('Describí tu solicitud.'); return; }
    setEnviando(true); setErr(''); setOk('');
    try {
      const res = await fetch(`${SOL_API}/savean/solicitudes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSolToken()}` },
        body: JSON.stringify({ tipo, descripcion: descripcion.trim() }),
      });
      if (res.ok) {
        setOk('Solicitud enviada correctamente.');
        setDescripcion('');
        setTipo('insumos');
        cargar();
      } else {
        const d = await res.json();
        setErr(d.error || 'Error al enviar la solicitud.');
      }
    } catch { setErr('Error de conexión.'); }
    finally { setEnviando(false); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Mis Solicitudes</h2>
        <p className="text-sm text-gray-400 mt-0.5">Enviá solicitudes de insumos o consultas al equipo de coordinación</p>
      </div>

      {/* Formulario */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-700">Nueva solicitud</p>

        <div className="flex gap-3">
          {([
            { key: 'insumos', label: 'Falta de insumos' },
            { key: 'otra',    label: 'Otra consulta' },
          ] as { key: TipoSolicitud; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTipo(t.key)}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition ${
                tipo === t.key
                  ? 'bg-orange-50 border-orange-400 text-orange-700'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">
            {tipo === 'insumos' ? 'Detallá qué insumos faltan' : 'Describí tu solicitud'}
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none bg-white"
            rows={4}
            placeholder={
              tipo === 'insumos'
                ? 'Ej: Faltan cintas de precinto, formularios impresos...'
                : 'Describí tu consulta o solicitud...'
            }
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
          />
        </div>

        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</p>}
        {ok  && <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">{ok}</p>}

        <button
          onClick={enviar}
          disabled={enviando}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
        >
          <Send size={15} />
          {enviando ? 'Enviando…' : 'Enviar solicitud'}
        </button>
      </div>

      {/* Historial propio */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">Mis solicitudes anteriores</p>
          <button onClick={cargar} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <RefreshCw size={12} /> Actualizar
          </button>
        </div>

        {cargando ? (
          <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
            <RefreshCw size={16} className="animate-spin" />
            <span className="text-sm">Cargando…</span>
          </div>
        ) : solicitudes.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl text-center py-8">
            <p className="text-sm text-gray-400">Aún no enviaste ninguna solicitud.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
            {solicitudes.map(s => (
              <div key={s.id} className="px-4 py-3 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <EstadoBadge estado={s.estado} />
                  <span className="text-xs text-gray-400">{fmtFecha(s.creadoEn)}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                    {s.tipo === 'insumos' ? 'Insumos' : 'Otra'}
                  </span>
                </div>
                <p className="text-sm text-gray-800">{s.descripcion}</p>
                {s.estado === 'resuelta' && s.resueltoPor && (
                  <p className="text-xs text-green-700">
                    <CheckCircle2 size={11} className="inline mr-1" />
                    Resuelta por <span className="font-medium">{s.resueltoPor}</span>
                    {s.resueltoEn && <> el {fmtFecha(s.resueltoEn)}</>}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Vista admin ──────────────────────────────────────────────────────────────
export function AdminSolicitudes() {
  const [solicitudes, setSolicitudes]       = useState<Solicitud[]>([]);
  const [cargando, setCargando]             = useState(true);
  const [filtroEstado, setFiltroEstado]     = useState<EstadoSolicitud | 'todas'>('todas');
  const [actualizandoId, setActualizandoId] = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await fetch(`${SOL_API}/savean/solicitudes`, {
        headers: { Authorization: `Bearer ${getSolToken()}` },
      });
      if (res.ok) setSolicitudes(await res.json());
    } catch { /* ignore */ } finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const cambiarEstado = async (id: string, estado: EstadoSolicitud) => {
    setActualizandoId(id);
    try {
      const res = await fetch(`${SOL_API}/savean/solicitudes/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSolToken()}` },
        body: JSON.stringify({ estado }),
      });
      if (res.ok) cargar();
    } catch { /* ignore */ } finally { setActualizandoId(null); }
  };

  const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length;
  const filtradas  = filtroEstado === 'todas' ? solicitudes : solicitudes.filter(s => s.estado === filtroEstado);

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Solicitudes de Inspectores</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {pendientes > 0
              ? `${pendientes} solicitud${pendientes > 1 ? 'es' : ''} pendiente${pendientes > 1 ? 's' : ''}`
              : 'Sin solicitudes pendientes'}
          </p>
        </div>
        <button
          onClick={cargar}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 transition hover:bg-gray-50"
        >
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'todas',      label: 'Todas' },
          { key: 'pendiente',  label: 'Pendientes' },
          { key: 'en_proceso', label: 'En proceso' },
          { key: 'resuelta',   label: 'Resueltas' },
        ] as { key: EstadoSolicitud | 'todas'; label: string }[]).map(f => (
          <button
            key={f.key}
            onClick={() => setFiltroEstado(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              filtroEstado === f.key
                ? 'bg-gray-900 text-white border-gray-900'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            {f.label}
            {f.key === 'pendiente' && pendientes > 0 && (
              <span className="ml-1.5 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendientes}
              </span>
            )}
          </button>
        ))}
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
          <RefreshCw size={18} className="animate-spin" />
          <span className="text-sm">Cargando…</span>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl text-center py-10">
          <p className="text-sm text-gray-400">
            No hay solicitudes{filtroEstado !== 'todas' ? ` con estado "${filtroEstado}"` : ''}.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
          {filtradas.map(s => (
            <div key={s.id} className="px-5 py-4 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <EstadoBadge estado={s.estado} />
                    <span className="text-sm font-semibold text-gray-900">{s.usuarioNombre}</span>
                    {s.barrNombre && <span className="text-xs text-gray-400">{s.barrNombre}</span>}
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                      {s.tipo === 'insumos' ? 'Insumos' : 'Otra'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{fmtFecha(s.creadoEn)}</p>
                </div>

                {s.estado !== 'resuelta' && (
                  <div className="flex gap-2 flex-shrink-0">
                    {s.estado === 'pendiente' && (
                      <button
                        onClick={() => cambiarEstado(s.id, 'en_proceso')}
                        disabled={actualizandoId === s.id}
                        className="text-xs border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50"
                      >
                        Tomar
                      </button>
                    )}
                    <button
                      onClick={() => cambiarEstado(s.id, 'resuelta')}
                      disabled={actualizandoId === s.id}
                      className="text-xs border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50"
                    >
                      Resolver
                    </button>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-800 leading-relaxed">{s.descripcion}</p>

              {s.estado === 'resuelta' && s.resueltoPor && (
                <p className="text-xs text-green-700">
                  <CheckCircle2 size={11} className="inline mr-1" />
                  Resuelta por <span className="font-medium">{s.resueltoPor}</span>
                  {s.resueltoEn && <> el {fmtFecha(s.resueltoEn)}</>}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
