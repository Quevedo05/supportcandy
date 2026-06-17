export type TipoPrograma = string;

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
  condicion?: {
    campo: string;        // slug del campo que controla la visibilidad
    valor: string[];      // valores que hacen visible este campo
  };
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
  loading: boolean;
  activarFormulario: (id: string) => Promise<void>;
  desactivarFormulario: (id: string) => Promise<void>;
  obtenerFormulariosActivos: () => Formulario[];
  actualizarCampos: (formularioId: string, campos: CampoFormulario[]) => Promise<void>;
  actualizarInfo: (formularioId: string, info: InfoFormulario) => Promise<void>;
  crearFormulario: () => Promise<string>;
  eliminarFormulario: (id: string) => Promise<void>;
  obtenerCampos: (formularioId: string) => CampoFormulario[];
}
