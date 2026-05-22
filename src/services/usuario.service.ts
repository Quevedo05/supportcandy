/**
 * Servicio de Usuarios
 * Maneja operaciones CRUD de usuarios (solo para admin)
 */

import { httpClient } from './http-client';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  password: string; // Solo en desarrollo
  rol: 'admin' | 'contribuidor';
  activo: boolean;
  creadoEn: string;
  actualizadoEn?: string;
}

export interface CrearUsuarioRequest {
  nombre: string;
  email: string;
  password: string;
  rol: 'admin' | 'contribuidor';
}

export interface UsuariosResponse {
  usuarios: Usuario[];
  total: number;
}

export class UsuarioService {
  async obtenerTodos(): Promise<UsuariosResponse> {
    if (httpClient.isUsingLocalStorage()) {
      return this.obtenerTodosLocal();
    }

    try {
      return await httpClient.get<UsuariosResponse>('/usuarios');
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      throw error;
    }
  }

  async crear(data: CrearUsuarioRequest): Promise<Usuario> {
    if (httpClient.isUsingLocalStorage()) {
      return this.crearLocal(data);
    }

    try {
      return await httpClient.post<Usuario>('/usuarios', data);
    } catch (error) {
      console.error('Error creando usuario:', error);
      throw error;
    }
  }

  async toggleActivo(usuarioId: string): Promise<Usuario> {
    if (httpClient.isUsingLocalStorage()) {
      return this.toggleActivoLocal(usuarioId);
    }

    try {
      return await httpClient.patch<Usuario>(`/usuarios/${usuarioId}/toggle-activo`, {});
    } catch (error) {
      console.error('Error toggleando usuario:', error);
      throw error;
    }
  }

  async eliminar(usuarioId: string): Promise<void> {
    if (httpClient.isUsingLocalStorage()) {
      return this.eliminarLocal(usuarioId);
    }

    try {
      await httpClient.delete(`/usuarios/${usuarioId}`);
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      throw error;
    }
  }

  // Fallback para localStorage (desarrollo)
  private obtenerTodosLocal(): Promise<UsuariosResponse> {
    const usuariosStr = localStorage.getItem('sc_usuarios');
    const usuarios = usuariosStr ? JSON.parse(usuariosStr) : [];

    return Promise.resolve({
      usuarios,
      total: usuarios.length,
    });
  }

  private crearLocal(data: CrearUsuarioRequest): Promise<Usuario> {
    const usuariosStr = localStorage.getItem('sc_usuarios') || '[]';
    const usuarios = JSON.parse(usuariosStr);

    // Validar email único
    if (usuarios.some((u: Usuario) => u.email === data.email)) {
      return Promise.reject(new Error('Este email ya está registrado'));
    }

    const nuevoUsuario: Usuario = {
      id: 'uuid-' + Date.now(),
      nombre: data.nombre,
      email: data.email,
      password: data.password,
      rol: data.rol,
      activo: true,
      creadoEn: new Date().toISOString(),
    };

    usuarios.push(nuevoUsuario);
    localStorage.setItem('sc_usuarios', JSON.stringify(usuarios));

    return Promise.resolve(nuevoUsuario);
  }

  private toggleActivoLocal(usuarioId: string): Promise<Usuario> {
    const usuariosStr = localStorage.getItem('sc_usuarios') || '[]';
    const usuarios = JSON.parse(usuariosStr);

    const usuario = usuarios.find((u: Usuario) => u.id === usuarioId);
    if (!usuario) {
      return Promise.reject(new Error('Usuario no encontrado'));
    }

    usuario.activo = !usuario.activo;
    usuario.actualizadoEn = new Date().toISOString();

    localStorage.setItem('sc_usuarios', JSON.stringify(usuarios));

    return Promise.resolve(usuario);
  }

  private eliminarLocal(usuarioId: string): Promise<void> {
    const usuariosStr = localStorage.getItem('sc_usuarios') || '[]';
    const usuarios = JSON.parse(usuariosStr);

    const indice = usuarios.findIndex((u: Usuario) => u.id === usuarioId);
    if (indice === -1) {
      return Promise.reject(new Error('Usuario no encontrado'));
    }

    usuarios.splice(indice, 1);
    localStorage.setItem('sc_usuarios', JSON.stringify(usuarios));

    return Promise.resolve();
  }
}

export const usuarioService = new UsuarioService();
