import { AlertCircle, Lightbulb, Trash2, CheckCheck, RefreshCw, MessageSquare } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FeedbackItem {
  id: string;
  tipo: 'problema' | 'sugerencia';
  mensaje: string;
  usuario_nombre: string;
  usuario_email: string;
  usuario_rol: string;
  usuario_modulo: string;
  leido: number;
  creado_en: string;
}

type Filtro = 'todos' | 'problema' | 'sugerencia' | 'sinleer';

const MOD_LABEL: Record<string, string> = { tickets: 'Tickets', savean: 'SAVEAN', comite: 'Comité' };
const MOD_CLS: Record<string, string> = {
  tickets: 'bg-blue-50 text-blue-700',
  savean:  'bg-orange-50 text-orange-700',
  comite:  'bg-green-50 text-green-700',
};

// ── Componente principal ───────────────────────────────────────────────────────

export function FeedbackSection({
  items, cargando,
  onMarcarLeido, onEliminar, onRecargar,
}: {
  items: FeedbackItem[];
  cargando: boolean;
  onMarcarLeido: (id: string) => void;
  onEliminar: (id: string) => void;
  onRecargar: () => void;
}) {
  const nProb   = items.filter(m => m.tipo === 'problema').length;
  const nSug    = items.filter(m => m.tipo === 'sugerencia').length;
  const nUnread = items.filter(m => !m.leido).length;

  const [filtro, setFiltro] = React.useState<Filtro>('todos');

  const visibles = items.filter(m => {
    if (filtro === 'problema')   return m.tipo === 'problema';
    if (filtro === 'sugerencia') return m.tipo === 'sugerencia';
    if (filtro === 'sinleer')    return !m.leido;
    return true;
  });

  const tabs: { key: Filtro; label: string; n: number }[] = [
    { key: 'todos',      label: 'Todos',       n: items.length },
    { key: 'problema',   label: 'Problemas',   n: nProb },
    { key: 'sugerencia', label: 'Sugerencias', n: nSug },
    { key: 'sinleer',    label: 'Sin leer',    n: nUnread },
  ];

  function fmtDate(s: string) {
    const d = new Date(s);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) + ' · ' +
           d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[30px] font-medium leading-tight tracking-[-0.025em] text-gray-900">Feedback</h1>
          <p className="text-sm text-gray-500 mt-1">Mensajes enviados por los usuarios del sistema</p>
        </div>
        <button onClick={onRecargar}
          className="h-11 px-3.5 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition">
          <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} />
          Recargar
        </button>
      </header>

      {/* Tabs */}
      <div role="tablist" aria-label="Filtrar mensajes"
        className="inline-flex flex-wrap gap-1 p-1 bg-white border border-gray-100 rounded-[14px] shadow-[0_1px_2px_rgba(17,24,39,0.04)] mb-5">
        {tabs.map(t => (
          <button key={t.key} role="tab" aria-selected={filtro === t.key}
            onClick={() => setFiltro(t.key)}
            className={`inline-flex items-center gap-2 min-h-[44px] px-3.5 rounded-[10px] text-sm font-[400] transition ${
              filtro === t.key ? 'bg-violet-50 text-violet-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}>
            {t.label}
            <span className={`font-mono text-[12px] font-[500] px-1.5 leading-5 rounded-[3px] ${
              filtro === t.key ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {t.n}
            </span>
          </button>
        ))}
      </div>

      {/* Lista */}
      {cargando ? (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
          <RefreshCw size={18} className="animate-spin" /> Cargando…
        </div>
      ) : visibles.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-16 flex flex-col items-center gap-3 text-center shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
          <span className="w-9 h-9 rounded-[12px] bg-violet-50 text-violet-700 flex items-center justify-center">
            <MessageSquare size={18} />
          </span>
          <h2 className="text-[16px] font-medium">No hay mensajes en esta vista</h2>
          <p className="text-[13px] text-gray-400">Cuando un usuario envíe feedback desde su módulo, aparece acá.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibles.map(m => {
            const isProb = m.tipo === 'problema';
            return (
              <article key={m.id}
                className={`bg-white border border-gray-100 rounded-2xl flex gap-4 p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)] ${m.leido ? 'opacity-70' : ''}`}>
                {/* Ícono tipo */}
                <span className={`w-10 h-10 rounded-[12px] flex items-center justify-center flex-none ${isProb ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                  {isProb ? <AlertCircle size={20} /> : <Lightbulb size={20} />}
                </span>
                <div className="flex-1 min-w-0 flex flex-col gap-2.5">
                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-2">
                    {!m.leido && <span className="w-2 h-2 rounded-[1px] bg-violet-600 flex-none" aria-label="Sin leer" />}
                    <span className={`px-2 py-0.5 rounded-[3px] text-[11.5px] ${isProb ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                      {isProb ? 'Problema' : 'Sugerencia'}
                    </span>
                    <span className="text-[15px] font-[500]">{m.usuario_nombre}</span>
                    <span className="text-[13px] text-gray-400">{m.usuario_rol}</span>
                    <span className={`px-2 py-0.5 rounded-[3px] text-[11.5px] ${MOD_CLS[m.usuario_modulo] ?? 'bg-gray-100 text-gray-600'}`}>
                      {MOD_LABEL[m.usuario_modulo] ?? m.usuario_modulo}
                    </span>
                    <span className="ml-auto font-mono text-[12px] text-gray-400">{fmtDate(m.creado_en)}</span>
                  </div>
                  {/* Texto */}
                  <p className="text-sm leading-relaxed text-gray-600">{m.mensaje}</p>
                  {/* Acciones */}
                  <div className="flex flex-wrap gap-2 mt-1">
                    {!m.leido && (
                      <button onClick={() => onMarcarLeido(m.id)}
                        className="h-9 px-3.5 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition">
                        <CheckCheck size={15} /> Marcar como leído
                      </button>
                    )}
                    <button onClick={() => onEliminar(m.id)} aria-label={`Eliminar mensaje de ${m.usuario_nombre}`}
                      className="h-9 px-3.5 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 flex items-center gap-2 transition">
                      <Trash2 size={15} /> Eliminar
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Necesitamos importar React para useState
import React from 'react';
