import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Database, Cpu, HardDrive, Server, Clock } from 'lucide-react';

interface Metricas {
  cpu: { pct: number; cores: number; model: string };
  mem: { total: number; used: number; pct: number };
  disk: { total: number; used: number; avail: number; pct: number } | null;
  uptime: { system: number; process: number };
  node: { version: string; platform: string };
  db: { ok: boolean };
  ts: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(bytes: number): string {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(0) + ' MB';
  return (bytes / 1e3).toFixed(0) + ' KB';
}

function fmtUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${sec % 60}s`;
}

function pctColor(pct: number): string {
  if (pct >= 85) return 'text-red-600';
  if (pct >= 65) return 'text-amber-500';
  return 'text-violet-600';
}

function barCls(pct: number): string {
  if (pct >= 85) return 'bg-red-500';
  if (pct >= 65) return 'bg-amber-400';
  return 'bg-violet-600';
}

function sparkColor(pct: number): string {
  if (pct >= 85) return '#ef4444';
  if (pct >= 65) return '#f59e0b';
  return '#7c3aed';
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Spark({ data, pct }: { data: number[]; pct: number }) {
  const W = 200, H = 40, pad = 2;
  if (data.length < 2) return <svg className="w-full h-10" viewBox={`0 0 ${W} ${H}`} />;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - 2 * pad);
    const y = H - pad - (v / max) * (H - 2 * pad);
    return `${x},${y}`;
  });
  const color = sparkColor(pct);
  const last = pts[pts.length - 1];
  const first = pts[0];
  const areaBot = `${last.split(',')[0]},${H} ${first.split(',')[0]},${H}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${pts.join(' ')} ${areaBot}`} fill={`url(#sg-${color.replace('#','')})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── MetricCard ─────────────────────────────────────────────────────────────────

function MetricCard({ label, pct, detail, history, icon, loading }: {
  label: string; pct: number | null; detail: string; history: number[];
  icon: React.ReactNode; loading: boolean;
}) {
  const p = pct ?? 0;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)] flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-400">{icon}<span className="text-[13px]">{label}</span></div>
        {loading && !pct
          ? <div className="w-12 h-6 bg-gray-100 rounded animate-pulse" />
          : <span className={`text-[22px] font-medium leading-none ${pctColor(p)}`}>{p.toFixed(1)}%</span>
        }
      </div>
      <Spark data={history.length ? history : [0]} pct={p} />
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-[2px] overflow-hidden">
          <div className={`h-full rounded-[2px] transition-all duration-500 ${barCls(p)}`} style={{ width: `${Math.min(p, 100)}%` }} />
        </div>
        <span className="text-[12px] text-gray-400 font-mono flex-none">{detail}</span>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export function SistemaSection({ activo, apiUrl, token }: {
  activo: boolean;
  apiUrl: string;
  token: string | null;
}) {
  const [m, setM]           = useState<Metricas | null>(null);
  const [error, setError]   = useState('');
  const [loading, setLoad]  = useState(true);

  const cpuH  = useRef<number[]>([]);
  const memH  = useRef<number[]>([]);
  const diskH = useRef<number[]>([]);
  const HIST  = 30;

  function push(ref: React.MutableRefObject<number[]>, v: number) {
    ref.current = [...ref.current.slice(-(HIST - 1)), v];
  }

  async function poll() {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/sistema/metricas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) { setError('deploy_pending'); setLoad(false); return; }
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: Metricas = await res.json();
      push(cpuH, data.cpu.pct);
      push(memH, data.mem.pct);
      if (data.disk) push(diskH, data.disk.pct);
      setM(data); setError('');
    } catch (e: any) {
      setError(e.message || 'Sin conexión');
    } finally {
      setLoad(false);
    }
  }

  useEffect(() => {
    if (!activo) return;
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo]);

  if (error === 'deploy_pending') {
    return (
      <div>
        <h1 className="text-[30px] font-medium tracking-[-0.025em] text-gray-900 mb-7">Sistema</h1>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-10 flex flex-col items-center gap-3 text-center shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
          <Server size={22} className="text-amber-500" />
          <h2 className="text-[16px] font-medium">Endpoint pendiente de deploy</h2>
          <p className="text-[13px] text-gray-500 max-w-sm">
            Se agregó <code className="font-mono bg-amber-100 px-1 rounded text-amber-700">/api/sistema/metricas</code> al backend.
            Hacé el push y deploy para activar las métricas en tiempo real.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-3 mb-7">
        <h1 className="text-[30px] font-medium tracking-[-0.025em] text-gray-900">Sistema</h1>
        <div className="flex items-center gap-3 text-[13px] text-gray-400">
          {error && <span className="text-red-500">{error}</span>}
          {m && <span className="font-mono">{new Date(m.ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
          {loading && <RefreshCw size={14} className="animate-spin" />}
        </div>
      </header>

      {/* Métricas CPU / RAM / Disco */}
      <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px,100%), 1fr))' }}>
        <MetricCard label="CPU" icon={<Cpu size={15} />}
          pct={m?.cpu.pct ?? null} loading={loading && !m}
          detail={m ? `${m.cpu.cores} núcleos` : '—'}
          history={cpuH.current} />
        <MetricCard label="Memoria RAM" icon={<Server size={15} />}
          pct={m?.mem.pct ?? null} loading={loading && !m}
          detail={m ? `${fmt(m.mem.used)} / ${fmt(m.mem.total)}` : '—'}
          history={memH.current} />
        {(m?.disk || diskH.current.length > 0) && (
          <MetricCard label="Disco" icon={<HardDrive size={15} />}
            pct={m?.disk?.pct ?? null} loading={false}
            detail={m?.disk ? `${fmt(m.disk.used)} / ${fmt(m.disk.total)}` : '—'}
            history={diskH.current} />
        )}
      </div>

      {/* Info secundaria */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px,100%), 1fr))' }}>
        {/* DB */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-[0_1px_2px_rgba(17,24,39,0.04)] flex items-center gap-3">
          <span className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-none ${
            m === null ? 'bg-gray-50 text-gray-400' : m.db.ok ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
          }`}>
            <Database size={17} />
          </span>
          <div>
            <p className="text-[13px] font-[500]">Base de datos</p>
            <p className={`text-[12px] ${m === null ? 'text-gray-400' : m.db.ok ? 'text-green-600' : 'text-red-500'}`}>
              {m === null ? 'Verificando…' : m.db.ok ? 'Conectada · MySQL' : 'Error de conexión'}
            </p>
          </div>
        </div>
        {/* Uptime proceso */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-[0_1px_2px_rgba(17,24,39,0.04)] flex items-center gap-3">
          <span className="w-9 h-9 rounded-[10px] bg-violet-50 text-violet-600 flex items-center justify-center flex-none">
            <Clock size={17} />
          </span>
          <div>
            <p className="text-[13px] font-[500]">Uptime proceso</p>
            <p className="text-[12px] text-gray-400 font-mono">{m ? fmtUptime(m.uptime.process) : '…'}</p>
          </div>
        </div>
        {/* Uptime sistema */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-[0_1px_2px_rgba(17,24,39,0.04)] flex items-center gap-3">
          <span className="w-9 h-9 rounded-[10px] bg-violet-50 text-violet-600 flex items-center justify-center flex-none">
            <Server size={17} />
          </span>
          <div>
            <p className="text-[13px] font-[500]">Uptime servidor</p>
            <p className="text-[12px] text-gray-400 font-mono">{m ? fmtUptime(m.uptime.system) : '…'}</p>
          </div>
        </div>
        {/* Entorno */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
          <p className="text-[13px] font-[500] mb-2">Entorno</p>
          <div className="flex flex-wrap gap-2 mb-1.5">
            <span className="font-mono text-[12px] bg-gray-50 px-2 py-0.5 rounded-[3px] text-gray-600">{m?.node.version ?? '…'}</span>
            <span className="font-mono text-[12px] bg-gray-50 px-2 py-0.5 rounded-[3px] text-gray-600">{m?.node.platform ?? '…'}</span>
          </div>
          {m?.cpu.model && (
            <p className="text-[12px] text-gray-400 truncate" title={m.cpu.model}>{m.cpu.model}</p>
          )}
        </div>
      </div>
    </div>
  );
}
