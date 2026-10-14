import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MessageCircle, X, AlertCircle, Lightbulb, Send, CheckCircle2 } from 'lucide-react';

const API_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:3000/api';

type Tipo = 'problema' | 'sugerencia';

const CONFIG: Record<Tipo, {
  icon: JSX.Element;
  color: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
  placeholder: string;
  respuesta: string;
}> = {
  problema: {
    icon: <AlertCircle size={15} />,
    color: 'text-red-500',
    activeBg: 'bg-red-50',
    activeBorder: 'border-red-400',
    activeText: 'text-red-700',
    placeholder: 'Describí lo que pasó, qué estabas haciendo cuando ocurrió el error...',
    respuesta: 'Muchas gracias por reportarlo. Vamos a revisar el problema y arreglarlo lo antes posible.',
  },
  sugerencia: {
    icon: <Lightbulb size={15} />,
    color: 'text-yellow-500',
    activeBg: 'bg-yellow-50',
    activeBorder: 'border-yellow-400',
    activeText: 'text-yellow-700',
    placeholder: 'Contanos qué cambiarías o qué te gustaría que funcione distinto...',
    respuesta: 'Muchas gracias por tu sugerencia. La vamos a tener en cuenta para seguir mejorando el sistema.',
  },
};

export function FeedbackWidget() {
  const { usuario } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<Tipo>('problema');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  if (!usuario || usuario.rol === 'dev') return null;

  const abrir = () => {
    setAbierto(true);
    setEnviado(false);
    setMensaje('');
    setError('');
    setTipo('problema');
  };

  const cerrar = () => {
    setAbierto(false);
    setEnviado(false);
    setMensaje('');
    setError('');
  };

  const enviar = async () => {
    if (!mensaje.trim()) { setError('Escribí tu mensaje antes de enviar.'); return; }
    setEnviando(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sc_token') || ''}`,
        },
        body: JSON.stringify({ tipo, mensaje }),
      });
      if (!res.ok) { setError('No se pudo enviar. Intentá de nuevo.'); return; }
      setEnviado(true);
    } catch {
      setError('Error de conexión.');
    } finally {
      setEnviando(false);
    }
  };

  const cfg = CONFIG[tipo];

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={abrir}
        title="¿Experimentás algún error o tenés una sugerencia?"
        className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full bg-gray-800 hover:bg-gray-700 active:bg-gray-900 text-white shadow-lg flex items-center justify-center transition-all hover:scale-105"
      >
        <MessageCircle size={20} />
      </button>

      {/* Backdrop */}
      {abierto && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center sm:justify-end sm:pr-5 sm:pb-20"
          onClick={e => { if (e.target === e.currentTarget) cerrar(); }}
        >
          {/* Panel */}
          <div className="w-full sm:w-96 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MessageCircle size={16} className="text-gray-500" />
                <span className="font-semibold text-gray-800 text-sm">Contacto con el equipo</span>
              </div>
              <button onClick={cerrar} className="text-gray-400 hover:text-gray-600 transition">
                <X size={18} />
              </button>
            </div>

            {enviado ? (
              /* Mensaje de confirmación */
              <div className="px-5 py-8 text-center space-y-3">
                <CheckCircle2 size={40} className="mx-auto text-green-500" />
                <p className="font-semibold text-gray-800">¡Mensaje enviado!</p>
                <p className="text-sm text-gray-500 leading-relaxed">{cfg.respuesta}</p>
                <button
                  onClick={cerrar}
                  className="mt-4 px-5 py-2 bg-gray-800 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <div className="px-5 py-4 space-y-4">

                {/* Selector de tipo */}
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wide">¿Qué querés reportar?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['problema', 'sugerencia'] as Tipo[]).map(t => {
                      const c = CONFIG[t];
                      const activo = tipo === t;
                      return (
                        <button
                          key={t}
                          onClick={() => setTipo(t)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition ${
                            activo
                              ? `${c.activeBg} ${c.activeBorder} ${c.activeText}`
                              : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <span className={activo ? c.activeText : c.color}>{c.icon}</span>
                          {t === 'problema' ? 'Tengo un problema' : 'Tengo una sugerencia'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Textarea */}
                <div>
                  <textarea
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-300 text-gray-800 placeholder-gray-400"
                    rows={4}
                    placeholder={cfg.placeholder}
                    value={mensaje}
                    onChange={e => { setMensaje(e.target.value); setError(''); }}
                  />
                  {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
                </div>

                {/* Info usuario */}
                <p className="text-[11px] text-gray-400">
                  Se enviará como <strong className="text-gray-500">{usuario.nombre}</strong> · {usuario.rol} · {usuario.modulo}
                </p>

                {/* Botón enviar */}
                <button
                  onClick={enviar}
                  disabled={enviando}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-300 text-white font-semibold text-sm rounded-xl transition"
                >
                  <Send size={14} />
                  {enviando ? 'Enviando...' : 'Enviar mensaje'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
