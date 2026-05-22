/**
 * Servicio de Tickets
 * Maneja operaciones CRUD de tickets
 */

import { httpClient } from './http-client';

export interface Ticket {
  id: string;
  numero?: number;
  titulo: string;
  descripcion: string;
  estado: 'abierto' | 'en_progreso' | 'cerrado';
  prioridad?: 'baja' | 'media' | 'alta' | 'critica';
  asignadoA?: string;
  formularioId?: string;
  ciudadanoNombre?: string;
  ciudadanoEmail?: string;
  ciudadanoTelefono?: string;
  creadoEn: string;
  cerradoEn?: string | null;
  comentarios?: Array<{
    id: string;
    autor: string;
    contenido: string;
    fecha: string;
  }>;
}

export interface CrearTicketRequest {
  titulo: string;
  descripcion: string;
  prioridad?: 'baja' | 'media' | 'alta' | 'critica';
}

export interface CrearTicketDesdeFormularioRequest {
  formularioId: string;
  nombreCiudadano: string;
  emailCiudadano: string;
  telefonoCiudadano?: string;
  descripcion: string;
  datosAdicionales?: Record<string, unknown>;
}

export interface CrearTicketDesdeFormularioResponse {
  ticketId: string;
  numero: number;
  estado: string;
  mensaje: string;
}

export interface TicketsResponse {
  tickets: Ticket[];
  total: number;
}

export interface ActualizarTicketRequest {
  estado?: 'abierto' | 'en_progreso' | 'cerrado';
  prioridad?: 'baja' | 'media' | 'alta' | 'critica';
  asignadoA?: string;
}

export class TicketService {
  async obtenerTodos(filtros?: {
    estado?: string;
    formularioId?: string;
    skip?: number;
    limit?: number;
  }): Promise<TicketsResponse> {
    if (httpClient.isUsingLocalStorage()) {
      return this.obtenerTodosLocal(filtros);
    }

    try {
      const params = new URLSearchParams();
      if (filtros?.estado) params.append('estado', filtros.estado);
      if (filtros?.formularioId) params.append('formularioId', filtros.formularioId);
      if (filtros?.skip) params.append('skip', filtros.skip.toString());
      if (filtros?.limit) params.append('limit', filtros.limit.toString());

      const endpoint = `/tickets${params.toString() ? '?' + params.toString() : ''}`;
      return await httpClient.get<TicketsResponse>(endpoint);
    } catch (error) {
      console.error('Error obteniendo tickets:', error);
      throw error;
    }
  }

  async crear(data: CrearTicketRequest): Promise<Ticket> {
    if (httpClient.isUsingLocalStorage()) {
      return this.crearLocal(data);
    }

    try {
      return await httpClient.post<Ticket>('/tickets', data);
    } catch (error) {
      console.error('Error creando ticket:', error);
      throw error;
    }
  }

  async crearDesdeFormulario(
    data: CrearTicketDesdeFormularioRequest
  ): Promise<CrearTicketDesdeFormularioResponse> {
    if (httpClient.isUsingLocalStorage()) {
      return this.crearDesdeFormularioLocal(data);
    }

    try {
      return await httpClient.post<CrearTicketDesdeFormularioResponse>(
        '/tickets/crear-desde-formulario',
        data
      );
    } catch (error) {
      console.error('Error creando ticket desde formulario:', error);
      throw error;
    }
  }

  async actualizar(ticketId: string, data: ActualizarTicketRequest): Promise<Ticket> {
    if (httpClient.isUsingLocalStorage()) {
      return this.actualizarLocal(ticketId, data);
    }

    try {
      return await httpClient.patch<Ticket>(`/tickets/${ticketId}`, data);
    } catch (error) {
      console.error('Error actualizando ticket:', error);
      throw error;
    }
  }

  async agregarComentario(ticketId: string, contenido: string): Promise<Ticket> {
    if (httpClient.isUsingLocalStorage()) {
      return this.agregarComentarioLocal(ticketId, contenido);
    }

    try {
      return await httpClient.post<Ticket>(`/tickets/${ticketId}/comentarios`, {
        contenido,
      });
    } catch (error) {
      console.error('Error agregando comentario:', error);
      throw error;
    }
  }

  // Fallback para localStorage (desarrollo)
  private obtenerTodosLocal(filtros?: {
    estado?: string;
    formularioId?: string;
    skip?: number;
    limit?: number;
  }): Promise<TicketsResponse> {
    const ticketsStr = localStorage.getItem('sc_tickets');
    let tickets = ticketsStr ? JSON.parse(ticketsStr) : [];

    // Aplicar filtros
    if (filtros?.estado) {
      tickets = tickets.filter((t: Ticket) => t.estado === filtros.estado);
    }
    if (filtros?.formularioId) {
      tickets = tickets.filter((t: Ticket) => t.formularioId === filtros.formularioId);
    }

    // Paginación
    const skip = filtros?.skip || 0;
    const limit = filtros?.limit || 20;
    const paginados = tickets.slice(skip, skip + limit);

    return Promise.resolve({
      tickets: paginados,
      total: tickets.length,
    });
  }

  private crearLocal(data: CrearTicketRequest): Promise<Ticket> {
    const ticketsStr = localStorage.getItem('sc_tickets') || '[]';
    const tickets = JSON.parse(ticketsStr);

    const nuevoTicket: Ticket = {
      id: 'uuid-' + Date.now(),
      numero: (tickets.length || 0) + 1,
      titulo: data.titulo,
      descripcion: data.descripcion,
      estado: 'abierto',
      prioridad: data.prioridad || 'media',
      creadoEn: new Date().toISOString(),
      comentarios: [],
    };

    tickets.push(nuevoTicket);
    localStorage.setItem('sc_tickets', JSON.stringify(tickets));

    return Promise.resolve(nuevoTicket);
  }

  private crearDesdeFormularioLocal(
    data: CrearTicketDesdeFormularioRequest
  ): Promise<CrearTicketDesdeFormularioResponse> {
    const ticketsStr = localStorage.getItem('sc_tickets') || '[]';
    const tickets = JSON.parse(ticketsStr);

    const nuevoTicket: Ticket = {
      id: 'uuid-' + Date.now(),
      numero: tickets.length + 1,
      titulo: `Solicitud: ${data.formularioId}`,
      descripcion: data.descripcion,
      estado: 'abierto',
      prioridad: 'media',
      formularioId: data.formularioId,
      ciudadanoNombre: data.nombreCiudadano,
      ciudadanoEmail: data.emailCiudadano,
      ciudadanoTelefono: data.telefonoCiudadano,
      creadoEn: new Date().toISOString(),
      comentarios: [],
    };

    tickets.push(nuevoTicket);
    localStorage.setItem('sc_tickets', JSON.stringify(tickets));

    return Promise.resolve({
      ticketId: nuevoTicket.id,
      numero: nuevoTicket.numero!,
      estado: nuevoTicket.estado,
      mensaje: `Ticket creado exitosamente. Su número de seguimiento es: ${nuevoTicket.numero}`,
    });
  }

  private actualizarLocal(ticketId: string, data: ActualizarTicketRequest): Promise<Ticket> {
    const ticketsStr = localStorage.getItem('sc_tickets') || '[]';
    const tickets = JSON.parse(ticketsStr);

    const ticket = tickets.find((t: Ticket) => t.id === ticketId);
    if (!ticket) {
      return Promise.reject(new Error('Ticket no encontrado'));
    }

    if (data.estado) ticket.estado = data.estado;
    if (data.prioridad) ticket.prioridad = data.prioridad;
    if (data.asignadoA) ticket.asignadoA = data.asignadoA;

    localStorage.setItem('sc_tickets', JSON.stringify(tickets));

    return Promise.resolve(ticket);
  }

  private agregarComentarioLocal(ticketId: string, contenido: string): Promise<Ticket> {
    const ticketsStr = localStorage.getItem('sc_tickets') || '[]';
    const tickets = JSON.parse(ticketsStr);

    const ticket = tickets.find((t: Ticket) => t.id === ticketId);
    if (!ticket) {
      return Promise.reject(new Error('Ticket no encontrado'));
    }

    if (!ticket.comentarios) {
      ticket.comentarios = [];
    }

    ticket.comentarios.push({
      id: 'uuid-' + Date.now(),
      autor: 'Usuario Actual',
      contenido,
      fecha: new Date().toISOString(),
    });

    localStorage.setItem('sc_tickets', JSON.stringify(tickets));

    return Promise.resolve(ticket);
  }
}

export const ticketService = new TicketService();
