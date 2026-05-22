import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Usuario, SesionActiva, AuthContextType } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_USUARIOS = 'sc_usuarios';
const STORAGE_KEY_SESION = 'sc_sesion';

const USUARIO_ADMIN_DEFECTO: Usuario = {
  id: 'admin-001',
  nombre: 'Administrador',
  email: 'admin@agenciacalidad.gob.ar',
  password: 'admin123',
  rol: 'admin',
  activo: true,
  creadoEn: new Date().toISOString(),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<SesionActiva | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Inicializar desde localStorage
  useEffect(() => {
    const usuariosGuardados = localStorage.getItem(STORAGE_KEY_USUARIOS);
    const sesionGuardada = localStorage.getItem(STORAGE_KEY_SESION);

    let usuariosList: Usuario[] = [];

    if (usuariosGuardados) {
      try {
        usuariosList = JSON.parse(usuariosGuardados);
      } catch {
        usuariosList = [USUARIO_ADMIN_DEFECTO];
      }
    } else {
      // Seed inicial
      usuariosList = [USUARIO_ADMIN_DEFECTO];
      localStorage.setItem(STORAGE_KEY_USUARIOS, JSON.stringify(usuariosList));
    }

    setUsuarios(usuariosList);

    if (sesionGuardada) {
      try {
        setUsuario(JSON.parse(sesionGuardada));
      } catch {
        setUsuario(null);
      }
    }
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    const usuarioEncontrado = usuarios.find(
      (u) => u.email === email && u.password === password && u.activo
    );

    if (!usuarioEncontrado) {
      setError('Email o contraseña incorrectos');
      throw new Error('Email o contraseña incorrectos');
    }

    const sesion: SesionActiva = {
      usuarioId: usuarioEncontrado.id,
      email: usuarioEncontrado.email,
      nombre: usuarioEncontrado.nombre,
      rol: usuarioEncontrado.rol,
    };

    setUsuario(sesion);
    localStorage.setItem(STORAGE_KEY_SESION, JSON.stringify(sesion));
  };

  const logout = () => {
    setUsuario(null);
    localStorage.removeItem(STORAGE_KEY_SESION);
  };

  const crearUsuario = (data: Omit<Usuario, 'id' | 'creadoEn'>) => {
    const nuevoUsuario: Usuario = {
      ...data,
      id: `user-${Date.now()}`,
      creadoEn: new Date().toISOString(),
    };

    const usuariosActualizados = [...usuarios, nuevoUsuario];
    setUsuarios(usuariosActualizados);
    localStorage.setItem(STORAGE_KEY_USUARIOS, JSON.stringify(usuariosActualizados));
  };

  const eliminarUsuario = (id: string) => {
    // No permite eliminar el usuario propio
    if (usuario?.usuarioId === id) {
      setError('No puedes eliminar tu propia cuenta');
      return;
    }

    const usuariosActualizados = usuarios.filter((u) => u.id !== id);
    setUsuarios(usuariosActualizados);
    localStorage.setItem(STORAGE_KEY_USUARIOS, JSON.stringify(usuariosActualizados));
  };

  const toggleActivoUsuario = (id: string) => {
    // No permite desactivar el usuario propio
    if (usuario?.usuarioId === id) {
      setError('No puedes desactivar tu propia cuenta');
      return;
    }

    const usuariosActualizados = usuarios.map((u) =>
      u.id === id ? { ...u, activo: !u.activo } : u
    );
    setUsuarios(usuariosActualizados);
    localStorage.setItem(STORAGE_KEY_USUARIOS, JSON.stringify(usuariosActualizados));
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        usuarios,
        login,
        logout,
        crearUsuario,
        eliminarUsuario,
        toggleActivoUsuario,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
