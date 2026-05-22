import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Declaracion, DeclaracionNueva, SaveanContextType } from '../types/savean';

const SaveanContext = createContext<SaveanContextType | undefined>(undefined);

const STORAGE_KEY = 'sc_savean_declaraciones';

// Generador de número de declaración
function generarNumeroDeclaracion(indice: number): string {
  const numero = String(indice + 1).padStart(4, '0');
  return `SAV-2026-${numero}`;
}

// Declaraciones de ejemplo iniciales
const DECLARACIONES_DEFECTO: Declaracion[] = [
  {
    id: 'decl-001',
    numero: 'SAV-2026-0001',
    estado: 'pendiente',
    fechaCreacion: new Date().toISOString(),
    conductorNombre: 'Juan Carlos López',
    conductorDni: '12345678',
    conductorCuil: '20-12345678-9',
    patenteVehiculo: 'ABC123',
    patenteAcoplado: 'DEF456',
    empresaTransporte: 'Transportes López S.A.',
    especie: 'Tomate',
    variedad: 'Cherry',
    cantidadKg: 5000,
    cantidadBultos: 50,
    tipoEnvase: 'Caja',
    localidadOrigen: 'La Plata',
    localidadDestino: 'Mendoza',
    provinciaDestino: 'Mendoza',
    barrierFitosanitaria: 'Puesto de Control Mendoza',
  },
  {
    id: 'decl-002',
    numero: 'SAV-2026-0002',
    estado: 'validada',
    fechaCreacion: new Date(Date.now() - 86400000).toISOString(),
    conductorNombre: 'María García Rodríguez',
    conductorDni: '87654321',
    conductorCuil: '27-87654321-5',
    patenteVehiculo: 'XYZ789',
    empresaTransporte: 'García Transportes',
    especie: 'Lechuga',
    variedad: 'Manteca',
    cantidadKg: 2000,
    cantidadBultos: 40,
    tipoEnvase: 'Bolsa',
    localidadOrigen: 'San Martín',
    localidadDestino: 'San Rafael',
    provinciaDestino: 'Mendoza',
    barrierFitosanitaria: 'Puesto de Control San Rafael',
    inspectorNombre: 'Inspector Martínez',
    fechaValidacion: new Date(Date.now() - 86400000).toISOString(),
  },
];

export function SaveanProvider({ children }: { children: ReactNode }) {
  const [declaraciones, setDeclaraciones] = useState<Declaracion[]>([]);

  // Inicializar desde localStorage
  useEffect(() => {
    const declaracionesGuardadas = localStorage.getItem(STORAGE_KEY);

    if (declaracionesGuardadas) {
      try {
        setDeclaraciones(JSON.parse(declaracionesGuardadas));
      } catch {
        setDeclaraciones(DECLARACIONES_DEFECTO);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DECLARACIONES_DEFECTO));
      }
    } else {
      setDeclaraciones(DECLARACIONES_DEFECTO);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DECLARACIONES_DEFECTO));
    }
  }, []);

  const crearDeclaracion = (data: DeclaracionNueva): Declaracion => {
    const indice = declaraciones.length;
    const nuevaDeclaracion: Declaracion = {
      ...data,
      id: `decl-${Date.now()}`,
      numero: generarNumeroDeclaracion(indice),
      estado: 'pendiente',
      fechaCreacion: new Date().toISOString(),
    };

    const declaracionesActualizadas = [...declaraciones, nuevaDeclaracion];
    setDeclaraciones(declaracionesActualizadas);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(declaracionesActualizadas));

    return nuevaDeclaracion;
  };

  const validarDeclaracion = (id: string, inspectorNombre: string) => {
    const declaracionesActualizadas = declaraciones.map((d) =>
      d.id === id
        ? {
            ...d,
            estado: 'validada' as const,
            inspectorNombre,
            fechaValidacion: new Date().toISOString(),
          }
        : d
    );
    setDeclaraciones(declaracionesActualizadas);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(declaracionesActualizadas));
  };

  const observarDeclaracion = (id: string, observaciones: string) => {
    const declaracionesActualizadas = declaraciones.map((d) =>
      d.id === id
        ? {
            ...d,
            estado: 'observada' as const,
            observaciones,
            fechaValidacion: new Date().toISOString(),
          }
        : d
    );
    setDeclaraciones(declaracionesActualizadas);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(declaracionesActualizadas));
  };

  const obtenerDeclaracion = (id: string): Declaracion | undefined => {
    return declaraciones.find((d) => d.id === id);
  };

  return (
    <SaveanContext.Provider
      value={{
        declaraciones,
        crearDeclaracion,
        validarDeclaracion,
        observarDeclaracion,
        obtenerDeclaracion,
      }}
    >
      {children}
    </SaveanContext.Provider>
  );
}

export function useSavean(): SaveanContextType {
  const context = useContext(SaveanContext);
  if (!context) {
    throw new Error('useSavean debe ser usado dentro de un SaveanProvider');
  }
  return context;
}
