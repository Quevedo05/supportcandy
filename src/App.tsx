import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { TicketsApp } from './components/TicketsApp';
import { SaveanApp } from './modules/savean/SaveanApp';
import { DevPanel } from './components/DevPanel';
import { ActivarCuenta } from './components/ActivarCuenta';

function AppContent() {
  const { usuario } = useAuth();

  // 1. Activation link takes priority over everything
  const params = new URLSearchParams(window.location.search);
  const activarToken = params.get('activar');
  if (activarToken) return <ActivarCuenta token={activarToken} />;

  // 2. Not logged in
  if (!usuario) return <LoginPage />;

  // 3. Developer
  if (usuario.rol === 'dev') return <DevPanel />;

  // 4. Module routing
  if (usuario.modulo === 'savean') return <SaveanApp />;

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
