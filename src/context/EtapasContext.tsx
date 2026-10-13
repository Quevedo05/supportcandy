import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface Etapa {
  id: number;
  nombre: string;
  orden: number;
  color: string;
  bgColor: string;
  esCierre: boolean;
  activa: boolean;
}

interface EtapasContextType {
  etapas: Etapa[];
  etapasActivas: Etapa[];
  etapaCierre: Etapa | null;
  getConfig: (nombre: string) => { color: string; bg: string };
  recargar: () => Promise<void>;
  cargando: boolean;
}

const EtapasContext = createContext<EtapasContextType | null>(null);

const DEFAULT_CONFIG = { color: '#6B7280', bg: '#F9FAFB' };

export function EtapasProvider({ children }: { children: ReactNode }) {
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [cargando, setCargando] = useState(true);
  const apiUrl = (import.meta.env as Record<string, string>).VITE_API_URL;

  const recargar = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/config/etapas`);
      if (res.ok) {
        const data = await res.json();
        setEtapas(data.etapas ?? []);
      }
    } catch {
      // silencioso — usar etapas vacías si falla
    } finally {
      setCargando(false);
    }
  }, [apiUrl]);

  useEffect(() => { recargar(); }, [recargar]);

  const etapasActivas = etapas.filter(e => e.activa);
  const etapaCierre = etapas.find(e => e.esCierre) ?? null;

  const getConfig = (nombre: string): { color: string; bg: string } => {
    const etapa = etapas.find(e => e.nombre === nombre);
    if (!etapa) return DEFAULT_CONFIG;
    return { color: etapa.color, bg: etapa.bgColor };
  };

  return (
    <EtapasContext.Provider value={{ etapas, etapasActivas, etapaCierre, getConfig, recargar, cargando }}>
      {children}
    </EtapasContext.Provider>
  );
}

export function useEtapas() {
  const ctx = useContext(EtapasContext);
  if (!ctx) throw new Error('useEtapas debe usarse dentro de EtapasProvider');
  return ctx;
}
