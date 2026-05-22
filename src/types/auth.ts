export type RolSistema = 'admin' | 'contribuidor' | 'inspector';
export type Modulo = 'tickets' | 'savean';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  password: string;
  rol: RolSistema;
  modulo: Modulo;
  activo: boolean;
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
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  crearUsuario: (data: Omit<Usuario, 'id' | 'creadoEn'>) => void;
  eliminarUsuario: (id: string) => void;
  toggleActivoUsuario: (id: string) => void;
  error: string | null;
}
