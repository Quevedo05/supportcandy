export type EstadoGuia = 'pendiente' | 'verificada' | 'vencida' | 'denegada';

export interface ItemMercaderia {
  id: string;
  lugarEmpaque?: string;
  especie: string;
  especieNombre?: string;
  variedad?: string;
  vidDestino?: string[];
  vidInv?: string;
  tipoEnvase?: string;
  cantidadBultos?: number;
  cantidadKg?: number;
}

export interface GuiaSavean {
  id: string;
  numero: string;
  token: string;
  estado: EstadoGuia;
  fechaEmision: string;
  fechaVencimiento: string;
  fechaVerificacion?: string;
  remitenteNombre: string;
  remitenteRenspa?: string;
  remitenteInv?: string;
  remitenteTipo?: string;
  destinatarioNombre: string;
  destinoTipo: 'externo' | 'interno';
  destinoPais?: string;
  destinoPuntoSalida?: string;
  destinoMercadoInterno?: string;
  destinoProvincia?: string;
  items: ItemMercaderia[];
  transporteEmpresa?: string;
  transporteConductor: string;
  transporteTipo?: string;
  transporteCamionPatente: string;
  transporteAcopladoPatente?: string;
  transportePrecintos?: string;
  barreraId?: string;
  barrieraNombre?: string;
  inspectorUsuario?: string;
  inspectorNombre?: string;
  motivoDenegacion?: string;
  emailContacto?: string;
}

export interface Barrera {
  id: string;
  nombre: string;
  ruta?: string;
  kilometro?: string;
  departamento?: string;
  activa: boolean;
}

export interface Barrerista {
  id: string;
  nombre: string;
  usuario: string;
  activo: boolean;
}

export interface SaveanContextType {
  guias: GuiaSavean[];
  barreras: Barrera[];
  barreristas: Barrerista[];
  crearGuia: (data: Omit<GuiaSavean, 'id' | 'numero' | 'token' | 'estado' | 'fechaEmision' | 'fechaVencimiento'>) => GuiaSavean;
  verificarGuia: (id: string, barreraId: string, inspectorUsuario: string, inspectorNombre: string) => void;
  denegarGuia: (id: string, barreraId: string, inspectorUsuario: string, inspectorNombre: string, motivo: string) => void;
  modificarYVerificarGuia: (id: string, barreraId: string, inspectorUsuario: string, inspectorNombre: string, cambios: Partial<GuiaSavean>) => void;
  obtenerGuia: (id: string) => GuiaSavean | undefined;
  obtenerGuiaPorNumero: (numero: string) => GuiaSavean | undefined;
  agregarBarrerista: (b: Omit<Barrerista, 'id'>) => void;
  desactivarBarrerista: (id: string) => void;
  eliminarBarrerista: (id: string) => void;
  agregarBarrera: (b: Omit<Barrera, 'id'>) => void;
}
