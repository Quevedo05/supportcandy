'use client';

import React, { useReducer, useMemo, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Plus, X, Search, File, Bold, Italic, Underline, RefreshCw, List, CheckCircle, Trash2, Pencil, Users, UserCircle, Mail } from 'lucide-react';
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

interface Comentario {
  id: string;
  autor: string;
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
  legajo?: string;
  tipoTramite?: string;
  datosAdicionales?: Record<string, string>;
  numeroActa?: string;
  agentes?: string[];
  emailSolicitante?: string;
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
  dni: string;
  descripcion: string;
  errores: Record<string, string>;
  numeroActa: string;
  agentes: string;
  emailSolicitante: string;
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
}

type DashboardAction =
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
  | { type: 'AGREGAR_COMENTARIO'; payload: string }
  | { type: 'CAMBIAR_ESTADO_TICKET'; payload: { id: string; estado: TicketEstado; autor: string } }
  | { type: 'CAMBIAR_AGENTES_TICKET'; payload: { id: string; agentes: string[]; autor: string } }
  | { type: 'ELIMINAR_TICKET'; payload: string };

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
// SECTION 3: MOCK DATA (15 TICKETS)
// ═════════════════════════════════════════════════════════════════════════════

const MOCK_TICKETS: Ticket[] = [
  {
    id: 'PM 403 JIMENEZ VERA MARIA ANGELES',
    prefix: 'PM',
    numero: 403,
    beneficiario: { apellido: 'JIMENEZ VERA', nombre: 'MARIA ANGELES', dni: '28741203' },
    asunto: 'Solicitud de microcrédito para emprendimiento textil',
    programa: 'Microcréditos 2024',
    estado: 'Veraz',
    prioridad: 'Normal',
    descripcion: 'Emprendedora solicita financiamiento para taller de confección domiciliaria en Rawson.',
    adjuntos: [{ nombre: 'dni_frente.pdf', tipo: 'application/pdf', tamano: 214000 }],
    fechaCreacion: new Date('2025-01-08'),
    fechaActualizacion: new Date('2025-01-15'),
    telefono: '2644123456',
    legajo: 'LEG-2024-001',
    tipoTramite: 'Nuevo Microcrédito',
    numeroActa: 'ACTA-001/2025',
    agentes: ['Mario Ureta', 'Martina Oliver'],
    emailSolicitante: 'maria.jimenez@gmail.com',
    comentarios: [
      {
        id: '1',
        tipo: 'comentario' as const,
        autor: 'Mario Ureta',
        email: 'mario@agencia.gob.ar',
        fecha: new Date('2025-01-08T10:30:00'),
        contenido: 'Ticket creado. Documentación inicial recibida correctamente.',
        adjuntos: [],
      },
      {
        id: '2',
        tipo: 'evento_estado' as const,
        autor: 'Mario Ureta',
        email: 'mario@agencia.gob.ar',
        fecha: new Date('2025-01-10T09:00:00'),
        contenido: '',
        estadoAnterior: 'Solicitud inicial',
        estadoNuevo: 'Revisión de documentación',
        adjuntos: [],
      },
      {
        id: '3',
        tipo: 'comentario' as const,
        autor: 'Martina Oliver',
        email: 'moliver@agencia.gob.ar',
        fecha: new Date('2025-01-12T14:45:00'),
        contenido: 'Se ha revisado la documentación. Requiere fotocopia de recibos de servicios.',
        adjuntos: [],
      },
      {
        id: '4',
        tipo: 'evento_estado' as const,
        autor: 'Martina Oliver',
        email: 'moliver@agencia.gob.ar',
        fecha: new Date('2025-01-15T11:20:00'),
        contenido: '',
        estadoAnterior: 'Revisión de documentación',
        estadoNuevo: 'Veraz',
        adjuntos: [],
      },
    ],
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
    telefono: '2645678901',
    legajo: 'LEG-2024-002',
    tipoTramite: 'Ampliación de Línea',
    numeroActa: 'NOTA DEL 20/01/25',
    agentes: ['Mario Ureta'],
    emailSolicitante: 'pablo.rodriguez@hotmail.com',
    comentarios: [
      {
        id: '1',
        tipo: 'comentario' as const,
        autor: 'Mario Ureta',
        email: 'mario@agencia.gob.ar',
        fecha: new Date('2025-01-10T09:00:00'),
        contenido: 'Documentación completa recibida. Se inicia el proceso.',
        adjuntos: [],
      },
      {
        id: '2',
        tipo: 'evento_agente' as const,
        autor: 'Mario Ureta',
        email: 'mario@agencia.gob.ar',
        fecha: new Date('2025-01-18T10:05:00'),
        contenido: '',
        agenteAnterior: 'Mario Ureta, Martina Oliver',
        agenteNuevo: 'Mario Ureta',
        adjuntos: [],
      },
      {
        id: '3',
        tipo: 'evento_estado' as const,
        autor: 'Mario Ureta',
        email: 'mario@agencia.gob.ar',
        fecha: new Date('2025-01-20T08:30:00'),
        contenido: '',
        estadoAnterior: 'Seguimiento de verificable',
        estadoNuevo: 'Transferencia',
        adjuntos: [],
      },
    ],
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
    telefono: '2642891234',
    legajo: 'LEG-2024-003',
    tipoTramite: 'Nuevo Microcrédito',
    numeroActa: 'CONTRATO-2024-003',
    agentes: ['Martina Oliver'],
    emailSolicitante: 'scorrea@tramitesonline.agenciacalidad.gob.ar',
    comentarios: [],
  },
  {
    id: 'PM 089 VARGAS HECTOR OMAR',
    prefix: 'PM',
    numero: 89,
    beneficiario: { apellido: 'VARGAS', nombre: 'HECTOR OMAR', dni: '20134567' },
    asunto: 'Solicitud de microcrédito — revisión de documentación pendiente',
    programa: 'Microcréditos 2024',
    estado: 'Revisión de documentación',
    prioridad: 'Urgente',
    descripcion: 'Documentación vencida. Requiere re-presentación de DNI y constancia AFIP.',
    adjuntos: [],
    fechaCreacion: new Date('2024-12-03'),
    fechaActualizacion: new Date('2025-01-05'),
    telefono: '2643456789',
    legajo: 'LEG-2023-045',
    tipoTramite: 'Renovación',
    numeroActa: 'GASTO',
    agentes: [],
    emailSolicitante: 'hvargas@gmail.com',
    comentarios: [],
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
    telefono: '2644567890',
    legajo: 'LEG-2024-004',
    tipoTramite: 'Finalizado',
    numeroActa: 'CIERRE-2025-001',
    agentes: ['Martina Oliver'],
    emailSolicitante: 'pluna@outlook.com',
    comentarios: [],
  },
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
    telefono: '2645891234',
    legajo: 'LEG-2026-001',
    tipoTramite: 'Inscripción Cosecha',
    numeroActa: 'INSCRIPCION-2026-001',
    agentes: [],
    emailSolicitante: 'rina.gugliemino@gmail.com',
    comentarios: [],
  },
  {
    id: 'PCA26 044 ARAYA JUAN CARLOS',
    prefix: 'PCA26',
    numero: 44,
    beneficiario: { apellido: 'ARAYA', nombre: 'JUAN CARLOS', dni: '18765432' },
    asunto: 'Transferencia de beneficio cosecha y acarreo',
    programa: 'Cosecha y Acarreo 2026',
    estado: 'Seguimiento de verificable',
    prioridad: 'Alta',
    descripcion: 'Trabajador verificado. Pendiente acreditación bancaria Cuenta ANSES.',
    adjuntos: [],
    fechaCreacion: new Date('2025-03-10'),
    fechaActualizacion: new Date('2025-03-18'),
    telefono: '2646123456',
    legajo: 'LEG-2026-002',
    tipoTramite: 'Transferencia Bancaria',
    numeroActa: 'NOTA DEL 18/03/25',
    agentes: ['Mario Ureta', 'Ana Salinas'],
    emailSolicitante: 'juancarlos.araya@hotmail.com',
    comentarios: [],
  },
  {
    id: 'PCA26 302 FLORES MARTA ELENA',
    prefix: 'PCA26',
    numero: 302,
    beneficiario: { apellido: 'FLORES', nombre: 'MARTA ELENA', dni: '29567843' },
    asunto: 'Comité de análisis — verificación de datos en padrón',
    programa: 'Cosecha y Acarreo 2026',
    estado: 'Comité de análisis',
    prioridad: 'Urgente',
    descripcion: 'Beneficiaria aparece duplicada en padrón. Requiere depuración de base.',
    adjuntos: [{ nombre: 'captura_padron.png', tipo: 'image/png', tamano: 87000 }],
    fechaCreacion: new Date('2025-02-20'),
    fechaActualizacion: new Date('2025-03-01'),
    telefono: '2647234567',
    legajo: 'LEG-2026-003',
    tipoTramite: 'Duplicado en Padrón',
    agentes: ['Mario Ureta'],
    emailSolicitante: 'mflores@tramitesonline.agenciacalidad.gob.ar',
    comentarios: [],
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
    telefono: '2648345678',
    legajo: 'LEG-2026-004',
    tipoTramite: 'Firma de Contrato',
    numeroActa: 'CONTRATO-COS-2026-004',
    agentes: ['Ana Salinas'],
    emailSolicitante: 'carlos.mercado@gmail.com',
    comentarios: [],
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
    telefono: '2649456789',
    legajo: 'LEG-2026-005',
    tipoTramite: 'Cerrado',
    numeroActa: 'CIERRE-COS-2026-005',
    agentes: ['Mario Ureta'],
    emailSolicitante: 'nperez@gmail.com',
    comentarios: [],
  },
  {
    id: 'ATPA 076 CASTRO LORENA BEATRIZ',
    prefix: 'ATPA',
    numero: 76,
    beneficiario: { apellido: 'CASTRO', nombre: 'LORENA BEATRIZ', dni: '30234567' },
    asunto: 'Inscripción capacitación en oficios — costura y serigrafía',
    programa: 'Programa Aprender, Trabajar y Producir',
    estado: 'Contrato',
    prioridad: 'Normal',
    descripcion: 'Joven de 24 años inscripta en módulo textil del programa ATP.',
    adjuntos: [{ nombre: 'formulario_atp.pdf', tipo: 'application/pdf', tamano: 275000 }],
    fechaCreacion: new Date('2025-02-10'),
    fechaActualizacion: new Date('2025-02-12'),
    telefono: '2640567890',
    legajo: 'LEG-ATP-001',
    tipoTramite: 'Inscripción ATP',
    numeroActa: 'ATP-INS-2025-001',
    agentes: ['Martina Oliver'],
    emailSolicitante: 'lorena.castro@gmail.com',
    comentarios: [],
  },
  {
    id: 'ATPA 155 GOMEZ RAUL FERNANDO',
    prefix: 'ATPA',
    numero: 155,
    beneficiario: { apellido: 'GOMEZ', nombre: 'RAUL FERNANDO', dni: '26789012' },
    asunto: 'Subsidio ATP — transferencia pendiente verificación CBU',
    programa: 'Programa Aprender, Trabajar y Producir',
    estado: 'Simulador',
    prioridad: 'Alta',
    descripcion: 'CBU declarado difiere del registrado en ANSES. Requiere corrección.',
    adjuntos: [{ nombre: 'constancia_cbu.pdf', tipo: 'application/pdf', tamano: 145000 }],
    fechaCreacion: new Date('2025-02-18'),
    fechaActualizacion: new Date('2025-03-02'),
    telefono: '2641678901',
    legajo: 'LEG-ATP-002',
    tipoTramite: 'Transferencia Subsidio',
    numeroActa: 'NOTA DEL 02/03/25',
    agentes: ['Mario Ureta', 'Ana Salinas'],
    emailSolicitante: 'raul.gomez@hotmail.com',
    comentarios: [],
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
    telefono: '2642789012',
    legajo: 'LEG-ATP-003',
    tipoTramite: 'Contrato Firmado',
    numeroActa: 'CONTRATO-ATP-2025-003',
    agentes: ['Martina Oliver'],
    emailSolicitante: 'msoto@tramitesonline.agenciacalidad.gob.ar',
    comentarios: [],
  },
  {
    id: 'ATPA 033 DIAZ OSCAR GUILLERMO',
    prefix: 'ATPA',
    numero: 33,
    beneficiario: { apellido: 'DIAZ', nombre: 'OSCAR GUILLERMO', dni: '19345678' },
    asunto: 'Caso ATP sin resolver — falta documentación laboral',
    programa: 'Programa Aprender, Trabajar y Producir',
    estado: 'Certificación de firma',
    prioridad: 'Urgente',
    descripcion: 'Beneficiario no presentó historial laboral requerido por normativa ATP-2025.',
    adjuntos: [],
    fechaCreacion: new Date('2024-11-20'),
    fechaActualizacion: new Date('2025-01-08'),
    telefono: '2643890123',
    legajo: 'LEG-ATP-004',
    tipoTramite: 'Pendiente Documentación',
    agentes: ['Mario Ureta'],
    emailSolicitante: 'odiaz@gmail.com',
    comentarios: [],
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
    telefono: '2644901234',
    legajo: 'LEG-ATP-005',
    tipoTramite: 'Finalizado',
    numeroActa: 'CIERRE-ATP-2025-005',
    agentes: ['Ana Salinas'],
    emailSolicitante: 'claudia.herrera@outlook.com',
    comentarios: [],
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
  onSubmit: (datosAdicionales?: Record<string, string>) => void;
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
  const { formularios, obtenerCampos } = useFormularios();
  const [valoresCampos, setValoresCampos] = useState<ValoresCampos>({});
  const [erroresCampos, setErroresCampos] = useState<ErroresCampos>({});

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
                placeholder="Ej: Mario Ureta, Ana Salinas"
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
              Adjuntos
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-md p-6 text-center">
              <File className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600">
                Arrastrá archivos aquí o{' '}
                <button className="text-[#FF9500] font-medium hover:underline">
                  selecciona archivos
                </button>
              </p>
            </div>
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
  onCommentChange: (text: string) => void;
  onAddComment: () => void;
  onChangeEstado: (id: string, estado: TicketEstado) => void;
  onChangeAgentes: (id: string, agentes: string[]) => void;
  onEliminarTicket: (id: string) => void;
  onNuevoTicket: () => void;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  onClose,
  comentarioNuevo,
  onCommentChange,
  onAddComment,
  onChangeEstado,
  onChangeAgentes,
  onEliminarTicket,
  onNuevoTicket,
}) => {
  const [editandoEstado, setEditandoEstado] = useState(false);
  const [estadoTmp, setEstadoTmp] = useState<TicketEstado | ''>('');
  const [editandoAgentes, setEditandoAgentes] = useState(false);
  const [agentesTmp, setAgentesTmp] = useState('');

  if (!ticket) return null;

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
            {/* Toolbar */}
            <div className="flex items-center gap-1 mb-2 pb-2 border-b border-slate-100">
              {[Bold, Italic, Underline].map((Icon, i) => (
                <button key={i} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded">
                  <Icon size={15} />
                </button>
              ))}
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <button className="p-1.5 text-slate-600 hover:bg-slate-100 rounded text-xs font-bold">≡</button>
              <button className="p-1.5 text-slate-600 hover:bg-slate-100 rounded text-xs font-bold">•</button>
            </div>
            <textarea
              value={comentarioNuevo}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="Escribir respuesta..."
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm resize-none"
            />
            <div className="mt-2 flex items-start justify-between">
              <div className="text-xs text-slate-400">
                <button className="text-blue-500 hover:underline">Adjuntar archivo</button>
                <p className="mt-1 text-slate-400">RECORDÁ CARGAR LOS ARCHIVOS RÁPIDAMENTE Y NO DEMORAR EN ENVIAR EL TICKET.</p>
              </div>
              <button
                onClick={onAddComment}
                disabled={!comentarioNuevo.trim()}
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
                      <div className="w-9 h-9 rounded-full bg-slate-300 flex-shrink-0 flex items-center justify-center text-slate-600">
                        <UserCircle size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-900">{entrada.autor}</span>
                          <span className="text-xs text-slate-500">respondió {formatearFechaHora(entrada.fecha)}</span>
                        </div>
                        {entrada.email && (
                          <p className="text-xs text-slate-400">{entrada.email}</p>
                        )}
                        <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{entrada.contenido}</p>
                        {entrada.adjuntos.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-slate-600 mb-1">Archivos adjuntos:</p>
                            {entrada.adjuntos.map((adj, idx) => (
                              <span key={idx} className="text-xs text-blue-500 flex items-center gap-1">
                                <File size={12} /> {adj.nombre}
                              </span>
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
        <div className="w-72 border-l border-slate-200 bg-white overflow-y-auto">
          {/* Estado */}
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                ● Estado
              </span>
              <button
                onClick={() => { setEditandoEstado(true); setEstadoTmp(ticket.estado); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <Pencil size={13} />
              </button>
            </div>
            {editandoEstado ? (
              <div className="space-y-2">
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
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-slate-500">Estado: </span>
                  <EstadoBadge estado={ticket.estado} />
                </div>
                <div>
                  <span className="text-xs text-slate-500">Categoría: </span>
                  <span className="text-xs font-medium text-slate-700">{ticket.programa}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Prioridad: </span>
                  <PrioridadBadge prioridad={ticket.prioridad} />
                </div>
              </div>
            )}
          </div>

          {/* Elevado por */}
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <UserCircle size={15} className="text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">Elevado por</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 rounded px-3 py-2">
              <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center flex-shrink-0">
                <UserCircle size={18} className="text-slate-500" />
              </div>
              <span className="text-sm text-slate-700 font-medium">
                {ticket.beneficiario.apellido} {ticket.beneficiario.nombre}
              </span>
            </div>
          </div>

          {/* Asignar agente */}
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Users size={15} className="text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">Asignar agente</span>
              </div>
              <button
                onClick={() => { setEditandoAgentes(true); setAgentesTmp((ticket.agentes ?? []).join(', ')); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <Pencil size={13} />
              </button>
            </div>
            {editandoAgentes ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={agentesTmp}
                  onChange={(e) => setAgentesTmp(e.target.value)}
                  placeholder="Ej: Mario Ureta, Ana Salinas"
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                />
                <p className="text-xs text-slate-400">Separar con comas para múltiples agentes</p>
                <div className="flex gap-2">
                  <button onClick={handleGuardarAgentes} className="flex-1 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Guardar</button>
                  <button onClick={() => setEditandoAgentes(false)} className="flex-1 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {(ticket.agentes ?? []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Sin agente asignado</p>
                ) : (
                  (ticket.agentes ?? []).map((agente, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                        <UserCircle size={14} className="text-slate-500" />
                      </div>
                      <span className="text-sm text-slate-700">{agente}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Campos del Ticket */}
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <File size={15} className="text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">Campos del Ticket</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex gap-1">
                <span className="text-slate-500 min-w-fit">DNI del solicitante:</span>
                <span className="text-slate-800 font-medium">{ticket.beneficiario.dni}</span>
              </div>
              {ticket.telefono && (
                <div className="flex gap-1">
                  <span className="text-slate-500 min-w-fit">Teléfono:</span>
                  <span className="text-slate-800">{ticket.telefono}</span>
                </div>
              )}
              {ticket.tipoTramite && (
                <div className="flex gap-1">
                  <span className="text-slate-500 min-w-fit">Tipo de trámite:</span>
                  <span className="text-slate-800">{ticket.tipoTramite}</span>
                </div>
              )}
              {ticket.legajo && (
                <div className="flex gap-1">
                  <span className="text-slate-500 min-w-fit">Número de legajo:</span>
                  <span className="text-slate-800">{ticket.legajo}</span>
                </div>
              )}
              {ticket.datosAdicionales &&
                Object.entries(ticket.datosAdicionales).map(([k, v]) => (
                  <div key={k} className="flex gap-1">
                    <span className="text-slate-500 min-w-fit">{k}:</span>
                    <span className="text-slate-800 break-words">{v}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Destinatarios */}
          <div className="p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Mail size={15} className="text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">Destinatarios</span>
            </div>
            <div className="text-sm">
              <p className="text-xs text-slate-500 mb-1">Emails:</p>
              <p className={ticket.emailSolicitante ? 'text-blue-600 text-xs' : 'text-slate-400 text-xs italic'}>
                {ticket.emailSolicitante ?? 'Ninguno'}
              </p>
            </div>
          </div>
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
          dni: '',
          descripcion: '',
          errores: {},
          numeroActa: '',
          agentes: '',
          emailSolicitante: '',
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
          numeroActa: '',
          agentes: '',
          emailSolicitante: '',
        },
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
        autor: action.payload,
        fecha: new Date(),
        contenido: state.comentarioNuevo,
        adjuntos: [],
      };
      const ticketActualizado = {
        ...state.ticketAbierto,
        fechaActualizacion: new Date(),
        comentarios: [...state.ticketAbierto.comentarios, nuevoComentario],
      };
      const ticketsActualizados = state.tickets.map((t) =>
        t.id === ticketActualizado.id ? ticketActualizado : t
      );
      return {
        ...state,
        tickets: ticketsActualizados,
        ticketAbierto: ticketActualizado,
        comentarioNuevo: '',
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
    dni: '',
    descripcion: '',
    errores: {},
    numeroActa: '',
    agentes: '',
    emailSolicitante: '',
  },
  ticketAbierto: null,
  comentarioNuevo: '',
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 8: MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function AgenciaCalidadDashboard() {
  const { usuario, usuarios } = useAuth();
  const [state, dispatch] = useReducer(dashboardReducer, undefined, getInitialState);

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
      estado: state.modal.estado as TicketEstado,
      prioridad: state.modal.prioridad as TicketPrioridad,
      descripcion: state.modal.descripcion,
      adjuntos: [],
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
      comentarios: [],
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
        onCommentChange={(text) =>
          dispatch({ type: 'SET_COMENTARIO_NUEVO', payload: text })
        }
        onAddComment={() => dispatch({ type: 'AGREGAR_COMENTARIO', payload: usuario?.nombre || 'Usuario' })}
        onChangeEstado={(id, estado) =>
          dispatch({ type: 'CAMBIAR_ESTADO_TICKET', payload: { id, estado, autor: usuario?.nombre || 'Usuario' } })
        }
        onChangeAgentes={(id, agentes) =>
          dispatch({ type: 'CAMBIAR_AGENTES_TICKET', payload: { id, agentes, autor: usuario?.nombre || 'Usuario' } })
        }
        onEliminarTicket={(id) => dispatch({ type: 'ELIMINAR_TICKET', payload: id })}
        onNuevoTicket={() => dispatch({ type: 'CERRAR_TICKET_DETAIL' })}
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
        onSubmit={handleSubmitTicket}
        asuntoGenerado={asuntoGenerado}
      />
    </div>
  );
}
