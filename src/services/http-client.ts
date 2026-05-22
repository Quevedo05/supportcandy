/**
 * Cliente HTTP para comunicación con API
 * Soporta desarrollo local (localStorage) y producción (API real)
 */

const API_BASE_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:3000/api';
const USE_LOCAL_STORAGE = (import.meta.env as any).VITE_USE_LOCAL_STORAGE === 'true' || !(import.meta.env as any).VITE_API_URL;

export class HttpClient {
  private baseUrl: string;
  private useLocalStorage: boolean;

  constructor() {
    this.baseUrl = API_BASE_URL;
    this.useLocalStorage = USE_LOCAL_STORAGE;
  }

  private getToken(): string | null {
    return localStorage.getItem('sc_token');
  }

  private getHeaders(contentType = 'application/json'): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': contentType,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  async get<T>(endpoint: string): Promise<T> {
    if (this.useLocalStorage) {
      return this.getLocal<T>(endpoint);
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as T;
    } catch (error) {
      console.error(`GET ${endpoint}:`, error);
      throw error;
    }
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    if (this.useLocalStorage) {
      return this.postLocal<T>(endpoint, data);
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as T;
    } catch (error) {
      console.error(`POST ${endpoint}:`, error);
      throw error;
    }
  }

  async patch<T>(endpoint: string, data: unknown): Promise<T> {
    if (this.useLocalStorage) {
      return this.patchLocal<T>(endpoint, data);
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as T;
    } catch (error) {
      console.error(`PATCH ${endpoint}:`, error);
      throw error;
    }
  }

  async delete<T>(endpoint: string): Promise<T> {
    if (this.useLocalStorage) {
      return this.deleteLocal<T>(endpoint);
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (response.status === 204) {
        return {} as T;
      }

      return await response.json() as T;
    } catch (error) {
      console.error(`DELETE ${endpoint}:`, error);
      throw error;
    }
  }

  // Métodos fallback para localStorage (desarrollo)
  private getLocal<T>(_endpoint: string): Promise<T> {
    // Será sobrescrito por servicios específicos
    return Promise.reject(new Error('Not implemented in localStorage mode'));
  }

  private postLocal<T>(_endpoint: string, _data: unknown): Promise<T> {
    // Será sobrescrito por servicios específicos
    return Promise.reject(new Error('Not implemented in localStorage mode'));
  }

  private patchLocal<T>(_endpoint: string, _data: unknown): Promise<T> {
    // Será sobrescrito por servicios específicos
    return Promise.reject(new Error('Not implemented in localStorage mode'));
  }

  private deleteLocal<T>(_endpoint: string): Promise<T> {
    // Será sobrescrito por servicios específicos
    return Promise.reject(new Error('Not implemented in localStorage mode'));
  }

  isUsingLocalStorage(): boolean {
    return this.useLocalStorage;
  }
}

export const httpClient = new HttpClient();
