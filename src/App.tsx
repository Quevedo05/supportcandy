import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { TicketsApp } from './components/TicketsApp';
import { SaveanApp } from './modules/savean/SaveanApp';
import { DevPanel } from './components/DevPanel';
import { ActivarCuenta } from './components/ActivarCuenta';
import { CheckCircle2, XCircle, Clock, AlertCircle, ArrowLeft, User, Truck, Package, Shield } from 'lucide-react';

// ─── Public guide verification (accessible without login) ──────────────────
function GuiaVerificacion({ token }: { token: string }) {
  const [guia, setGuia] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = (import.meta.env as any).VITE_API_URL || 'http://localhost:3000/api';
    fetch(`${apiUrl}/savean/guias/token/${token}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setGuia)
      .catch(() => setError('Guía no encontrada o código QR inválido.'))
      .finally(() => setLoading(false));
  }, [token]);

  const volver = () => window.location.replace(window.location.pathname);

  const estadoConfig: Record<string, { label: string; bg: string; icon: JSX.Element }> = {
    pendiente: { label: 'Pendiente de verificación', bg: 'bg-yellow-50 border-yellow-200', icon: <Clock size={32} className="text-yellow-500 mx-auto mb-2" /> },
    verificada: { label: 'Verificada', bg: 'bg-green-50 border-green-200', icon: <CheckCircle2 size={32} className="text-green-600 mx-auto mb-2" /> },
    denegada: { label: 'Denegada', bg: 'bg-red-50 border-red-200', icon: <XCircle size={32} className="text-red-600 mx-auto mb-2" /> },
    vencida: { label: 'Vencida', bg: 'bg-gray-50 border-gray-200', icon: <AlertCircle size={32} className="text-gray-400 mx-auto mb-2" /> },
  };

  const cfg = estadoConfig[guia?.estado] ?? estadoConfig.pendiente;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">SAVEAN · Verificación</span>
          </div>
          <button
            onClick={volver}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={16} /> Inicio
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-4">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <XCircle size={40} className="text-red-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-red-800 mb-1">Guía no encontrada</h2>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : guia ? (
          <>
            {/* Estado banner */}
            <div className={`border rounded-xl p-6 text-center ${cfg.bg}`}>
              {cfg.icon}
              <p className="font-bold text-gray-800 text-xl">{guia.numero}</p>
              <p className="text-base font-semibold mt-1">{cfg.label.toUpperCase()}</p>
              {guia.motivoDenegacion && (
                <p className="text-sm text-red-700 mt-2">Motivo: {guia.motivoDenegacion}</p>
              )}
              {guia.barrieraNombre && (
                <p className="text-xs text-gray-500 mt-1">
                  {guia.estado === 'verificada' ? 'Verificada' : 'Procesada'} en {guia.barrieraNombre}
                  {guia.inspectorNombre ? ` por ${guia.inspectorNombre}` : ''}
                </p>
              )}
            </div>

            {/* Remitente / Destinatario */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <User size={15} className="text-orange-500" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Remitente</span>
              </div>
              <p className="font-semibold text-gray-900">{guia.remitenteNombre}</p>
              {guia.remitenteTipo && <p className="text-xs text-gray-500">Tipo: {guia.remitenteTipo}</p>}
              {guia.remitenteRenspa && <p className="text-xs text-gray-500">RENSPA: {guia.remitenteRenspa}</p>}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package size={15} className="text-orange-500" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Destinatario</span>
              </div>
              <p className="font-semibold text-gray-900">{guia.destinatarioNombre}</p>
              <p className="text-xs text-gray-500">
                Destino: {guia.destinoTipo === 'externo' ? 'Exportación' : 'Mercado Interno'}
                {guia.destinoPais ? ` — ${guia.destinoPais}` : ''}
                {guia.destinoProvincia ? ` — ${guia.destinoProvincia}` : ''}
              </p>
            </div>

            {/* Transporte */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Truck size={15} className="text-orange-500" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Transporte</span>
              </div>
              <p className="text-sm"><span className="text-gray-500">Conductor:</span> <strong>{guia.transporteConductor}</strong></p>
              {guia.transporteEmpresa && <p className="text-sm"><span className="text-gray-500">Empresa:</span> {guia.transporteEmpresa}</p>}
              {guia.transporteCamionPatente && <p className="text-sm"><span className="text-gray-500">Patente:</span> <strong>{guia.transporteCamionPatente}</strong></p>}
              {guia.transportePrecintos && <p className="text-sm"><span className="text-gray-500">Precintos:</span> {guia.transportePrecintos}</p>}
            </div>

            {/* Items */}
            {guia.items?.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  Mercadería ({guia.items.length} ítem{guia.items.length !== 1 ? 's' : ''})
                </p>
                <div className="space-y-2">
                  {guia.items.map((item: any, i: number) => (
                    <div key={i} className="text-sm flex justify-between border-b border-gray-50 pb-1">
                      <span className="font-medium text-gray-800">{item.especie}{item.variedad ? ` · ${item.variedad}` : ''}</span>
                      <span className="text-gray-500">
                        {item.cantidadBultos != null ? `${item.cantidadBultos} bultos` : ''}
                        {item.cantidadKg != null ? ` · ${item.cantidadKg.toLocaleString('es-AR')} kg` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Validity */}
            <div className="text-center text-xs text-gray-400 pb-4">
              Emitida: {new Date(guia.fechaEmision).toLocaleDateString('es-AR')}
              {guia.fechaVencimiento && ` · Vence: ${new Date(guia.fechaVencimiento).toLocaleDateString('es-AR')}`}
              <br />
              <span className="font-medium">SAVEAN · Agencia de Calidad San Juan</span>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

// ─── App routing ───────────────────────────────────────────────────────────
function AppContent() {
  const { usuario } = useAuth();

  const params = new URLSearchParams(window.location.search);
  const activarToken = params.get('activar');
  if (activarToken) return <ActivarCuenta token={activarToken} />;

  const verificarToken = params.get('verificar');
  if (verificarToken) return <GuiaVerificacion token={verificarToken} />;

  if (!usuario) return <LoginPage />;

  if (usuario.rol === 'dev') return <DevPanel />;

  if (usuario.modulo === 'savean') return <SaveanApp />;

  return <TicketsApp />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
