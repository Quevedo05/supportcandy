import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { TicketsApp } from './components/TicketsApp';
import { SaveanApp } from './modules/savean/SaveanApp';

function AppContent() {
  const { usuario } = useAuth();

  // Sin sesión - mostrar login
  if (!usuario) {
    return <LoginPage />;
  }

  // Bifurcación por módulo
  if (usuario.modulo === 'savean') {
    return <SaveanApp />;
  }

  // Módulo tickets (comportamiento actual sin cambios)
  return <TicketsApp />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
