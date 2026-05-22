/**
 * Índice de Servicios
 * Exporta todos los servicios para fácil importación
 */

export { httpClient, HttpClient } from './http-client';
export { authService, AuthService, type LoginRequest, type LoginResponse } from './auth.service';
export {
  usuarioService,
  UsuarioService,
  type Usuario,
  type CrearUsuarioRequest,
  type UsuariosResponse,
} from './usuario.service';
export {
  formularioService,
  FormularioService,
  type Formulario,
  type FormulariosResponse,
  type TipoPrograma,
} from './formulario.service';
export {
  ticketService,
  TicketService,
  type Ticket,
  type CrearTicketRequest,
  type CrearTicketDesdeFormularioRequest,
  type CrearTicketDesdeFormularioResponse,
  type TicketsResponse,
  type ActualizarTicketRequest,
} from './ticket.service';
