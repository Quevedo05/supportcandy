import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FormulariosProvider } from '../context/FormulariosContext';
import AgenciaCalidadDashboard from '../AgenciaCalidadDashboard';
import { AdminPanel } from './AdminPanel';
import { FormulariosPanel } from './FormulariosPanel';
import { NavBar } from './NavBar';
import { Header } from './Header';

type Seccion = 'dashboard' | 'formularios' | 'admin';

function TicketsAppContent() {
  const { usuario } = useAuth();
  const [seccionActiva, setSeccionActiva] = useState<Seccion>('dashboard');

  // Renderizar contenido según sección
  const renderContenido = () => {
    switch (seccionActiva) {
      case 'formularios':
        return <FormulariosPanel />;
      case 'admin':
        return usuario?.rol === 'admin' ? <AdminPanel /> : <AgenciaCalidadDashboard />;
      case 'dashboard':
      default:
        return <AgenciaCalidadDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <NavBar seccionActiva={seccionActiva} onSeccionChange={setSeccionActiva} />
      <div className="flex-1 p-6">
        {renderContenido()}
      </div>
    </div>
  );
}

export function TicketsApp() {
  return (
    <FormulariosProvider>
      <TicketsAppContent />
    </FormulariosProvider>
  );
}
