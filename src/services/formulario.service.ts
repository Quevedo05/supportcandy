/**
 * Servicio de Formularios
 * Maneja operaciones de formularios públicos y privados
 */

import { httpClient } from './http-client';

export type TipoPrograma = string;

export interface Formulario {
  id: string;
  programa: TipoPrograma;
  activo: boolean;
  descripcion: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface FormulariosResponse {
  formularios: Formulario[];
}

export class FormularioService {
  async obtenerTodos(): Promise<FormulariosResponse> {
    if (httpClient.isUsingLocalStorage()) {
      return this.obtenerTodosLocal();
    }

    try {
      return await httpClient.get<FormulariosResponse>('/formularios');
    } catch (error) {
      console.error('Error obteniendo formularios:', error);
      throw error;
    }
  }

  async obtenerActivos(): Promise<FormulariosResponse> {
    if (httpClient.isUsingLocalStorage()) {
      return this.obtenerActivosLocal();
    }

    try {
      return await httpClient.get<FormulariosResponse>('/formularios/publicos/activos');
    } catch (error) {
      console.error('Error obteniendo formularios activos:', error);
      throw error;
    }
  }

  async toggleActivo(formularioId: string): Promise<Formulario> {
    if (httpClient.isUsingLocalStorage()) {
      return this.toggleActivoLocal(formularioId);
    }

    try {
      return await httpClient.patch<Formulario>(`/formularios/${formularioId}/toggle-activo`, {});
    } catch (error) {
      console.error('Error toggling formulario:', error);
      throw error;
    }
  }

  // Fallback para localStorage (desarrollo)
  private obtenerTodosLocal(): Promise<FormulariosResponse> {
    const formulariosStr = localStorage.getItem('sc_formularios_v2');
    const formularios = formulariosStr ? JSON.parse(formulariosStr) : [];

    return Promise.resolve({
      formularios,
    });
  }

  private obtenerActivosLocal(): Promise<FormulariosResponse> {
    const formulariosStr = localStorage.getItem('sc_formularios_v2');
    const formularios = formulariosStr ? JSON.parse(formulariosStr) : [];

    const activos = formularios.filter((f: Formulario) => f.activo);

    return Promise.resolve({
      formularios: activos,
    });
  }

  private toggleActivoLocal(formularioId: string): Promise<Formulario> {
    const formulariosStr = localStorage.getItem('sc_formularios_v2') || '[]';
    const formularios = JSON.parse(formulariosStr);

    const formulario = formularios.find((f: Formulario) => f.id === formularioId);
    if (!formulario) {
      return Promise.reject(new Error('Formulario no encontrado'));
    }

    formulario.activo = !formulario.activo;
    formulario.actualizadoEn = new Date().toISOString();

    localStorage.setItem('sc_formularios_v2', JSON.stringify(formularios));

    return Promise.resolve(formulario);
  }
}

export const formularioService = new FormularioService();
