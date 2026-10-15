import { useState, useEffect } from 'react';
import { Users, Ticket, MessageSquare, MapPin, FileText, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface Resumen {
  usuarios: number;
  tickets: number;
  feedbackNoLeido: number;
  barreras: number;
  guiasPendientes: number;
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  chip?: string;
  chipCls?: string;
  loading: boolean;
}

function StatCard({ label, value, icon, chip, chipCls, loading }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)] flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="w-9 h-9 rounded-[10px] bg-violet-50 text-violet-600 flex items-center justify-center flex-none">
          {icon}
        </span>
        {chip && (
          <span className={`px-2 py-0.5 rounded-[3px] text-[11.5px] font-[400] ${chipCls}`}>{chip}</span>
        )}
      </div>
      <div>
        {loading ? (
          <div className="h-8 w-16 bg-gray-100 rounded-[4px] animate-pulse" />
        ) : (
          <p className="text-[28px] font-medium leading-none tracking-[-0.02em] text-gray-900">{value}</p>
        )}
        <p className="text-[13px] text-gray-400 mt-1">{label}</p>
      </div>
    </div>
  );
}

export function InicioSection({ nombre, apiUrl, token }: { nombre: string; apiUrl: string; token: string | null }) {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [apiOk, setApiOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function cargar() {
      setCargando(true); setError('');
      try {
        // Check API health
        const health = await fetch(`${apiUrl.replace('/api', '')}/api/health`).then(r => r.ok);
        if (!cancelled) setApiOk(health);

        // Load resumen
        const res = await fetch(`${apiUrl}/sistema/resumen`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!cancelled) {
          if (res.ok) {
            setResumen(await res.json());
          } else {
            setError(`Error ${res.status}`);
          }
        }
      } catch (e: any) {
        if (!cancelled) { setApiOk(false); setError('Sin conexión al servidor'); }
      } finally {
        if (!cancelled) setCargando(false);
      }
    }

    cargar();
    return () => { cancelled = true; };
  }, [apiUrl, token]);

  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div>
      {/* Header */}
      <header className="mb-8">
        <p className="text-[13px] text-gray-400 mb-1">{saludo}</p>
        <h1 className="text-[32px] font-medium leading-tight tracking-[-0.03em] text-gray-900">{nombre}</h1>
        <p className="text-[14px] text-gray-400 mt-1.5">Panel de administración · Agencia de Calidad San Juan</p>
      </header>

      {/* Estado del servidor */}
      <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-[13px] mb-7 ${
        apiOk === null ? 'bg-gray-50 border-gray-100 text-gray-400' :
        apiOk ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'
      }`}>
        {apiOk === null
          ? <RefreshCw size={14} className="animate-spin flex-none" />
          : apiOk
            ? <CheckCircle2 size={14} className="flex-none" />
            : <AlertCircle size={14} className="flex-none" />
        }
        <span>
          {apiOk === null ? 'Verificando servidor…' :
           apiOk ? 'Servidor en línea · ' + new URL(apiUrl).hostname :
           'Servidor no disponible'}
        </span>
        {apiOk && (
          <span className="ml-auto font-mono text-[11.5px] text-green-600">
            {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-[13px] text-red-600 mb-5">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 mb-7" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(180px,100%), 1fr))' }}>
        <StatCard label="Usuarios activos"      value={resumen?.usuarios ?? 0}           icon={<Users size={18} />}       loading={cargando} />
        <StatCard label="Tickets abiertos"      value={resumen?.tickets ?? 0}            icon={<Ticket size={18} />}      loading={cargando} />
        <StatCard label="Feedback sin leer"     value={resumen?.feedbackNoLeido ?? 0}    icon={<MessageSquare size={18}/>} loading={cargando}
          chip={resumen && resumen.feedbackNoLeido > 0 ? 'Pendiente' : undefined}
          chipCls="bg-red-50 text-red-600" />
        <StatCard label="Barreras activas"      value={resumen?.barreras ?? 0}           icon={<MapPin size={18} />}      loading={cargando} />
        <StatCard label="Guías pendientes"      value={resumen?.guiasPendientes ?? 0}    icon={<FileText size={18} />}    loading={cargando}
          chip={resumen && resumen.guiasPendientes > 0 ? 'En revisión' : undefined}
          chipCls="bg-amber-50 text-amber-600" />
      </div>

      {/* Info */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
        <h2 className="text-[15px] font-medium mb-3 text-gray-700">Sistema</h2>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-[13px] text-gray-500">
          <span>Frontend: React 18 + Vite 5</span>
          <span>Backend: Node.js + Express</span>
          <span>DB: MySQL</span>
          <span>Deploy: Nginx · Ubuntu</span>
        </div>
      </div>
    </div>
  );
}
