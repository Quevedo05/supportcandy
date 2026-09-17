import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  LogOut, AlertTriangle, Check, RefreshCw, Search,
  MapPin, Clock, Package, ChevronDown, ChevronUp, Phone,
} from 'lucide-react';

const API_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('sc_token') || '';
}

interface Transporte {
  id: string;
  numero: string;
  barreraId: string;
  barreraNombre: string;
  inspectorNombre: string;
  fechaCruce: string;
  patente: string;
  empresaOrigen: string | null;
  senasaNumero: string | null;
  telefonoChofer: string | null;
  tipoCargaDetalle: string | null;
  destinoComercial: string | null;
  destinoTipo: 'interno' | 'externo' | null;
  estado: Estado;
  fechaRecepcion: string | null;
  observaciones: string | null;
  ingresoId: string | null;
  creadoEn: string;
}

type Estado = 'en_transito' | 'recibido' | 'no_recibido' | 'alerta';

const ESTADO_CONFIG: Record<Estado, { label: string; textCls: string; bgCls: string; borderCls: string }> = {
  en_transito: {
    label: 'En tránsito',
    textCls: 'text-blue-700',
    bgCls: 'bg-blue-50',
    borderCls: 'border-blue-200',
  },
  recibido: {
    label: 'Recibido',
    textCls: 'text-green-700',
    bgCls: 'bg-green-50',
    borderCls: 'border-green-200',
  },
  no_recibido: {
    label: 'No recibido',
    textCls: 'text-gray-600',
    bgCls: 'bg-gray-50',
    borderCls: 'border-gray-200',
  },
  alerta: {
    label: 'Alerta / Fuga',
    textCls: 'text-red-700',
    bgCls: 'bg-red-50',
    borderCls: 'border-red-200',
  },
};

function tiempoTranscurrido(fechaCruce: string): string {
  const diff = Date.now() - new Date(fechaCruce).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins} min`;
  const hs = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${hs}h ${m}min` : `${hs}h`;
}

function fmtFechaHora(s: string) {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) +
    ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

// ─── Card de transporte ───────────────────────────────────────────────────────

function TransporteCard({
  transporte,
  onRecibir,
  onAlerta,
  onNoRecibido,
  marcando,
}: {
  transporte: Transporte;
  onRecibir: (id: string, obs: string) => void;
  onAlerta: (id: string, obs: string) => void;
  onNoRecibido: (id: string, obs: string) => void;
  marcando: string | null;
}) {
  const [expandido, setExpandido] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const cfg = ESTADO_CONFIG[transporte.estado];
  const esTransito = transporte.estado === 'en_transito';
  const ocupado = marcando === transporte.id;

  return (
    <div className={`rounded-2xl border overflow-hidden shadow-sm ${cfg.borderCls}`}>
      {/* Cabecera siempre visible */}
      <button
        className={`w-full text-left p-4 ${cfg.bgCls}`}
        onClick={() => setExpandido(v => !v)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl font-black text-gray-900 tracking-widest leading-none">
                {transporte.patente || '—'}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bgCls} ${cfg.textCls} border ${cfg.borderCls}`}>
                {cfg.label}
              </span>
            </div>
            {transporte.empresaOrigen && (
              <p className="text-sm text-gray-600 mt-1 font-medium truncate">{transporte.empresaOrigen}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <MapPin size={11} className="flex-shrink-0" />
                {transporte.barreraNombre}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={11} className="flex-shrink-0" />
                {tiempoTranscurrido(transporte.fechaCruce)}
              </span>
              {transporte.senasaNumero && (
                <span className="flex items-center gap-1 font-medium text-red-600">
                  <Package size={11} className="flex-shrink-0" />
                  {transporte.senasaNumero}
                </span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            {expandido
              ? <ChevronUp size={18} className="text-gray-400 mt-1" />
              : <ChevronDown size={18} className="text-gray-400 mt-1" />
            }
          </div>
        </div>
      </button>

      {/* Detalle expandible */}
      {expandido && (
        <div className="bg-white border-t border-gray-100 px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {transporte.tipoCargaDetalle && (
              <div className="col-span-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Carga</p>
                <p className="font-medium text-gray-800">{transporte.tipoCargaDetalle}</p>
              </div>
            )}
            {transporte.destinoComercial && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Destino</p>
                <p className="font-medium text-gray-800">
                  {transporte.destinoComercial}
                  {transporte.destinoTipo && (
                    <span className="text-xs text-gray-400 ml-1">({transporte.destinoTipo})</span>
                  )}
                </p>
              </div>
            )}
            {transporte.telefonoChofer && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Chofer</p>
                <a
                  href={`tel:${transporte.telefonoChofer}`}
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1.5 font-semibold text-blue-600"
                >
                  <Phone size={13} />
                  {transporte.telefonoChofer}
                </a>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Cruce</p>
              <p className="font-medium text-gray-800">{fmtFechaHora(transporte.fechaCruce)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Inspector</p>
              <p className="text-gray-600 text-xs">{transporte.inspectorNombre}</p>
            </div>
          </div>

          {transporte.observaciones && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-sm text-yellow-800">
              <p className="text-xs font-bold uppercase tracking-wide mb-0.5 text-yellow-600">Observaciones</p>
              {transporte.observaciones}
            </div>
          )}

          {/* Acciones para transportes en tránsito */}
          {esTransito && (
            <div className="space-y-3 pt-1">
              <textarea
                className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                rows={2}
                placeholder="Observaciones (opcional)..."
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onRecibir(transporte.id, observaciones)}
                  disabled={ocupado}
                  className="flex items-center justify-center gap-2 py-3.5 bg-green-500 active:bg-green-700 text-white font-black text-sm rounded-2xl transition-all disabled:opacity-40 shadow-sm"
                >
                  <Check size={20} strokeWidth={3} />
                  {ocupado ? '...' : 'Recibido'}
                </button>
                <button
                  onClick={() => onAlerta(transporte.id, observaciones)}
                  disabled={ocupado}
                  className="flex items-center justify-center gap-2 py-3.5 bg-red-500 active:bg-red-700 text-white font-black text-sm rounded-2xl transition-all disabled:opacity-40 shadow-sm"
                >
                  <AlertTriangle size={20} strokeWidth={3} />
                  {ocupado ? '...' : 'Alerta'}
                </button>
              </div>
              <button
                onClick={() => onNoRecibido(transporte.id, observaciones)}
                disabled={ocupado}
                className="w-full py-2.5 border border-gray-300 text-gray-600 font-semibold text-sm rounded-2xl transition disabled:opacity-40"
              >
                No llegó / No recibido
              </button>
            </div>
          )}

          {/* Info de recepción para transportes ya procesados */}
          {!esTransito && transporte.fechaRecepcion && (
            <p className="text-xs text-gray-400">
              Procesado el {fmtFechaHora(transporte.fechaRecepcion)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Panel principal ──────────────────────────────────────────────────────────

export function SaveanPuntoControl() {
  const { usuario, logout } = useAuth();

  const [transportes, setTransportes] = useState<Transporte[]>([]);
  const [cargando, setCargando] = useState(true);
  const [err, setErr] = useState('');
  const [tabEstado, setTabEstado] = useState<Estado>('en_transito');
  const [busqueda, setBusqueda] = useState('');
  const [marcando, setMarcando] = useState<string | null>(null);
  const [transitoCount, setTransitoCount] = useState(0);

  const cargar = useCallback(async (estadoBuscado: Estado) => {
    setCargando(true);
    setErr('');
    try {
      const params = new URLSearchParams({ estado: estadoBuscado });
      const res = await fetch(`${API_URL}/savean/punto-control/transportes?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) { setErr('Error al cargar los transportes.'); return; }
      const data: Transporte[] = await res.json();
      setTransportes(data);
      if (estadoBuscado === 'en_transito') setTransitoCount(data.length);
    } catch { setErr('Error de conexión.'); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(tabEstado); }, [cargar, tabEstado]);

  const cambiarTab = (estado: Estado) => {
    setTabEstado(estado);
    setBusqueda('');
  };

  const marcarEstado = async (id: string, endpoint: string, observaciones: string) => {
    setMarcando(id);
    try {
      const res = await fetch(`${API_URL}/savean/punto-control/transportes/${id}/${endpoint}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ observaciones }),
      });
      if (!res.ok) { setErr('Error al actualizar el transporte.'); return; }
      setTransportes(prev => prev.filter(t => t.id !== id));
      if (tabEstado === 'en_transito') setTransitoCount(c => Math.max(0, c - 1));
    } catch { setErr('Error de conexión.'); }
    finally { setMarcando(null); }
  };

  const filtrados = transportes.filter(t => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return (
      (t.patente?.toLowerCase().includes(q)) ||
      (t.empresaOrigen?.toLowerCase().includes(q)) ||
      (t.senasaNumero?.toLowerCase().includes(q)) ||
      (t.destinoComercial?.toLowerCase().includes(q))
    );
  });

  const tabs: { key: Estado; label: string }[] = [
    { key: 'en_transito', label: 'En tránsito' },
    { key: 'recibido',    label: 'Recibidos' },
    { key: 'no_recibido', label: 'No recibidos' },
    { key: 'alerta',      label: 'Alertas' },
  ];

  const tabColors: Record<Estado, { active: string; dot: string }> = {
    en_transito: { active: 'border-blue-600 text-blue-700', dot: 'bg-blue-500' },
    recibido:    { active: 'border-green-600 text-green-700', dot: 'bg-green-500' },
    no_recibido: { active: 'border-gray-500 text-gray-700', dot: 'bg-gray-400' },
    alerta:      { active: 'border-red-600 text-red-700', dot: 'bg-red-500' },
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* Header */}
      <header className="bg-red-700 text-white px-4 py-4 flex-shrink-0 shadow-md">
        <div className="flex items-start justify-between max-w-lg mx-auto">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 leading-none mb-1">SAVEAN · ACSJ</p>
            <h1 className="text-xl font-black leading-tight">Punto de Control</h1>
            <p className="text-xs opacity-60 mt-0.5">Control de cargas cárnicas — Ruta 215</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-xs opacity-80 font-semibold">{usuario?.nombre}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs bg-white/15 hover:bg-white/25 active:bg-white/30 px-3 py-1.5 rounded-xl transition font-semibold"
            >
              <LogOut size={13} /> Salir
            </button>
          </div>
        </div>
      </header>

      {/* Tabs de estado */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0 shadow-sm">
        <div className="flex overflow-x-auto max-w-lg mx-auto" style={{ scrollbarWidth: 'none' }}>
          {tabs.map(tab => {
            const isActive = tabEstado === tab.key;
            const col = tabColors[tab.key];
            return (
              <button
                key={tab.key}
                onClick={() => cambiarTab(tab.key)}
                className={`flex-shrink-0 px-4 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition whitespace-nowrap ${
                  isActive ? col.active : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
                {tab.key === 'en_transito' && transitoCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-black">
                    {transitoCount > 99 ? '99+' : transitoCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Buscador */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="Patente, empresa, SENASA..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          <button
            onClick={() => cargar(tabEstado)}
            className="flex-shrink-0 p-2.5 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-2xl transition"
            title="Actualizar"
          >
            <RefreshCw size={16} className={`text-gray-600 ${cargando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full">
        {err && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600 mb-3">{err}</div>
        )}

        {!cargando && (
          <p className="text-xs text-gray-400 mb-3">
            {filtrados.length} transporte{filtrados.length !== 1 ? 's' : ''}
            {busqueda && ` · filtrado${filtrados.length !== 1 ? 's' : ''}`}
          </p>
        )}

        {cargando && (
          <div className="text-center py-16 text-sm text-gray-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-gray-300" />
            Cargando transportes...
          </div>
        )}

        {!cargando && filtrados.length === 0 && (
          <div className="text-center py-16 text-sm text-gray-400">
            <Package size={36} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">
              {tabEstado === 'en_transito'
                ? 'No hay transportes en tránsito'
                : `No hay transportes en esta categoría`}
            </p>
            {tabEstado === 'en_transito' && (
              <p className="text-xs mt-1 text-gray-300">Los registros aparecen cuando el inspector marca carga cárnica</p>
            )}
          </div>
        )}

        <div className="space-y-3">
          {filtrados.map(t => (
            <TransporteCard
              key={t.id}
              transporte={t}
              marcando={marcando}
              onRecibir={(id, obs) => marcarEstado(id, 'recibir', obs)}
              onAlerta={(id, obs) => marcarEstado(id, 'alerta', obs)}
              onNoRecibido={(id, obs) => marcarEstado(id, 'no-recibido', obs)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
