import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Guia {
  id: string;
  numero: string;
  estado: 'pendiente' | 'verificada' | 'denegada' | 'vencida';
  fechaEmision: string;
  fechaVencimiento: string;
  remitenteNombre: string;
  destinatarioNombre: string;
  destinoTipo: string;
  barrieraNombre?: string;
  inspectorNombre?: string;
  transporteConductor: string;
  transporteCamionPatente: string;
  motivoDenegacion?: string;
}

interface Planilla {
  id: string;
  barreraNombre: string;
  fecha: string;
  horaInicio: string;
  horaCierre: string | null;
  estado: string;
  totalCount: number;
  autosCount: number;
  colectivosCount: number;
  camionesCount: number;
  conActaCount: number;
}

interface Ingreso {
  id: string;
  numero: string;
  barreraNombre: string;
  inspectorNombre: string;
  fechaHora: string;
  actaTipo: string;
  tipoProducto: string | null;
  interesadoNombre: string | null;
  noPago: boolean;
  pagoEstado: string;
}

interface Transporte {
  id: string;
  numero: string;
  barreraNombre: string;
  fechaCruce: string;
  patente: string;
  empresaOrigen: string | null;
  tipoCargaDetalle: string | null;
  destinoComercial: string | null;
  estado: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtFecha(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return iso; }
}

function fmtFechaHora(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

const ESTADO_CHIP: Record<string, string> = {
  pendiente:   'bg-amber-50 text-amber-700',
  verificada:  'bg-green-50 text-green-700',
  denegada:    'bg-red-50 text-red-600',
  vencida:     'bg-gray-100 text-gray-500',
  abierta:     'bg-blue-50 text-blue-700',
  cerrada:     'bg-gray-100 text-gray-500',
  alerta:      'bg-orange-50 text-orange-700',
  recibido:    'bg-emerald-50 text-emerald-700',
  pagado:      'bg-green-50 text-green-700',
};

function Chip({ estado }: { estado: string }) {
  const cls = ESTADO_CHIP[estado] ?? 'bg-gray-100 text-gray-500';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-[3px] text-[11.5px] capitalize ${cls}`}>
      {estado}
    </span>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="py-16 flex flex-col items-center gap-2 text-gray-400">
      <p className="text-[14px]">{msg}</p>
    </div>
  );
}

function TableHeader({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="border-b border-gray-100">
        {cols.map(c => (
          <th key={c} className="px-3 py-2.5 text-left text-[11.5px] font-[500] text-gray-400 uppercase tracking-[0.05em] whitespace-nowrap">{c}</th>
        ))}
      </tr>
    </thead>
  );
}

// ── Guías ─────────────────────────────────────────────────────────────────────

function GuiasTab({ apiUrl, token }: { apiUrl: string; token: string | null }) {
  const [guias, setGuias] = useState<Guia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${apiUrl}/savean/guias`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = await res.json();
      setGuias(d.guias ?? []);
    } catch (e: any) { setError(e.message || 'Error al cargar'); }
    finally { setLoading(false); }
  }, [apiUrl, token]);

  useEffect(() => { load(); }, [load]);

  const counts = {
    pendiente:  guias.filter(g => g.estado === 'pendiente').length,
    verificada: guias.filter(g => g.estado === 'verificada').length,
    denegada:   guias.filter(g => g.estado === 'denegada').length,
    vencida:    guias.filter(g => g.estado === 'vencida').length,
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-3">
          {Object.entries(counts).map(([e, n]) => (
            <div key={e} className="bg-white border border-gray-100 rounded-xl px-4 py-2 flex items-center gap-2 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
              <Chip estado={e} />
              <span className="text-[20px] font-medium leading-none text-gray-900">{n}</span>
            </div>
          ))}
        </div>
        <button onClick={load} className="h-9 w-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_2px_rgba(17,24,39,0.04)] overflow-hidden">
        {loading && guias.length === 0
          ? <div className="py-12 flex justify-center"><RefreshCw size={18} className="animate-spin text-gray-300" /></div>
          : guias.length === 0
            ? <EmptyState msg="No hay guías registradas" />
            : (
              <table className="w-full text-sm">
                <TableHeader cols={['Número', 'Estado', 'Fecha', 'Remitente', 'Destino', 'Inspector', '']} />
                <tbody className="divide-y divide-gray-50">
                  {guias.map(g => (
                    <>
                      <tr key={g.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-3 py-2.5 font-mono text-[12px] text-gray-700">{g.numero}</td>
                        <td className="px-3 py-2.5"><Chip estado={g.estado} /></td>
                        <td className="px-3 py-2.5 text-[13px] text-gray-500 whitespace-nowrap">{fmtFecha(g.fechaEmision)}</td>
                        <td className="px-3 py-2.5 text-[13px] max-w-[180px] truncate" title={g.remitenteNombre}>{g.remitenteNombre}</td>
                        <td className="px-3 py-2.5 text-[13px] text-gray-500 capitalize">{g.destinoTipo}</td>
                        <td className="px-3 py-2.5 text-[13px] text-gray-500">{g.inspectorNombre ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          <button onClick={() => setExpanded(expanded === g.id ? null : g.id)}
                            className="text-gray-400 hover:text-gray-700 transition">
                            {expanded === g.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </button>
                        </td>
                      </tr>
                      {expanded === g.id && (
                        <tr key={`${g.id}-detail`} className="bg-gray-50/70">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-1.5 text-[12.5px]">
                              <div><span className="text-gray-400">Destinatario:</span> <span className="text-gray-700">{g.destinatarioNombre}</span></div>
                              <div><span className="text-gray-400">Conductor:</span> <span className="text-gray-700">{g.transporteConductor}</span></div>
                              <div><span className="text-gray-400">Patente:</span> <span className="font-mono text-gray-700">{g.transporteCamionPatente}</span></div>
                              <div><span className="text-gray-400">Barrera:</span> <span className="text-gray-700">{g.barrieraNombre ?? '—'}</span></div>
                              <div><span className="text-gray-400">Vence:</span> <span className="text-gray-700">{fmtFecha(g.fechaVencimiento)}</span></div>
                              {g.motivoDenegacion && <div className="col-span-3"><span className="text-red-500">Motivo denegación:</span> <span className="text-gray-700">{g.motivoDenegacion}</span></div>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )
        }
      </div>
    </div>
  );
}

// ── Planillas ─────────────────────────────────────────────────────────────────

function PlanillasTab({ apiUrl, token }: { apiUrl: string; token: string | null }) {
  const [planillas, setPlanillas] = useState<Planilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${apiUrl}/savean/entrada/planillas`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = await res.json();
      setPlanillas(Array.isArray(d) ? d : []);
    } catch (e: any) { setError(e.message || 'Error al cargar'); }
    finally { setLoading(false); }
  }, [apiUrl, token]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5">
        <p className="text-[13px] text-gray-400">{planillas.length} planilla{planillas.length !== 1 ? 's' : ''}</p>
        <button onClick={load} className="h-9 w-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_2px_rgba(17,24,39,0.04)] overflow-hidden">
        {loading && planillas.length === 0
          ? <div className="py-12 flex justify-center"><RefreshCw size={18} className="animate-spin text-gray-300" /></div>
          : planillas.length === 0
            ? <EmptyState msg="No hay planillas registradas" />
            : (
              <table className="w-full text-sm">
                <TableHeader cols={['Barrera', 'Fecha', 'Estado', 'Total', 'Autos', 'Colect.', 'Camiones', 'Con acta']} />
                <tbody className="divide-y divide-gray-50">
                  {planillas.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-3 py-2.5 text-[13px] font-medium">{p.barreraNombre}</td>
                      <td className="px-3 py-2.5 text-[13px] text-gray-500 whitespace-nowrap">{fmtFecha(p.fecha)}</td>
                      <td className="px-3 py-2.5"><Chip estado={p.estado} /></td>
                      <td className="px-3 py-2.5 text-[13px] font-medium text-gray-900">{p.totalCount}</td>
                      <td className="px-3 py-2.5 text-[13px] text-gray-500">{p.autosCount}</td>
                      <td className="px-3 py-2.5 text-[13px] text-gray-500">{p.colectivosCount}</td>
                      <td className="px-3 py-2.5 text-[13px] text-gray-500">{p.camionesCount}</td>
                      <td className="px-3 py-2.5 text-[13px] text-gray-500">{p.conActaCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
        }
      </div>
    </div>
  );
}

// ── Ingresos / Actas ──────────────────────────────────────────────────────────

function IngresosTab({ apiUrl, token }: { apiUrl: string; token: string | null }) {
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${apiUrl}/savean/entrada/ingresos`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = await res.json();
      setIngresos(Array.isArray(d) ? d : (d.ingresos ?? []));
    } catch (e: any) { setError(e.message || 'Error al cargar'); }
    finally { setLoading(false); }
  }, [apiUrl, token]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5">
        <p className="text-[13px] text-gray-400">{ingresos.length} ingreso{ingresos.length !== 1 ? 's' : ''}</p>
        <button onClick={load} className="h-9 w-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_2px_rgba(17,24,39,0.04)] overflow-hidden">
        {loading && ingresos.length === 0
          ? <div className="py-12 flex justify-center"><RefreshCw size={18} className="animate-spin text-gray-300" /></div>
          : ingresos.length === 0
            ? <EmptyState msg="No hay ingresos registrados" />
            : (
              <table className="w-full text-sm">
                <TableHeader cols={['Número', 'Barrera', 'Fecha/Hora', 'Tipo acta', 'Producto', 'Interesado', 'Pago']} />
                <tbody className="divide-y divide-gray-50">
                  {ingresos.map(i => (
                    <tr key={i.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-3 py-2.5 font-mono text-[12px] text-gray-700">{i.numero}</td>
                      <td className="px-3 py-2.5 text-[13px]">{i.barreraNombre}</td>
                      <td className="px-3 py-2.5 text-[13px] text-gray-500 whitespace-nowrap">{fmtFechaHora(i.fechaHora)}</td>
                      <td className="px-3 py-2.5"><Chip estado={i.actaTipo} /></td>
                      <td className="px-3 py-2.5 text-[13px] text-gray-500">{i.tipoProducto ?? '—'}</td>
                      <td className="px-3 py-2.5 text-[13px] max-w-[140px] truncate" title={i.interesadoNombre ?? ''}>{i.interesadoNombre ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        {i.noPago
                          ? <Chip estado={i.pagoEstado} />
                          : <span className="text-[12px] text-gray-400">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
        }
      </div>
    </div>
  );
}

// ── Transportes / Acta cárnica ────────────────────────────────────────────────

function TransportesTab({ apiUrl, token }: { apiUrl: string; token: string | null }) {
  const [transportes, setTransportes] = useState<Transporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${apiUrl}/savean/punto-control/transportes`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = await res.json();
      setTransportes(Array.isArray(d) ? d : []);
    } catch (e: any) { setError(e.message || 'Error al cargar'); }
    finally { setLoading(false); }
  }, [apiUrl, token]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5">
        <p className="text-[13px] text-gray-400">{transportes.length} transporte{transportes.length !== 1 ? 's' : ''}</p>
        <button onClick={load} className="h-9 w-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_2px_rgba(17,24,39,0.04)] overflow-hidden">
        {loading && transportes.length === 0
          ? <div className="py-12 flex justify-center"><RefreshCw size={18} className="animate-spin text-gray-300" /></div>
          : transportes.length === 0
            ? <EmptyState msg="No hay transportes registrados" />
            : (
              <table className="w-full text-sm">
                <TableHeader cols={['Número', 'Barrera', 'Fecha', 'Patente', 'Empresa', 'Carga', 'Estado']} />
                <tbody className="divide-y divide-gray-50">
                  {transportes.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-3 py-2.5 font-mono text-[12px] text-gray-700">{t.numero}</td>
                      <td className="px-3 py-2.5 text-[13px]">{t.barreraNombre}</td>
                      <td className="px-3 py-2.5 text-[13px] text-gray-500 whitespace-nowrap">{fmtFechaHora(t.fechaCruce)}</td>
                      <td className="px-3 py-2.5 font-mono text-[12px]">{t.patente}</td>
                      <td className="px-3 py-2.5 text-[13px] text-gray-500 max-w-[120px] truncate" title={t.empresaOrigen ?? ''}>{t.empresaOrigen ?? '—'}</td>
                      <td className="px-3 py-2.5 text-[13px] text-gray-500 max-w-[140px] truncate" title={t.tipoCargaDetalle ?? ''}>{t.tipoCargaDetalle ?? '—'}</td>
                      <td className="px-3 py-2.5"><Chip estado={t.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
        }
      </div>
    </div>
  );
}

// ── DocumentosSection ─────────────────────────────────────────────────────────

type DocTab = 'guias' | 'planillas' | 'ingresos' | 'transportes';

const TABS: { key: DocTab; label: string }[] = [
  { key: 'guias',       label: 'Guías de origen' },
  { key: 'planillas',   label: 'Planillas de control' },
  { key: 'ingresos',    label: 'Ingresos / Actas' },
  { key: 'transportes', label: 'Actas cárnicas' },
];

export function DocumentosSection({ apiUrl, token }: { apiUrl: string; token: string | null }) {
  const [tab, setTab] = useState<DocTab>('guias');

  return (
    <div>
      <p className="text-[12px] font-[500] uppercase tracking-[0.08em] text-gray-400 mb-1">SAVEAN</p>
      <h1 className="text-[30px] font-medium leading-tight tracking-[-0.025em] text-gray-900 mb-6">Documentos</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`h-9 px-4 rounded-xl text-[13px] transition ${
              tab === t.key
                ? 'bg-violet-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'guias'       && <GuiasTab       apiUrl={apiUrl} token={token} />}
      {tab === 'planillas'   && <PlanillasTab   apiUrl={apiUrl} token={token} />}
      {tab === 'ingresos'    && <IngresosTab    apiUrl={apiUrl} token={token} />}
      {tab === 'transportes' && <TransportesTab apiUrl={apiUrl} token={token} />}
    </div>
  );
}
