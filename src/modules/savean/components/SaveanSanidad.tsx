import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useSavean } from '../context/SaveanContext';
import { LogOut, ArrowDownCircle, Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

const API_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
}

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
  creadoEn: string;
}

const TIPO_LABELS: Record<string, string> = {
  inspeccion: 'Inspección',
  rechazo: 'Rechazo',
  decomiso: 'Decomiso',
  infraccion: 'Infracción',
  constatacion: 'Constatación',
};

const TIPO_COLORS: Record<string, string> = {
  inspeccion: 'bg-blue-100 text-blue-700',
  rechazo: 'bg-red-100 text-red-700',
  decomiso: 'bg-orange-100 text-orange-700',
  infraccion: 'bg-yellow-100 text-yellow-800',
  constatacion: 'bg-gray-100 text-gray-700',
};

function fmtFechaHora(s: string) {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function IngresoCard({ ingreso }: { ingreso: Ingreso }) {
  const [expandido, setExpandido] = useState(false);
  const totalKg = (ingreso.productos || []).reduce((s, p) => s + Number(p.kg_totales || 0), 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-start justify-between p-4 cursor-pointer" onClick={() => setExpandido(v => !v)}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <ArrowDownCircle size={18} className="text-green-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-gray-900">{ingreso.numero}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIPO_COLORS[ingreso.actaTipo] || 'bg-gray-100 text-gray-600'}`}>
                {TIPO_LABELS[ingreso.actaTipo] || ingreso.actaTipo}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{fmtFechaHora(ingreso.fechaHora)} · {ingreso.barreraNombre}</p>
            {ingreso.interesadoNombre && (
              <p className="text-xs text-gray-600 mt-0.5 font-medium">{ingreso.interesadoNombre}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(ingreso.productos?.length ?? 0) > 0 && (
            <span className="text-xs text-gray-400">{totalKg.toFixed(0)} kg</span>
          )}
          {expandido ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {expandido && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-4 text-sm">
          {/* Datos interesado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Interesado</p>
              <p className="font-medium text-gray-800">{ingreso.interesadoNombre || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">DNI</p>
              <p className="font-medium text-gray-800">{ingreso.interesadoDni || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Vehículo / Chasis</p>
              <p className="font-medium text-gray-800">{ingreso.vehiculo || '—'} {ingreso.chasis ? `· ${ingreso.chasis}` : ''}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Procedencia → Destino</p>
              <p className="font-medium text-gray-800">{ingreso.procedenteDe || '—'} → {ingreso.destino || '—'}</p>
            </div>
          </div>

          {ingreso.declaracion && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Declaración</p>
              <p className="text-gray-700 text-xs leading-relaxed bg-gray-50 rounded p-2">{ingreso.declaracion}</p>
            </div>
          )}

          {/* Productos */}
          {(ingreso.productos?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Productos declarados</p>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                {ingreso.productos!.map(p => (
                  <div key={p.codigo} className="flex items-center justify-between px-3 py-1.5 text-xs">
                    <span className="text-gray-700">{p.nombre}</span>
                    <span className="text-gray-500">{p.cant_bultos} bultos · {p.kg_totales} kg</span>
                  </div>
                ))}
                <div className="flex justify-end px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-50">
                  Total: {totalKg.toFixed(1)} kg
                </div>
              </div>
            </div>
          )}

          {/* Transporte */}
          {(ingreso.transporteEmpresa || ingreso.transportePatente) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Empresa</p>
                <p className="font-medium text-gray-800">{ingreso.transporteEmpresa || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Patente</p>
                <p className="font-medium text-gray-800">{ingreso.transportePatente || '—'}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
            <span>Inspector: {ingreso.inspectorNombre}</span>
            {ingreso.pdfEnviado && <span className="text-green-600 font-medium">PDF enviado por email</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export function SaveanSanidad() {
  const { usuario, logout } = useAuth();
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
      if (!res.ok) { setErr('Error al cargar los ingresos.'); return; }
      const data = await res.json();
      setIngresos(data);
    } catch { setErr('Error de conexión.'); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, [filtroFecha, filtroBarrera, filtroTipo]);

  const limpiarFiltros = () => {
    setFiltroFecha('');
    setFiltroBarrera('');
    setFiltroTipo('');
    setBusqueda('');
  };

  const ingresosFiltrados = ingresos.filter(i => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return (
      i.numero?.toLowerCase().includes(q) ||
      i.interesadoNombre?.toLowerCase().includes(q) ||
      i.interesadoDni?.includes(q) ||
      i.transportePatente?.toLowerCase().includes(q)
    );
  });

  const hayFiltros = filtroFecha || filtroBarrera || filtroTipo || busqueda;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <ArrowDownCircle size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">SAVEAN · Sanidad</h1>
              <p className="text-xs text-gray-400">Panel de ingresos a la provincia</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{usuario?.nombre}</span>
            <button onClick={logout} className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition text-sm">
              <LogOut size={15} /><span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 sm:px-6 space-y-4">
        {/* Filtros */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Filter size={14} />Filtros
            {hayFiltros && (
              <button onClick={limpiarFiltros} className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
                <X size={12} />Limpiar
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fecha</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Barrera</label>
              <select className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                value={filtroBarrera} onChange={e => setFiltroBarrera(e.target.value)}>
                <option value="">Todas</option>
                {barreras.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo de acta</label>
              <select className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                <option value="">Todos</option>
                {Object.entries(TIPO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Buscar</label>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="w-full pl-7 pr-3 border border-gray-300 rounded-lg py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder="N°, nombre, DNI, patente" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Resumen */}
        {!cargando && (
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{ingresosFiltrados.length} ingreso{ingresosFiltrados.length !== 1 ? 's' : ''}</span>
            <span className="text-xs">
              {ingresosFiltrados.reduce((s, i) => s + (i.productos?.length ?? 0), 0)} productos declarados en total
            </span>
          </div>
        )}

        {/* Lista */}
        {cargando && (
          <div className="text-center py-12 text-sm text-gray-400">Cargando ingresos...</div>
        )}
        {err && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{err}</div>
        )}
        {!cargando && !err && ingresosFiltrados.length === 0 && (
          <div className="text-center py-16 text-sm text-gray-400">
            <ArrowDownCircle size={32} className="mx-auto mb-3 text-gray-300" />
            <p>No hay ingresos registrados{hayFiltros ? ' con los filtros seleccionados' : ''}.</p>
          </div>
        )}
        <div className="space-y-3">
          {ingresosFiltrados.map(i => <IngresoCard key={i.id} ingreso={i} />)}
        </div>
      </main>
    </div>
  );
}
