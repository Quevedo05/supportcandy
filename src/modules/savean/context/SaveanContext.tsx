import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GuiaSavean, Barrera, Barrerista, SaveanContextType } from '../types/savean';
import { httpClient } from '../../../services/http-client';

const SaveanContext = createContext<SaveanContextType | undefined>(undefined);

export function SaveanProvider({ children }: { children: ReactNode }) {
  const [guias, setGuias] = useState<GuiaSavean[]>([]);
  const [barreras, setBarreras] = useState<Barrera[]>([]);
  const [barreristas, setBarreristas] = useState<Barrerista[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      httpClient.get<{ guias: GuiaSavean[] }>('/savean/guias').then(({ guias: list }) => setGuias(list)).catch(() => {}),
      httpClient.get<{ barreras: Barrera[] }>('/savean/barreras').then(({ barreras: list }) => setBarreras(list)).catch(() => {}),
      httpClient.get<{ barreristas: Barrerista[] }>('/savean/barreristas').then(({ barreristas: list }) => setBarreristas(list)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const crearGuia = async (
    data: Omit<GuiaSavean, 'id' | 'numero' | 'token' | 'estado' | 'fechaEmision' | 'fechaVencimiento'>
  ): Promise<GuiaSavean> => {
    const nueva = await httpClient.post<GuiaSavean>('/savean/guias', data);
    setGuias((prev) => [nueva, ...prev]);
    return nueva;
  };

  const verificarGuia = async (id: string, barreraId: string): Promise<void> => {
    const actualizada = await httpClient.patch<GuiaSavean>(`/savean/guias/${id}/verificar`, { barreraId });
    setGuias((prev) => prev.map((g) => (g.id === id ? actualizada : g)));
  };

  const denegarGuia = async (id: string, barreraId: string, motivo: string): Promise<void> => {
    const actualizada = await httpClient.patch<GuiaSavean>(`/savean/guias/${id}/denegar`, { barreraId, motivo });
    setGuias((prev) => prev.map((g) => (g.id === id ? actualizada : g)));
  };

  const modificarYVerificarGuia = async (id: string, barreraId: string, cambios: Partial<GuiaSavean>): Promise<void> => {
    const actualizada = await httpClient.patch<GuiaSavean>(`/savean/guias/${id}/modificar-verificar`, { barreraId, cambios });
    setGuias((prev) => prev.map((g) => (g.id === id ? actualizada : g)));
  };

  const obtenerGuia = (id: string) => guias.find((g) => g.id === id);

  const obtenerGuiaPorNumero = (numero: string) =>
    guias.find((g) => g.numero.toLowerCase() === numero.toLowerCase().trim());

  const agregarBarrerista = async (b: Omit<Barrerista, 'id'> & { contrasena?: string }): Promise<void> => {
    const nuevo = await httpClient.post<Barrerista>('/savean/barreristas', b);
    setBarreristas((prev) => [...prev, nuevo]);
  };

  const desactivarBarrerista = async (id: string): Promise<void> => {
    const actualizado = await httpClient.patch<Barrerista>(`/savean/barreristas/${id}`, { activo: false });
    setBarreristas((prev) => prev.map((b) => (b.id === id ? actualizado : b)));
  };

  const eliminarBarrerista = async (id: string): Promise<void> => {
    await httpClient.delete<void>(`/savean/barreristas/${id}`);
    setBarreristas((prev) => prev.filter((b) => b.id !== id));
  };

  const agregarBarrera = async (b: Omit<Barrera, 'id'>): Promise<void> => {
    const nueva = await httpClient.post<Barrera>('/savean/barreras', b);
    setBarreras((prev) => [...prev, nueva]);
  };

  return (
    <SaveanContext.Provider value={{
      guias, barreras, barreristas, loading,
      crearGuia, verificarGuia, denegarGuia, modificarYVerificarGuia,
      obtenerGuia, obtenerGuiaPorNumero,
      agregarBarrerista, desactivarBarrerista, eliminarBarrerista, agregarBarrera,
    }}>
      {children}
    </SaveanContext.Provider>
  );
}

export function useSavean(): SaveanContextType {
  const ctx = useContext(SaveanContext);
  if (!ctx) throw new Error('useSavean debe usarse dentro de SaveanProvider');
  return ctx;
}
