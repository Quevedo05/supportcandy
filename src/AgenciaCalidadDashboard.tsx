'use client';

import React, { useReducer, useMemo, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Plus, X, Search, File, RefreshCw, CheckCircle, Trash2, Pencil, UserCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useFormularios } from './context/FormulariosContext';

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1: TYPE DEFINITIONS
// ═════════════════════════════════════════════════════════════════════════════

type TicketEstado =
  | 'Solicitud inicial'
  | 'Revisión de documentación'
  | 'Veraz'
  | 'Comité de análisis'
  | 'Contrato'
  | 'Simulador'
  | 'Firma de contrato'
  | 'Certificación de firma'
  | 'Transferencia'
  | 'Seguimiento de verificable'
  | 'Cerrado';

type VistaFiltro = 'todos' | 'no_resuelto' | 'sin_asignar' | 'mio' | 'cerrado' | 'eliminado';

type TicketPrioridad = 'Normal' | 'Alta' | 'Urgente';

type TipoPrograma = string;
type TicketPrefix = string;

type CampoBusqueda = 'ID' | 'Asunto' | 'Beneficiario' | 'DNI';

interface Beneficiario {
  apellido: string;
  nombre: string;
  dni: string;
}

interface Adjunto {
  nombre: string;
  tipo: string;
  tamano: number;
  contenido?: string; // base64 data URL
}

interface Comentario {
  id: string;
  autor: string;
  autorRol?: string;
  email?: string;
  fecha: Date;
  contenido: string;
  adjuntos: Adjunto[];
  tipo?: 'comentario' | 'evento_estado' | 'evento_agente';
  estadoAnterior?: string;
  estadoNuevo?: string;
  agenteAnterior?: string;
  agenteNuevo?: string;
}

interface Ticket {
  id: string;
  prefix: TicketPrefix;
  numero: number;
  beneficiario: Beneficiario;
  asunto: string;
  programa: TipoPrograma;
  estado: TicketEstado;
  prioridad: TicketPrioridad;
  descripcion: string;
  adjuntos: Adjunto[];
  fechaCreacion: Date;
  fechaActualizacion: Date;
  comentarios: Comentario[];
  telefono?: string;
  tipoDocumento?: string;
  legajo?: string;
  tipoTramite?: string;
  datosAdicionales?: Record<string, string>;
  numeroActa?: string;
  agentes?: string[];
  emailSolicitante?: string;
  importe?: number;
  codigoExterno?: string;
  observaciones?: string;
  eliminado?: boolean;
  leido?: boolean;
}

interface FiltrosActivos {
  busqueda: string;
  campoBusqueda: CampoBusqueda;
  vista: VistaFiltro;
  programa: TipoPrograma | 'Todos';
  prioridad: TicketPrioridad | 'Todos';
}

interface ModalState {
  abierto: boolean;
  programa: TipoPrograma | '';
  estado: TicketEstado | '';
  prioridad: TicketPrioridad | '';
  beneficiario: string;
  tipoDocumento: string;
  dni: string;
  telefono: string;
  email: string;
  descripcion: string;
  errores: Record<string, string>;
  numeroActa: string;
  agentes: string;
  emailSolicitante: string;
  adjuntos: Adjunto[];
  tipoTramite: string;
  legajo: string;
  asunto: string;
}

interface DashboardState {
  tickets: Ticket[];
  cargandoTickets: boolean;
  seleccionados: Set<string>;
  filtros: FiltrosActivos;
  paginaActual: number;
  porPagina: number;
  sidebarColapsado: boolean;
  modal: ModalState;
  ticketAbierto: Ticket | null;
  comentarioNuevo: string;
  comentarioAdjuntos: Adjunto[];
}

type DashboardAction =
  | { type: 'SET_TICKETS'; payload: Ticket[] }
  | { type: 'SET_CARGANDO_TICKETS'; payload: boolean }
  | { type: 'SET_BUSQUEDA'; payload: string }
  | { type: 'SET_CAMPO_BUSQUEDA'; payload: CampoBusqueda }
  | { type: 'SET_VISTA'; payload: VistaFiltro }
  | { type: 'SET_FILTRO_PROGRAMA'; payload: TipoPrograma | 'Todos' }
  | { type: 'SET_FILTRO_PRIORIDAD'; payload: TicketPrioridad | 'Todos' }
  | { type: 'RESTABLECER_FILTROS' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_SELECCION'; payload: string }
  | { type: 'SELECCIONAR_TODOS'; payload: Ticket[] }
  | { type: 'DESELECCIONAR_TODOS' }
  | { type: 'CAMBIAR_PAGINA'; payload: number }
  | { type: 'CAMBIAR_POR_PAGINA'; payload: number }
  | { type: 'ABRIR_MODAL' }
  | { type: 'CERRAR_MODAL' }
  | { type: 'UPDATE_MODAL_FIELD'; payload: { field: string; value: unknown } }
  | { type: 'TICKET_GUARDADO'; payload: Ticket }
  | { type: 'SET_MODAL_ERRORES'; payload: Record<string, string> }
  | { type: 'ABRIR_TICKET_DETAIL'; payload: Ticket }
  | { type: 'CERRAR_TICKET_DETAIL' }
  | { type: 'SET_COMENTARIO_NUEVO'; payload: string }
  | { type: 'SET_COMENTARIO_ADJUNTOS'; payload: Adjunto[] }
  | { type: 'SET_MODAL_ADJUNTOS'; payload: Adjunto[] }
  | { type: 'AGREGAR_COMENTARIO'; payload: { autor: string; autorRol: string; adjuntos: Adjunto[] } }
  | { type: 'CAMBIAR_ESTADO_TICKET'; payload: { id: string; estado: TicketEstado; autor: string } }
  | { type: 'CAMBIAR_AGENTES_TICKET'; payload: { id: string; agentes: string[]; autor: string } }
  | { type: 'ELIMINAR_TICKET'; payload: string }
  | { type: 'ACTUALIZAR_TICKET'; payload: { id: string; fields: Partial<Ticket> } };

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2: CONSTANTS & COLOR CONFIG
// ═════════════════════════════════════════════════════════════════════════════

const ESTADO_CONFIG: Record<TicketEstado, { color: string; bg: string }> = {
  'Solicitud inicial':         { color: '#F97316', bg: '#FFF7ED' },
  'Revisión de documentación': { color: '#EAB308', bg: '#FEFCE8' },
  'Veraz':                     { color: '#06B6D4', bg: '#ECFEFF' },
  'Comité de análisis':        { color: '#8B5CF6', bg: '#F5F3FF' },
  'Contrato':                  { color: '#6366F1', bg: '#EEF2FF' },
  'Simulador':                 { color: '#3B82F6', bg: '#EFF6FF' },
  'Firma de contrato':         { color: '#EC4899', bg: '#FDF2F8' },
  'Certificación de firma':    { color: '#D946EF', bg: '#FDF4FF' },
  'Transferencia':             { color: '#22C55E', bg: '#F0FDF4' },
  'Seguimiento de verificable':{ color: '#14B8A6', bg: '#F0FDFA' },
  'Cerrado':                   { color: '#6B7280', bg: '#F9FAFB' },
};

const PRIORIDAD_CONFIG: Record<TicketPrioridad, { color: string; bg: string }> = {
  Normal: { color: '#22C55E', bg: '#F0FDF4' },
  Alta: { color: '#EAB308', bg: '#FEFCE8' },
  Urgente: { color: '#EF4444', bg: '#FEF2F2' },
};

const TIPO_TRAMITE_OPCIONES = ['N/A', 'ANR', 'COMPRA DE MATERIALES', 'CRÉDITO', 'HONORARIOS'] as const;


const ESTADOS: TicketEstado[] = [
  'Solicitud inicial',
  'Revisión de documentación',
  'Veraz',
  'Comité de análisis',
  'Contrato',
  'Simulador',
  'Firma de contrato',
  'Certificación de firma',
  'Transferencia',
  'Seguimiento de verificable',
  'Cerrado',
];

const PRIORIDADES: TicketPrioridad[] = ['Normal', 'Alta', 'Urgente'];

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3: MOCK DATA
// ═════════════════════════════════════════════════════════════════════════════


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 4: PURE HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

function formatearFecha(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatearFechaHora(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function aplicarFiltros(
  tickets: Ticket[],
  filtros: FiltrosActivos,
  usuarioNombre?: string,
): Ticket[] {
  return tickets
    .filter((t) => {
      switch (filtros.vista) {
        case 'todos':       return !t.eliminado;
        case 'no_resuelto': return !t.eliminado && t.estado !== 'Cerrado';
        case 'sin_asignar': return !t.eliminado && (!t.agentes || t.agentes.length === 0);
        case 'mio':         return !t.eliminado && !!usuarioNombre && (t.agentes ?? []).includes(usuarioNombre);
        case 'cerrado':     return !t.eliminado && t.estado === 'Cerrado';
        case 'eliminado':   return !!t.eliminado;
        default:            return !t.eliminado;
      }
    })
    .filter((t) =>
      filtros.programa === 'Todos' ? true : t.programa === filtros.programa
    )
    .filter((t) =>
      filtros.prioridad === 'Todos' ? true : t.prioridad === filtros.prioridad
    )
    .filter((t) => {
      if (!filtros.busqueda.trim()) return true;
      const q = filtros.busqueda.toLowerCase();
      switch (filtros.campoBusqueda) {
        case 'ID':
          return t.id.toLowerCase().includes(q);
        case 'Asunto':
          return t.asunto.toLowerCase().includes(q);
        case 'Beneficiario':
          return `${t.beneficiario.apellido} ${t.beneficiario.nombre}`
            .toLowerCase()
            .includes(q);
        case 'DNI':
          return t.beneficiario.dni.includes(q);
        default:
          return true;
      }
    });
}



function validarModal(modal: ModalState): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!modal.beneficiario.trim()) errores.beneficiario = 'El nombre es requerido';
  if (!modal.dni.trim()) errores.dni = 'El DNI es requerido';
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!modal.email.trim() || !emailRe.test(modal.email.trim())) errores.email = 'Email inválido';
  if (!modal.telefono.trim()) errores.telefono = 'El teléfono es requerido';
  if (!modal.programa) errores.programa = 'Seleccioná un programa';
  if (!modal.tipoTramite) errores.tipoTramite = 'Seleccioná un tipo de trámite';
  if (!modal.legajo.trim()) errores.legajo = 'El número de legajo es requerido';
  if (!modal.asunto.trim()) errores.asunto = 'El asunto es requerido';
  if (!modal.descripcion.trim()) errores.descripcion = 'La descripción es requerida';
  return errores;
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 5: SUB-COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

interface EstadoBadgeProps {
  estado: TicketEstado;
}

const EstadoBadge: React.FC<EstadoBadgeProps> = ({ estado }) => {
  const config = ESTADO_CONFIG[estado];
  return (
    <span
      style={{
        color: config.color,
        backgroundColor: config.bg,
        borderColor: config.color + '33',
      }}
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border"
    >
      <div
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      {estado}
    </span>
  );
};

interface PrioridadBadgeProps {
  prioridad: TicketPrioridad;
}

const PrioridadBadge: React.FC<PrioridadBadgeProps> = ({ prioridad }) => {
  const config = PRIORIDAD_CONFIG[prioridad];
  return (
    <span
      style={{
        color: config.color,
        backgroundColor: config.bg,
        borderColor: config.color + '33',
      }}
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
    >
      {prioridad}
    </span>
  );
};

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-cyan-500', 'bg-emerald-500',
  'bg-rose-500', 'bg-amber-500', 'bg-pink-500', 'bg-indigo-500',
];

function getAvatarColor(nombre: string): string {
  let hash = 0;
  for (const ch of nombre) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface TicketRowProps {
  ticket: Ticket;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onOpenDetail: (ticket: Ticket) => void;
  onMarkUnread: (id: string) => void;
}

const TicketRow: React.FC<TicketRowProps> = ({
  ticket,
  isSelected,
  onToggleSelect,
  onOpenDetail,
  onMarkUnread,
}) => {
  const [expandido, setExpandido] = useState(false);
  const bgClass = isSelected ? 'bg-[#FEF2F2]' : 'hover:bg-slate-50';
  const unread = !ticket.leido;
  const textWeight = unread ? 'font-semibold' : '';

  return (
    <React.Fragment>
      <tr
        className={`border-b transition-colors cursor-pointer ${bgClass}`}
        onClick={() => onOpenDetail(ticket)}
      >
        <td className="px-4 py-3 w-12" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(ticket.id)}
            className="w-4 h-4 rounded border-slate-300 cursor-pointer"
          />
        </td>
        <td
          className="px-3 py-3 w-8"
          onClick={(e) => { e.stopPropagation(); setExpandido((v) => !v); }}
        >
          <ChevronDown
            size={14}
            className={`text-slate-400 transition-transform ${expandido ? 'rotate-180' : ''}`}
          />
        </td>
        <td className={`px-4 py-3 text-sm text-slate-700 ${textWeight}`}>
          {unread && <span className="inline-block w-2 h-2 rounded-full bg-[#FF9500] mr-1.5 mb-0.5" />}
          {ticket.programa}
        </td>
        <td className={`px-4 py-3 text-sm text-slate-600 font-mono ${textWeight}`}>
          {ticket.legajo ?? '—'}
        </td>
        <td className={`px-4 py-3 text-sm text-slate-800 ${textWeight}`}>
          {ticket.beneficiario.apellido} {ticket.beneficiario.nombre}
        </td>
        <td className="px-4 py-3">
          <EstadoBadge estado={ticket.estado} />
        </td>
        <td className="px-4 py-3">
          {ticket.agentes && ticket.agentes.length > 0 ? (
            <div className="flex items-center -space-x-1.5">
              {ticket.agentes.slice(0, 3).map((agente, i) => (
                <div
                  key={i}
                  title={agente}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white ${getAvatarColor(agente)}`}
                >
                  {getInitials(agente)}
                </div>
              ))}
              {ticket.agentes.length > 3 && (
                <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center text-slate-600 text-xs font-bold ring-2 ring-white">
                  +{ticket.agentes.length - 3}
                </div>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 text-xs">
              Sin asignar
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
          {formatearFecha(ticket.fechaActualizacion)}
        </td>
      </tr>
      {expandido && (
        <tr className={`border-b ${isSelected ? 'bg-[#FEF2F2]' : 'bg-slate-50'}`}>
          <td colSpan={8} className="px-6 py-3">
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
              <div className="flex gap-2">
                <span className="text-slate-400 font-medium min-w-[90px]">Nº de Acta:</span>
                <span className="text-slate-700">{ticket.numeroActa ?? '—'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-400 font-medium min-w-[90px]">Agente/s:</span>
                <span className="text-slate-700">{ticket.agentes?.join(', ') ?? '—'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-400 font-medium min-w-[90px]">DNI:</span>
                <span className="text-slate-700">{ticket.beneficiario.dni}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-400 font-medium min-w-[90px]">Email:</span>
                <span className="text-blue-600">{ticket.emailSolicitante ?? '—'}</span>
              </div>
            </div>
            {!unread && (
              <div className="mt-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onMarkUnread(ticket.id); }}
                  className="text-xs text-slate-500 hover:text-[#FF9500] flex items-center gap-1"
                >
                  Marcar como no leído
                </button>
              </div>
            )}
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};

interface SidebarItemProps {
  label: string;
  value: VistaFiltro;
  isActive: boolean;
  count: number;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  label,
  isActive,
  count,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between transition-colors ${
        isActive
          ? 'border-l-2 border-[#FF9500] bg-orange-50 text-[#FF9500] font-semibold'
          : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      <span>{label}</span>
      {count > 0 && (
        <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
          isActive ? 'bg-orange-100 text-[#FF9500]' : 'bg-slate-100 text-slate-500'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
};

interface NuevoTicketModalProps {
  isOpen: boolean;
  modal: ModalState;
  onClose: () => void;
  onUpdateField: (field: string, value: unknown) => void;
  onAdjuntosChange: (adjuntos: Adjunto[]) => void;
  onSubmit: () => void;
  guardando: boolean;
  todosLosProgramas: string[];
}

const NuevoTicketModal: React.FC<NuevoTicketModalProps> = ({
  isOpen,
  modal,
  onClose,
  onUpdateField,
  onAdjuntosChange,
  onSubmit,
  guardando,
  todosLosProgramas,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const contenido = e.target?.result as string;
        onAdjuntosChange([...modal.adjuntos, { nombre: file.name, tipo: file.type, tamano: file.size, contenido }]);
      };
      reader.readAsDataURL(file);
    });
  };

  if (!isOpen) return null;

  const campo = (
    label: string,
    field: string,
    tipo: 'text' | 'email' | 'textarea' = 'text',
    opciones?: { placeholder?: string; requerido?: boolean }
  ) => {
    const requerido = opciones?.requerido !== false;
    const error = modal.errores[field];
    const cls = `w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#FF9500] ${
      error ? 'border-red-400 bg-red-50' : 'border-slate-300'
    }`;
    return (
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label}{requerido && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {tipo === 'textarea' ? (
          <textarea
            value={String((modal as unknown as Record<string, unknown>)[field] ?? '')}
            onChange={(e) => onUpdateField(field, e.target.value)}
            placeholder={opciones?.placeholder}
            rows={4}
            className={cls + ' resize-none'}
          />
        ) : (
          <input
            type={tipo}
            value={String((modal as unknown as Record<string, unknown>)[field] ?? '')}
            onChange={(e) => onUpdateField(field, e.target.value)}
            placeholder={opciones?.placeholder}
            className={cls}
          />
        )}
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Nuevo Ticket</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Fila 1: Nombre + DNI */}
          <div className="grid grid-cols-2 gap-4">
            {campo('Nombre del solicitante', 'beneficiario', 'text', { placeholder: 'Ej: Laura Gómez' })}
            {campo('DNI del solicitante', 'dni', 'text', { placeholder: 'Número de documento' })}
          </div>

          {/* Fila 2: Email + Teléfono */}
          <div className="grid grid-cols-2 gap-4">
            {campo('Dirección de correo electrónico', 'email', 'email', { placeholder: 'correo@ejemplo.com' })}
            {campo('Teléfono', 'telefono', 'text', { placeholder: 'Ej: 2645123456' })}
          </div>

          {/* Fila 3: Tipo de programa + Tipo de trámite */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tipo de programa<span className="text-red-500 ml-0.5">*</span>
              </label>
              <select
                value={modal.programa}
                onChange={(e) => onUpdateField('programa', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#FF9500] ${
                  modal.errores.programa ? 'border-red-400 bg-red-50' : 'border-slate-300'
                }`}
              >
                <option value="">Por favor seleccione el tipo de programa</option>
                {todosLosProgramas.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {modal.errores.programa && (
                <p className="text-xs text-red-600 mt-1">{modal.errores.programa}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tipo de trámite<span className="text-red-500 ml-0.5">*</span>
              </label>
              <select
                value={modal.tipoTramite}
                onChange={(e) => onUpdateField('tipoTramite', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#FF9500] ${
                  modal.errores.tipoTramite ? 'border-red-400 bg-red-50' : 'border-slate-300'
                }`}
              >
                <option value=""></option>
                {TIPO_TRAMITE_OPCIONES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {modal.errores.tipoTramite && (
                <p className="text-xs text-red-600 mt-1">{modal.errores.tipoTramite}</p>
              )}
            </div>
          </div>

          {/* Fila 4: Nº Legajo + Nº Acta */}
          <div className="grid grid-cols-2 gap-4">
            {campo('Número de legajo', 'legajo', 'text', { placeholder: 'Ingrese el número de legajo interno' })}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Número de Acta <span className="text-slate-400 font-normal text-xs">(opcional)</span>
              </label>
              <input
                type="text"
                value={modal.numeroActa}
                onChange={(e) => onUpdateField('numeroActa', e.target.value)}
                placeholder="Ej: NOTA DEL 15/05/26"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#FF9500]"
              />
            </div>
          </div>

          {/* Asunto */}
          {campo('Asunto', 'asunto', 'text', { placeholder: 'Breve descripción del ticket' })}

          {/* Descripción */}
          {campo('Descripción', 'descripcion', 'textarea', { placeholder: 'Descripción detallada del ticket' })}

          {/* Adjuntos */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Adjuntar archivos <span className="text-slate-400 font-normal text-xs">(opcional)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <div
              className="border-2 border-dashed border-slate-300 rounded-md p-5 text-center cursor-pointer hover:border-[#FF9500] hover:bg-orange-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            >
              <File className="w-7 h-7 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600">
                Arrastrá archivos aquí o <span className="text-[#FF9500] font-medium">seleccioná archivos</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">PDF, Word, Excel, imágenes</p>
            </div>
            {modal.adjuntos.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {modal.adjuntos.map((adj, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-3 py-1.5">
                    <File size={14} className="text-slate-500 flex-shrink-0" />
                    <span className="text-xs text-slate-700 flex-1 truncate">{adj.nombre}</span>
                    <span className="text-xs text-slate-400">{(adj.tamano / 1024).toFixed(0)} KB</span>
                    <button
                      onClick={() => onAdjuntosChange(modal.adjuntos.filter((_, j) => j !== i))}
                      className="text-slate-400 hover:text-red-500 ml-1"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-end px-6 py-4 border-t border-slate-200">
          <button
            onClick={onClose}
            disabled={guardando}
            className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={guardando}
            className="px-4 py-2 text-sm font-medium text-white bg-[#FF9500] rounded-md hover:bg-[#E67E00] disabled:opacity-60 flex items-center gap-2"
          >
            {guardando && <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {guardando ? 'Guardando...' : 'Guardar Ticket'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface BulkActionBarProps {
  count: number;
  onClearSelection: () => void;
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({ count, onClearSelection }) => {
  return (
    <div className="bg-gradient-to-r from-slate-700 to-blue-800 text-white px-6 py-3 flex items-center gap-4 rounded-b-lg">
      <span className="text-sm font-medium">{count} tickets seleccionados</span>
      <div className="flex-1" />
      <button className="text-sm px-3 py-1 hover:bg-white/10 rounded">
        Cambiar estado
      </button>
      <button className="text-sm px-3 py-1 hover:bg-white/10 rounded">
        Asignar prioridad
      </button>
      <button
        onClick={onClearSelection}
        className="text-sm px-3 py-1 hover:bg-white/10 rounded"
      >
        Limpiar
      </button>
    </div>
  );
};

interface TicketDetailModalProps {
  ticket: Ticket | null;
  onClose: () => void;
  comentarioNuevo: string;
  comentarioAdjuntos: Adjunto[];
  onCommentChange: (text: string) => void;
  onAdjuntosChange: (adj: Adjunto[]) => void;
  onAddComment: (autorRol: string, adjuntos: Adjunto[]) => void;
  onChangeEstado: (id: string, estado: TicketEstado) => void;
  onChangeAgentes: (id: string, agentes: string[]) => void;
  onEliminarTicket: (id: string) => void;
  onNuevoTicket: () => void;
  onActualizarTicket: (id: string, fields: Partial<Ticket>) => void;
  operativos: { usuarioId: string; nombre: string }[];
}

const ROL_LABELS: Record<string, string> = {
  admin: 'Supervisor', contribuidor: 'Operativo',
  inspector: 'Inspector', dev: 'Desarrollador',
};

function formatBytes(b: number) {
  return b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  onClose,
  comentarioNuevo,
  comentarioAdjuntos,
  onCommentChange,
  onAdjuntosChange,
  onAddComment,
  onChangeEstado,
  onChangeAgentes,
  onEliminarTicket,
  onNuevoTicket,
  onActualizarTicket,
  operativos,
}) => {
  const { usuario } = useAuth();
  const { formularios, obtenerCampos } = useFormularios();
  const [editandoEstado, setEditandoEstado] = useState(false);
  const [estadoTmp, setEstadoTmp] = useState<TicketEstado | ''>('');
  const [derivarAbierto, setDerivarAbierto] = useState(false);
  const [pendingAgente, setPendingAgente] = useState<{ nombre: string; accion: 'asignar' | 'quitar' | 'derivar' } | null>(null);
  const [editandoSolicitud, setEditandoSolicitud] = useState(false);
  const [solicitudTmp, setSolicitudTmp] = useState({ nombre: '', dni: '', email: '', telefono: '' });
  const [editandoLegajo, setEditandoLegajo] = useState(false);
  const [legajoTmp, setLegajoTmp] = useState({ legajo: '', numeroActa: '', importe: '', codigoExterno: '' });
  const [editandoObservaciones, setEditandoObservaciones] = useState(false);
  const [observacionesTmp, setObservacionesTmp] = useState('');
  const [editandoCampos, setEditandoCampos] = useState(false);
  const [camposTmp, setCamposTmp] = useState<Record<string, string>>({});
  const [adjuntosTmp, setAdjuntosTmp] = useState<Record<string, string>>({});
  const adjuntosCamposRef = React.useRef<HTMLInputElement>(null);
  const [seccionesAbiertas, setSeccionesAbiertas] = useState<Record<string, boolean>>({
    solicitud: true, campos: true, legajo: true, asignaciones: true, observaciones: true, auditoria: false,
  });
  const adjuntosRef = React.useRef<HTMLInputElement>(null);

  if (!ticket) return null;

  const autorRol = usuario ? (ROL_LABELS[usuario.rol] ?? usuario.rol) : '';
  const puedeEditarTicket =
    usuario?.rol === 'admin' ||
    (ticket.agentes ?? []).includes(usuario?.nombre ?? '') ||
    usuario?.puedeEditarDatos === true;
  const puedeEditarDatos =
    usuario?.rol === 'admin' ||
    usuario?.puedeEditarDatos === true;
  const puedeComentarUser = puedeEditarTicket;

  const toggleSeccion = (key: string) =>
    setSeccionesAbiertas((prev) => ({ ...prev, [key]: !prev[key] }));

  const confirmarAsignacion = () => {
    if (!pendingAgente) return;
    const current = ticket.agentes ?? [];
    let newAgentes: string[];
    if (pendingAgente.accion === 'quitar') {
      newAgentes = current.filter((a) => a !== pendingAgente.nombre);
    } else if (pendingAgente.accion === 'derivar') {
      newAgentes = [pendingAgente.nombre];
    } else {
      newAgentes = [...current, pendingAgente.nombre];
    }
    onChangeAgentes(ticket.id, newAgentes);
    setPendingAgente(null);
  };

  const camposFormulario = (() => {
    const form = formularios.find((f) => f.programa === ticket.programa);
    if (!form) return [] as import('./types/formularios').CampoFormulario[];
    return obtenerCampos(form.id);
  })();

  const campoLabelMap = Object.fromEntries(camposFormulario.map((c) => [c.id, c.label]));

  const InfoRow = ({ label, children, value }: { label: string; children?: React.ReactNode; value?: string }) => (
    <div className="flex gap-2 py-0.5">
      <span className="text-slate-500 text-xs min-w-[100px] flex-shrink-0">{label}:</span>
      {children ? <span className="text-xs">{children}</span> : <span className="text-slate-800 text-xs font-medium break-words">{value ?? '—'}</span>}
    </div>
  );

  const SeccionHeader = ({ title, sKey }: { title: string; sKey: string }) => (
    <button
      onClick={() => toggleSeccion(sKey)}
      className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200 hover:bg-slate-100 transition-colors"
    >
      <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{title}</span>
      <ChevronDown size={14} className={`text-slate-400 transition-transform ${seccionesAbiertas[sKey] ? 'rotate-180' : ''}`} />
    </button>
  );

  const handleAgregarArchivos = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const contenido = e.target?.result as string;
        onAdjuntosChange([
          ...comentarioAdjuntos,
          { nombre: file.name, tipo: file.type, tamano: file.size, contenido },
        ]);
      };
      reader.readAsDataURL(file);
    });
    if (adjuntosRef.current) adjuntosRef.current.value = '';
  };

  const handleEnviarComentario = () => {
    if (!comentarioNuevo.trim() && comentarioAdjuntos.length === 0) return;
    onAddComment(autorRol, comentarioAdjuntos);
  };

  const handleGuardarEstado = () => {
    if (estadoTmp && estadoTmp !== ticket.estado) {
      onChangeEstado(ticket.id, estadoTmp as TicketEstado);
    }
    setEditandoEstado(false);
    setEstadoTmp('');
  };

  return (
    <>
    <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden">
      {/* Header granate */}
      <div className="bg-[#7F1D1D] px-4 py-2 flex items-center gap-2">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 bg-white text-[#7F1D1D] text-xs font-bold px-3 py-1.5 rounded hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={14} /> Volver
        </button>
        <button
          onClick={onNuevoTicket}
          className="flex items-center gap-1.5 bg-[#FF9500] hover:bg-[#E67E00] text-white text-xs font-medium px-3 py-1.5 rounded transition-colors"
        >
          <Plus size={13} /> Nuevo ticket
        </button>
        <button className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors">
          <RefreshCw size={13} /> Refrescar
        </button>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors"
        >
          <CheckCircle size={13} /> Cerrar
        </button>
        <button
          onClick={() => {
            if (window.confirm('¿Eliminár este ticket?')) onEliminarTicket(ticket.id);
          }}
          className="flex items-center gap-1.5 bg-white/10 hover:bg-red-600 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors"
        >
          <Trash2 size={13} /> Borrar
        </button>
      </div>

      {/* Título */}
      <div className="border-b border-slate-200 px-6 py-3 bg-white">
        <h1 className="text-base font-semibold text-slate-900">
          [Ticket #{ticket.numero}] {ticket.beneficiario.apellido} {ticket.beneficiario.nombre}
        </h1>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor de respuesta */}
          <div className="border-b border-slate-200 p-4 bg-white">
            {puedeComentarUser ? (
              <>
                {/* Author badge */}
                {usuario && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-[#7F1D1D] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {usuario.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-slate-800">{usuario.nombre}</span>
                      <span className="ml-2 text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">{autorRol}</span>
                    </div>
                  </div>
                )}
                <textarea
                  value={comentarioNuevo}
                  onChange={(e) => onCommentChange(e.target.value)}
                  placeholder="Escribir comentario o respuesta..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#FF9500] focus:border-[#FF9500]"
                />
                {/* Attached files list */}
                {comentarioAdjuntos.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {comentarioAdjuntos.map((adj, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-2 py-1">
                        <File size={13} className="text-slate-400 flex-shrink-0" />
                        <span className="text-xs text-slate-700 flex-1 truncate">{adj.nombre}</span>
                        <span className="text-xs text-slate-400">{formatBytes(adj.tamano)}</span>
                        <button onClick={() => onAdjuntosChange(comentarioAdjuntos.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      ref={adjuntosRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => handleAgregarArchivos(e.target.files)}
                    />
                    <button
                      onClick={() => adjuntosRef.current?.click()}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-[#FF9500] border border-slate-300 rounded px-2.5 py-1.5 hover:border-[#FF9500] transition-colors"
                    >
                      <File size={13} /> Adjuntar archivo
                    </button>
                    {/* Derivar button */}
                    <div className="relative">
                      <button
                        onClick={() => setDerivarAbierto((v) => !v)}
                        className="flex items-center gap-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded px-3 py-1.5 transition-colors"
                      >
                        ↪ Derivar a...
                        <ChevronDown size={12} className={`transition-transform ${derivarAbierto ? 'rotate-180' : ''}`} />
                      </button>
                      {derivarAbierto && (
                        <div className="absolute left-0 bottom-full mb-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 py-1 min-w-[200px] max-h-60 overflow-y-auto">
                          {operativos.length === 0 ? (
                            <p className="px-4 py-3 text-xs text-slate-400 italic">Sin agentes operativos</p>
                          ) : (
                            operativos.map((u) => (
                              <button
                                key={u.usuarioId}
                                onClick={() => {
                                  setPendingAgente({ nombre: u.nombre, accion: 'derivar' });
                                  setDerivarAbierto(false);
                                }}
                                className="w-full flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-orange-50 hover:text-[#FF9500] transition-colors"
                              >
                                <span className="font-medium">{u.nombre}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleEnviarComentario}
                    disabled={!comentarioNuevo.trim() && comentarioAdjuntos.length === 0}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ↩ Enviar respuesta
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-md">
                <UserCircle size={16} className="text-slate-400 flex-shrink-0" />
                <p className="text-sm text-slate-500">
                  Solo el agente asignado a este ticket puede agregar comentarios.
                </p>
              </div>
            )}
          </div>

          {/* Hilo de actividad */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {ticket.comentarios.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No hay actividad aún</p>
            ) : (
              [...ticket.comentarios].reverse().map((entrada) => {
                if (entrada.tipo === 'evento_estado') {
                  return (
                    <div key={entrada.id} className="text-center">
                      <div className="inline-block bg-blue-50 border border-blue-100 rounded px-4 py-2 text-sm text-slate-600">
                        <strong>{entrada.autor}</strong> cambió de estado de{' '}
                        <strong>{entrada.estadoAnterior}</strong> a{' '}
                        <strong>{entrada.estadoNuevo}</strong>{' '}
                        <span className="text-slate-400">reportado {formatearFechaHora(entrada.fecha)}</span>
                      </div>
                    </div>
                  );
                }
                if (entrada.tipo === 'evento_agente') {
                  return (
                    <div key={entrada.id} className="text-center">
                      <div className="inline-block bg-blue-50 border border-blue-100 rounded px-4 py-2 text-sm text-slate-600">
                        <strong>{entrada.autor}</strong> cambio de agente de{' '}
                        <strong>{entrada.agenteAnterior}</strong> a{' '}
                        <strong>{entrada.agenteNuevo}</strong>{' '}
                        <span className="text-slate-400">reportado {formatearFechaHora(entrada.fecha)}</span>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={entrada.id} className="border border-slate-200 rounded-md p-4 bg-white">
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#7F1D1D] flex-shrink-0 flex items-center justify-center text-white text-sm font-bold">
                        {entrada.autor.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-900">{entrada.autor}</span>
                          {entrada.autorRol && (
                            <span className="text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">{entrada.autorRol}</span>
                          )}
                          <span className="text-xs text-slate-400">respondió {formatearFechaHora(entrada.fecha)}</span>
                        </div>
                        {entrada.email && (
                          <p className="text-xs text-slate-400">{entrada.email}</p>
                        )}
                        {entrada.contenido && (
                          <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{entrada.contenido}</p>
                        )}
                        {entrada.adjuntos.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs font-medium text-slate-600">Archivos adjuntos:</p>
                            {entrada.adjuntos.map((adj, idx) => (
                              adj.contenido ? (
                                <a
                                  key={idx}
                                  href={adj.contenido}
                                  download={adj.nombre}
                                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  <File size={12} /> {adj.nombre}
                                  <span className="text-slate-400">({formatBytes(adj.tamano)})</span>
                                </a>
                              ) : (
                                <span key={idx} className="flex items-center gap-1.5 text-xs text-slate-500">
                                  <File size={12} /> {adj.nombre}
                                </span>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Panel derecho */}
        <div className="w-80 border-l border-slate-200 bg-white overflow-y-auto">

          {/* Información de la Solicitud */}
          <SeccionHeader title="Información de la Solicitud" sKey="solicitud" />
          {seccionesAbiertas.solicitud && (
            <div className="p-4 border-b border-slate-100">
              {editandoEstado ? (
                <div className="space-y-2 mb-3">
                  <label className="text-xs text-slate-500">Estado:</label>
                  <select
                    value={estadoTmp}
                    onChange={(e) => setEstadoTmp(e.target.value as TicketEstado)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                  >
                    {ESTADOS.map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={handleGuardarEstado} className="flex-1 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Guardar</button>
                    <button onClick={() => setEditandoEstado(false)} className="flex-1 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-3">
                  <EstadoBadge estado={ticket.estado} />
                  {puedeEditarTicket && (
                    <button onClick={() => { setEditandoEstado(true); setEstadoTmp(ticket.estado); }} className="text-slate-400 hover:text-slate-600 ml-auto">
                      <Pencil size={12} />
                    </button>
                  )}
                </div>
              )}
              <InfoRow label="Programa" value={ticket.programa} />
              <InfoRow label="Prioridad"><PrioridadBadge prioridad={ticket.prioridad} /></InfoRow>

              {editandoSolicitud ? (
                <div className="space-y-2 mt-2">
                  {[
                    { key: 'nombre', label: 'Nombre completo' },
                    { key: 'dni', label: 'N° Documento' },
                    { key: 'email', label: 'Email' },
                    { key: 'telefono', label: 'Teléfono' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-xs text-slate-500">{label}</label>
                      <input
                        type="text"
                        value={solicitudTmp[key as keyof typeof solicitudTmp]}
                        onChange={(e) => setSolicitudTmp((p) => ({ ...p, [key]: e.target.value }))}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        const partes = solicitudTmp.nombre.trim().split(' ');
                        const apellido = partes.length > 1 ? partes[partes.length - 1] : '';
                        const nombre = partes.length > 1 ? partes.slice(0, -1).join(' ') : partes[0] ?? '';
                        onActualizarTicket(ticket.id, {
                          beneficiario: { ...ticket.beneficiario, apellido, nombre, dni: solicitudTmp.dni },
                          emailSolicitante: solicitudTmp.email,
                          telefono: solicitudTmp.telefono,
                        });
                        setEditandoSolicitud(false);
                      }}
                      className="flex-1 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >Guardar</button>
                    <button onClick={() => setEditandoSolicitud(false)} className="flex-1 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50">Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  {puedeEditarDatos && (
                    <div className="flex justify-end mb-1">
                      <button
                        onClick={() => {
                          setSolicitudTmp({
                            nombre: `${ticket.beneficiario.apellido} ${ticket.beneficiario.nombre}`.trim(),
                            dni: ticket.beneficiario.dni,
                            email: ticket.emailSolicitante ?? '',
                            telefono: ticket.telefono ?? '',
                          });
                          setEditandoSolicitud(true);
                        }}
                        className="text-slate-400 hover:text-slate-600"
                      ><Pencil size={12} /></button>
                    </div>
                  )}
                  <InfoRow label="Nombre" value={`${ticket.beneficiario.apellido} ${ticket.beneficiario.nombre}`} />
                  <InfoRow label="Tipo Doc." value={ticket.tipoDocumento ?? '—'} />
                  <InfoRow label="N° Documento" value={ticket.beneficiario.dni} />
                  <InfoRow label="Email" value={ticket.emailSolicitante ?? '—'} />
                  <InfoRow label="Teléfono" value={ticket.telefono ?? '—'} />
                </>
              )}

              <InfoRow label="Fecha ingreso" value={formatearFecha(ticket.fechaCreacion)} />
              <InfoRow label="Últ. edición" value={formatearFecha(ticket.fechaActualizacion)} />
            </div>
          )}

          {/* Descripción de ticket manual (sin campos estructurados) */}
          {ticket.descripcion && (!ticket.datosAdicionales || Object.keys(ticket.datosAdicionales).length === 0) && (
            <>
              <SeccionHeader title="Descripción de la Solicitud" sKey="campos" />
              {seccionesAbiertas.campos && (
                <div className="p-4 border-b border-slate-100">
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{ticket.descripcion}</p>
                </div>
              )}
            </>
          )}

          {/* Campos de la Solicitud */}
          {ticket.datosAdicionales && Object.keys(ticket.datosAdicionales).length > 0 && (
            <>
              <SeccionHeader title="Campos de la Solicitud" sKey="campos" />
              {seccionesAbiertas.campos && (
                <div className="p-4 border-b border-slate-100 space-y-2">
                  {editandoCampos ? (
                    <div className="space-y-2">
                      {Object.entries(camposTmp).map(([k, v]) => (
                        <div key={k}>
                          <label className="text-xs text-slate-500">{campoLabelMap[k] ?? k}</label>
                          <input
                            type="text"
                            value={v}
                            onChange={(e) => setCamposTmp((prev) => ({ ...prev, [k]: e.target.value }))}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs mt-0.5"
                          />
                        </div>
                      ))}
                      {/* Adjuntos editables */}
                      {Object.keys(adjuntosTmp).length > 0 && (
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Archivos adjuntos:</p>
                          <div className="space-y-1">
                            {Object.entries(adjuntosTmp).map(([nombre]) => (
                              <div key={nombre} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-2 py-1">
                                <File size={12} className="text-slate-400 flex-shrink-0" />
                                <span className="text-xs text-slate-700 flex-1 truncate">{nombre}</span>
                                <button
                                  onClick={() => setAdjuntosTmp((prev) => { const n = { ...prev }; delete n[nombre]; return n; })}
                                  className="text-red-400 hover:text-red-600 flex-shrink-0"
                                  title="Eliminar adjunto"
                                >✕</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Subir nuevos adjuntos */}
                      <div>
                        <input
                          ref={adjuntosCamposRef}
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
                          className="hidden"
                          onChange={(e) => {
                            const files = e.target.files;
                            if (!files) return;
                            Array.from(files).forEach((file) => {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const contenido = ev.target?.result as string;
                                setAdjuntosTmp((prev) => ({ ...prev, [file.name]: contenido }));
                              };
                              reader.readAsDataURL(file);
                            });
                            if (adjuntosCamposRef.current) adjuntosCamposRef.current.value = '';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => adjuntosCamposRef.current?.click()}
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 border border-dashed border-slate-300 hover:border-blue-400 rounded px-2.5 py-1.5 w-full justify-center transition-colors"
                        >
                          <File size={12} /> Agregar archivo
                        </button>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => {
                            const nuevosDatos: Record<string, string> = {
                              ...Object.fromEntries(
                                Object.entries(ticket.datosAdicionales ?? {})
                                  .filter(([, v]) => !String(v).startsWith('data:'))
                                  .map(([k]) => [k, camposTmp[k] ?? ''])
                              ),
                              ...adjuntosTmp,
                            };
                            const descripcionNueva = Object.entries(nuevosDatos)
                              .map(([k, v]) => String(v).startsWith('data:') ? `${k}: [Adjunto]${v}` : `${k}: ${v}`)
                              .join('\n');
                            onActualizarTicket(ticket.id, { descripcion: descripcionNueva, datosAdicionales: nuevosDatos });
                            setEditandoCampos(false);
                          }}
                          className="flex-1 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >Guardar</button>
                        <button onClick={() => setEditandoCampos(false)} className="flex-1 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {puedeEditarDatos && (
                        <div className="flex justify-end mb-1">
                          <button
                            onClick={() => {
                              const entradas = Object.entries(ticket.datosAdicionales ?? {});
                              setCamposTmp(Object.fromEntries(entradas.filter(([, v]) => !String(v).startsWith('data:'))));
                              setAdjuntosTmp(Object.fromEntries(entradas.filter(([, v]) => String(v).startsWith('data:'))));
                              setEditandoCampos(true);
                            }}
                            className="text-slate-400 hover:text-slate-600"
                          ><Pencil size={12} /></button>
                        </div>
                      )}
                      {Object.entries(ticket.datosAdicionales).map(([k, v]) => {
                        const label = campoLabelMap[k] ?? k;
                        if (typeof v === 'string' && v.startsWith('data:')) {
                          const esImagen = v.startsWith('data:image/');
                          return (
                            <div key={k} className="py-0.5">
                              <span className="text-slate-500 text-xs block mb-1">{label}:</span>
                              {esImagen ? (
                                <div className="space-y-1">
                                  <img src={v} alt={label} className="max-w-full rounded border border-slate-200 max-h-48 object-contain" />
                                  <a href={v} download={`${label}.jpg`} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                    <File size={11} /> Descargar imagen
                                  </a>
                                </div>
                              ) : (
                                <a href={v} download={label} className="inline-flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded transition-colors">
                                  <File size={12} /> Descargar archivo
                                </a>
                              )}
                            </div>
                          );
                        }
                        return (
                          <div key={k} className="flex gap-2 py-0.5">
                            <span className="text-slate-500 text-xs min-w-[100px] flex-shrink-0">{label}:</span>
                            <span className="text-slate-800 text-xs font-medium break-words">{v || '—'}</span>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* Información del Legajo */}
          <SeccionHeader title="Información del Legajo" sKey="legajo" />
          {seccionesAbiertas.legajo && (
            <div className="p-4 border-b border-slate-100">
              {editandoLegajo ? (
                <div className="space-y-2">
                  {[
                    { key: 'legajo', label: 'Nro. Legajo', placeholder: 'Ej: LEG-2024-001' },
                    { key: 'numeroActa', label: 'Nro. Acta', placeholder: 'Ej: ACTA-001/2026' },
                    { key: 'importe', label: 'Importe ($)', placeholder: 'Ej: 150000' },
                    { key: 'codigoExterno', label: 'Código', placeholder: 'Auto-generado' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="text-xs text-slate-500">{label}</label>
                      <input
                        type={key === 'importe' ? 'number' : 'text'}
                        value={(legajoTmp as Record<string, string>)[key]}
                        onChange={(e) => setLegajoTmp((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs mt-0.5"
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        onActualizarTicket(ticket.id, {
                          legajo: legajoTmp.legajo || undefined,
                          numeroActa: legajoTmp.numeroActa || undefined,
                          importe: legajoTmp.importe ? Number(legajoTmp.importe) : undefined,
                          codigoExterno: legajoTmp.codigoExterno || undefined,
                        });
                        setEditandoLegajo(false);
                      }}
                      className="flex-1 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >Guardar</button>
                    <button onClick={() => setEditandoLegajo(false)} className="flex-1 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {puedeEditarDatos && (
                    <div className="flex justify-end mb-1">
                      <button
                        onClick={() => {
                          setLegajoTmp({
                            legajo: ticket.legajo ?? '',
                            numeroActa: ticket.numeroActa ?? '',
                            importe: ticket.importe ? String(ticket.importe) : '',
                            codigoExterno: ticket.codigoExterno ?? '',
                          });
                          setEditandoLegajo(true);
                        }}
                        className="text-slate-400 hover:text-slate-600"
                      ><Pencil size={12} /></button>
                    </div>
                  )}
                  <InfoRow label="Nro. Legajo" value={ticket.legajo} />
                  <InfoRow label="Nro. Acta" value={ticket.numeroActa} />
                  <InfoRow label="Importe" value={ticket.importe ? `$ ${ticket.importe.toLocaleString('es-AR')}` : undefined} />
                  <InfoRow label="Código" value={ticket.codigoExterno} />
                </div>
              )}
            </div>
          )}

          {/* Información de Asignaciones */}
          <SeccionHeader title="Información de Asignaciones" sKey="asignaciones" />
          {seccionesAbiertas.asignaciones && (
            <div className="p-4 border-b border-slate-100">
              {/* Asignado actualmente */}
              {(ticket.agentes ?? []).length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-slate-500 mb-1">Asignado a:</p>
                  <div className="space-y-1">
                    {(ticket.agentes ?? []).map((agente, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                          <UserCircle size={14} className="text-slate-500" />
                        </div>
                        <span className="text-xs text-slate-700">{agente}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Picker de personas — solo para supervisores y agente actualmente asignado */}
              {puedeEditarTicket && (
                operativos.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">
                      {(ticket.agentes ?? []).length === 0 ? 'Asignar a:' : 'Reasignar a:'}
                    </p>
                    <div className="space-y-1">
                      {operativos.map((u) => {
                        const yaAsignado = (ticket.agentes ?? []).includes(u.nombre);
                        return (
                          <button
                            key={u.usuarioId}
                            onClick={() => setPendingAgente({ nombre: u.nombre, accion: yaAsignado ? 'quitar' : 'asignar' })}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border transition text-left ${
                              yaAsignado
                                ? 'border-blue-400 bg-blue-50'
                                : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50'
                            }`}
                          >
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                              <UserCircle size={13} className="text-slate-500" />
                            </div>
                            <span className="text-xs font-medium text-slate-700">{u.nombre}</span>
                            {yaAsignado && <span className="ml-auto text-xs text-blue-500 font-semibold">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Sin agentes operativos en el sistema
                  </p>
                )
              )}
              {ticket.adjuntos.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-600 mb-1.5">Archivos adjuntos:</p>
                  <div className="space-y-1">
                    {ticket.adjuntos.map((adj, i) =>
                      adj.contenido ? (
                        <a key={i} href={adj.contenido} download={adj.nombre}
                          className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                          <File size={11} className="flex-shrink-0" />
                          <span className="flex-1 truncate">{adj.nombre}</span>
                        </a>
                      ) : (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-slate-500">
                          <File size={11} className="flex-shrink-0" />
                          <span className="flex-1 truncate">{adj.nombre}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Observaciones */}
          <SeccionHeader title="Observaciones" sKey="observaciones" />
          {seccionesAbiertas.observaciones && (
            <div className="p-4 border-b border-slate-100">
              {editandoObservaciones ? (
                <div className="space-y-2">
                  <textarea
                    value={observacionesTmp}
                    onChange={(e) => setObservacionesTmp(e.target.value)}
                    rows={4}
                    placeholder="Escribir observaciones..."
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onActualizarTicket(ticket.id, { observaciones: observacionesTmp });
                        setEditandoObservaciones(false);
                      }}
                      className="flex-1 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >Guardar</button>
                    <button onClick={() => setEditandoObservaciones(false)} className="flex-1 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div>
                  {puedeEditarDatos && (
                    <div className="flex justify-end mb-1">
                      <button
                        onClick={() => { setObservacionesTmp(ticket.observaciones ?? ''); setEditandoObservaciones(true); }}
                        className="text-slate-400 hover:text-slate-600"
                      ><Pencil size={12} /></button>
                    </div>
                  )}
                  {ticket.observaciones ? (
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">{ticket.observaciones}</p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Sin observaciones</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Información de Auditoría */}
          <SeccionHeader title="Información de Auditoría" sKey="auditoria" />
          {seccionesAbiertas.auditoria && (
            <div className="p-4">
              {ticket.comentarios.filter((c) => c.tipo === 'evento_estado' || c.tipo === 'evento_agente').length === 0 ? (
                <p className="text-xs text-slate-400 italic">Sin eventos registrados</p>
              ) : (
                <div className="space-y-2">
                  {ticket.comentarios
                    .filter((c) => c.tipo === 'evento_estado' || c.tipo === 'evento_agente')
                    .map((c) => (
                      <div key={c.id} className="text-xs text-slate-600 bg-slate-50 rounded p-2">
                        <span className="font-medium">{c.autor}</span>{' '}
                        {c.tipo === 'evento_estado'
                          ? <>cambió estado: <span className="font-medium">{c.estadoAnterior}</span> → <span className="font-medium">{c.estadoNuevo}</span></>
                          : <>cambió agente: <span className="font-medium">{c.agenteAnterior}</span> → <span className="font-medium">{c.agenteNuevo}</span></>
                        }
                        <div className="text-slate-400 mt-0.5">{formatearFechaHora(c.fecha)}</div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Modal de confirmación de asignación */}
    {pendingAgente && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setPendingAgente(null)}>
        <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-base font-semibold text-slate-800 mb-2">Confirmar asignación</h3>
          <p className="text-sm text-slate-600 mb-5">
            {pendingAgente.accion === 'quitar'
              ? <>¿Desasignar a <span className="font-semibold">{pendingAgente.nombre}</span> de este ticket?</>
              : pendingAgente.accion === 'derivar'
              ? <>¿Derivar este ticket a <span className="font-semibold">{pendingAgente.nombre}</span>?</>
              : <>¿Asignar a <span className="font-semibold">{pendingAgente.nombre}</span> a este ticket?</>}
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setPendingAgente(null)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarAsignacion}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 6: REDUCER
// ═════════════════════════════════════════════════════════════════════════════

function dashboardReducer(
  state: DashboardState,
  action: DashboardAction
): DashboardState {
  switch (action.type) {
    case 'SET_BUSQUEDA':
      return {
        ...state,
        filtros: { ...state.filtros, busqueda: action.payload },
        paginaActual: 1,
      };
    case 'SET_CAMPO_BUSQUEDA':
      return {
        ...state,
        filtros: { ...state.filtros, campoBusqueda: action.payload },
      };
    case 'SET_VISTA':
      return {
        ...state,
        filtros: { ...state.filtros, vista: action.payload },
        paginaActual: 1,
      };
    case 'SET_FILTRO_PROGRAMA':
      return {
        ...state,
        filtros: { ...state.filtros, programa: action.payload },
        paginaActual: 1,
      };
    case 'SET_FILTRO_PRIORIDAD':
      return {
        ...state,
        filtros: { ...state.filtros, prioridad: action.payload },
        paginaActual: 1,
      };
    case 'RESTABLECER_FILTROS':
      return {
        ...state,
        filtros: {
          busqueda: '',
          campoBusqueda: 'ID',
          vista: 'todos',
          programa: 'Todos',
          prioridad: 'Todos',
        },
        paginaActual: 1,
        seleccionados: new Set(),
      };
    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        sidebarColapsado: !state.sidebarColapsado,
      };
    case 'TOGGLE_SELECCION': {
      const newSelected = new Set(state.seleccionados);
      if (newSelected.has(action.payload)) {
        newSelected.delete(action.payload);
      } else {
        newSelected.add(action.payload);
      }
      return {
        ...state,
        seleccionados: newSelected,
      };
    }
    case 'SELECCIONAR_TODOS': {
      const ids = new Set(action.payload.map((t) => t.id));
      return {
        ...state,
        seleccionados: ids,
      };
    }
    case 'DESELECCIONAR_TODOS':
      return {
        ...state,
        seleccionados: new Set(),
      };
    case 'CAMBIAR_PAGINA':
      return {
        ...state,
        paginaActual: action.payload,
      };
    case 'CAMBIAR_POR_PAGINA':
      return {
        ...state,
        porPagina: action.payload,
        paginaActual: 1,
      };
    case 'ABRIR_MODAL':
      return {
        ...state,
        modal: {
          ...state.modal,
          abierto: true,
          errores: {},
        },
      };
    case 'CERRAR_MODAL':
      return {
        ...state,
        modal: {
          abierto: false,
          programa: '',
          estado: '',
          prioridad: '',
          beneficiario: '',
          tipoDocumento: '',
          dni: '',
          telefono: '',
          email: '',
          descripcion: '',
          errores: {},
          numeroActa: '',
          agentes: '',
          emailSolicitante: '',
          adjuntos: [],
          tipoTramite: '',
          legajo: '',
          asunto: '',
        },
      };
    case 'SET_MODAL_ADJUNTOS':
      return { ...state, modal: { ...state.modal, adjuntos: action.payload } };
    case 'SET_COMENTARIO_ADJUNTOS':
      return { ...state, comentarioAdjuntos: action.payload };
    case 'UPDATE_MODAL_FIELD':
      return {
        ...state,
        modal: {
          ...state.modal,
          [action.payload.field]: action.payload.value,
        },
      };
    case 'SET_MODAL_ERRORES':
      return {
        ...state,
        modal: {
          ...state.modal,
          errores: action.payload,
        },
      };
    case 'TICKET_GUARDADO': {
      const newTickets = [action.payload, ...state.tickets];
      return {
        ...state,
        tickets: newTickets,
        modal: {
          abierto: false,
          programa: '',
          estado: '',
          prioridad: '',
          beneficiario: '',
          tipoDocumento: '',
          dni: '',
          telefono: '',
          email: '',
          descripcion: '',
          errores: {},
          numeroActa: '',
          agentes: '',
          emailSolicitante: '',
          adjuntos: [],
          tipoTramite: '',
          legajo: '',
          asunto: '',
        },
      };
    }
    case 'ACTUALIZAR_TICKET': {
      if (!state.ticketAbierto) return state;
      const ticketActualizado = {
        ...state.ticketAbierto,
        ...action.payload.fields,
        fechaActualizacion: new Date(),
      };
      return {
        ...state,
        tickets: state.tickets.map((t) => t.id === action.payload.id ? ticketActualizado : t),
        ticketAbierto: ticketActualizado,
      };
    }
    case 'ABRIR_TICKET_DETAIL':
      return {
        ...state,
        ticketAbierto: action.payload,
      };
    case 'CERRAR_TICKET_DETAIL':
      return {
        ...state,
        ticketAbierto: null,
        comentarioNuevo: '',
      };
    case 'SET_COMENTARIO_NUEVO':
      return {
        ...state,
        comentarioNuevo: action.payload,
      };
    case 'AGREGAR_COMENTARIO': {
      if (!state.ticketAbierto) return state;
      const nuevoComentario: Comentario = {
        id: String(Date.now()),
        tipo: 'comentario',
        autor: action.payload.autor,
        autorRol: action.payload.autorRol,
        fecha: new Date(),
        contenido: state.comentarioNuevo,
        adjuntos: action.payload.adjuntos,
      };
      const ticketActualizado = {
        ...state.ticketAbierto,
        fechaActualizacion: new Date(),
        comentarios: [...state.ticketAbierto.comentarios, nuevoComentario],
      };
      return {
        ...state,
        tickets: state.tickets.map((t) => t.id === ticketActualizado.id ? ticketActualizado : t),
        ticketAbierto: ticketActualizado,
        comentarioNuevo: '',
        comentarioAdjuntos: [],
      };
    }
    case 'CAMBIAR_ESTADO_TICKET': {
      if (!state.ticketAbierto) return state;
      const eventoEstado: Comentario = {
        id: String(Date.now()),
        tipo: 'evento_estado',
        autor: action.payload.autor,
        fecha: new Date(),
        contenido: '',
        estadoAnterior: state.ticketAbierto.estado,
        estadoNuevo: action.payload.estado,
        adjuntos: [],
      };
      const ticketActualizado = {
        ...state.ticketAbierto,
        estado: action.payload.estado,
        fechaActualizacion: new Date(),
        comentarios: [...state.ticketAbierto.comentarios, eventoEstado],
      };
      return {
        ...state,
        tickets: state.tickets.map((t) => t.id === action.payload.id ? ticketActualizado : t),
        ticketAbierto: ticketActualizado,
      };
    }
    case 'CAMBIAR_AGENTES_TICKET': {
      if (!state.ticketAbierto) return state;
      const eventoAgente: Comentario = {
        id: String(Date.now()),
        tipo: 'evento_agente',
        autor: action.payload.autor,
        fecha: new Date(),
        contenido: '',
        agenteAnterior: (state.ticketAbierto.agentes ?? []).join(', ') || '—',
        agenteNuevo: action.payload.agentes.join(', ') || '—',
        adjuntos: [],
      };
      const ticketActualizado = {
        ...state.ticketAbierto,
        agentes: action.payload.agentes,
        fechaActualizacion: new Date(),
        comentarios: [...state.ticketAbierto.comentarios, eventoAgente],
      };
      return {
        ...state,
        tickets: state.tickets.map((t) => t.id === action.payload.id ? ticketActualizado : t),
        ticketAbierto: ticketActualizado,
      };
    }
    case 'ELIMINAR_TICKET':
      return {
        ...state,
        tickets: state.tickets.map((t) =>
          t.id === action.payload ? { ...t, eliminado: true } : t
        ),
        ticketAbierto: null,
      };
    case 'SET_TICKETS':
      return { ...state, tickets: action.payload, cargandoTickets: false };
    case 'SET_CARGANDO_TICKETS':
      return { ...state, cargandoTickets: action.payload };
    default:
      return state;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 7: INITIAL STATE
// ═════════════════════════════════════════════════════════════════════════════



const getInitialState = (): DashboardState => {
  return {
    tickets: [],
    cargandoTickets: true,
    seleccionados: new Set(),
    filtros: {
      busqueda: '',
      campoBusqueda: 'ID',
      vista: 'todos',
      programa: 'Todos',
      prioridad: 'Todos',
    },
    paginaActual: 1,
    porPagina: 50,
    sidebarColapsado: false,
    modal: {
      abierto: false,
      programa: '',
      estado: '',
      prioridad: '',
      beneficiario: '',
      tipoDocumento: '',
      dni: '',
      telefono: '',
      email: '',
      descripcion: '',
      errores: {},
      numeroActa: '',
      agentes: '',
      emailSolicitante: '',
      adjuntos: [],
      tipoTramite: '',
      legajo: '',
      asunto: '',
    },
    ticketAbierto: null,
    comentarioNuevo: '',
    comentarioAdjuntos: [],
  };
};

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 8: MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

function parsearDescripcion(descripcion: string): Record<string, string> {
  if (!descripcion || descripcion === 'Sin información adicional') return {};
  const resultado: Record<string, string> = {};
  descripcion.split('\n').forEach((linea) => {
    const idx = linea.indexOf(': ');
    if (idx === -1) return;
    const label = linea.slice(0, idx).trim();
    let valor = linea.slice(idx + 2).trim();
    if (valor.startsWith('[Adjunto]')) valor = valor.slice(9);
    if (label) resultado[label] = valor;
  });
  return resultado;
}

function mapApiTicket(t: Record<string, unknown>): Ticket {
  const titulo = String(t.titulo ?? '');

  // Preferir el programa del formulario (campo directo), con fallback al patrón legacy del titulo
  let programa = String(t.formularioPrograma ?? '');
  if (!programa) {
    const partes = titulo.split(' - ');
    programa = partes.length > 1 ? partes[partes.length - 1] : 'Sin programa';
  }

  const nombreCompleto = String(t.ciudadanoNombre ?? '');
  const partesNombre = nombreCompleto.trim().split(' ');
  const apellido = partesNombre.length > 1 ? partesNombre[partesNombre.length - 1] : '';
  const nombre = partesNombre.length > 1 ? partesNombre.slice(0, -1).join(' ') : nombreCompleto;

  const estadoApi = String(t.estado ?? 'abierto');
  const estadoMapped: TicketEstado =
    t.etapa ? (t.etapa as TicketEstado) :
    estadoApi === 'cerrado' ? 'Cerrado' :
    estadoApi === 'en_progreso' ? 'Revisión de documentación' :
    'Solicitud inicial';

  const prioridadApi = String(t.prioridad ?? 'media');
  const prioridadMapped: TicketPrioridad =
    prioridadApi === 'alta' || prioridadApi === 'critica' ? 'Alta' :
    prioridadApi === 'baja' ? 'Normal' : 'Normal';

  return {
    id: String(t.ticketId ?? t.id ?? ''),
    prefix: programa.slice(0, 2).toUpperCase(),
    numero: Number(t.numero ?? 0),
    beneficiario: { apellido, nombre, dni: String(t.ciudadanoDni ?? '') },
    asunto: titulo,
    programa,
    estado: estadoMapped,
    prioridad: prioridadMapped,
    descripcion: String(t.descripcion ?? ''),
    datosAdicionales: parsearDescripcion(String(t.descripcion ?? '')),
    adjuntos: [],
    agentes: Array.isArray(t.agentes) ? (t.agentes as string[]) : [],
    fechaCreacion: new Date(String(t.fechaCreacion ?? t.fecha_creacion ?? new Date())),
    fechaActualizacion: new Date(String(t.fechaCreacion ?? t.fecha_creacion ?? new Date())),
    comentarios: [],
    telefono: String(t.ciudadanoTelefono ?? ''),
    emailSolicitante: String(t.ciudadanoEmail ?? ''),
    tipoTramite: t.tipoTramite ? String(t.tipoTramite) : undefined,
    legajo: t.numeroLegajo ? String(t.numeroLegajo) : undefined,
    numeroActa: t.numeroActa ? String(t.numeroActa) : undefined,
    leido: t.leido === true,
  };
}

interface OperativoInfo {
  usuarioId: string;
  nombre: string;
}

export default function AgenciaCalidadDashboard() {
  const { usuario } = useAuth();
  const { formularios } = useFormularios();
  const [state, dispatch] = useReducer(dashboardReducer, undefined, getInitialState);
  const [operativos, setOperativos] = useState<OperativoInfo[]>([]);

  // Fetch tickets from API on mount and on focus
  useEffect(() => {
    const fetchTickets = async () => {
      const token = localStorage.getItem('sc_token');
      const apiUrl = (import.meta.env as Record<string, string>).VITE_API_URL;
      if (!token || !apiUrl) return;
      try {
        const res = await fetch(`${apiUrl}/tickets?limit=200`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { dispatch({ type: 'SET_CARGANDO_TICKETS', payload: false }); return; }
        const data = await res.json();
        const mapped = (data.tickets as Record<string, unknown>[]).map(mapApiTicket);
        dispatch({ type: 'SET_TICKETS', payload: mapped });
      } catch {
        dispatch({ type: 'SET_CARGANDO_TICKETS', payload: false });
      }
    };
    fetchTickets();
    window.addEventListener('focus', fetchTickets);
    return () => window.removeEventListener('focus', fetchTickets);
  }, []);

  // Fetch todos los agentes operativos activos
  useEffect(() => {
    const fetchOperativos = async () => {
      const token = localStorage.getItem('sc_token');
      const apiUrl = (import.meta.env as Record<string, string>).VITE_API_URL;
      if (!token || !apiUrl) return;
      try {
        const res = await fetch(`${apiUrl}/usuarios`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        setOperativos(
          (data.usuarios as Array<{ usuarioId: string; nombre: string; rol: string; activo: boolean; modulo: string }>)
            .filter((u) => u.activo && (u.rol === 'admin' || u.modulo === 'tickets'))
            .filter((u) => !['Administrador', 'Director Savean', 'Manuel Rodriguez', 'Lucas Quevedo', 'Savean'].includes(u.nombre))
            .map(({ usuarioId, nombre }) => ({ usuarioId, nombre }))
        );
      } catch { /* silencioso */ }
    };
    fetchOperativos();
  }, []);


  // Fetch comments from API when a ticket is opened
  useEffect(() => {
    if (!state.ticketAbierto) return;
    const ticketId = state.ticketAbierto.id;
    const fetchComentarios = async () => {
      const token = localStorage.getItem('sc_token');
      const apiUrl = (import.meta.env as Record<string, string>).VITE_API_URL;
      if (!token || !apiUrl) return;
      try {
        const res = await fetch(`${apiUrl}/tickets/${ticketId}/comentarios`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const comentariosApi: Comentario[] = (data.comentarios as Array<Record<string, unknown>>).map((c) => ({
          id: String(c.comentarioId),
          tipo: 'comentario' as const,
          autor: String(c.autorNombre),
          autorRol: String(c.autorRol),
          fecha: new Date(String(c.fecha)),
          contenido: String(c.contenido),
          adjuntos: Array.isArray(c.adjuntos) ? (c.adjuntos as Adjunto[]) : [],
        }));
        dispatch({ type: 'ACTUALIZAR_TICKET', payload: { id: ticketId, fields: { comentarios: comentariosApi } } });
      } catch { /* silencioso */ }
    };
    fetchComentarios();
  }, [state.ticketAbierto?.id]);

  // Fetch descripción completa al abrir un ticket (no viene en el listado para ahorrar ancho de banda)
  useEffect(() => {
    if (!state.ticketAbierto) return;
    if (state.ticketAbierto.descripcion) return; // ya cargada
    const ticketId = state.ticketAbierto.id;
    const fetchDescripcion = async () => {
      const token = localStorage.getItem('sc_token');
      const apiUrl = (import.meta.env as Record<string, string>).VITE_API_URL;
      if (!token || !apiUrl) return;
      try {
        const res = await fetch(`${apiUrl}/tickets/${ticketId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const t = await res.json() as Record<string, unknown>;
        const desc = String(t.descripcion ?? '');
        dispatch({ type: 'ACTUALIZAR_TICKET', payload: { id: ticketId, fields: { descripcion: desc, datosAdicionales: parsearDescripcion(desc) } } });
      } catch { /* silencioso */ }
    };
    fetchDescripcion();
  }, [state.ticketAbierto?.id]);

  // Programas activos para el filtro del sidebar
  const programasDisponibles = useMemo(() => {
    const set = new Set(formularios.filter(f => f.activo).map(f => f.programa).filter(Boolean));
    return Array.from(set).sort();
  }, [formularios]);

  // Todos los programas (activos + inactivos) para el modal de creación manual
  const todosLosProgramas = useMemo(() => {
    const set = new Set(formularios.map(f => f.programa).filter(Boolean));
    return Array.from(set).sort();
  }, [formularios]);

  // Derived state
  const ticketsFiltrados = useMemo(
    () => aplicarFiltros(state.tickets, state.filtros, usuario?.nombre),
    [state.tickets, state.filtros, usuario?.nombre]
  );

  const ticketsPaginados = useMemo(() => {
    const inicio = (state.paginaActual - 1) * state.porPagina;
    return ticketsFiltrados.slice(inicio, inicio + state.porPagina);
  }, [ticketsFiltrados, state.paginaActual, state.porPagina]);

  const totalPaginas = Math.ceil(ticketsFiltrados.length / state.porPagina);

  const countPorVista = useMemo(() => {
    const noElim = state.tickets.filter((t) => !t.eliminado);
    return {
      todos:       noElim.length,
      no_resuelto: noElim.filter((t) => t.estado !== 'Cerrado').length,
      sin_asignar: noElim.filter((t) => !t.agentes || t.agentes.length === 0).length,
      mio:         noElim.filter((t) => (t.agentes ?? []).includes(usuario?.nombre ?? '')).length,
      cerrado:     noElim.filter((t) => t.estado === 'Cerrado').length,
      eliminado:   state.tickets.filter((t) => !!t.eliminado).length,
    };
  }, [state.tickets, usuario?.nombre]);

  const [guardandoTicket, setGuardandoTicket] = useState(false);

  const handleSubmitTicket = async () => {
    const errores = validarModal(state.modal);
    if (Object.keys(errores).length > 0) {
      dispatch({ type: 'SET_MODAL_ERRORES', payload: errores });
      return;
    }

    const token = localStorage.getItem('sc_token');
    const apiUrl = (import.meta.env as Record<string, string>).VITE_API_URL;
    if (!token || !apiUrl) {
      alert('Sin conexión al servidor');
      return;
    }

    const formularioSeleccionado = formularios.find((f) => f.programa === state.modal.programa);

    setGuardandoTicket(true);
    try {
      const lineasAdjuntos = state.modal.adjuntos.map((adj) => `${adj.nombre}: [Adjunto]${adj.contenido}`);
      const descripcionFinal = [`Descripción: ${state.modal.descripcion.trim()}`, ...lineasAdjuntos].join('\n');

      const res = await fetch(`${apiUrl}/tickets/crear-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          formularioId: formularioSeleccionado?.id || null,
          nombre: state.modal.beneficiario,
          dni: state.modal.dni,
          email: state.modal.email,
          telefono: state.modal.telefono,
          tipoTramite: state.modal.tipoTramite,
          legajo: state.modal.legajo,
          numeroActa: state.modal.numeroActa || null,
          asunto: state.modal.asunto,
          descripcion: descripcionFinal,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert((err as Record<string, string>).error || 'Error al crear el ticket');
        return;
      }

      // Recargar todos los tickets desde el servidor
      const res2 = await fetch(`${apiUrl}/tickets?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res2.ok) {
        const data = await res2.json();
        const mapped = (data.tickets as Record<string, unknown>[]).map(mapApiTicket);
        dispatch({ type: 'SET_TICKETS', payload: mapped });
      }

      dispatch({ type: 'CERRAR_MODAL' });
    } catch {
      alert('Error al crear el ticket. Verificá tu conexión.');
    } finally {
      setGuardandoTicket(false);
    }
  };

  const paginaInicio = (state.paginaActual - 1) * state.porPagina + 1;
  const paginaFin = Math.min(state.paginaActual * state.porPagina, ticketsFiltrados.length);

  // Si hay un ticket abierto, mostrar detail view
  if (state.ticketAbierto) {
    return (
      <TicketDetailModal
        ticket={state.ticketAbierto}
        onClose={() => dispatch({ type: 'CERRAR_TICKET_DETAIL' })}
        comentarioNuevo={state.comentarioNuevo}
        comentarioAdjuntos={state.comentarioAdjuntos}
        onCommentChange={(text) =>
          dispatch({ type: 'SET_COMENTARIO_NUEVO', payload: text })
        }
        onAdjuntosChange={(adj) =>
          dispatch({ type: 'SET_COMENTARIO_ADJUNTOS', payload: adj })
        }
        onAddComment={async (autorRol, adjuntos) => {
          const token = localStorage.getItem('sc_token');
          const apiUrl = (import.meta.env as Record<string, string>).VITE_API_URL;
          const tieneTexto = state.comentarioNuevo.trim().length > 0;
          const tieneAdjuntos = adjuntos.length > 0;
          if (token && apiUrl && state.ticketAbierto && (tieneTexto || tieneAdjuntos)) {
            await fetch(`${apiUrl}/tickets/${state.ticketAbierto.id}/comentarios`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                contenido: state.comentarioNuevo,
                adjuntos: tieneAdjuntos ? adjuntos : undefined,
              }),
            }).catch(() => {});
          }
          dispatch({ type: 'AGREGAR_COMENTARIO', payload: { autor: usuario?.nombre || 'Usuario', autorRol, adjuntos } });
        }}
        onChangeEstado={async (id, estado) => {
          dispatch({ type: 'CAMBIAR_ESTADO_TICKET', payload: { id, estado, autor: usuario?.nombre || 'Usuario' } });
          const token = localStorage.getItem('sc_token');
          const apiUrl = (import.meta.env as Record<string, string>).VITE_API_URL;
          if (token && apiUrl) {
            await fetch(`${apiUrl}/tickets/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ etapa: estado }),
            }).catch(() => {});
          }
        }}
        onChangeAgentes={async (id, agentes) => {
          dispatch({ type: 'CAMBIAR_AGENTES_TICKET', payload: { id, agentes, autor: usuario?.nombre || 'Usuario' } });
          const token = localStorage.getItem('sc_token');
          const apiUrl = (import.meta.env as Record<string, string>).VITE_API_URL;
          if (token && apiUrl) {
            await fetch(`${apiUrl}/tickets/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ agentes }),
            }).catch(() => {});
          }
        }}
        operativos={operativos}
        onEliminarTicket={async (id) => {
          const token = localStorage.getItem('sc_token');
          const apiUrl = (import.meta.env as Record<string, string>).VITE_API_URL;
          try {
            if (token && apiUrl) {
              await fetch(`${apiUrl}/tickets/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
            }
          } catch { /* si falla el API igual elimina del estado local */ }
          dispatch({ type: 'ELIMINAR_TICKET', payload: id });
        }}
        onNuevoTicket={() => dispatch({ type: 'CERRAR_TICKET_DETAIL' })}
        onActualizarTicket={async (id, fields) => {
          dispatch({ type: 'ACTUALIZAR_TICKET', payload: { id, fields } });
          const token = localStorage.getItem('sc_token');
          const apiUrl = (import.meta.env as Record<string, string>).VITE_API_URL;
          if (token && apiUrl) {
            const body: Record<string, unknown> = {};
            if (fields.descripcion !== undefined) body.descripcion = fields.descripcion;
            if (fields.beneficiario !== undefined) {
              body.ciudadanoNombre = `${fields.beneficiario.apellido} ${fields.beneficiario.nombre}`.trim();
              body.ciudadanoDni = fields.beneficiario.dni;
            }
            if (fields.emailSolicitante !== undefined) body.ciudadanoEmail = fields.emailSolicitante;
            if (fields.telefono !== undefined) body.ciudadanoTelefono = fields.telefono;
            if (Object.keys(body).length > 0) {
              await fetch(`${apiUrl}/tickets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
              }).catch(() => {});
            }
          }
        }}
      />
    );
  }

  // Dashboard list view
  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3">
        <button
          onClick={() => dispatch({ type: 'ABRIR_MODAL' })}
          className="flex items-center gap-2 bg-[#FF9500] hover:bg-[#E67E00] text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          <Plus size={16} />
          Nuevo Ticket
        </button>

        <button
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          className="border border-slate-300 text-slate-600 text-sm px-3 py-2 rounded-md hover:bg-slate-50 transition-colors"
        >
          {state.sidebarColapsado ? 'Mostrar filtros' : 'Ocultar filtros'}
        </button>

        <button
          onClick={() => dispatch({ type: 'RESTABLECER_FILTROS' })}
          className="border border-slate-300 text-slate-600 text-sm px-3 py-2 rounded-md hover:bg-slate-50 transition-colors"
        >
          Restablecer filtros
        </button>

        <div className="flex-1" />

        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Buscar..."
              value={state.filtros.busqueda}
              onChange={(e) =>
                dispatch({ type: 'SET_BUSQUEDA', payload: e.target.value })
              }
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
            />
          </div>

          <select
            value={state.filtros.campoBusqueda}
            onChange={(e) =>
              dispatch({
                type: 'SET_CAMPO_BUSQUEDA',
                payload: e.target.value as CampoBusqueda,
              })
            }
            className="px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-600 bg-white"
          >
            <option value="ID">ID</option>
            <option value="Asunto">Asunto</option>
            <option value="Beneficiario">Beneficiario</option>
            <option value="DNI">DNI</option>
          </select>
        </div>

        {/* Ticket Counter */}
        <div className="text-sm text-slate-500 ml-4">
          {paginaInicio}-{paginaFin} de {ticketsFiltrados.length} Tickets
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`border-r border-slate-200 bg-white transition-all overflow-hidden ${
            state.sidebarColapsado ? 'w-0' : 'w-64'
          }`}
        >
          <div className="p-4 space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-2 flex items-center gap-2">
                Filtros
              </h3>
              <SidebarItem label="Todos los tickets" value="todos"
                isActive={state.filtros.vista === 'todos'}
                count={countPorVista.todos}
                onClick={() => dispatch({ type: 'SET_VISTA', payload: 'todos' })}
              />
              <SidebarItem label="No resuelto" value="no_resuelto"
                isActive={state.filtros.vista === 'no_resuelto'}
                count={countPorVista.no_resuelto}
                onClick={() => dispatch({ type: 'SET_VISTA', payload: 'no_resuelto' })}
              />
              <SidebarItem label="Sin asignar" value="sin_asignar"
                isActive={state.filtros.vista === 'sin_asignar'}
                count={countPorVista.sin_asignar}
                onClick={() => dispatch({ type: 'SET_VISTA', payload: 'sin_asignar' })}
              />
              <SidebarItem label="Mío" value="mio"
                isActive={state.filtros.vista === 'mio'}
                count={countPorVista.mio}
                onClick={() => dispatch({ type: 'SET_VISTA', payload: 'mio' })}
              />
              <SidebarItem label="Cerrado" value="cerrado"
                isActive={state.filtros.vista === 'cerrado'}
                count={countPorVista.cerrado}
                onClick={() => dispatch({ type: 'SET_VISTA', payload: 'cerrado' })}
              />
              <SidebarItem label="Eliminado" value="eliminado"
                isActive={state.filtros.vista === 'eliminado'}
                count={countPorVista.eliminado}
                onClick={() => dispatch({ type: 'SET_VISTA', payload: 'eliminado' })}
              />
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-2">
                Filtrar por Programa
              </h3>
              <div className="space-y-2 px-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="programa"
                    checked={state.filtros.programa === 'Todos'}
                    onChange={() =>
                      dispatch({
                        type: 'SET_FILTRO_PROGRAMA',
                        payload: 'Todos',
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">Todos</span>
                </label>
                {programasDisponibles.map((p) => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="programa"
                      checked={state.filtros.programa === p}
                      onChange={() =>
                        dispatch({
                          type: 'SET_FILTRO_PROGRAMA',
                          payload: p,
                        })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-700">{p}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-2">
                Filtrar por Prioridad
              </h3>
              <div className="space-y-2 px-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="prioridad"
                    checked={state.filtros.prioridad === 'Todos'}
                    onChange={() =>
                      dispatch({
                        type: 'SET_FILTRO_PRIORIDAD',
                        payload: 'Todos',
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">Todos</span>
                </label>
                {PRIORIDADES.map((p) => (
                  <label
                    key={p}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="prioridad"
                      checked={state.filtros.prioridad === p}
                      onChange={() =>
                        dispatch({
                          type: 'SET_FILTRO_PRIORIDAD',
                          payload: p,
                        })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-700">{p}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto flex flex-col">
          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      checked={
                        state.seleccionados.size > 0 &&
                        state.seleccionados.size === ticketsPaginados.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          dispatch({
                            type: 'SELECCIONAR_TODOS',
                            payload: ticketsPaginados,
                          });
                        } else {
                          dispatch({ type: 'DESELECCIONAR_TODOS' });
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-3 w-8" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Tipo de Programa
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Nº de Legajo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Nombre del Solicitante
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Agente/s
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Fecha de Actualización
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {state.cargandoTickets && (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                        <span className="text-sm">Cargando tickets...</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!state.cargandoTickets && ticketsPaginados.map((ticket) => (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    isSelected={state.seleccionados.has(ticket.id)}
                    onToggleSelect={(id) =>
                      dispatch({ type: 'TOGGLE_SELECCION', payload: id })
                    }
                    onOpenDetail={(ticket) => {
                      dispatch({ type: 'ABRIR_TICKET_DETAIL', payload: ticket });
                      if (!ticket.leido) {
                        const token = localStorage.getItem('sc_token');
                        const apiUrl = (import.meta.env as Record<string, string>).VITE_API_URL;
                        if (token && apiUrl) {
                          fetch(`${apiUrl}/tickets/${ticket.id}/leido`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ leido: true }),
                          }).then(() => {
                            dispatch({ type: 'ACTUALIZAR_TICKET', payload: { id: ticket.id, fields: { leido: true } } });
                            dispatch({ type: 'SET_TICKETS', payload: state.tickets.map((t) => t.id === ticket.id ? { ...t, leido: true } : t) });
                          }).catch(() => {/* silencioso */});
                        }
                      }
                    }}
                    onMarkUnread={(id) => {
                      const token = localStorage.getItem('sc_token');
                      const apiUrl = (import.meta.env as Record<string, string>).VITE_API_URL;
                      if (token && apiUrl) {
                        fetch(`${apiUrl}/tickets/${id}/leido`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ leido: false }),
                        }).then(() => {
                          dispatch({ type: 'SET_TICKETS', payload: state.tickets.map((t) => t.id === id ? { ...t, leido: false } : t) });
                        }).catch(() => {/* silencioso */});
                      }
                    }}
                  />
                ))}

              </tbody>
            </table>
          </div>

          {/* Bulk Action Bar (conditional) */}
          {state.seleccionados.size > 0 && (
            <BulkActionBar
              count={state.seleccionados.size}
              onClearSelection={() =>
                dispatch({ type: 'DESELECCIONAR_TODOS' })
              }
            />
          )}

          {/* Pagination */}
          <div className="border-t border-slate-200 bg-white px-6 py-3 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Página {state.paginaActual} de {totalPaginas}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  dispatch({
                    type: 'CAMBIAR_PAGINA',
                    payload: Math.max(1, state.paginaActual - 1),
                  })
                }
                disabled={state.paginaActual === 1}
                className="p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() =>
                  dispatch({
                    type: 'CAMBIAR_PAGINA',
                    payload: Math.min(totalPaginas, state.paginaActual + 1),
                  })
                }
                disabled={state.paginaActual === totalPaginas}
                className="p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <NuevoTicketModal
        isOpen={state.modal.abierto}
        modal={state.modal}
        onClose={() => dispatch({ type: 'CERRAR_MODAL' })}
        onUpdateField={(field, value) =>
          dispatch({
            type: 'UPDATE_MODAL_FIELD',
            payload: { field, value },
          })
        }
        onAdjuntosChange={(adj) =>
          dispatch({ type: 'SET_MODAL_ADJUNTOS', payload: adj })
        }
        onSubmit={handleSubmitTicket}
        guardando={guardandoTicket}
        todosLosProgramas={todosLosProgramas}
      />
    </div>
  );
}
