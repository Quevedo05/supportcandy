import { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { useSavean } from '../context/SaveanContext';
import { GuiaSavean, EstadoGuia, ItemMercaderia } from '../types/savean';
import {
  CheckCircle2, XCircle, Clock, AlertCircle, Search, ChevronLeft,
  Package, Truck, User, MapPin, Edit3, X, Shield, Eye, Camera,
} from 'lucide-react';

const API_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:3000/api';

// ─── QR Scanner modal ─────────────────────────────────────────────────────────
interface QRScannerProps {
  onClose: () => void;
  onFound: (guia: GuiaSavean) => void;
}

function QRScanner({ onClose, onFound }: QRScannerProps) {
  const { guias, obtenerGuiaPorNumero } = useSavean();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState('');
  const [manual, setManual] = useState('');
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  function extractToken(raw: string): string | null {
    try {
      const url = new URL(raw);
      return url.searchParams.get('verificar');
    } catch {
      return raw.length > 20 ? raw : null;
    }
  }

  const handleInput = async (raw: string) => {
    const token = extractToken(raw);
    const numero = raw.trim();

    let encontrada = token ? guias.find(g => g.token === token) : undefined;
    if (!encontrada) encontrada = obtenerGuiaPorNumero(numero);

    if (!encontrada && token) {
      try {
        setBuscando(true);
        const res = await fetch(`${API_URL}/savean/guias/token/${token}`);
        if (res.ok) encontrada = await res.json();
      } catch { /* ignore */ } finally { setBuscando(false); }
    }

    if (encontrada) {
      stopCamera();
      onFound(encontrada);
    } else {
      setErr('No se encontró la guía. Revisá el código o actualizá la lista.');
    }
  };

  const startCamera = async () => {
    setErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);

      const loop = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { rafRef.current = requestAnimationFrame(loop); return; }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          stopCamera();
          handleInput(code.data);
          return;
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setErr('No se pudo acceder a la cámara. Usá el ingreso manual.');
    }
  };

  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr('');
    try {
      const img = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code?.data) { await handleInput(code.data); return; }
      setErr('No se encontró un QR válido en la imagen.');
    } catch { setErr('Error al procesar la imagen.'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-sm mx-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Camera size={18} className="text-orange-500" /> Escanear QR
          </h3>
          <button onClick={() => { stopCamera(); onClose(); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {/* Cámara — funciona en todos los navegadores con jsQR */}
        <div className="relative w-full aspect-square bg-black rounded-xl overflow-hidden">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="w-52 h-52 border-2 border-orange-400 rounded-xl"
              style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }}
            />
          </div>
          {scanning && (
            <div className="absolute bottom-3 left-0 right-0 text-center">
              <span className="text-white text-xs bg-black/50 px-3 py-1 rounded-full">Apuntá al código QR de la guía</span>
            </div>
          )}
          {buscando && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-orange-400 border-t-transparent" />
            </div>
          )}
        </div>

        {/* Opción alternativa: foto del QR */}
        <label className="cursor-pointer flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
          <Camera size={15} /> O tomá una foto del QR
          <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
        </label>

        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}

        <div>
          <p className="text-xs text-gray-500 mb-1.5 font-medium">O ingresá el número de guía:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manual}
              onChange={e => setManual(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInput(manual)}
              placeholder="SAVEAN-2025-00001"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none"
            />
            <button
              onClick={() => handleInput(manual)}
              disabled={buscando}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white font-medium rounded-lg text-sm"
            >
              {buscando ? '...' : 'Buscar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
const TIPOS_REMITENTE_OPT = ['Galpón de Empaque', 'Cámara de Frío', 'Productor', 'Industria'];
const MERCADOS_INT_OPT = ['Depósito Mayorista', 'Mercado Concentrador', 'Supermercado', 'Industria'];
const TIPOS_ENVASE_OPT = ['Cajón', 'Bolsa', 'Bins', 'Granel', 'Bandeja', 'Otro'];

const fld = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none';
const lbl = 'block text-xs font-semibold text-gray-600 mb-1';
const sec = 'text-xs font-bold text-orange-600 uppercase tracking-wide border-b border-orange-200 pb-1 mb-3';

interface GuiaDetalleProps {
  guia: GuiaSavean;
  onVolver: () => void;
}

export function GuiaDetalle({ guia, onVolver }: GuiaDetalleProps) {
  const { barreras, verificarGuia, denegarGuia, modificarYVerificarGuia, obtenerGuia } = useSavean();

  const [barreraId, setBarreraId] = useState(guia.barreraId ?? '');
  const [guiaFresca, setGuiaFresca] = useState<GuiaSavean | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/savean/guias/token/${guia.token}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: GuiaSavean | null) => { if (data) setGuiaFresca(data); })
      .catch(() => {});
  }, [guia.token]);

  const [showDenegarModal, setShowDenegarModal] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [showModificarModal, setShowModificarModal] = useState(false);
  const [cambios, setCambios] = useState({
    remitenteNombre: guia.remitenteNombre,
    remitenteRenspa: guia.remitenteRenspa ?? '',
    remitenteTipo: guia.remitenteTipo ?? '',
    destinatarioNombre: guia.destinatarioNombre,
    destinoTipo: guia.destinoTipo as 'externo' | 'interno',
    destinoPais: guia.destinoPais ?? '',
    destinoPuntoSalida: guia.destinoPuntoSalida ?? '',
    destinoMercadoInterno: guia.destinoMercadoInterno ?? '',
    destinoProvincia: guia.destinoProvincia ?? '',
    transporteEmpresa: guia.transporteEmpresa ?? '',
    transporteConductor: guia.transporteConductor,
    transporteCamionPatente: guia.transporteCamionPatente,
    transporteAcopladoPatente: guia.transporteAcopladoPatente ?? '',
    transportePrecintos: guia.transportePrecintos ?? '',
  });
  const [itemsCambios, setItemsCambios] = useState<ItemMercaderia[]>([...guia.items]);
  const [accion, setAccion] = useState<'ok' | 'err' | null>(null);
  const [accionMsg, setAccionMsg] = useState('');

  const barrerasActivas = barreras.filter((b) => b.activa);
  const guiaActual = guiaFresca ?? obtenerGuia(guia.id) ?? guia;
  const puedeActuar = guiaActual.estado === 'pendiente';

  const actualizarItem = (idx: number, campo: keyof ItemMercaderia, valor: string | number) => {
    setItemsCambios(prev => prev.map((it, i) => i === idx ? { ...it, [campo]: valor } : it));
  };

  const handleVerificar = async () => {
    if (!barreraId) { setAccion('err'); setAccionMsg('Seleccioná una barrera antes de verificar.'); return; }
    const barrera = barreras.find((b) => b.id === barreraId);
    try {
      await verificarGuia(guiaActual.id, barreraId);
      setGuiaFresca(null);
      setAccion('ok');
      setAccionMsg(`Guía verificada en ${barrera?.nombre ?? barreraId}`);
      setTimeout(() => onVolver(), 2000);
    } catch (error) {
      setAccion('err');
      setAccionMsg((error instanceof Error ? error.message : null) || 'Error al verificar la guía. Intentá de nuevo.');
    }
  };

  const handleDenegar = async () => {
    if (!barreraId) { setAccion('err'); setAccionMsg('Seleccioná una barrera antes de denegar.'); return; }
    if (!motivo.trim()) return;
    const barrera = barreras.find((b) => b.id === barreraId);
    try {
      await denegarGuia(guiaActual.id, barreraId, motivo.trim());
      setGuiaFresca(null);
      setShowDenegarModal(false);
      setAccion('ok');
      setAccionMsg(`Guía denegada en ${barrera?.nombre ?? barreraId}`);
      setTimeout(() => onVolver(), 2000);
    } catch (error) {
      setAccion('err');
      setAccionMsg((error instanceof Error ? error.message : null) || 'Error al denegar la guía. Intentá de nuevo.');
    }
  };

  const handleModificarVerificar = async () => {
    if (!barreraId) { setAccion('err'); setAccionMsg('Seleccioná una barrera.'); return; }
    const barrera = barreras.find((b) => b.id === barreraId);
    try {
      await modificarYVerificarGuia(guiaActual.id, barreraId, { ...cambios, items: itemsCambios });
      setGuiaFresca(null);
      setShowModificarModal(false);
      setAccion('ok');
      setAccionMsg(`Guía modificada y verificada en ${barrera?.nombre ?? barreraId}`);
      setTimeout(() => onVolver(), 2000);
    } catch (error) {
      setAccion('err');
      setAccionMsg((error instanceof Error ? error.message : null) || 'Error al modificar la guía. Intentá de nuevo.');
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
          {barrerasActivas.length === 0 ? (
            <p className="text-sm text-red-600 mt-1">
              No hay barreras activas configuradas. Contactá al administrador para habilitarlas.
            </p>
          ) : (
            <select
              value={barreraId}
              onChange={(e) => setBarreraId(e.target.value)}
              className="w-full border border-orange-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none bg-white"
            >
              <option value="">— Seleccioná tu barrera —</option>
              {barrerasActivas.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nombre}
                </option>
              ))}
            </select>
          )}
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

      {/* Modal: Modificar y Verificar — todos los campos */}
      {showModificarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Edit3 size={20} className="text-orange-500" /> Modificar y Verificar
              </h3>
              <button onClick={() => setShowModificarModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-5">Corregí los datos que no coincidan y luego verificá la guía.</p>

            <div className="space-y-6">
              {/* Remitente */}
              <div>
                <p className={sec}>Remitente</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className={lbl}>Nombre / Razón Social</label>
                    <input type="text" className={fld} value={cambios.remitenteNombre}
                      onChange={e => setCambios({ ...cambios, remitenteNombre: e.target.value })} />
                  </div>
                  <div>
                    <label className={lbl}>RENSPA N°</label>
                    <input type="text" className={fld} value={cambios.remitenteRenspa}
                      onChange={e => setCambios({ ...cambios, remitenteRenspa: e.target.value })} />
                  </div>
                  <div>
                    <label className={lbl}>Tipo de Remitente</label>
                    <select className={fld} value={cambios.remitenteTipo}
                      onChange={e => setCambios({ ...cambios, remitenteTipo: e.target.value })}>
                      <option value="">— Seleccionar —</option>
                      {TIPOS_REMITENTE_OPT.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Destinatario */}
              <div>
                <p className={sec}>Destinatario</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className={lbl}>Nombre / Razón Social</label>
                    <input type="text" className={fld} value={cambios.destinatarioNombre}
                      onChange={e => setCambios({ ...cambios, destinatarioNombre: e.target.value })} />
                  </div>
                  <div>
                    <label className={lbl}>Tipo de Destino</label>
                    <select className={fld} value={cambios.destinoTipo}
                      onChange={e => setCambios({ ...cambios, destinoTipo: e.target.value as 'externo' | 'interno' })}>
                      <option value="externo">Mercado Externo</option>
                      <option value="interno">Mercado Interno</option>
                    </select>
                  </div>
                  {cambios.destinoTipo === 'externo' ? (
                    <>
                      <div>
                        <label className={lbl}>País de Destino</label>
                        <input type="text" className={fld} value={cambios.destinoPais}
                          onChange={e => setCambios({ ...cambios, destinoPais: e.target.value })} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={lbl}>Punto de Salida</label>
                        <input type="text" className={fld} value={cambios.destinoPuntoSalida}
                          onChange={e => setCambios({ ...cambios, destinoPuntoSalida: e.target.value })} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className={lbl}>Tipo de Mercado Interno</label>
                        <select className={fld} value={cambios.destinoMercadoInterno}
                          onChange={e => setCambios({ ...cambios, destinoMercadoInterno: e.target.value })}>
                          <option value="">— Seleccionar —</option>
                          {MERCADOS_INT_OPT.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={lbl}>Provincia de Destino</label>
                        <input type="text" className={fld} value={cambios.destinoProvincia}
                          onChange={e => setCambios({ ...cambios, destinoProvincia: e.target.value })} />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Ítems de mercadería */}
              <div>
                <p className={sec}>Mercadería</p>
                <div className="space-y-4">
                  {itemsCambios.map((it, idx) => (
                    <div key={it.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs font-bold text-orange-500 mb-2">Producto {idx + 1} — {it.especie}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div>
                          <label className={lbl}>Variedad</label>
                          <input type="text" className={fld} value={it.variedad ?? ''}
                            onChange={e => actualizarItem(idx, 'variedad', e.target.value)} />
                        </div>
                        <div>
                          <label className={lbl}>Tipo de Envase</label>
                          <select className={fld} value={it.tipoEnvase ?? ''}
                            onChange={e => actualizarItem(idx, 'tipoEnvase', e.target.value)}>
                            <option value="">—</option>
                            {TIPOS_ENVASE_OPT.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={lbl}>Lugar de Empaque</label>
                          <input type="text" className={fld} value={it.lugarEmpaque ?? ''}
                            onChange={e => actualizarItem(idx, 'lugarEmpaque', e.target.value)} />
                        </div>
                        <div>
                          <label className={lbl}>Cantidad (kg)</label>
                          <input type="number" className={fld} value={it.cantidadKg ?? ''}
                            onChange={e => actualizarItem(idx, 'cantidadKg', e.target.value ? Number(e.target.value) : '')} />
                        </div>
                        <div>
                          <label className={lbl}>Bultos</label>
                          <input type="number" className={fld} value={it.cantidadBultos ?? ''}
                            onChange={e => actualizarItem(idx, 'cantidadBultos', e.target.value ? Number(e.target.value) : '')} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transporte */}
              <div>
                <p className={sec}>Transporte</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Conductor</label>
                    <input type="text" className={fld} value={cambios.transporteConductor}
                      onChange={e => setCambios({ ...cambios, transporteConductor: e.target.value })} />
                  </div>
                  <div>
                    <label className={lbl}>Empresa de Transporte</label>
                    <input type="text" className={fld} value={cambios.transporteEmpresa}
                      onChange={e => setCambios({ ...cambios, transporteEmpresa: e.target.value })} />
                  </div>
                  <div>
                    <label className={lbl}>Patente Camión</label>
                    <input type="text" className={fld} value={cambios.transporteCamionPatente}
                      onChange={e => setCambios({ ...cambios, transporteCamionPatente: e.target.value.toUpperCase() })} />
                  </div>
                  <div>
                    <label className={lbl}>Patente Acoplado</label>
                    <input type="text" className={fld} value={cambios.transporteAcopladoPatente}
                      onChange={e => setCambios({ ...cambios, transporteAcopladoPatente: e.target.value.toUpperCase() })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={lbl}>Precintos</label>
                    <input type="text" className={fld} value={cambios.transportePrecintos}
                      onChange={e => setCambios({ ...cambios, transportePrecintos: e.target.value })} />
                  </div>
                </div>
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
  const { guias, errorCarga } = useSavean();
  const [filtro, setFiltro] = useState<FiltroEstado>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [guiaSeleccionada, setGuiaSeleccionada] = useState<GuiaSavean | null>(null);
  const [showScanner, setShowScanner] = useState(false);

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

      {errorCarga && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{errorCarga}</p>
        </div>
      )}

      {/* Search + Scanner */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por número, remitente, conductor o patente..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none"
          />
        </div>
        <button
          onClick={() => setShowScanner(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg text-sm transition flex-shrink-0"
          title="Escanear código QR"
        >
          <Camera size={16} />
          <span className="hidden sm:inline">Escanear QR</span>
        </button>
      </div>

      {showScanner && (
        <QRScanner
          onClose={() => setShowScanner(false)}
          onFound={(guia) => { setShowScanner(false); setGuiaSeleccionada(guia); }}
        />
      )}

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
