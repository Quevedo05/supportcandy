import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Usuario, SesionActiva, AuthContextType } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_USUARIOS = 'sc_usuarios';
const STORAGE_KEY_SESION = 'sc_sesion';

function generarToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<SesionActiva | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY_USUARIOS);
    let lista: Usuario[] = [];

    if (raw) {
      try {
        lista = (JSON.parse(raw) as Usuario[]).map((u) => ({ ...u, activado: u.activado ?? true }));
      } catch {
        lista = [];
      }
    }

    localStorage.setItem(STORAGE_KEY_USUARIOS, JSON.stringify(lista));
    setUsuarios(lista);

    const rawSesion = localStorage.getItem(STORAGE_KEY_SESION);
    if (rawSesion) {
      try {
        setUsuario(JSON.parse(rawSesion));
      } catch {
        setUsuario(null);
      }
    }

    setCargando(false);
  }, []);

  function saveUsuarios(lista: Usuario[]) {
    setUsuarios(lista);
    localStorage.setItem(STORAGE_KEY_USUARIOS, JSON.stringify(lista));
  }

  const login = async (email: string, password: string) => {
    setError(null);

    // Try real backend auth first
    try {
      const apiUrl = (import.meta.env as any).VITE_API_URL || 'http://localhost:3000/api';
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('sc_token', data.token);
        const sesion: SesionActiva = {
          usuarioId: data.usuario.usuarioId,
          email: data.usuario.email,
          nombre: data.usuario.nombre,
          rol: data.usuario.rol,
          modulo: data.usuario.modulo ?? 'tickets',
          formularioId: data.usuario.formularioId ?? null,
        };
        setUsuario(sesion);
        localStorage.setItem(STORAGE_KEY_SESION, JSON.stringify(sesion));
        return;
      }

      // Backend respondió con error (401, 403, etc.) — no derivar al auth local
      const body = await res.json().catch(() => ({}));
      setError(body.error || 'Email o contraseña incorrectos');
      throw new Error('invalid');
    } catch (err: any) {
      if (err.message === 'invalid') throw err;
      // Error de red — backend no disponible, intentar auth local como último recurso
    }

    // Auth local: solo cuando el backend está completamente inaccesible por red
    const found = usuarios.find((u) => u.email === email && u.activo);

    if (!found) {
      setError('Email o contraseña incorrectos');
      throw new Error('invalid');
    }
    if (!found.activado) {
      setError('Tu cuenta no fue activada aún. Revisá tu email para completar el registro.');
      throw new Error('not-activated');
    }
    if (found.password !== password) {
      setError('Email o contraseña incorrectos');
      throw new Error('invalid');
    }

    const sesion: SesionActiva = {
      usuarioId: found.id,
      email: found.email,
      nombre: found.nombre,
      rol: found.rol,
      modulo: found.modulo,
    };
    setUsuario(sesion);
    localStorage.setItem(STORAGE_KEY_SESION, JSON.stringify(sesion));
  };

  const logout = () => {
    setUsuario(null);
    localStorage.removeItem(STORAGE_KEY_SESION);
    localStorage.removeItem('sc_token');
  };

  const crearUsuario = (data: Omit<Usuario, 'id' | 'creadoEn'>) => {
    const nuevo: Usuario = {
      ...data,
      id: `user-${Date.now()}`,
      creadoEn: new Date().toISOString(),
    };
    saveUsuarios([...usuarios, nuevo]);
  };

  const crearInvitado = (data: {
    nombre: string;
    email: string;
    rol: Usuario['rol'];
    modulo: Usuario['modulo'];
    etapasAsignadas?: string[];
  }): string => {
    const token = generarToken();
    const nuevo: Usuario = {
      ...data,
      id: `user-${Date.now()}`,
      password: '',
      activo: true,
      activado: false,
      tokenActivacion: token,
      creadoEn: new Date().toISOString(),
    };
    saveUsuarios([...usuarios, nuevo]);
    return token;
  };

  const activarCuenta = (token: string, password: string): boolean => {
    const found = usuarios.find((u) => u.tokenActivacion === token && !u.activado);
    if (!found) return false;
    saveUsuarios(
      usuarios.map((u) =>
        u.id === found.id
          ? { ...u, password, activado: true, tokenActivacion: undefined }
          : u,
      ),
    );
    return true;
  };

  const obtenerPorToken = (token: string) =>
    usuarios.find((u) => u.tokenActivacion === token);

  const eliminarUsuario = (id: string) => {
    if (usuario?.usuarioId === id) {
      setError('No podés eliminar tu propia cuenta');
      return;
    }
    saveUsuarios(usuarios.filter((u) => u.id !== id));
  };

  const toggleActivoUsuario = (id: string) => {
    if (usuario?.usuarioId === id) {
      setError('No podés desactivar tu propia cuenta');
      return;
    }
    saveUsuarios(usuarios.map((u) => (u.id === id ? { ...u, activo: !u.activo } : u)));
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        usuarios,
        cargando,
        error,
        login,
        logout,
        crearUsuario,
        crearInvitado,
        activarCuenta,
        obtenerPorToken,
        eliminarUsuario,
        toggleActivoUsuario,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
