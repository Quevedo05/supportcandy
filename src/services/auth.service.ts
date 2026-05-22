/**
 * Servicio de Autenticación
 * Maneja login y gestión de sesión
 */

import { httpClient } from './http-client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  usuario: {
    usuarioId: string;
    nombre: string;
    email: string;
    rol: 'admin' | 'contribuidor';
  };
  expiresIn: number;
}

export class AuthService {
  private readonly tokenKey = 'sc_token';
  private readonly usuarioKey = 'sc_sesion';

  async login(email: string, password: string): Promise<LoginResponse> {
    if (httpClient.isUsingLocalStorage()) {
      return this.loginLocal(email, password);
    }

    try {
      const response = await httpClient.post<LoginResponse>('/auth/login', {
        email,
        password,
      });

      this.setToken(response.token);
      localStorage.setItem(this.usuarioKey, JSON.stringify(response.usuario));

      return response;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.usuarioKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getUsuario() {
    const usuario = localStorage.getItem(this.usuarioKey);
    if (usuario) {
      return JSON.parse(usuario);
    }
    return null;
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  // Fallback para localStorage (desarrollo)
  private loginLocal(email: string, password: string): Promise<LoginResponse> {
    // Buscar usuario en localStorage
    const usuariosStr = localStorage.getItem('sc_usuarios');
    const usuarios = usuariosStr ? JSON.parse(usuariosStr) : [];

    const usuario = usuarios.find((u: any) => u.email === email && u.password === password);

    if (!usuario) {
      return Promise.reject(new Error('Email o contraseña incorrectos'));
    }

    const response: LoginResponse = {
      token: 'local-token-' + usuario.id,
      usuario: {
        usuarioId: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
      expiresIn: 3600,
    };

    this.setToken(response.token);
    localStorage.setItem(this.usuarioKey, JSON.stringify(response.usuario));

    return Promise.resolve(response);
  }
}

export const authService = new AuthService();
