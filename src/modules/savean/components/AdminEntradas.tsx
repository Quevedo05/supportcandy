import { useState, useEffect } from 'react';
import { useSavean } from '../context/SaveanContext';
import { ArrowDownToLine, Search, Filter, X, ChevronDown, ChevronUp, FileDown } from 'lucide-react';

const API_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:3000/api';
function getToken() { return localStorage.getItem('sc_token') || ''; }

interface Ingreso {
  id: string;
  numero: string;
  barreraId: string;
  barreraNombre: string;
  inspectorNombre: string;
  fechaHora: string;
  actaTipo: string;
  interesadoNombre?: string;
  interesadoDni?: string;
  vehiculo?: string;
  chasis?: string;
  procedenteDe?: string;
  destino?: string;
  declaracion?: string;
  remitenteNombre?: string;
  destinatarioNombre?: string;
  destinoTipo?: string;
  productos?: { codigo: number; nombre: string; cant_bultos: number; kg_bulto: number; kg_totales: number }[];
  transporteEmpresa?: string;
  transportePatente?: string;
  emailConductor?: string;
  pdfEnviado: boolean;
}

const TIPO_LABELS: Record<string, string> = {
  inspeccion: 'Inspección', rechazo: 'Rechazo', decomiso: 'Decomiso',
  infraccion: 'Infracción', constatacion: 'Constatación',
};
const TIPO_COLORS: Record<string, string> = {
  inspeccion: 'bg-blue-100 text-blue-700', rechazo: 'bg-red-100 text-red-700',
  decomiso: 'bg-orange-100 text-orange-700', infraccion: 'bg-yellow-100 text-yellow-800',
  constatacion: 'bg-gray-100 text-gray-700',
};

function fmtFH(s: string) {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function IngresoFila({ ingreso }: { ingreso: Ingreso }) {
  const [exp, setExp] = useState(false);
  const totalKg = (ingreso.productos || []).reduce((s, p) => s + Number(p.kg_totales || 0), 0);

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setExp(v => !v)}>
        <td className="px-4 py-2.5 font-mono text-xs font-semibold text-gray-800">{ingreso.numero}</td>
        <td className="px-3 py-2.5">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIPO_COLORS[ingreso.actaTipo] || 'bg-gray-100 text-gray-600'}`}>
            {TIPO_LABELS[ingreso.actaTipo] || ingreso.actaTipo}
          </span>
        </td>
        <td className="px-3 py-2.5 text-xs text-gray-700">{ingreso.interesadoNombre || '—'}</td>
        <td className="px-3 py-2.5 text-xs text-gray-500">{ingreso.barreraNombre}</td>
        <td className="px-3 py-2.5 text-xs text-gray-500">{fmtFH(ingreso.fechaHora)}</td>
        <td className="px-3 py-2.5 text-xs text-right text-gray-400">
          {(ingreso.productos?.length ?? 0) > 0 ? `${totalKg.toFixed(0)} kg` : '—'}
        </td>
        <td className="px-3 py-2.5 text-gray-400">
          {exp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </td>
      </tr>
      {exp && (
        <tr className="bg-gray-50 border-b border-gray-200">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-3 gap-4 text-xs mb-3">
              <div><span className="text-gray-400">DNI:</span> <span className="font-medium">{ingreso.interesadoDni || '—'}</span></div>
              <div><span className="text-gray-400">Vehículo:</span> <span className="font-medium">{ingreso.vehiculo || '—'} {ingreso.chasis ? `(${ingreso.chasis})` : ''}</span></div>
              <div><span className="text-gray-400">Ruta:</span> <span className="font-medium">{ingreso.procedenteDe || '—'} → {ingreso.destino || '—'}</span></div>
              <div><span className="text-gray-400">Remitente:</span> <span className="font-medium">{ingreso.remitenteNombre || '—'}</span></div>
              <div><span className="text-gray-400">Destinatario:</span> <span className="font-medium">{ingreso.destinatarioNombre || '—'}</span></div>
              <div><span className="text-gray-400">Transporte:</span> <span className="font-medium">{ingreso.transporteEmpresa || '—'} {ingreso.transportePatente ? `· ${ingreso.transportePatente}` : ''}</span></div>
              <div><span className="text-gray-400">Inspector:</span> <span className="font-medium">{ingreso.inspectorNombre}</span></div>
              <div><span className="text-gray-400">Email conductor:</span> <span className="font-medium">{ingreso.emailConductor || '—'}</span></div>
              {ingreso.pdfEnviado && <div className="text-green-600 font-semibold">PDF enviado</div>}
            </div>
            <div className="mt-2">
              <a
                href={`${API_URL}/savean/entrada/ingresos/${ingreso.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition"
                onClick={e => {
                  e.stopPropagation();
                  const token = getToken();
                  if (!token) return;
                  e.preventDefault();
                  fetch(`${API_URL}/savean/entrada/ingresos/${ingreso.id}/pdf`, {
                    headers: { Authorization: `Bearer ${token}` },
                  }).then(r => r.blob()).then(blob => {
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                  });
                }}
              >
                <FileDown size={12} />Ver / Descargar PDF
              </a>
            </div>
            {ingreso.declaracion && (
              <div className="mb-3">
                <span className="text-gray-400 text-xs">Declaración: </span>
                <span className="text-xs text-gray-700">{ingreso.declaracion}</span>
              </div>
            )}
            {(ingreso.productos?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Productos:</p>
                <div className="flex flex-wrap gap-2">
                  {ingreso.productos!.map(p => (
                    <span key={p.codigo} className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5">
                      {p.nombre} · {p.cant_bultos} bultos · {p.kg_totales} kg
                    </span>
                  ))}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export function AdminEntradas() {
  const { barreras } = useSavean();
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [err, setErr] = useState('');

  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroBarrera, setFiltroBarrera] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const cargar = async () => {
    setCargando(true);
    setErr('');
    try {
      const params = new URLSearchParams();
      if (filtroFecha) params.set('fecha', filtroFecha);
      if (filtroBarrera) params.set('barreraId', filtroBarrera);
      if (filtroTipo) params.set('actaTipo', filtroTipo);
      const res = await fetch(`${API_URL}/savean/entrada/ingresos?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) { setErr('Error al cargar.'); return; }
      setIngresos(await res.json());
    } catch { setErr('Error de conexión.'); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, [filtroFecha, filtroBarrera, filtroTipo]);

  const limpiar = () => { setFiltroFecha(''); setFiltroBarrera(''); setFiltroTipo(''); setBusqueda(''); };
  const hayFiltros = filtroFecha || filtroBarrera || filtroTipo || busqueda;

  const filtrados = ingresos.filter(i => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return i.numero?.toLowerCase().includes(q) || i.interesadoNombre?.toLowerCase().includes(q) ||
      i.interesadoDni?.includes(q) || i.transportePatente?.toLowerCase().includes(q);
  });

  const totalKgGeneral = filtrados.reduce((s, i) =>
    s + (i.productos || []).reduce((ss, p) => ss + Number(p.kg_totales || 0), 0), 0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ArrowDownToLine size={18} className="text-green-600" />
        <h2 className="text-base font-bold text-gray-900">Actas de Entrada a la Provincia</h2>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
          <Filter size={13} />Filtros
          {hayFiltros && (
            <button onClick={limpiar} className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
              <X size={12} />Limpiar
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fecha</label>
            <input type="date" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Barrera</label>
            <select className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              value={filtroBarrera} onChange={e => setFiltroBarrera(e.target.value)}>
              <option value="">Todas</option>
              {barreras.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo</label>
            <select className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(TIPO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Buscar</label>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="w-full pl-7 pr-3 border border-gray-300 rounded-lg py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                placeholder="N°, nombre, patente..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {!cargando && filtrados.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Actas', valor: filtrados.length },
            { label: 'Con productos', valor: filtrados.filter(i => (i.productos?.length ?? 0) > 0).length },
            { label: 'Kg totales', valor: totalKgGeneral.toFixed(0) + ' kg' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{s.valor}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabla */}
      {cargando && <div className="text-center py-12 text-sm text-gray-400">Cargando...</div>}
      {err && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{err}</div>}
      {!cargando && !err && (
        filtrados.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400">
            <ArrowDownToLine size={32} className="mx-auto mb-3 text-gray-300" />
            No hay actas{hayFiltros ? ' con los filtros seleccionados' : ''}.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                  <th className="text-left px-4 py-2.5">N° Acta</th>
                  <th className="text-left px-3 py-2.5">Tipo</th>
                  <th className="text-left px-3 py-2.5">Interesado</th>
                  <th className="text-left px-3 py-2.5">Barrera</th>
                  <th className="text-left px-3 py-2.5">Fecha / Hora</th>
                  <th className="text-right px-3 py-2.5">Kg</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(i => <IngresoFila key={i.id} ingreso={i} />)}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
