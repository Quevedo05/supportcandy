import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Formulario, FormulariosContextType, CampoFormulario, InfoFormulario } from '../types/formularios';

const FormulariosContext = createContext<FormulariosContextType | undefined>(undefined);

const STORAGE_KEY = 'sc_formularios';

const FORMULARIOS_DEFECTO: Formulario[] = [
  {
    id: 'form-001',
    programa: 'Microcréditos 2024',
    nombre: 'Microcréditos 2024',
    activo: true,
    personasFisicas: true,
    personasJuridicas: false,
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
    descripcion: 'Formulario para solicitar microcréditos 2024',
  },
  {
    id: 'form-002',
    programa: 'Cosecha y Acarreo 2026',
    nombre: 'Cosecha y Acarreo 2026',
    activo: false,
    personasFisicas: true,
    personasJuridicas: false,
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
    descripcion: 'Formulario para beneficiarios de Cosecha y Acarreo 2026',
  },
  {
    id: 'form-003',
    programa: 'Programa Aprender, Trabajar y Producir',
    nombre: 'Programa Aprender, Trabajar y Producir',
    activo: true,
    personasFisicas: true,
    personasJuridicas: true,
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
    descripcion: 'Formulario para el programa Aprender, Trabajar y Producir',
  },
];

function migrarFormulario(f: Formulario): Formulario {
  return {
    ...f,
    nombre: f.nombre ?? f.programa ?? '',
    personasFisicas: f.personasFisicas ?? true,
    personasJuridicas: f.personasJuridicas ?? false,
    campos: (f.campos ?? []).map((c) => ({
      ...c,
      campo: c.campo || `cf_${(c.label ?? '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`,
    })),
  };
}

export function FormulariosProvider({ children }: { children: ReactNode }) {
  const [formularios, setFormularios] = useState<Formulario[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setFormularios((JSON.parse(raw) as Formulario[]).map(migrarFormulario));
      } catch {
        setFormularios(FORMULARIOS_DEFECTO);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(FORMULARIOS_DEFECTO));
      }
    } else {
      setFormularios(FORMULARIOS_DEFECTO);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(FORMULARIOS_DEFECTO));
    }
  }, []);

  function save(lista: Formulario[]) {
    setFormularios(lista);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  }

  const activarFormulario = (id: string) =>
    save(formularios.map((f) => f.id === id ? { ...f, activo: true, actualizadoEn: new Date().toISOString() } : f));

  const desactivarFormulario = (id: string) =>
    save(formularios.map((f) => f.id === id ? { ...f, activo: false, actualizadoEn: new Date().toISOString() } : f));

  const obtenerFormulariosActivos = () => formularios.filter((f) => f.activo);

  const actualizarCampos = (formularioId: string, campos: CampoFormulario[]) =>
    save(formularios.map((f) => f.id === formularioId ? { ...f, campos, actualizadoEn: new Date().toISOString() } : f));

  const actualizarInfo = (formularioId: string, info: InfoFormulario) =>
    save(formularios.map((f) => f.id === formularioId ? { ...f, ...info, actualizadoEn: new Date().toISOString() } : f));

  const crearFormulario = (): string => {
    const id = `form-${Date.now()}`;
    const nuevo: Formulario = {
      id,
      programa: '',
      nombre: '',
      activo: false,
      personasFisicas: true,
      personasJuridicas: false,
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
      descripcion: '',
      campos: [],
    };
    save([...formularios, nuevo]);
    return id;
  };

  const eliminarFormulario = (id: string) =>
    save(formularios.filter((f) => f.id !== id));

  const obtenerCampos = (formularioId: string): CampoFormulario[] =>
    formularios.find((f) => f.id === formularioId)?.campos ?? [];

  return (
    <FormulariosContext.Provider
      value={{
        formularios,
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
