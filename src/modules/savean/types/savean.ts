export type EstadoDeclaracion = 'pendiente' | 'validada' | 'observada';

export interface Declaracion {
  id: string;
  numero: string;           // "SAV-2026-0001"
  estado: EstadoDeclaracion;
  fechaCreacion: string;

  // Datos del conductor/camionero
  conductorNombre: string;
  conductorDni: string;
  conductorCuil?: string;

  // Datos del vehículo
  patenteVehiculo: string;
  patenteAcoplado?: string;
  empresaTransporte?: string;

  // Datos del cargamento
  especie: string;
  variedad: string;
  cantidadKg: number;
  cantidadBultos?: number;
  tipoEnvase?: string;

  // Origen / Destino
  localidadOrigen: string;
  localidadDestino: string;
  provinciaDestino: string;

  // Barrera
  barrierFitosanitaria?: string;
  inspectorNombre?: string;
  observaciones?: string;
  fechaValidacion?: string;
}

export type DeclaracionNueva = Omit<
  Declaracion,
  'id' | 'numero' | 'estado' | 'fechaCreacion' | 'inspectorNombre' | 'observaciones' | 'fechaValidacion'
>;

export interface SaveanContextType {
  declaraciones: Declaracion[];
  crearDeclaracion: (data: DeclaracionNueva) => Declaracion;
  validarDeclaracion: (id: string, inspectorNombre: string) => void;
  observarDeclaracion: (id: string, observaciones: string) => void;
  obtenerDeclaracion: (id: string) => Declaracion | undefined;
}
