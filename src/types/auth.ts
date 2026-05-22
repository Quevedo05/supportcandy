export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  password: string;
  rol: 'admin' | 'contribuidor';
  activo: boolean;
  creadoEn: string;
}

export interface SesionActiva {
  usuarioId: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'contribuidor';
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
