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
  loading: boolean;
  crearGuia: (data: Omit<GuiaSavean, 'id' | 'numero' | 'token' | 'estado' | 'fechaEmision' | 'fechaVencimiento'>) => Promise<GuiaSavean>;
  verificarGuia: (id: string, barreraId: string) => Promise<void>;
  denegarGuia: (id: string, barreraId: string, motivo: string) => Promise<void>;
  modificarYVerificarGuia: (id: string, barreraId: string, cambios: Partial<GuiaSavean>) => Promise<void>;
  obtenerGuia: (id: string) => GuiaSavean | undefined;
  obtenerGuiaPorNumero: (numero: string) => GuiaSavean | undefined;
  agregarBarrerista: (b: Omit<Barrerista, 'id'> & { contrasena?: string }) => Promise<void>;
  desactivarBarrerista: (id: string) => Promise<void>;
  eliminarBarrerista: (id: string) => Promise<void>;
  agregarBarrera: (b: Omit<Barrera, 'id'>) => Promise<void>;
}
