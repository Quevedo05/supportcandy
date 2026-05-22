import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Formulario, FormulariosContextType, CampoFormulario } from '../types/formularios';

const FormulariosContext = createContext<FormulariosContextType | undefined>(undefined);

const STORAGE_KEY = 'sc_formularios';

const FORMULARIOS_DEFECTO: Formulario[] = [
  {
    id: 'form-001',
    programa: 'Microcréditos 2024',
    activo: true,
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
    descripcion: 'Formulario para solicitar microcréditos 2024',
  },
  {
    id: 'form-002',
    programa: 'Cosecha y Acarreo 2026',
    activo: false,
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
    descripcion: 'Formulario para beneficiarios de Cosecha y Acarreo 2026',
  },
  {
    id: 'form-003',
    programa: 'Programa Aprender, Trabajar y Producir',
    activo: true,
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
    descripcion: 'Formulario para el programa Aprender, Trabajar y Producir',
  },
];

export function FormulariosProvider({ children }: { children: ReactNode }) {
  const [formularios, setFormularios] = useState<Formulario[]>([]);

  // Inicializar desde localStorage
  useEffect(() => {
    const formulariosGuardados = localStorage.getItem(STORAGE_KEY);

    if (formulariosGuardados) {
      try {
        setFormularios(JSON.parse(formulariosGuardados));
      } catch {
        setFormularios(FORMULARIOS_DEFECTO);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(FORMULARIOS_DEFECTO));
      }
    } else {
      setFormularios(FORMULARIOS_DEFECTO);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(FORMULARIOS_DEFECTO));
    }
  }, []);

  const activarFormulario = (id: string) => {
    const formulariosActualizados = formularios.map((f) =>
      f.id === id ? { ...f, activo: true, actualizadoEn: new Date().toISOString() } : f
    );
    setFormularios(formulariosActualizados);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formulariosActualizados));
  };

  const desactivarFormulario = (id: string) => {
    const formulariosActualizados = formularios.map((f) =>
      f.id === id ? { ...f, activo: false, actualizadoEn: new Date().toISOString() } : f
    );
    setFormularios(formulariosActualizados);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formulariosActualizados));
  };

  const obtenerFormulariosActivos = () => {
    return formularios.filter((f) => f.activo);
  };

  const actualizarCampos = (formularioId: string, campos: CampoFormulario[]) => {
    const formulariosActualizados = formularios.map((f) =>
      f.id === formularioId
        ? { ...f, campos, actualizadoEn: new Date().toISOString() }
        : f
    );
    setFormularios(formulariosActualizados);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formulariosActualizados));
  };

  const obtenerCampos = (formularioId: string): CampoFormulario[] => {
    const formulario = formularios.find((f) => f.id === formularioId);
    return formulario?.campos ?? [];
  };

  return (
    <FormulariosContext.Provider
      value={{
        formularios,
        activarFormulario,
        desactivarFormulario,
        obtenerFormulariosActivos,
        actualizarCampos,
        obtenerCampos,
      }}
    >
      {children}
    </FormulariosContext.Provider>
  );
}

export function useFormularios(): FormulariosContextType {
  const context = useContext(FormulariosContext);
  if (!context) {
    throw new Error('useFormularios debe ser usado dentro de un FormulariosProvider');
  }
  return context;
}
