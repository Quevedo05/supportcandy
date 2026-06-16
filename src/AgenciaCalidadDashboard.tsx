'use client';

import React, { useReducer, useMemo, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Plus, X, Search, File, RefreshCw, List, CheckCircle, Trash2, Pencil, UserCircle } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useFormularios } from './context/FormulariosContext';
import { FormularioDinamico } from './components/FormularioDinamico';
import { validarRespuestasCampos } from './utils/validarCampos';
import type { ValoresCampos, ErroresCampos } from './types/formularios';

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
}

interface DashboardState {
  tickets: Ticket[];
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

const PROGRAMA_PREFIX_MAP: Record<TipoPrograma, TicketPrefix> = {
  'MICROCRÉDITOS': 'MC',
};

const PROGRAMAS: TipoPrograma[] = ['MICROCRÉDITOS'];

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

const MOCK_TICKETS: Ticket[] = [];

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
  etapasAsignadas?: string[],
): Ticket[] {
  return tickets
    .filter((t) => !etapasAsignadas?.length || etapasAsignadas.includes(t.estado))
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

function getNextNumero(tickets: Ticket[], prefix: TicketPrefix): number {
  const matching = tickets.filter((t) => t.prefix === prefix);
  return matching.length > 0 ? Math.max(...matching.map((t) => t.numero)) + 1 : 1;
}

function generarIDTicket(
  programa: TipoPrograma,
  beneficiario: string,
  numero: number
): string {
  const prefix = PROGRAMA_PREFIX_MAP[programa];
  const nombreUpper = beneficiario.toUpperCase().trim();
  return `${prefix} ${numero} ${nombreUpper}`;
}

function validarModal(modal: ModalState): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!modal.programa) errores.programa = 'Seleccioná un programa';
  if (!modal.prioridad) errores.prioridad = 'Seleccioná una prioridad';
  if (!modal.beneficiario.trim())
    errores.beneficiario = 'Ingresá el nombre del beneficiario';
  if (!/^\d{7,8}$/.test(modal.dni))
    errores.dni = 'DNI debe tener 7 u 8 dígitos';
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

interface TicketRowProps {
  ticket: Ticket;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onOpenDetail: (ticket: Ticket) => void;
}

const TicketRow: React.FC<TicketRowProps> = ({
  ticket,
  isSelected,
  onToggleSelect,
  onOpenDetail,
}) => {
  const [expandido, setExpandido] = useState(false);
  const bgClass = isSelected ? 'bg-[#FEF2F2]' : 'hover:bg-slate-50';

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
        <td className="px-4 py-3 text-sm text-slate-700">
          {ticket.programa}
        </td>
        <td className="px-4 py-3 text-sm text-slate-600 font-mono">
          {ticket.legajo ?? '—'}
        </td>
        <td className="px-4 py-3 text-sm text-slate-800">
          {ticket.beneficiario.apellido} {ticket.beneficiario.nombre}
        </td>
        <td className="px-4 py-3">
          <EstadoBadge estado={ticket.estado} />
        </td>
        <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
          {formatearFecha(ticket.fechaActualizacion)}
        </td>
      </tr>
      {expandido && (
        <tr className={`border-b ${isSelected ? 'bg-[#FEF2F2]' : 'bg-slate-50'}`}>
          <td colSpan={7} className="px-6 py-3">
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
  onSubmit: (datosAdicionales?: Record<string, string>) => void;
  asuntoGenerado: string;
}

const NuevoTicketModal: React.FC<NuevoTicketModalProps> = ({
  isOpen,
  modal,
  onClose,
  onUpdateField,
  onAdjuntosChange,
  onSubmit,
  asuntoGenerado,
}) => {
  const { formularios, obtenerCampos } = useFormularios();
  const [valoresCampos, setValoresCampos] = useState<ValoresCampos>({});
  const [erroresCampos, setErroresCampos] = useState<ErroresCampos>({});
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const contenido = e.target?.result as string;
        onAdjuntosChange([
          ...modal.adjuntos,
          { nombre: file.name, tipo: file.type, tamano: file.size, contenido },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAdjunto = (idx: number) =>
    onAdjuntosChange(modal.adjuntos.filter((_, i) => i !== idx));

  // Reset dynamic values when programa changes
  useEffect(() => {
    setValoresCampos({});
    setErroresCampos({});
  }, [modal.programa]);

  const camposDelPrograma = modal.programa
    ? obtenerCampos(
        formularios.find((f) => f.programa === modal.programa)?.id ?? ''
      )
    : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Nuevo Ticket</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Asunto
            </label>
            <input
              type="text"
              value={asuntoGenerado}
              readOnly
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-xs font-mono text-slate-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tipo de Programa
              </label>
              <select
                value={modal.programa}
                onChange={(e) =>
                  onUpdateField('programa', e.target.value as TipoPrograma)
                }
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  modal.errores.programa
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-300'
                }`}
              >
                <option value="">Seleccionar...</option>
                {programasDisponibles.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {modal.errores.programa && (
                <p className="text-xs text-red-600 mt-1">
                  {modal.errores.programa}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Estado inicial
              </label>
              <div className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-orange-50 text-orange-700 font-medium">
                Solicitud inicial
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Prioridad
            </label>
            <div className="flex gap-6">
              {PRIORIDADES.map((p) => (
                <label key={p} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="prioridad"
                    value={p}
                    checked={modal.prioridad === p}
                    onChange={(e) =>
                      onUpdateField('prioridad', e.target.value as TicketPrioridad)
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">{p}</span>
                </label>
              ))}
            </div>
            {modal.errores.prioridad && (
              <p className="text-xs text-red-600 mt-1">
                {modal.errores.prioridad}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Beneficiario (nombre completo)
              </label>
              <input
                type="text"
                value={modal.beneficiario}
                onChange={(e) =>
                  onUpdateField('beneficiario', e.target.value)
                }
                placeholder="Ej: GOMEZ LAURA"
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  modal.errores.beneficiario
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-300'
                }`}
              />
              {modal.errores.beneficiario && (
                <p className="text-xs text-red-600 mt-1">
                  {modal.errores.beneficiario}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Teléfono móvil
              </label>
              <input
                type="text"
                value={modal.telefono}
                onChange={(e) => onUpdateField('telefono', e.target.value)}
                placeholder="Ej: 2645123456"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tipo de Documento
              </label>
              <select
                value={modal.tipoDocumento}
                onChange={(e) => onUpdateField('tipoDocumento', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              >
                <option value="">Seleccionar...</option>
                <option value="DNI">DNI</option>
                <option value="CUIT">CUIT</option>
                <option value="CUIL">CUIL</option>
                <option value="LC">LC</option>
                <option value="LE">LE</option>
                <option value="CE">CE</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                N° de Documento
              </label>
              <input
                type="text"
                value={modal.dni}
                onChange={(e) => onUpdateField('dni', e.target.value)}
                placeholder="Ej: 12345678"
                maxLength={11}
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  modal.errores.dni
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-300'
                }`}
              />
              {modal.errores.dni && (
                <p className="text-xs text-red-600 mt-1">{modal.errores.dni}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Descripción
            </label>
            <textarea
              value={modal.descripcion}
              onChange={(e) => onUpdateField('descripcion', e.target.value)}
              placeholder="Detalles del ticket..."
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
          </div>

          {camposDelPrograma.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 border-t border-slate-200 pt-4">
                Campos del programa
              </h3>
              <FormularioDinamico
                campos={camposDelPrograma}
                valores={valoresCampos}
                errores={erroresCampos}
                onChange={(campoId, valor) =>
                  setValoresCampos((prev) => ({ ...prev, [campoId]: valor }))
                }
                modo="staff"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Número de Acta <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={modal.numeroActa}
                onChange={(e) => onUpdateField('numeroActa', e.target.value)}
                placeholder="Ej: NOTA DEL 15/05/26"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Agente/s asignado/s <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={modal.agentes}
                onChange={(e) => onUpdateField('agentes', e.target.value)}
                placeholder="Ej: Juan Pérez, María García"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email del solicitante <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              type="email"
              value={modal.emailSolicitante}
              onChange={(e) => onUpdateField('emailSolicitante', e.target.value)}
              placeholder="Ej: solicitante@gmail.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Adjuntos <span className="text-slate-400 font-normal">(PDF, Word, imágenes, etc.)</span>
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
                    <button onClick={() => removeAdjunto(i)} className="text-slate-400 hover:text-red-500 ml-1">
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
            className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              // Validate dynamic fields if any
              if (camposDelPrograma.length > 0) {
                const erroresDinamicos = validarRespuestasCampos(
                  camposDelPrograma,
                  valoresCampos
                );
                if (Object.keys(erroresDinamicos).length > 0) {
                  setErroresCampos(erroresDinamicos);
                  return;
                }
              }
              // All validation passed, submit with dynamic values
              onSubmit(valoresCampos);
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-[#FF9500] rounded-md hover:bg-[#E67E00]"
          >
            Guardar Ticket
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
}

const ROL_LABELS: Record<string, string> = {
  admin: 'Administrador', contribuidor: 'Contribuidor',
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
}) => {
  const { usuario } = useAuth();
  const { formularios, obtenerCampos } = useFormularios();
  const [editandoEstado, setEditandoEstado] = useState(false);
  const [estadoTmp, setEstadoTmp] = useState<TicketEstado | ''>('');
  const [editandoAgentes, setEditandoAgentes] = useState(false);
  const [agentesTmp, setAgentesTmp] = useState('');
  const [derivarAbierto, setDerivarAbierto] = useState(false);
  const [editandoLegajo, setEditandoLegajo] = useState(false);
  const [legajoTmp, setLegajoTmp] = useState({ legajo: '', numeroActa: '', importe: '', codigoExterno: '' });
  const [editandoObservaciones, setEditandoObservaciones] = useState(false);
  const [observacionesTmp, setObservacionesTmp] = useState('');
  const [seccionesAbiertas, setSeccionesAbiertas] = useState<Record<string, boolean>>({
    solicitud: true, campos: true, legajo: true, asignaciones: true, observaciones: true, auditoria: false,
  });
  const adjuntosRef = React.useRef<HTMLInputElement>(null);

  if (!ticket) return null;

  const autorRol = usuario ? (ROL_LABELS[usuario.rol] ?? usuario.rol) : '';

  const toggleSeccion = (key: string) =>
    setSeccionesAbiertas((prev) => ({ ...prev, [key]: !prev[key] }));

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

  const handleGuardarAgentes = () => {
    const lista = agentesTmp.split(',').map((s) => s.trim()).filter(Boolean);
    onChangeAgentes(ticket.id, lista);
    setEditandoAgentes(false);
    setAgentesTmp('');
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden">
      {/* Header granate */}
      <div className="bg-[#7F1D1D] px-4 py-2 flex items-center gap-2">
        <button
          onClick={onNuevoTicket}
          className="flex items-center gap-1.5 bg-[#FF9500] hover:bg-[#E67E00] text-white text-xs font-medium px-3 py-1.5 rounded transition-colors"
        >
          <Plus size={13} /> Nuevo ticket
        </button>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors"
        >
          <List size={13} /> Lista de Ticket
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
                    <div className="absolute left-0 bottom-full mb-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 py-1 min-w-[220px]">
                      {ESTADOS.filter(e => e !== ticket.estado).map((e) => (
                        <button
                          key={e}
                          onClick={() => {
                            onChangeEstado(ticket.id, e);
                            setDerivarAbierto(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-orange-50 hover:text-[#FF9500] transition-colors"
                        >
                          {e}
                        </button>
                      ))}
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
                  <button onClick={() => { setEditandoEstado(true); setEstadoTmp(ticket.estado); }} className="text-slate-400 hover:text-slate-600 ml-auto">
                    <Pencil size={12} />
                  </button>
                </div>
              )}
              <InfoRow label="Programa" value={ticket.programa} />
              <InfoRow label="Prioridad"><PrioridadBadge prioridad={ticket.prioridad} /></InfoRow>
              <InfoRow label="Nombre" value={`${ticket.beneficiario.apellido} ${ticket.beneficiario.nombre}`} />
              <InfoRow label="Tipo Doc." value={ticket.tipoDocumento ?? '—'} />
              <InfoRow label="N° Documento" value={ticket.beneficiario.dni} />
              <InfoRow label="Email" value={ticket.emailSolicitante ?? '—'} />
              <InfoRow label="Teléfono" value={ticket.telefono ?? '—'} />
              <InfoRow label="Fecha ingreso" value={formatearFecha(ticket.fechaCreacion)} />
              <InfoRow label="Últ. edición" value={formatearFecha(ticket.fechaActualizacion)} />
            </div>
          )}

          {/* Campos de la Solicitud */}
          {ticket.datosAdicionales && Object.keys(ticket.datosAdicionales).length > 0 && (
            <>
              <SeccionHeader title="Campos de la Solicitud" sKey="campos" />
              {seccionesAbiertas.campos && (
                <div className="p-4 border-b border-slate-100 space-y-1">
                  {Object.entries(ticket.datosAdicionales).map(([k, v]) => {
                    const label = campoLabelMap[k] ?? k;
                    if (typeof v === 'string' && v.startsWith('data:')) {
                      return (
                        <div key={k} className="flex gap-2 py-0.5">
                          <span className="text-slate-500 text-xs min-w-[100px] flex-shrink-0">{label}:</span>
                          <a href={v} download={label} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                            <File size={11} /> Descargar
                          </a>
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
              {editandoAgentes ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={agentesTmp}
                    onChange={(e) => setAgentesTmp(e.target.value)}
                    placeholder="Ej: Agente 1, Agente 2"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                  />
                  <p className="text-xs text-slate-400">Separar con comas</p>
                  <div className="flex gap-2">
                    <button onClick={handleGuardarAgentes} className="flex-1 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Guardar</button>
                    <button onClick={() => setEditandoAgentes(false)} className="flex-1 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-end mb-1">
                    <button
                      onClick={() => { setEditandoAgentes(true); setAgentesTmp((ticket.agentes ?? []).join(', ')); }}
                      className="text-slate-400 hover:text-slate-600"
                    ><Pencil size={12} /></button>
                  </div>
                  {(ticket.agentes ?? []).length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Sin agente asignado</p>
                  ) : (
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
                  )}
                </div>
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
                  <div className="flex justify-end mb-1">
                    <button
                      onClick={() => { setObservacionesTmp(ticket.observaciones ?? ''); setEditandoObservaciones(true); }}
                      className="text-slate-400 hover:text-slate-600"
                    ><Pencil size={12} /></button>
                  </div>
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
      return { ...state, tickets: action.payload };
    default:
      return state;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 7: INITIAL STATE
// ═════════════════════════════════════════════════════════════════════════════

function reviveDates(_key: string, value: unknown): unknown {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    return new Date(value);
  }
  return value;
}

const STORAGE_KEY_TICKETS = 'sc_tickets_v2';

function saveTickets(tickets: Ticket[]) {
  try {
    localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));
  } catch { /* quota exceeded */ }
}

const getInitialState = (): DashboardState => {
  let tickets = MOCK_TICKETS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TICKETS);
    if (raw) tickets = JSON.parse(raw, reviveDates) as Ticket[];
  } catch { /* use mock */ }
  return {
    tickets,
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
    },
    ticketAbierto: null,
    comentarioNuevo: '',
    comentarioAdjuntos: [],
  };
};

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 8: MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

function mapApiTicket(t: Record<string, unknown>): Ticket {
  const titulo = String(t.titulo ?? '');
  const partesTitulo = titulo.split(' - ');
  const programa = partesTitulo.length > 1 ? partesTitulo[partesTitulo.length - 1] : 'Sin programa';

  const nombreCompleto = String(t.ciudadanoNombre ?? '');
  const partesNombre = nombreCompleto.trim().split(' ');
  const apellido = partesNombre.length > 1 ? partesNombre[partesNombre.length - 1] : '';
  const nombre = partesNombre.length > 1 ? partesNombre.slice(0, -1).join(' ') : nombreCompleto;

  const estadoApi = String(t.estado ?? 'abierto');
  const estadoMapped: TicketEstado =
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
    beneficiario: { apellido, nombre, dni: '' },
    asunto: titulo,
    programa,
    estado: estadoMapped,
    prioridad: prioridadMapped,
    descripcion: String(t.descripcion ?? ''),
    adjuntos: [],
    fechaCreacion: new Date(String(t.fechaCreacion ?? t.fecha_creacion ?? new Date())),
    fechaActualizacion: new Date(String(t.fechaCreacion ?? t.fecha_creacion ?? new Date())),
    comentarios: [],
    telefono: String(t.ciudadanoTelefono ?? ''),
    emailSolicitante: String(t.ciudadanoEmail ?? ''),
  };
}

export default function AgenciaCalidadDashboard() {
  const { usuario, usuarios } = useAuth();
  const [state, dispatch] = useReducer(dashboardReducer, undefined, getInitialState);

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
        if (!res.ok) return;
        const data = await res.json();
        const mapped = (data.tickets as Record<string, unknown>[]).map(mapApiTicket);
        dispatch({ type: 'SET_TICKETS', payload: mapped });
        saveTickets(mapped);
      } catch {
        // fallback: keep localStorage tickets
      }
    };
    fetchTickets();
    window.addEventListener('focus', fetchTickets);
    return () => window.removeEventListener('focus', fetchTickets);
  }, []);

  // Persist tickets to localStorage whenever they change
  useEffect(() => {
    saveTickets(state.tickets);
  }, [state.tickets]);

  // Programas únicos presentes en los tickets cargados
  const programasDisponibles = useMemo(() => {
    const set = new Set(state.tickets.map((t) => t.programa).filter(Boolean));
    return Array.from(set).sort();
  }, [state.tickets]);

  // For contribuidores, restrict visible tickets to their assigned stages
  const etapasAsignadas = useMemo(() => {
    if (usuario?.rol !== 'contribuidor') return undefined;
    const fullUser = usuarios.find(u => u.id === usuario.usuarioId);
    return fullUser?.etapasAsignadas ?? [];
  }, [usuario, usuarios]);

  // Derived state
  const ticketsFiltrados = useMemo(
    () => aplicarFiltros(state.tickets, state.filtros, usuario?.nombre, etapasAsignadas),
    [state.tickets, state.filtros, usuario?.nombre, etapasAsignadas]
  );

  const ticketsPaginados = useMemo(() => {
    const inicio = (state.paginaActual - 1) * state.porPagina;
    return ticketsFiltrados.slice(inicio, inicio + state.porPagina);
  }, [ticketsFiltrados, state.paginaActual, state.porPagina]);

  const totalPaginas = Math.ceil(ticketsFiltrados.length / state.porPagina);

  const asuntoGenerado = useMemo(() => {
    if (!state.modal.programa || !state.modal.beneficiario) return '';
    const nextNum = getNextNumero(
      state.tickets,
      PROGRAMA_PREFIX_MAP[state.modal.programa as TipoPrograma]
    );
    return generarIDTicket(
      state.modal.programa as TipoPrograma,
      state.modal.beneficiario,
      nextNum
    );
  }, [state.modal.programa, state.modal.beneficiario, state.tickets]);

  const countPorVista = useMemo(() => {
    const visibles = etapasAsignadas?.length
      ? state.tickets.filter((t) => etapasAsignadas.includes(t.estado))
      : state.tickets;
    const noElim = visibles.filter((t) => !t.eliminado);
    return {
      todos:       noElim.length,
      no_resuelto: noElim.filter((t) => t.estado !== 'Cerrado').length,
      sin_asignar: noElim.filter((t) => !t.agentes || t.agentes.length === 0).length,
      mio:         noElim.filter((t) => (t.agentes ?? []).includes(usuario?.nombre ?? '')).length,
      cerrado:     noElim.filter((t) => t.estado === 'Cerrado').length,
      eliminado:   visibles.filter((t) => !!t.eliminado).length,
    };
  }, [state.tickets, usuario?.nombre]);

  const handleSubmitTicket = (datosAdicionales?: Record<string, string>) => {
    const errores = validarModal(state.modal);
    if (Object.keys(errores).length > 0) {
      dispatch({ type: 'SET_MODAL_ERRORES', payload: errores });
      return;
    }

    const nextNum = getNextNumero(
      state.tickets,
      PROGRAMA_PREFIX_MAP[state.modal.programa as TipoPrograma]
    );
    const newTicket: Ticket = {
      id: asuntoGenerado,
      prefix: PROGRAMA_PREFIX_MAP[state.modal.programa as TipoPrograma],
      numero: nextNum,
      beneficiario: {
        apellido: state.modal.beneficiario.split(' ')[0] || '',
        nombre: state.modal.beneficiario.split(' ').slice(1).join(' ') || '',
        dni: state.modal.dni,
      },
      asunto: asuntoGenerado,
      programa: state.modal.programa as TipoPrograma,
      estado: (state.modal.estado as TicketEstado) || 'Solicitud inicial',
      prioridad: state.modal.prioridad as TicketPrioridad,
      descripcion: state.modal.descripcion,
      adjuntos: state.modal.adjuntos,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
      comentarios: [],
      tipoDocumento: state.modal.tipoDocumento || undefined,
      telefono: state.modal.telefono || undefined,
      datosAdicionales: datosAdicionales && Object.keys(datosAdicionales).length > 0 ? datosAdicionales : undefined,
      numeroActa: state.modal.numeroActa || undefined,
      agentes: state.modal.agentes ? state.modal.agentes.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      emailSolicitante: state.modal.emailSolicitante || undefined,
    };

    dispatch({ type: 'TICKET_GUARDADO', payload: newTicket });
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
        onAddComment={(autorRol, adjuntos) =>
          dispatch({ type: 'AGREGAR_COMENTARIO', payload: { autor: usuario?.nombre || 'Usuario', autorRol, adjuntos } })
        }
        onChangeEstado={(id, estado) =>
          dispatch({ type: 'CAMBIAR_ESTADO_TICKET', payload: { id, estado, autor: usuario?.nombre || 'Usuario' } })
        }
        onChangeAgentes={(id, agentes) =>
          dispatch({ type: 'CAMBIAR_AGENTES_TICKET', payload: { id, agentes, autor: usuario?.nombre || 'Usuario' } })
        }
        onEliminarTicket={(id) => dispatch({ type: 'ELIMINAR_TICKET', payload: id })}
        onNuevoTicket={() => dispatch({ type: 'CERRAR_TICKET_DETAIL' })}
        onActualizarTicket={(id, fields) => dispatch({ type: 'ACTUALIZAR_TICKET', payload: { id, fields } })}
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
                    Fecha de Actualización
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {ticketsPaginados.map((ticket) => (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    isSelected={state.seleccionados.has(ticket.id)}
                    onToggleSelect={(id) =>
                      dispatch({ type: 'TOGGLE_SELECCION', payload: id })
                    }
                    onOpenDetail={(ticket) =>
                      dispatch({ type: 'ABRIR_TICKET_DETAIL', payload: ticket })
                    }
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
        asuntoGenerado={asuntoGenerado}
      />
    </div>
  );
}
