import { useAuth } from '../context/AuthContext';
import { LogOut, Settings, Building2, User, FileText, LayoutDashboard } from 'lucide-react';

type Seccion = 'dashboard' | 'formularios' | 'admin';

interface NavBarProps {
  seccionActiva: Seccion;
  onSeccionChange: (seccion: Seccion) => void;
}

export function NavBar({ seccionActiva, onSeccionChange }: NavBarProps) {
  const { usuario, logout } = useAuth();

  if (!usuario) return null;

  const getButtonClass = (seccion: Seccion) => {
    const baseClass = "flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition duration-200 backdrop-blur border";
    const activeClass = "bg-white/30 text-white border-white/40";
    const inactiveClass = "bg-white/10 hover:bg-white/20 text-white border-white/20";
    return `${baseClass} ${seccionActiva === seccion ? activeClass : inactiveClass}`;
  };

  return (
    <nav className="bg-red-900 px-6 py-4 shadow-lg">
      <div className="flex items-center justify-between">
        {/* Logo y título */}
        <div className="flex items-center gap-4">
          <div className="bg-white/10 p-2 rounded-lg backdrop-blur">
            <Building2 size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Agencia Calidad</h1>
            <p className="text-xs text-blue-100">Sistema de Gestión de Tickets</p>
          </div>
        </div>

        {/* Centro: Botones de navegación */}
        <div className="flex gap-2">
          <button
            onClick={() => onSeccionChange('dashboard')}
            className={getButtonClass('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => onSeccionChange('formularios')}
            className={getButtonClass('formularios')}
          >
            <FileText size={18} />
            <span>Formularios</span>
          </button>

          {usuario.rol === 'admin' && (
            <button
              onClick={() => onSeccionChange('admin')}
              className={getButtonClass('admin')}
            >
              <Settings size={18} />
              <span>Administración</span>
            </button>
          )}
        </div>

        {/* Sección derecha: usuario y botones */}
        <div className="flex items-center gap-6">
          {/* Información del usuario */}
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg backdrop-blur">
              <User size={20} className="text-white" />
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-white">{usuario.nombre}</p>
              <p className="text-xs text-blue-100">
                {usuario.rol === 'admin' ? '👨‍💼 Administrador' : '👤 Contribuidor'}
              </p>
            </div>
          </div>

          {/* Separador */}
          <div className="w-px h-8 bg-white/20"></div>

          {/* Botón de salir */}
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600/80 hover:bg-red-700 text-white font-medium rounded-lg transition duration-200 backdrop-blur"
          >
            <LogOut size={18} />
            <span>Salir</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
