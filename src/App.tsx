import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FormulariosProvider } from './context/FormulariosContext';
import AgenciaCalidadDashboard from './AgenciaCalidadDashboard';
import { LoginPage } from './components/LoginPage';
import { AdminPanel } from './components/AdminPanel';
import { FormulariosPanel } from './components/FormulariosPanel';
import { NavBar } from './components/NavBar';
import { Header } from './components/Header';

type Seccion = 'dashboard' | 'formularios' | 'admin';

function AppContent() {
  const { usuario } = useAuth();
  const [seccionActiva, setSeccionActiva] = useState<Seccion>('dashboard');

  // Sin sesión - mostrar login
  if (!usuario) {
    return <LoginPage />;
  }

  // Con sesión - mostrar la sección correspondiente
  const renderContenido = () => {
    switch (seccionActiva) {
      case 'formularios':
        return <FormulariosPanel />;
      case 'admin':
        return usuario.rol === 'admin' ? <AdminPanel /> : <AgenciaCalidadDashboard />;
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

function App() {
  return (
    <AuthProvider>
      <FormulariosProvider>
        <AppContent />
      </FormulariosProvider>
    </AuthProvider>
  );
}

export default App;
