export type TipoPrograma =
  | 'Microcréditos 2024'
  | 'Cosecha y Acarreo 2026'
  | 'Programa Aprender, Trabajar y Producir';

export type TipoCampo = 'texto' | 'textarea' | 'numero' | 'fecha' | 'selector' | 'archivo';

export interface CampoFormulario {
  id: string;
  label: string;
  campo: string;          // internal slug, e.g. "cf_nombre"
  tipo: TipoCampo;
  requerido: boolean;
  orden: number;
  opciones?: string[];
  placeholder?: string;
  descripcion?: string;
  longitudMaxima?: number;
}

export interface Formulario {
  id: string;
  programa: TipoPrograma | string;
  nombre: string;
  activo: boolean;
  personasFisicas: boolean;
  personasJuridicas: boolean;
  creadoEn: string;
  actualizadoEn: string;
  descripcion: string;
  campos?: CampoFormulario[];
}

export type ValoresCampos = Record<string, string>;
export type ErroresCampos = Record<string, string>;

export interface InfoFormulario {
  nombre: string;
  programa: string;
  personasFisicas: boolean;
  personasJuridicas: boolean;
  activo: boolean;
}

export interface FormulariosContextType {
  formularios: Formulario[];
  activarFormulario: (id: string) => void;
  desactivarFormulario: (id: string) => void;
  obtenerFormulariosActivos: () => Formulario[];
  actualizarCampos: (formularioId: string, campos: CampoFormulario[]) => void;
  actualizarInfo: (formularioId: string, info: InfoFormulario) => void;
  crearFormulario: () => string;
  eliminarFormulario: (id: string) => void;
  obtenerCampos: (formularioId: string) => CampoFormulario[];
}
