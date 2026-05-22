export type TipoPrograma =
  | 'Microcréditos 2024'
  | 'Cosecha y Acarreo 2026'
  | 'Programa Aprender, Trabajar y Producir';

export type TipoCampo = 'texto' | 'textarea' | 'numero' | 'fecha' | 'selector';

export interface CampoFormulario {
  id: string;
  label: string;
  tipo: TipoCampo;
  requerido: boolean;
  orden: number;
  opciones?: string[];
  placeholder?: string;
}

export interface Formulario {
  id: string;
  programa: TipoPrograma;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
  descripcion: string;
  campos?: CampoFormulario[];
}

export type ValoresCampos = Record<string, string>;
export type ErroresCampos = Record<string, string>;

export interface FormulariosContextType {
  formularios: Formulario[];
  activarFormulario: (id: string) => void;
  desactivarFormulario: (id: string) => void;
  obtenerFormulariosActivos: () => Formulario[];
  actualizarCampos: (formularioId: string, campos: CampoFormulario[]) => void;
  obtenerCampos: (formularioId: string) => CampoFormulario[];
}
