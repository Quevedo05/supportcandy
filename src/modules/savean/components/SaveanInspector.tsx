import { useState } from 'react';
import { useSavean } from '../context/SaveanContext';
import { GuiaSavean, EstadoGuia } from '../types/savean';
import {
  CheckCircle2, XCircle, Clock, AlertCircle, Search, ChevronLeft,
  Package, Truck, User, MapPin, Edit3, X, Shield, Eye,
} from 'lucide-react';

function estadoBadgeClass(estado: EstadoGuia) {
  switch (estado) {
    case 'pendiente': return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
    case 'verificada': return 'bg-green-100 text-green-800 border border-green-300';
    case 'denegada': return 'bg-red-100 text-red-800 border border-red-300';
    case 'vencida': return 'bg-gray-100 text-gray-500 border border-gray-300';
  }
}

function estadoLabel(estado: EstadoGuia) {
  switch (estado) {
    case 'pendiente': return 'Pendiente';
    case 'verificada': return 'Verificada';
    case 'denegada': return 'Denegada';
    case 'vencida': return 'Vencida';
  }
}

function EstadoBadge({ estado }: { estado: EstadoGuia }) {
  const icons: Record<EstadoGuia, JSX.Element> = {
    pendiente: <Clock size={12} />,
    verificada: <CheckCircle2 size={12} />,
    denegada: <XCircle size={12} />,
    vencida: <AlertCircle size={12} />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${estadoBadgeClass(estado)}`}>
      {icons[estado]}
      {estadoLabel(estado)}
    </span>
  );
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// ───────────────────────────── Detail view ────────────────────────────────
interface GuiaDetalleProps {
  guia: GuiaSavean;
  onVolver: () => void;
}

function GuiaDetalle({ guia, onVolver }: GuiaDetalleProps) {
  const { barreras, verificarGuia, denegarGuia, modificarYVerificarGuia, obtenerGuia } = useSavean();

  const [barreraId, setBarreraId] = useState(guia.barreraId ?? '');
  const [showDenegarModal, setShowDenegarModal] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [showModificarModal, setShowModificarModal] = useState(false);
  const [cambios, setCambios] = useState({
    transporteConductor: guia.transporteConductor,
    transporteCamionPatente: guia.transporteCamionPatente,
    transporteAcopladoPatente: guia.transporteAcopladoPatente ?? '',
    transportePrecintos: guia.transportePrecintos ?? '',
  });
  const [accion, setAccion] = useState<'ok' | 'err' | null>(null);
  const [accionMsg, setAccionMsg] = useState('');

  const barrerasActivas = barreras.filter((b) => b.activa);
  const guiaActual = obtenerGuia(guia.id) ?? guia;
  const puedeActuar = guiaActual.estado === 'pendiente';

  const handleVerificar = async () => {
    if (!barreraId) { setAccion('err'); setAccionMsg('Seleccioná una barrera antes de verificar.'); return; }
    const barrera = barreras.find((b) => b.id === barreraId);
    try {
      await verificarGuia(guiaActual.id, barreraId);
      setAccion('ok');
      setAccionMsg(`Guía verificada en ${barrera?.nombre ?? barreraId}`);
    } catch {
      setAccion('err');
      setAccionMsg('Error al verificar la guía. Intentá de nuevo.');
    }
  };

  const handleDenegar = async () => {
    if (!barreraId) { setAccion('err'); setAccionMsg('Seleccioná una barrera antes de denegar.'); return; }
    if (!motivo.trim()) return;
    const barrera = barreras.find((b) => b.id === barreraId);
    try {
      await denegarGuia(guiaActual.id, barreraId, motivo.trim());
      setShowDenegarModal(false);
      setAccion('ok');
      setAccionMsg(`Guía denegada en ${barrera?.nombre ?? barreraId}`);
    } catch {
      setAccion('err');
      setAccionMsg('Error al denegar la guía. Intentá de nuevo.');
    }
  };

  const handleModificarVerificar = async () => {
    if (!barreraId) { setAccion('err'); setAccionMsg('Seleccioná una barrera.'); return; }
    const barrera = barreras.find((b) => b.id === barreraId);
    try {
      await modificarYVerificarGuia(guiaActual.id, barreraId, cambios);
      setShowModificarModal(false);
      setAccion('ok');
      setAccionMsg(`Guía modificada y verificada en ${barrera?.nombre ?? barreraId}`);
    } catch {
      setAccion('err');
      setAccionMsg('Error al modificar la guía. Intentá de nuevo.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onVolver}
          className="flex items-center gap-1 text-orange-600 hover:text-orange-700 font-medium text-sm"
        >
          <ChevronLeft size={18} /> Volver a la lista
        </button>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{guiaActual.numero}</h2>
          <p className="text-sm text-gray-500">
            Emitida {formatFecha(guiaActual.fechaEmision)} · Vence {formatFecha(guiaActual.fechaVencimiento)}
          </p>
        </div>
        <EstadoBadge estado={guiaActual.estado} />
      </div>

      {accion && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${accion === 'ok' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          {accion === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="font-medium">{accionMsg}</span>
        </div>
      )}

      {/* Barrera selector */}
      {puedeActuar && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <label className="block text-sm font-semibold text-orange-800 mb-2">
            <Shield size={14} className="inline mr-1" />
            Barrera de control
          </label>
          <select
            value={barreraId}
            onChange={(e) => setBarreraId(e.target.value)}
            className="w-full border border-orange-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none bg-white"
          >
            <option value="">— Seleccioná tu barrera —</option>
            {barrerasActivas.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nombre}{b.ruta ? ` · ${b.ruta}` : ''}{b.departamento ? ` · Dpto. ${b.departamento}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Main info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Remitente */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <User size={16} className="text-orange-500" />
            <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Remitente</h3>
          </div>
          <p className="font-semibold text-gray-900">{guiaActual.remitenteNombre}</p>
          {guiaActual.remitenteRenspa && <p className="text-xs text-gray-500">RENSPA: {guiaActual.remitenteRenspa}</p>}
          {guiaActual.remitenteTipo && <p className="text-xs text-gray-500">Tipo: {guiaActual.remitenteTipo}</p>}
        </div>

        {/* Destinatario */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={16} className="text-orange-500" />
            <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Destinatario / Destino</h3>
          </div>
          <p className="font-semibold text-gray-900">{guiaActual.destinatarioNombre}</p>
          {guiaActual.destinoTipo === 'externo' ? (
            <>
              <p className="text-xs text-gray-500">Destino: <strong>Exportación</strong></p>
              {guiaActual.destinoPais && <p className="text-xs text-gray-500">País: {guiaActual.destinoPais}</p>}
              {guiaActual.destinoPuntoSalida && <p className="text-xs text-gray-500">Punto de salida: {guiaActual.destinoPuntoSalida}</p>}
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500">Destino: <strong>Mercado Interno</strong></p>
              {guiaActual.destinoMercadoInterno && <p className="text-xs text-gray-500">Mercado: {guiaActual.destinoMercadoInterno}</p>}
              {guiaActual.destinoProvincia && <p className="text-xs text-gray-500">Provincia: {guiaActual.destinoProvincia}</p>}
            </>
          )}
        </div>

        {/* Transporte */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Truck size={16} className="text-orange-500" />
            <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Transporte</h3>
          </div>
          <div className="space-y-1 text-sm">
            <p><span className="text-gray-500">Conductor:</span> <strong>{guiaActual.transporteConductor}</strong></p>
            {guiaActual.transporteEmpresa && <p><span className="text-gray-500">Empresa:</span> {guiaActual.transporteEmpresa}</p>}
            <p><span className="text-gray-500">Camión:</span> <strong>{guiaActual.transporteCamionPatente}</strong></p>
            {guiaActual.transporteAcopladoPatente && <p><span className="text-gray-500">Acoplado:</span> {guiaActual.transporteAcopladoPatente}</p>}
            {guiaActual.transportePrecintos && <p><span className="text-gray-500">Precintos:</span> {guiaActual.transportePrecintos}</p>}
            {guiaActual.transporteTipo && <p><span className="text-gray-500">Tipo:</span> {guiaActual.transporteTipo}</p>}
          </div>
        </div>

        {/* Inspector info (if verified/denied) */}
        {(guiaActual.estado === 'verificada' || guiaActual.estado === 'denegada') && (
          <div className={`border rounded-lg p-4 ${guiaActual.estado === 'verificada' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-3">
              <Shield size={16} className={guiaActual.estado === 'verificada' ? 'text-green-600' : 'text-red-600'} />
              <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
                {guiaActual.estado === 'verificada' ? 'Verificación' : 'Denegación'}
              </h3>
            </div>
            <div className="space-y-1 text-sm">
              {guiaActual.barrieraNombre && <p><span className="text-gray-500">Barrera:</span> <strong>{guiaActual.barrieraNombre}</strong></p>}
              {guiaActual.inspectorNombre && <p><span className="text-gray-500">Inspector:</span> {guiaActual.inspectorNombre}</p>}
              {guiaActual.fechaVerificacion && <p><span className="text-gray-500">Fecha:</span> {formatFecha(guiaActual.fechaVerificacion)}</p>}
              {guiaActual.motivoDenegacion && (
                <p className="text-red-700"><span className="text-gray-500">Motivo:</span> {guiaActual.motivoDenegacion}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Package size={16} className="text-orange-500" />
          <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Mercadería ({guiaActual.items.length} ítem{guiaActual.items.length !== 1 ? 's' : ''})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left py-2 pr-3 font-medium">Especie</th>
                <th className="text-left py-2 pr-3 font-medium">Variedad</th>
                <th className="text-left py-2 pr-3 font-medium">Envase</th>
                <th className="text-right py-2 pr-3 font-medium">Bultos</th>
                <th className="text-right py-2 font-medium">Kg</th>
              </tr>
            </thead>
            <tbody>
              {guiaActual.items.map((item) => (
                <tr key={item.id} className="border-b border-gray-50">
                  <td className="py-2 pr-3 font-medium text-gray-900">
                    {item.especieNombre ?? item.especie}
                    {item.lugarEmpaque && <span className="block text-xs text-gray-400">{item.lugarEmpaque}</span>}
                  </td>
                  <td className="py-2 pr-3 text-gray-700">{item.variedad ?? '—'}</td>
                  <td className="py-2 pr-3 text-gray-700">{item.tipoEnvase ?? '—'}</td>
                  <td className="py-2 pr-3 text-right text-gray-900">{item.cantidadBultos ?? '—'}</td>
                  <td className="py-2 text-right font-semibold text-gray-900">
                    {item.cantidadKg != null ? `${item.cantidadKg.toLocaleString('es-AR')} kg` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action buttons */}
      {puedeActuar && (
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleVerificar}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
          >
            <CheckCircle2 size={18} />
            Verificar
          </button>
          <button
            onClick={() => setShowModificarModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition"
          >
            <Edit3 size={18} />
            Modificar y Verificar
          </button>
          <button
            onClick={() => setShowDenegarModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
          >
            <XCircle size={18} />
            Denegar
          </button>
        </div>
      )}

      {/* Modal: Denegar */}
      {showDenegarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <XCircle size={20} className="text-red-500" /> Denegar Guía
              </h3>
              <button onClick={() => setShowDenegarModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Ingresá el motivo de la denegación. Esto quedará registrado en la guía.</p>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={4}
              placeholder="Describí el motivo de la denegación..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleDenegar}
                disabled={!motivo.trim()}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition"
              >
                Confirmar Denegación
              </button>
              <button
                onClick={() => setShowDenegarModal(false)}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Modificar y Verificar */}
      {showModificarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Edit3 size={20} className="text-orange-500" /> Modificar y Verificar
              </h3>
              <button onClick={() => setShowModificarModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Corregí los datos incorrectos y luego verificá la guía.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Conductor</label>
                <input
                  type="text"
                  value={cambios.transporteConductor}
                  onChange={(e) => setCambios({ ...cambios, transporteConductor: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Patente Camión</label>
                <input
                  type="text"
                  value={cambios.transporteCamionPatente}
                  onChange={(e) => setCambios({ ...cambios, transporteCamionPatente: e.target.value.toUpperCase() })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Patente Acoplado (opcional)</label>
                <input
                  type="text"
                  value={cambios.transporteAcopladoPatente}
                  onChange={(e) => setCambios({ ...cambios, transporteAcopladoPatente: e.target.value.toUpperCase() })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Precintos (opcional)</label>
                <input
                  type="text"
                  value={cambios.transportePrecintos}
                  onChange={(e) => setCambios({ ...cambios, transportePrecintos: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleModificarVerificar}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition"
              >
                Guardar y Verificar
              </button>
              <button
                onClick={() => setShowModificarModal(false)}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────────── Main inspector ─────────────────────────────
type FiltroEstado = 'todos' | EstadoGuia;

export function SaveanInspector() {
  const { guias } = useSavean();
  const [filtro, setFiltro] = useState<FiltroEstado>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [guiaSeleccionada, setGuiaSeleccionada] = useState<GuiaSavean | null>(null);

  if (guiaSeleccionada) {
    return (
      <GuiaDetalle
        guia={guiaSeleccionada}
        onVolver={() => setGuiaSeleccionada(null)}
      />
    );
  }

  const guiasFiltradas = guias
    .filter((g) => filtro === 'todos' || g.estado === filtro)
    .filter((g) => {
      if (!busqueda) return true;
      const q = busqueda.toLowerCase();
      return (
        g.numero.toLowerCase().includes(q) ||
        g.remitenteNombre.toLowerCase().includes(q) ||
        g.transporteConductor.toLowerCase().includes(q) ||
        g.transporteCamionPatente.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      // pendientes first, then by date desc
      if (a.estado === 'pendiente' && b.estado !== 'pendiente') return -1;
      if (a.estado !== 'pendiente' && b.estado === 'pendiente') return 1;
      return new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime();
    });

  const conteo = (e: FiltroEstado) =>
    e === 'todos' ? guias.length : guias.filter((g) => g.estado === e).length;

  const tabs: { key: FiltroEstado; label: string; color: string; activeClass: string }[] = [
    { key: 'todos', label: 'Todos', color: 'text-gray-700', activeClass: 'bg-gray-800 text-white' },
    { key: 'pendiente', label: 'Pendientes', color: 'text-yellow-700', activeClass: 'bg-yellow-500 text-white' },
    { key: 'verificada', label: 'Verificadas', color: 'text-green-700', activeClass: 'bg-green-600 text-white' },
    { key: 'denegada', label: 'Denegadas', color: 'text-red-700', activeClass: 'bg-red-600 text-white' },
    { key: 'vencida', label: 'Vencidas', color: 'text-gray-500', activeClass: 'bg-gray-500 text-white' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-3 rounded-xl">
          <Eye size={28} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Panel de Inspección</h2>
          <p className="text-sm text-gray-500">Verificá, denegá o modificá las guías de origen</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por número de guía, remitente, conductor o patente..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFiltro(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filtro === t.key ? t.activeClass : `bg-gray-100 ${t.color} hover:bg-gray-200`
            }`}
          >
            {t.label} <span className="ml-1 opacity-75">({conteo(t.key)})</span>
          </button>
        ))}
      </div>

      {/* Guide list */}
      {guiasFiltradas.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Clock size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-500">No hay guías en este estado</p>
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="mt-2 text-sm text-orange-600 hover:underline">
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {guiasFiltradas.map((g) => (
            <div
              key={g.id}
              onClick={() => setGuiaSeleccionada(g)}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-orange-200 transition cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="font-bold text-gray-900 text-base">{g.numero}</span>
                    <EstadoBadge estado={g.estado} />
                    {g.destinoTipo === 'externo' && (
                      <span className="text-xs bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">Exportación</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Remitente</p>
                      <p className="font-medium text-gray-800 truncate">{g.remitenteNombre}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Conductor</p>
                      <p className="font-medium text-gray-800 truncate">{g.transporteConductor}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Patente</p>
                      <p className="font-medium text-gray-800">{g.transporteCamionPatente}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Ítems / Emisión</p>
                      <p className="font-medium text-gray-800">
                        {g.items.length} ítem{g.items.length !== 1 ? 's' : ''} · {formatFecha(g.fechaEmision)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-gray-300 group-hover:text-orange-400 transition flex-shrink-0 mt-1">
                  <Eye size={18} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
