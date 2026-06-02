export type RolSistema = 'admin' | 'contribuidor' | 'inspector' | 'dev';
export type Modulo = 'tickets' | 'savean';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  password: string;
  rol: RolSistema;
  modulo: Modulo;
  activo: boolean;
  activado: boolean;           // true = set their own password
  tokenActivacion?: string;    // pending invite token
  etapasAsignadas?: string[];  // ticket stages this user handles
  creadoEn: string;
}

export interface SesionActiva {
  usuarioId: string;
  email: string;
  nombre: string;
  rol: RolSistema;
  modulo: Modulo;
}

export interface AuthContextType {
  usuario: SesionActiva | null;
  usuarios: Usuario[];
  cargando: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  crearUsuario: (data: Omit<Usuario, 'id' | 'creadoEn'>) => void;
  crearInvitado: (data: { nombre: string; email: string; rol: RolSistema; modulo: Modulo; etapasAsignadas?: string[] }) => string;
  activarCuenta: (token: string, password: string) => boolean;
  obtenerPorToken: (token: string) => Usuario | undefined;
  eliminarUsuario: (id: string) => void;
  toggleActivoUsuario: (id: string) => void;
  error: string | null;
}
