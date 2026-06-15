import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Formulario, FormulariosContextType, CampoFormulario, InfoFormulario } from '../types/formularios';
import { httpClient } from '../services/http-client';

const FormulariosContext = createContext<FormulariosContextType | undefined>(undefined);

function normalizar(f: any): Formulario {
  return {
    id: f.id || f.formularioId,
    programa: f.programa ?? '',
    nombre: f.nombre ?? f.programa ?? '',
    activo: Boolean(f.activo),
    personasFisicas: f.personasFisicas ?? true,
    personasJuridicas: f.personasJuridicas ?? false,
    creadoEn: f.creadoEn ?? new Date().toISOString(),
    actualizadoEn: f.actualizadoEn ?? new Date().toISOString(),
    descripcion: f.descripcion ?? '',
    campos: f.campos ?? [],
  };
}

export function FormulariosProvider({ children }: { children: ReactNode }) {
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    httpClient.get<{ formularios: any[] }>('/formularios')
      .then(({ formularios: list }) => setFormularios(list.map(normalizar)))
      .catch(() => setFormularios([]))
      .finally(() => setLoading(false));
  }, []);

  const crearFormulario = async (): Promise<string> => {
    const data = await httpClient.post<any>('/formularios', {
      nombre: '',
      programa: '',
      descripcion: '',
      activo: false,
      personasFisicas: true,
      personasJuridicas: false,
      campos: [],
    });
    const nuevo = normalizar(data);
    setFormularios((prev) => [...prev, nuevo]);
    return nuevo.id;
  };

  const eliminarFormulario = async (id: string): Promise<void> => {
    await httpClient.delete<void>(`/formularios/${id}`);
    setFormularios((prev) => prev.filter((f) => f.id !== id));
  };

  const actualizarCampos = async (formularioId: string, campos: CampoFormulario[]): Promise<void> => {
    const data = await httpClient.patch<any>(`/formularios/${formularioId}`, { campos });
    const actualizado = normalizar(data);
    setFormularios((prev) => prev.map((f) => f.id === formularioId ? actualizado : f));
  };

  const actualizarInfo = async (formularioId: string, info: InfoFormulario): Promise<void> => {
    const data = await httpClient.patch<any>(`/formularios/${formularioId}`, info);
    const actualizado = normalizar(data);
    setFormularios((prev) => prev.map((f) => f.id === formularioId ? actualizado : f));
  };

  const activarFormulario = async (id: string): Promise<void> => {
    const f = formularios.find((f) => f.id === id);
    if (f?.activo) return;
    const data = await httpClient.patch<any>(`/formularios/${id}/toggle-activo`, {});
    const actualizado = normalizar(data);
    setFormularios((prev) => prev.map((f) => f.id === id ? actualizado : f));
  };

  const desactivarFormulario = async (id: string): Promise<void> => {
    const f = formularios.find((f) => f.id === id);
    if (!f?.activo) return;
    const data = await httpClient.patch<any>(`/formularios/${id}/toggle-activo`, {});
    const actualizado = normalizar(data);
    setFormularios((prev) => prev.map((f) => f.id === id ? actualizado : f));
  };

  const obtenerFormulariosActivos = () => formularios.filter((f) => f.activo);

  const obtenerCampos = (formularioId: string): CampoFormulario[] =>
    formularios.find((f) => f.id === formularioId)?.campos ?? [];

  return (
    <FormulariosContext.Provider
      value={{
        formularios,
        loading,
        activarFormulario,
        desactivarFormulario,
        obtenerFormulariosActivos,
        actualizarCampos,
        actualizarInfo,
        crearFormulario,
        eliminarFormulario,
        obtenerCampos,
      }}
    >
      {children}
    </FormulariosContext.Provider>
  );
}

export function useFormularios(): FormulariosContextType {
  const ctx = useContext(FormulariosContext);
  if (!ctx) throw new Error('useFormularios debe ser usado dentro de un FormulariosProvider');
  return ctx;
}
