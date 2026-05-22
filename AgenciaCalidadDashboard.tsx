'use client';

import React, { useReducer, useMemo, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Search, Menu, File } from 'lucide-react';

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1: TYPE DEFINITIONS
// ═════════════════════════════════════════════════════════════════════════════

type TicketEstado =
  | 'Solicitud inicial'
  | 'Transferencia'
  | 'Firma de contrato'
  | 'No resuelto'
  | 'Cerrado';

type TicketPrioridad = 'Normal' | 'Alta' | 'Urgente';

type TipoPrograma =
  | 'Microcréditos 2024'
  | 'Cosecha y Acarreo 2026'
  | 'Programa Aprender, Trabajar y Producir';

type TicketPrefix = 'PM' | 'PCA26' | 'ATPA';

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
}

interface FiltrosActivos {
  busqueda: string;
  campoBusqueda: CampoBusqueda;
  estado: TicketEstado | 'Todos';
  programa: TipoPrograma | 'Todos';
  prioridad: TicketPrioridad | 'Todos';
}

interface ModalState {
  abierto: boolean;
  programa: TipoPrograma | '';
  estado: TicketEstado | '';
  prioridad: TicketPrioridad | '';
  beneficiario: string;
  dni: string;
  descripcion: string;
  errores: Record<string, string>;
}

interface DashboardState {
  tickets: Ticket[];
  seleccionados: Set<string>;
  filtros: FiltrosActivos;
  paginaActual: number;
  porPagina: number;
  sidebarColapsado: boolean;
  modal: ModalState;
}

type DashboardAction =
  | { type: 'SET_BUSQUEDA'; payload: string }
  | { type: 'SET_CAMPO_BUSQUEDA'; payload: CampoBusqueda }
  | { type: 'SET_FILTRO_ESTADO'; payload: TicketEstado | 'Todos' }
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
  | { type: 'SET_MODAL_ERRORES'; payload: Record<string, string> };

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2: CONSTANTS & COLOR CONFIG
// ═════════════════════════════════════════════════════════════════════════════

const ESTADO_CONFIG: Record<TicketEstado, { color: string; bg: string }> = {
  'Solicitud inicial': { color: '#F97316', bg: '#FFF7ED' },
  Transferencia: { color: '#3B82F6', bg: '#EFF6FF' },
  'Firma de contrato': { color: '#EC4899', bg: '#FDF2F8' },
  'No resuelto': { color: '#EF4444', bg: '#FEF2F2' },
  Cerrado: { color: '#6B7280', bg: '#F9FAFB' },
};

const PRIORIDAD_CONFIG: Record<TicketPrioridad, { color: string; bg: string }> = {
  Normal: { color: '#22C55E', bg: '#F0FDF4' },
  Alta: { color: '#EAB308', bg: '#FEFCE8' },
  Urgente: { color: '#EF4444', bg: '#FEF2F2' },
};

const PROGRAMA_PREFIX_MAP: Record<TipoPrograma, TicketPrefix> = {
  'Microcréditos 2024': 'PM',
  'Cosecha y Acarreo 2026': 'PCA26',
  'Programa Aprender, Trabajar y Producir': 'ATPA',
};

const PROGRAMAS: TipoPrograma[] = [
  'Microcréditos 2024',
  'Cosecha y Acarreo 2026',
  'Programa Aprender, Trabajar y Producir',
];

const ESTADOS: TicketEstado[] = [
  'Solicitud inicial',
  'Transferencia',
  'Firma de contrato',
  'No resuelto',
  'Cerrado',
];

const PRIORIDADES: TicketPrioridad[] = ['Normal', 'Alta', 'Urgente'];

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3: MOCK DATA (15 TICKETS)
// ═════════════════════════════════════════════════════════════════════════════

const MOCK_TICKETS: Ticket[] = [
  // PM
  {
    id: 'PM 403 JIMENEZ VERA MARIA ANGELES',
    prefix: 'PM',
    numero: 403,
    beneficiario: { apellido: 'JIMENEZ VERA', nombre: 'MARIA ANGELES', dni: '28741203' },
    asunto: 'Solicitud de microcrédito para emprendimiento textil',
    programa: 'Microcréditos 2024',
    estado: 'Solicitud inicial',
    prioridad: 'Normal',
    descripcion: 'Emprendedora solicita financiamiento para taller de confección domiciliaria en Rawson.',
    adjuntos: [{ nombre: 'dni_frente.pdf', tipo: 'application/pdf', tamano: 214000 }],
    fechaCreacion: new Date('2025-01-08'),
    fechaActualizacion: new Date('2025-01-15'),
  },
  {
    id: 'PM 217 RODRIGUEZ PABLO EZEQUIEL',
    prefix: 'PM',
    numero: 217,
    beneficiario: { apellido: 'RODRIGUEZ', nombre: 'PABLO EZEQUIEL', dni: '33589012' },
    asunto: 'Microcrédito para adquisición de herramientas carpintería',
    programa: 'Microcréditos 2024',
    estado: 'Transferencia',
    prioridad: 'Alta',
    descripcion: 'Carpintero independiente solicita ampliación de taller.',
    adjuntos: [],
    fechaCreacion: new Date('2025-01-10'),
    fechaActualizacion: new Date('2025-01-20'),
  },
  {
    id: 'PM 512 CORREA SANDRA BEATRIZ',
    prefix: 'PM',
    numero: 512,
    beneficiario: { apellido: 'CORREA', nombre: 'SANDRA BEATRIZ', dni: '25463891' },
    asunto: 'Financiamiento para miniemprendimiento gastronómico',
    programa: 'Microcréditos 2024',
    estado: 'Firma de contrato',
    prioridad: 'Normal',
    descripcion: 'Productora de comidas caseras para venta en mercado local.',
    adjuntos: [{ nombre: 'contrato_firmado.pdf', tipo: 'application/pdf', tamano: 520000 }],
    fechaCreacion: new Date('2025-02-01'),
    fechaActualizacion: new Date('2025-02-14'),
  },
  {
    id: 'PM 089 VARGAS HECTOR OMAR',
    prefix: 'PM',
    numero: 89,
    beneficiario: { apellido: 'VARGAS', nombre: 'HECTOR OMAR', dni: '20134567' },
    asunto: 'Solicitud de microcrédito — caso no resuelto por documentación incompleta',
    programa: 'Microcréditos 2024',
    estado: 'No resuelto',
    prioridad: 'Urgente',
    descripcion: 'Documentación vencida. Requiere re-presentación de DNI y constancia AFIP.',
    adjuntos: [],
    fechaCreacion: new Date('2024-12-03'),
    fechaActualizacion: new Date('2025-01-05'),
  },
  {
    id: 'PM 334 LUNA PATRICIA VIVIANA',
    prefix: 'PM',
    numero: 334,
    beneficiario: { apellido: 'LUNA', nombre: 'PATRICIA VIVIANA', dni: '27890345' },
    asunto: 'Microcrédito para compra de máquina de coser industrial — Cerrado',
    programa: 'Microcréditos 2024',
    estado: 'Cerrado',
    prioridad: 'Normal',
    descripcion: 'Crédito otorgado y pagado en su totalidad. Expediente cerrado.',
    adjuntos: [{ nombre: 'comprobante_pago.pdf', tipo: 'application/pdf', tamano: 98000 }],
    fechaCreacion: new Date('2024-09-15'),
    fechaActualizacion: new Date('2025-01-30'),
  },
  // PCA26
  {
    id: 'PCA26 187 GUGLIEMINO RINA DANIELA',
    prefix: 'PCA26',
    numero: 187,
    beneficiario: { apellido: 'GUGLIEMINO', nombre: 'RINA DANIELA', dni: '31204567' },
    asunto: 'Inscripción cosecha temporada uva 2026 — Zona Valle de Tulum',
    programa: 'Cosecha y Acarreo 2026',
    estado: 'Solicitud inicial',
    prioridad: 'Normal',
    descripcion: 'Trabajadora temporaria. Primera inscripción al programa.',
    adjuntos: [{ nombre: 'formulario_inscripcion.pdf', tipo: 'application/pdf', tamano: 310000 }],
    fechaCreacion: new Date('2025-03-01'),
    fechaActualizacion: new Date('2025-03-05'),
  },
  {
    id: 'PCA26 044 ARAYA JUAN CARLOS',
    prefix: 'PCA26',
    numero: 44,
    beneficiario: { apellido: 'ARAYA', nombre: 'JUAN CARLOS', dni: '18765432' },
    asunto: 'Transferencia de beneficio cosecha y acarreo',
    programa: 'Cosecha y Acarreo 2026',
    estado: 'Transferencia',
    prioridad: 'Alta',
    descripcion: 'Trabajador verificado. Pendiente acreditación bancaria Cuenta ANSES.',
    adjuntos: [],
    fechaCreacion: new Date('2025-03-10'),
    fechaActualizacion: new Date('2025-03-18'),
  },
  {
    id: 'PCA26 302 FLORES MARTA ELENA',
    prefix: 'PCA26',
    numero: 302,
    beneficiario: { apellido: 'FLORES', nombre: 'MARTA ELENA', dni: '29567843' },
    asunto: 'Conflicto de datos en padrón — caso sin resolución',
    programa: 'Cosecha y Acarreo 2026',
    estado: 'No resuelto',
    prioridad: 'Urgente',
    descripcion: 'Beneficiaria aparece duplicada en padrón. Requiere depuración de base.',
    adjuntos: [{ nombre: 'captura_padron.png', tipo: 'image/png', tamano: 87000 }],
    fechaCreacion: new Date('2025-02-20'),
    fechaActualizacion: new Date('2025-03-01'),
  },
  {
    id: 'PCA26 259 MERCADO CARLOS ALBERTO',
    prefix: 'PCA26',
    numero: 259,
    beneficiario: { apellido: 'MERCADO', nombre: 'CARLOS ALBERTO', dni: '22456789' },
    asunto: 'Firma de contrato cosecha — zona Pocito',
    programa: 'Cosecha y Acarreo 2026',
    estado: 'Firma de contrato',
    prioridad: 'Normal',
    descripcion: 'Contrato de trabajo temporario emitido. Aguarda firma en sede.',
    adjuntos: [{ nombre: 'contrato_cosecha.pdf', tipo: 'application/pdf', tamano: 430000 }],
    fechaCreacion: new Date('2025-03-12'),
    fechaActualizacion: new Date('2025-03-14'),
  },
  {
    id: 'PCA26 118 PEREZ NATALIA SOLEDAD',
    prefix: 'PCA26',
    numero: 118,
    beneficiario: { apellido: 'PEREZ', nombre: 'NATALIA SOLEDAD', dni: '35678901' },
    asunto: 'Expediente cosecha 2026 cerrado — beneficio acreditado',
    programa: 'Cosecha y Acarreo 2026',
    estado: 'Cerrado',
    prioridad: 'Normal',
    descripcion: 'Beneficio transferido correctamente. Expediente archivado.',
    adjuntos: [],
    fechaCreacion: new Date('2025-01-25'),
    fechaActualizacion: new Date('2025-02-28'),
  },
  // ATPA
  {
    id: 'ATPA 076 CASTRO LORENA BEATRIZ',
    prefix: 'ATPA',
    numero: 76,
    beneficiario: { apellido: 'CASTRO', nombre: 'LORENA BEATRIZ', dni: '30234567' },
    asunto: 'Inscripción capacitación en oficios — costura y serigrafía',
    programa: 'Programa Aprender, Trabajar y Producir',
    estado: 'Solicitud inicial',
    prioridad: 'Normal',
    descripcion: 'Joven de 24 años inscripta en módulo textil del programa ATP.',
    adjuntos: [{ nombre: 'formulario_atp.pdf', tipo: 'application/pdf', tamano: 275000 }],
    fechaCreacion: new Date('2025-02-10'),
    fechaActualizacion: new Date('2025-02-12'),
  },
  {
    id: 'ATPA 155 GOMEZ RAUL FERNANDO',
    prefix: 'ATPA',
    numero: 155,
    beneficiario: { apellido: 'GOMEZ', nombre: 'RAUL FERNANDO', dni: '26789012' },
    asunto: 'Subsidio ATP — transferencia pendiente verificación CBU',
    programa: 'Programa Aprender, Trabajar y Producir',
    estado: 'Transferencia',
    prioridad: 'Alta',
    descripcion: 'CBU declarado difiere del registrado en ANSES. Requiere corrección.',
    adjuntos: [{ nombre: 'constancia_cbu.pdf', tipo: 'application/pdf', tamano: 145000 }],
    fechaCreacion: new Date('2025-02-18'),
    fechaActualizacion: new Date('2025-03-02'),
  },
  {
    id: 'ATPA 201 SOTO MIRIAM ALEJANDRA',
    prefix: 'ATPA',
    numero: 201,
    beneficiario: { apellido: 'SOTO', nombre: 'MIRIAM ALEJANDRA', dni: '24123456' },
    asunto: 'Contrato ATP firmado — modalidad producción agroalimentaria',
    programa: 'Programa Aprender, Trabajar y Producir',
    estado: 'Firma de contrato',
    prioridad: 'Normal',
    descripcion: 'Productora rural. Contrato de capacitación con compromiso de producción.',
    adjuntos: [
      { nombre: 'contrato_atp.pdf', tipo: 'application/pdf', tamano: 610000 },
      { nombre: 'acta_compromiso.pdf', tipo: 'application/pdf', tamano: 200000 },
    ],
    fechaCreacion: new Date('2025-03-05'),
    fechaActualizacion: new Date('2025-03-15'),
  },
  {
    id: 'ATPA 033 DIAZ OSCAR GUILLERMO',
    prefix: 'ATPA',
    numero: 33,
    beneficiario: { apellido: 'DIAZ', nombre: 'OSCAR GUILLERMO', dni: '19345678' },
    asunto: 'Caso ATP sin resolver — falta documentación laboral',
    programa: 'Programa Aprender, Trabajar y Producir',
    estado: 'No resuelto',
    prioridad: 'Urgente',
    descripcion: 'Beneficiario no presentó historial laboral requerido por normativa ATP-2025.',
    adjuntos: [],
    fechaCreacion: new Date('2024-11-20'),
    fechaActualizacion: new Date('2025-01-08'),
  },
  {
    id: 'ATPA 412 HERRERA CLAUDIA NOEMI',
    prefix: 'ATPA',
    numero: 412,
    beneficiario: { apellido: 'HERRERA', nombre: 'CLAUDIA NOEMI', dni: '27456789' },
    asunto: 'Expediente ATP cerrado — capacitación completada con certificación',
    programa: 'Programa Aprender, Trabajar y Producir',
    estado: 'Cerrado',
    prioridad: 'Normal',
    descripcion: 'Beneficiaria completó 120 horas. Certificado emitido. Expediente cerrado.',
    adjuntos: [{ nombre: 'certificado_atp.pdf', tipo: 'application/pdf', tamano: 330000 }],
    fechaCreacion: new Date('2024-10-01'),
    fechaActualizacion: new Date('2025-02-20'),
  },
];

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

function aplicarFiltros(tickets: Ticket[], filtros: FiltrosActivos): Ticket[] {
  return tickets
    .filter((t) =>
      filtros.estado === 'Todos' ? true : t.estado === filtros.estado
    )
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
  if (!modal.estado) errores.estado = 'Seleccioná un estado';
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
}

const TicketRow: React.FC<TicketRowProps> = ({
  ticket,
  isSelected,
  onToggleSelect,
}) => {
  return (
    <tr
      className={`border-b transition-colors ${
        isSelected ? 'bg-[#FEF2F2]' : 'hover:bg-slate-50'
      }`}
    >
      <td className="px-4 py-3 w-12">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(ticket.id)}
          className="w-4 h-4 rounded border-slate-300 cursor-pointer"
        />
      </td>
      <td className="px-4 py-3 text-xs font-mono text-slate-800 max-w-xs">
        {ticket.id}
      </td>
      <td className="px-4 py-3">
        <EstadoBadge estado={ticket.estado} />
      </td>
      <td className="px-4 py-3 text-sm text-slate-700 max-w-md truncate">
        {ticket.asunto}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {ticket.programa === 'Microcréditos 2024'
          ? 'Microcréditos'
          : ticket.programa === 'Cosecha y Acarreo 2026'
            ? 'Cosecha/Acarreo'
            : 'ATP'}
      </td>
      <td className="px-4 py-3">
        <PrioridadBadge prioridad={ticket.prioridad} />
      </td>
      <td className="px-4 py-3 text-sm text-slate-500">
        {formatearFecha(ticket.fechaActualizacion)}
      </td>
    </tr>
  );
};

interface SidebarItemProps {
  label: string;
  value: TicketEstado | 'Todos';
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
          ? 'border-l-2 border-[#B91C1C] bg-[#FEF2F2] text-[#B91C1C] font-medium'
          : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      <span>{label}</span>
      <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">
        {count}
      </span>
    </button>
  );
};

interface NuevoTicketModalProps {
  isOpen: boolean;
  modal: ModalState;
  onClose: () => void;
  onUpdateField: (field: string, value: unknown) => void;
  onSubmit: () => void;
  asuntoGenerado: string;
}

const NuevoTicketModal: React.FC<NuevoTicketModalProps> = ({
  isOpen,
  modal,
  onClose,
  onUpdateField,
  onSubmit,
  asuntoGenerado,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Nuevo Ticket</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Asunto (read-only) */}
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

          {/* Programa & Estado */}
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
                {PROGRAMAS.map((p) => (
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
                Estado
              </label>
              <select
                value={modal.estado}
                onChange={(e) =>
                  onUpdateField('estado', e.target.value as TicketEstado)
                }
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  modal.errores.estado
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-300'
                }`}
              >
                <option value="">Seleccionar...</option>
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
              {modal.errores.estado && (
                <p className="text-xs text-red-600 mt-1">
                  {modal.errores.estado}
                </p>
              )}
            </div>
          </div>

          {/* Prioridad */}
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

          {/* Beneficiario & DNI */}
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
                DNI
              </label>
              <input
                type="text"
                value={modal.dni}
                onChange={(e) => onUpdateField('dni', e.target.value)}
                placeholder="Ej: 12345678"
                maxLength={8}
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

          {/* Descripción */}
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

          {/* Adjuntos */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Adjuntos
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-md p-6 text-center">
              <File className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600">
                Arrastrá archivos aquí o{' '}
                <button className="text-[#B91C1C] font-medium hover:underline">
                  selecciona archivos
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end px-6 py-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-[#B91C1C] rounded-md hover:bg-[#991B1B]"
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
    <div className="bg-[#1E293B] text-white px-6 py-3 flex items-center gap-4 rounded-b-lg">
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
    case 'SET_FILTRO_ESTADO':
      return {
        ...state,
        filtros: { ...state.filtros, estado: action.payload },
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
          estado: 'Todos',
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
          dni: '',
          descripcion: '',
          errores: {},
        },
      };
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
          dni: '',
          descripcion: '',
          errores: {},
        },
      };
    }
    default:
      return state;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 7: INITIAL STATE
// ═════════════════════════════════════════════════════════════════════════════

const getInitialState = (): DashboardState => ({
  tickets: MOCK_TICKETS,
  seleccionados: new Set(),
  filtros: {
    busqueda: '',
    campoBusqueda: 'ID',
    estado: 'Todos',
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
    dni: '',
    descripcion: '',
    errores: {},
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 8: MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function AgenciaCalidadDashboard() {
  const [state, dispatch] = useReducer(dashboardReducer, undefined, getInitialState);

  // Derived state
  const ticketsFiltrados = useMemo(
    () => aplicarFiltros(state.tickets, state.filtros),
    [state.tickets, state.filtros]
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

  // Count for sidebar
  const countPorEstado = useMemo(() => {
    return {
      'Todos': state.tickets.length,
      'No resuelto': state.tickets.filter((t) => t.estado === 'No resuelto').length,
      'Cerrado': state.tickets.filter((t) => t.estado === 'Cerrado').length,
    };
  }, [state.tickets]);

  const handleSubmitTicket = () => {
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
      estado: state.modal.estado as TicketEstado,
      prioridad: state.modal.prioridad as TicketPrioridad,
      descripcion: state.modal.descripcion,
      adjuntos: [],
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
    };

    dispatch({ type: 'TICKET_GUARDADO', payload: newTicket });
  };

  const paginaInicio = (state.paginaActual - 1) * state.porPagina + 1;
  const paginaFin = Math.min(state.paginaActual * state.porPagina, ticketsFiltrados.length);

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Top Navigation Bar */}
      <div className="h-16 bg-[#1E293B] flex items-center px-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-white/20" />
          <div className="w-10 h-10 rounded bg-white/20" />
          <div className="w-px h-8 bg-white/20" />
          <div className="flex flex-col gap-0.5 leading-tight">
            <p className="text-xs text-white/60 font-medium tracking-wide">
              San Juan Gobierno
            </p>
            <p className="text-xs text-white/60">Ministerio de Producción</p>
            <p className="text-sm text-white font-semibold">Agencia Calidad San Juan</p>
          </div>
        </div>
      </div>

      {/* Red Accent Rule */}
      <div className="h-1 bg-[#B91C1C] w-full" />

      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3">
        <button
          onClick={() => dispatch({ type: 'ABRIR_MODAL' })}
          className="flex items-center gap-2 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
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
            {/* Vistas */}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-2">
                Vistas
              </h3>
              <SidebarItem
                label="Todos los tickets"
                value="Todos"
                isActive={state.filtros.estado === 'Todos'}
                count={countPorEstado['Todos']}
                onClick={() =>
                  dispatch({ type: 'SET_FILTRO_ESTADO', payload: 'Todos' })
                }
              />
              <SidebarItem
                label="No resuelto"
                value="No resuelto"
                isActive={state.filtros.estado === 'No resuelto'}
                count={countPorEstado['No resuelto']}
                onClick={() =>
                  dispatch({
                    type: 'SET_FILTRO_ESTADO',
                    payload: 'No resuelto',
                  })
                }
              />
              <SidebarItem
                label="Cerrado"
                value="Cerrado"
                isActive={state.filtros.estado === 'Cerrado'}
                count={countPorEstado['Cerrado']}
                onClick={() =>
                  dispatch({ type: 'SET_FILTRO_ESTADO', payload: 'Cerrado' })
                }
              />
            </div>

            {/* Filtros Guardados */}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-2">
                Filtros Guardados
              </h3>
              <p className="text-xs text-slate-500 px-4">
                Próximamente disponible
              </p>
            </div>

            {/* Filtro Programa */}
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
                {PROGRAMAS.map((p) => (
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

            {/* Filtro Prioridad */}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Asunto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Programa
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Prioridad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actualizado
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
        onSubmit={handleSubmitTicket}
        asuntoGenerado={asuntoGenerado}
      />
    </div>
  );
}
