import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Formulario, FormulariosContextType, CampoFormulario, InfoFormulario } from '../types/formularios';

const FormulariosContext = createContext<FormulariosContextType | undefined>(undefined);

const STORAGE_KEY = 'sc_formularios_v2';

const FORMULARIOS_DEFECTO: Formulario[] = [
  {
    id: 'form-mc-001',
    programa: 'MICROCRÉDITOS',
    nombre: 'MICROCRÉDITOS',
    activo: true,
    personasFisicas: true,
    personasJuridicas: false,
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
    descripcion: 'Formulario de solicitud del programa MICROCRÉDITOS',
    campos: [
      { id: 'campo-mc-01', campo: 'cf_domicilio_emprendimiento', label: 'Domicilio Del Emprendimiento', tipo: 'texto', requerido: true, orden: 1, placeholder: 'Ingrese el domicilio del emprendimiento' },
      { id: 'campo-mc-02', campo: 'cf_departamento', label: 'Departamento', tipo: 'selector', requerido: true, orden: 2, opciones: ['Albardón','Angaco','Calingasta','Capital','Caucete','Chimbas','25 de Mayo','Iglesia','Jáchal','Pocito','Rawson','Rivadavia','San Martín','Santa Lucía','Sarmiento','Ullum','Valle Fértil','Zonda','9 de Julio'] },
      { id: 'campo-mc-03', campo: 'cf_telefono_movil', label: 'Teléfono Móvil', tipo: 'texto', requerido: true, orden: 3, placeholder: 'Ej: 2645123456' },
      { id: 'campo-mc-04', campo: 'cf_rubro', label: 'Rubro', tipo: 'selector', requerido: true, orden: 4, opciones: ['Textil y Confecciones','Gastronomía y Alimentación','Servicios Personales','Tecnología','Artesanías','Comercio','Construcción','Agro y Producción Rural','Transporte','Educación y Capacitación','Salud','Otro'] },
      { id: 'campo-mc-05', campo: 'cf_descripcion_proyecto', label: 'Describa su Proyecto', tipo: 'textarea', requerido: true, orden: 5, placeholder: 'Describa en detalle su proyecto' },
      { id: 'campo-mc-06', campo: 'cf_equipo_trabajo', label: 'Describa su Equipo de Trabajo', tipo: 'textarea', requerido: false, orden: 6, placeholder: 'Describa las personas que forman parte del emprendimiento' },
      { id: 'campo-mc-07', campo: 'cf_fecha_inicio_actividades', label: 'Fecha de Inicio de Actividades', tipo: 'fecha', requerido: true, orden: 7 },
      { id: 'campo-mc-08', campo: 'cf_impacto_proyecto', label: 'Impacto que Genera su Proyecto', tipo: 'textarea', requerido: false, orden: 8, placeholder: 'Describa el impacto social, económico o ambiental' },
      { id: 'campo-mc-09', campo: 'cf_destino', label: 'Destino del Crédito', tipo: 'texto', requerido: true, orden: 9, placeholder: 'Ej: Compra de maquinaria, insumos, capital de trabajo' },
      { id: 'campo-mc-10', campo: 'cf_como_ayuda_emprendimiento', label: 'Cómo ayuda a su Emprendimiento', tipo: 'textarea', requerido: false, orden: 10, placeholder: 'Explique de qué manera el crédito ayudará a su emprendimiento' },
      { id: 'campo-mc-11', campo: 'cf_fotos_emprendimiento_1', label: 'Fotos del Emprendimiento 1', tipo: 'archivo', requerido: false, orden: 11 },
      { id: 'campo-mc-12', campo: 'cf_fotos_emprendimiento_2', label: 'Fotos del Emprendimiento 2', tipo: 'archivo', requerido: false, orden: 12 },
      { id: 'campo-mc-13', campo: 'cf_fotos_emprendimiento_3', label: 'Fotos del Emprendimiento 3', tipo: 'archivo', requerido: false, orden: 13 },
      { id: 'campo-mc-14', campo: 'cf_foto_frente_dni', label: 'Foto Frente DNI', tipo: 'archivo', requerido: true, orden: 14 },
      { id: 'campo-mc-15', campo: 'cf_foto_dorso_dni', label: 'Foto Dorso DNI', tipo: 'archivo', requerido: true, orden: 15 },
      { id: 'campo-mc-16', campo: 'cf_constancia_arca_vigente', label: 'Constancia ARCA Vigente', tipo: 'archivo', requerido: true, orden: 16 },
      { id: 'campo-mc-17', campo: 'cf_presupuesto_proveedor_1', label: 'Presupuesto Proveedor 1', tipo: 'archivo', requerido: true, orden: 17 },
      { id: 'campo-mc-18', campo: 'cf_presupuesto_proveedor_2', label: 'Presupuesto Proveedor 2', tipo: 'archivo', requerido: false, orden: 18 },
      { id: 'campo-mc-19', campo: 'cf_presupuesto_proveedor_3', label: 'Presupuesto Proveedor 3', tipo: 'archivo', requerido: false, orden: 19 },
      { id: 'campo-mc-20', campo: 'cf_presupuesto_proveedor_4', label: 'Presupuesto Proveedor 4', tipo: 'archivo', requerido: false, orden: 20 },
      { id: 'campo-mc-21', campo: 'cf_curriculum_vitae_consultor', label: 'Currículum Vitae del Consultor', tipo: 'archivo', requerido: false, orden: 21 },
      { id: 'campo-mc-22', campo: 'cf_constancia_arca_proveedor', label: 'Constancia ARCA Proveedor', tipo: 'archivo', requerido: false, orden: 22 },
      { id: 'campo-mc-23', campo: 'cf_cbu_proveedor', label: 'CBU Proveedor', tipo: 'archivo', requerido: false, orden: 23 },
      { id: 'campo-mc-24', campo: 'cf_garantia_cheque', label: 'Garantía con Cheque', tipo: 'archivo', requerido: false, orden: 24 },
    ],
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
