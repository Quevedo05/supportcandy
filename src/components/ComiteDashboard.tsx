import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChevronDown, ChevronRight, Send, LogOut, ClipboardList, Paperclip, Download } from 'lucide-react';

function decodeAdjNombre(nombre: string): string {
  if (nombre.startsWith('fn:')) {
    try { return atob(nombre.slice(3)); } catch { return nombre; }
  }
  return nombre;
}

function descargarBase64(base64Input: string, filename: string, mimeType?: string) {
  try {
    let data: string;
    let mime: string;
    if (base64Input.startsWith('data:')) {
      const commaIdx = base64Input.indexOf(',');
      if (commaIdx === -1) return;
      const header = base64Input.slice(0, commaIdx);
      data = base64Input.slice(commaIdx + 1);
      const mimeMatch = header.match(/:(.*?);/);
      mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    } else if (base64Input.startsWith('2b64:')) {
      data = atob(base64Input.slice(5));
      mime = mimeType || 'application/octet-stream';
    } else {
      data = base64Input;
      mime = mimeType || 'application/octet-stream';
    }
    const byteChars = atob(data);
    const byteArr = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
    const blob = new Blob([byteArr], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'archivo';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (e) {
    console.error('Error al descargar archivo:', e);
  }
}

interface TicketComite {
  ticketId: string;
  numero: number;
  ciudadanoNombre: string;
  ciudadanoEmail: string;
  ciudadanoTelefono: string;
  ciudadanoDni: string;
  tipoTramite: string;
  numeroLegajo: string;
  numeroActa: string | null;
  descripcion: string;
  etapa: string;
  fechaCreacion: string;
  programa: string;
}

interface AdjuntoItem {
  nombre: string;
  tipo?: string;
  tamano: number;
  contenido: string;
}

interface ComentarioComite {
  id: string;
  autor: string;
  autorId: string;
  contenido: string;
  tipo: 'comentario' | 'comite';
  fecha: string;
  adjuntos: AdjuntoItem[];
}

// Parsea la descripción del ticket separando texto de adjuntos embebidos.
// Soporta tres formatos:
//   1. "Label: [Adjunto]data:..."  (misma línea)
//   2. "Label: data:..."           (sin prefijo [Adjunto])
//   3. "Label: [Adjunto]\ndata:..." (data URL en línea siguiente)
function parsearDescripcion(raw: string): { texto: string; adjuntos: { nombre: string; dataUrl: string }[] } {
  const lineas = raw.split('\n');
  const adjuntos: { nombre: string; dataUrl: string }[] = [];
  const textoLineas: string[] = [];
  let pendingLabel: string | null = null;

  for (const linea of lineas) {
    // Si la línea anterior era un label con [Adjunto] sin data URL
    if (pendingLabel !== null) {
      if (linea.trim().startsWith('data:')) {
        adjuntos.push({ nombre: pendingLabel, dataUrl: linea.trim() });
        pendingLabel = null;
        continue;
      }
      textoLineas.push(pendingLabel + ': [Adjunto]');
      pendingLabel = null;
    }

    // Formatos 1 y 2: label y data URL en la misma línea
    const matchInline = linea.match(/^(.+?): (?:\[Adjunto\])?(data:.+)$/);
    if (matchInline) {
      adjuntos.push({ nombre: matchInline[1], dataUrl: matchInline[2] });
      continue;
    }

    // Formato 3: label con [Adjunto] al final, data URL en la siguiente línea
    const matchPending = linea.match(/^(.+?): \[Adjunto\]\s*$/);
    if (matchPending) {
      pendingLabel = matchPending[1];
      continue;
    }

    textoLineas.push(linea.replace(/^Descripción: /, ''));
  }

  if (pendingLabel !== null) textoLineas.push(pendingLabel + ': [Adjunto]');

  return { texto: textoLineas.join('\n').trim(), adjuntos };
}

function formatBytes(b: number) {
  return b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function ListaAdjuntos({ adjuntos }: { adjuntos: { nombre: string; dataUrl: string; tamano?: number; tipo?: string }[] }) {
  if (adjuntos.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {adjuntos.map((adj, i) => {
        const nombreReal = decodeAdjNombre(adj.nombre);
        return (
          <button
            key={i}
            onClick={() => descargarBase64(adj.dataUrl, nombreReal, adj.tipo)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-colors"
          >
            <Download size={12} />
            <span className="font-medium">{nombreReal}</span>
            {adj.tamano !== undefined && <span className="text-gray-400">({formatBytes(adj.tamano)})</span>}
          </button>
        );
      })}
    </div>
  );
}

function TicketCard({ ticket, apiUrl, token, usuarioId }: {
  ticket: TicketComite;
  apiUrl: string;
  token: string;
  usuarioId: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [comentarios, setComentarios] = useState<ComentarioComite[]>([]);
  const [cargandoComentarios, setCargandoComentarios] = useState(false);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  const { texto: descripcionTexto, adjuntos: adjuntosTicket } = parsearDescripcion(ticket.descripcion ?? '');

  const cargarComentarios = useCallback(async () => {
    if (!abierto) return;
    setCargandoComentarios(true);
    try {
      const res = await fetch(`${apiUrl}/comite/tickets/${ticket.ticketId}/comentarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setComentarios(data.comentarios ?? []);
      }
    } finally {
      setCargandoComentarios(false);
    }
  }, [abierto, apiUrl, token, ticket.ticketId]);

  useEffect(() => { cargarComentarios(); }, [cargarComentarios]);

  const handleEnviar = async () => {
    if (!nuevoComentario.trim() || enviando) return;
    setEnviando(true);
    try {
      const res = await fetch(`${apiUrl}/comite/tickets/${ticket.ticketId}/comentarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contenido: nuevoComentario.trim() }),
      });
      if (res.ok) {
        const nuevo = await res.json();
        setComentarios((prev) => [...prev, { ...nuevo, adjuntos: [] }]);
        setNuevoComentario('');
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-400 w-10 text-right">#{ticket.numero}</span>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{ticket.ciudadanoNombre}</p>
            <p className="text-xs text-gray-500">DNI {ticket.ciudadanoDni} · {ticket.tipoTramite || '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {adjuntosTicket.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Paperclip size={12} />{adjuntosTicket.length}
            </span>
          )}
          <span className="text-xs text-gray-400">{formatFecha(ticket.fechaCreacion)}</span>
          {abierto ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
        </div>
      </button>

      {abierto && (
        <div className="border-t border-gray-100">
          {/* Info del solicitante */}
          <div className="px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-2 bg-gray-50">
            <InfoRow label="Nombre completo" value={ticket.ciudadanoNombre} />
            <InfoRow label="DNI" value={ticket.ciudadanoDni} />
            <InfoRow label="Email" value={ticket.ciudadanoEmail} />
            <InfoRow label="Teléfono" value={ticket.ciudadanoTelefono} />
            <InfoRow label="Tipo de trámite" value={ticket.tipoTramite} />
            <InfoRow label="N° de legajo" value={ticket.numeroLegajo} />
            {ticket.numeroActa && <InfoRow label="N° de acta" value={ticket.numeroActa} />}
          </div>

          {/* Descripción + adjuntos del ticket */}
          {(descripcionTexto || adjuntosTicket.length > 0) && (
            <div className="px-5 py-3 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Descripción</p>
              {descripcionTexto && <p className="text-sm text-gray-700 whitespace-pre-wrap">{descripcionTexto}</p>}
              {adjuntosTicket.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                    <Paperclip size={11} /> Adjuntos del solicitante
                  </p>
                  <ListaAdjuntos adjuntos={adjuntosTicket} />
                </div>
              )}
            </div>
          )}

          {/* Comentarios de la agencia (lectura) */}
          {!cargandoComentarios && comentarios.filter((c) => c.tipo === 'comentario').length > 0 && (
            <div className="border-t border-gray-100 px-5 py-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Comentarios del expediente</p>
              <div className="space-y-2">
                {comentarios.filter((c) => c.tipo === 'comentario').map((c) => (
                  <div key={c.id} className="rounded-lg p-3 bg-gray-50 border border-gray-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-gray-700 text-xs">{c.autor}</span>
                      <span className="text-xs text-gray-400">{formatFecha(c.fecha)}</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.contenido}</p>
                    {c.adjuntos?.length > 0 && (
                      <ListaAdjuntos adjuntos={c.adjuntos.map((a) => ({ nombre: a.nombre, dataUrl: a.contenido, tamano: a.tamano, tipo: a.tipo }))} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verificaciones del comité */}
          <div className="border-t border-gray-100 px-5 py-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Mis verificaciones</p>
            {cargandoComentarios ? (
              <p className="text-xs text-gray-400">Cargando...</p>
            ) : comentarios.filter((c) => c.tipo === 'comite').length === 0 ? (
              <p className="text-xs text-gray-400 italic">Sin verificaciones aún</p>
            ) : (
              <div className="space-y-3 mb-4">
                {comentarios.filter((c) => c.tipo === 'comite').map((c) => (
                  <div key={c.id} className={`rounded-lg p-3 text-sm ${c.autorId === usuarioId ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border border-gray-100'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-gray-800 text-xs">{c.autor}</span>
                      <span className="text-xs text-gray-400">{formatFecha(c.fecha)}</span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{c.contenido}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <textarea
                value={nuevoComentario}
                onChange={(e) => setNuevoComentario(e.target.value)}
                placeholder="Escribí tu verificación o comentario..."
                rows={3}
                className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <button
                onClick={handleEnviar}
                disabled={!nuevoComentario.trim() || enviando}
                className="self-end p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg transition-colors"
                title="Enviar verificación"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value || '—'}</p>
    </div>
  );
}

export function ComiteDashboard() {
  const { usuario, logout } = useAuth();
  const apiUrl = (import.meta.env as Record<string, string>).VITE_API_URL;
  const [tickets, setTickets] = useState<TicketComite[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarTickets = useCallback(async () => {
    const token = localStorage.getItem('sc_token');
    if (!token) return;
    setCargando(true);
    try {
      const res = await fetch(`${apiUrl}/comite/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets ?? []);
      }
    } finally {
      setCargando(false);
    }
  }, [apiUrl]);

  useEffect(() => { cargarTickets(); }, [cargarTickets]);

  const token = localStorage.getItem('sc_token') ?? '';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 rounded-xl">
              <ClipboardList size={22} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg leading-tight">Comité de Análisis</h1>
              <p className="text-xs text-gray-500">Portal de verificación de solicitantes</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{usuario?.nombre}</p>
              <p className="text-xs text-gray-400">{usuario?.email}</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Solicitudes en revisión</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {cargando ? 'Cargando...' : `${tickets.length} solicitud${tickets.length !== 1 ? 'es' : ''} pendiente${tickets.length !== 1 ? 's' : ''} de verificación`}
            </p>
          </div>
          <button
            onClick={cargarTickets}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Actualizar
          </button>
        </div>

        {cargando ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <ClipboardList size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No hay solicitudes en comité de análisis</p>
            <p className="text-sm text-gray-400 mt-1">Cuando la agencia envíe solicitudes a este estado, aparecerán aquí.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket.ticketId}
                ticket={ticket}
                apiUrl={apiUrl}
                token={token}
                usuarioId={usuario?.usuarioId ?? ''}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
