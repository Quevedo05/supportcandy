import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GuiaSavean, Barrera, Barrerista, SaveanContextType } from '../types/savean';

const SaveanContext = createContext<SaveanContextType | undefined>(undefined);

const SK_GUIAS = 'sc_savean_guias';
const SK_BARRERAS = 'sc_savean_barreras';
const SK_BARRERISTAS = 'sc_savean_barreristas';

function generarToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generarNumero(existentes: GuiaSavean[]): string {
  const anio = new Date().getFullYear();
  const desteAnio = existentes.filter(g => g.numero.includes(`-${anio}-`));
  return `SAVEAN-${anio}-${String(desteAnio.length + 1).padStart(5, '0')}`;
}

function addDias(fecha: string, dias: number): string {
  return new Date(new Date(fecha).getTime() + dias * 86400000).toISOString();
}

const BARRERAS_SEED: Barrera[] = [
  { id: 'bar-001', nombre: 'San Carlos', ruta: 'Ruta Nac. 40', kilometro: 'km 3379', departamento: 'Sarmiento', activa: true },
  { id: 'bar-002', nombre: 'Valle Fértil', ruta: 'Ruta Prov. 510', kilometro: '', departamento: 'Valle Fértil', activa: true },
  { id: 'bar-003', nombre: 'Talacasto', ruta: 'Ruta Nac. 40', kilometro: 'km 3550', departamento: 'Albardón', activa: true },
  { id: 'bar-004', nombre: 'Caucete', ruta: 'Ruta Nac. 20', kilometro: '', departamento: 'Caucete', activa: true },
  { id: 'bar-005', nombre: 'Zonda', ruta: 'Ruta Prov. 12', kilometro: '', departamento: 'Zonda', activa: true },
  { id: 'bar-006', nombre: 'Albardón', ruta: 'Ruta Nac. 40', kilometro: 'km 3580', departamento: 'Albardón', activa: true },
  { id: 'bar-007', nombre: 'Iglesia', ruta: 'Ruta Nac. 150', kilometro: '', departamento: 'Iglesia', activa: true },
  { id: 'bar-008', nombre: '25 de Mayo', ruta: 'Ruta Nac. 7', kilometro: '', departamento: '25 de Mayo', activa: true },
];

const BARRERISTAS_SEED: Barrerista[] = [
  { id: 'br-001', nombre: 'Alejandro Aballay', usuario: 'aaballay', activo: true },
  { id: 'br-002', nombre: 'Aldo Abrego', usuario: 'aabrego', activo: true },
  { id: 'br-003', nombre: 'Claudio Agüero', usuario: 'caguero', activo: true },
  { id: 'br-004', nombre: 'Santiago Aguirre', usuario: 'saguirre', activo: true },
  { id: 'br-005', nombre: 'José Mercedes Aguirre', usuario: 'jaguirre', activo: true },
  { id: 'br-006', nombre: 'Cristian Baigorria', usuario: 'cbaigorria', activo: true },
  { id: 'br-007', nombre: 'Walter Balmaceda', usuario: 'wbalmaceda', activo: true },
  { id: 'br-008', nombre: 'Leonardo Casanelli', usuario: 'lcasanelli', activo: true },
  { id: 'br-009', nombre: 'Ariel Castaño', usuario: 'acastano', activo: true },
  { id: 'br-010', nombre: 'Lourdes Castillo', usuario: 'lcastillo', activo: true },
  { id: 'br-011', nombre: 'Cintia Castillo', usuario: 'ccastillo', activo: true },
  { id: 'br-012', nombre: 'Julia Castillo', usuario: 'jcastillo', activo: true },
  { id: 'br-013', nombre: 'Horacio Castro', usuario: 'hcastro', activo: true },
  { id: 'br-014', nombre: 'Emiliano Chirino', usuario: 'echirino', activo: true },
  { id: 'br-015', nombre: 'Claudia Fernandez', usuario: 'cfernandez', activo: true },
  { id: 'br-016', nombre: 'Gabriel Ferron', usuario: 'gferron', activo: true },
  { id: 'br-017', nombre: 'Carlos Flores', usuario: 'cflores', activo: true },
  { id: 'br-018', nombre: 'Cristian Garay', usuario: 'cgaray', activo: true },
  { id: 'br-019', nombre: 'Oscar Garay', usuario: 'ogaray', activo: true },
  { id: 'br-020', nombre: 'Sergio Antonio Geraldo', usuario: 'sgeraldo', activo: true },
  { id: 'br-021', nombre: 'Renzo Godoy', usuario: 'rgodoy', activo: true },
  { id: 'br-022', nombre: 'Nelson Gomez', usuario: 'ngomez', activo: true },
  { id: 'br-023', nombre: 'Luis Angel Gonzalez', usuario: 'lgonzalez', activo: true },
  { id: 'br-024', nombre: 'Nancy Gonzalez', usuario: 'ngonzalez', activo: true },
  { id: 'br-025', nombre: 'Ricardo Gonzalez', usuario: 'rgonzalez', activo: true },
  { id: 'br-026', nombre: 'Cristian Guzman', usuario: 'cguzman', activo: true },
  { id: 'br-027', nombre: 'Claudia Herrera', usuario: 'cherrera', activo: true },
  { id: 'br-028', nombre: 'Jessica Illanes', usuario: 'jillanes', activo: true },
  { id: 'br-029', nombre: 'Sabrina Lazo', usuario: 'slazo', activo: true },
  { id: 'br-030', nombre: 'Daniel Mancini', usuario: 'dmancini', activo: true },
  { id: 'br-031', nombre: 'Roberto Morales', usuario: 'rmorales', activo: true },
  { id: 'br-032', nombre: 'Diego Moreno', usuario: 'dmoreno', activo: true },
  { id: 'br-033', nombre: 'Sergio Navarrete', usuario: 'snavarrete', activo: true },
  { id: 'br-034', nombre: 'Mauricio Raúl Nome', usuario: 'mnome', activo: true },
  { id: 'br-035', nombre: 'Braian Orozco', usuario: 'borozco', activo: true },
  { id: 'br-036', nombre: 'Tadeo Ortiz', usuario: 'tortiz', activo: true },
  { id: 'br-037', nombre: 'Fernando Peleitay', usuario: 'fpeleitay', activo: true },
  { id: 'br-038', nombre: 'Mario Peletier', usuario: 'mpeletier', activo: true },
  { id: 'br-039', nombre: 'María de los Ángeles Pereyra', usuario: 'mpereyra', activo: true },
  { id: 'br-040', nombre: 'Orlando Pereyra', usuario: 'opereyra', activo: true },
  { id: 'br-041', nombre: 'Javier Quiroga', usuario: 'jquiroga', activo: true },
  { id: 'br-042', nombre: 'Carlos Quiroga', usuario: 'cquiroga', activo: true },
  { id: 'br-043', nombre: 'Marcelo Recabarren', usuario: 'mrecabarren', activo: true },
  { id: 'br-044', nombre: 'Aníbal Rivero', usuario: 'arivero', activo: true },
  { id: 'br-045', nombre: 'Luis Rodriguez', usuario: 'lrodriguez', activo: true },
  { id: 'br-046', nombre: 'Diego Rosselot', usuario: 'drosselot', activo: true },
  { id: 'br-047', nombre: 'Milagros Sabio', usuario: 'msabio', activo: true },
  { id: 'br-048', nombre: 'Hugo Sanchez', usuario: 'hsanchez', activo: true },
  { id: 'br-049', nombre: 'Carlos Suesa', usuario: 'csuesa', activo: true },
  { id: 'br-050', nombre: 'Gustavo Talquenca', usuario: 'gtalquenca', activo: true },
  { id: 'br-051', nombre: 'Eduardo Tanten', usuario: 'etanten', activo: true },
  { id: 'br-052', nombre: 'Daniel Tejada', usuario: 'dtejada', activo: true },
  { id: 'br-053', nombre: 'Oscar Tobares', usuario: 'otobares', activo: true },
  { id: 'br-054', nombre: 'Daniel Alfredo Tula', usuario: 'dtula', activo: true },
  { id: 'br-055', nombre: 'Antonio Vega', usuario: 'avega', activo: true },
  { id: 'br-056', nombre: 'Erica Zalazar', usuario: 'ezalazar', activo: true },
  { id: 'br-057', nombre: 'Franco Mariano Zalazar', usuario: 'fzalazar', activo: true },
  { id: 'br-058', nombre: 'Juan Zapata', usuario: 'jzapata', activo: true },
  { id: 'br-059', nombre: 'Alexis Zavalla Gomez', usuario: 'azavalla', activo: true },
];

const GUIAS_EJEMPLO: GuiaSavean[] = [
  {
    id: 'guia-ej-001',
    numero: 'SAVEAN-2026-00001',
    token: 'ej-token-001',
    estado: 'pendiente',
    fechaEmision: new Date().toISOString(),
    fechaVencimiento: addDias(new Date().toISOString(), 20),
    remitenteNombre: 'Bodegas San Juan S.A.',
    remitenteRenspa: '22.001.0.09756/00',
    remitenteTipo: 'Galpón de Empaque',
    destinatarioNombre: 'Mercado Central Buenos Aires',
    destinoTipo: 'interno',
    destinoMercadoInterno: 'Mercado Concentrador',
    destinoProvincia: 'Buenos Aires',
    items: [{
      id: 'item-ej-001',
      lugarEmpaque: 'Bodega San Juan - Valle Tulum',
      especie: 'Vid',
      variedad: 'Malbec',
      vidDestino: ['Consumo fresco'],
      cantidadKg: 15000,
      cantidadBultos: 300,
    }],
    transporteConductor: 'Carlos Rodríguez',
    transporteEmpresa: 'Transportes del Oeste',
    transporteCamionPatente: 'AB123CD',
    transporteAcopladoPatente: 'EF456GH',
    transporteTipo: 'Tercero',
    emailContacto: 'contacto@bodegassanjuan.com.ar',
  },
  {
    id: 'guia-ej-002',
    numero: 'SAVEAN-2026-00002',
    token: 'ej-token-002',
    estado: 'verificada',
    fechaEmision: new Date(Date.now() - 2 * 86400000).toISOString(),
    fechaVencimiento: addDias(new Date(Date.now() - 2 * 86400000).toISOString(), 20),
    fechaVerificacion: new Date(Date.now() - 86400000).toISOString(),
    remitenteNombre: 'Finca Los Álamos',
    remitenteTipo: 'Productor',
    destinatarioNombre: 'Supermercados Día S.A.',
    destinoTipo: 'interno',
    destinoMercadoInterno: 'Supermercado',
    destinoProvincia: 'Córdoba',
    items: [{
      id: 'item-ej-002',
      especie: 'Tomate',
      variedad: 'Perita',
      tipoEnvase: 'Cajón',
      cantidadKg: 3000,
      cantidadBultos: 150,
    }],
    transporteConductor: 'José Pérez',
    transporteCamionPatente: 'XY789ZA',
    transporteTipo: 'Propio',
    barreraId: 'bar-001',
    barrieraNombre: 'San Carlos',
    inspectorUsuario: 'aaballay',
    inspectorNombre: 'Alejandro Aballay',
    emailContacto: 'finca@losalamos.com.ar',
  },
];

export function SaveanProvider({ children }: { children: ReactNode }) {
  const [guias, setGuias] = useState<GuiaSavean[]>([]);
  const [barreras, setBarreras] = useState<Barrera[]>([]);
  const [barreristas, setBarreristas] = useState<Barrerista[]>([]);

  useEffect(() => {
    const g = localStorage.getItem(SK_GUIAS);
    setGuias(g ? JSON.parse(g) : GUIAS_EJEMPLO);
    if (!g) localStorage.setItem(SK_GUIAS, JSON.stringify(GUIAS_EJEMPLO));

    const b = localStorage.getItem(SK_BARRERAS);
    setBarreras(b ? JSON.parse(b) : BARRERAS_SEED);
    if (!b) localStorage.setItem(SK_BARRERAS, JSON.stringify(BARRERAS_SEED));

    const br = localStorage.getItem(SK_BARRERISTAS);
    setBarreristas(br ? JSON.parse(br) : BARRERISTAS_SEED);
    if (!br) localStorage.setItem(SK_BARRERISTAS, JSON.stringify(BARRERISTAS_SEED));
  }, []);

  // Auto-vencimiento al cargar
  useEffect(() => {
    if (!guias.length) return;
    const ahora = new Date();
    const actualizadas = guias.map(g =>
      g.estado === 'pendiente' && new Date(g.fechaVencimiento) < ahora
        ? { ...g, estado: 'vencida' as const }
        : g
    );
    const hayCambios = actualizadas.some((g, i) => g.estado !== guias[i].estado);
    if (hayCambios) {
      setGuias(actualizadas);
      localStorage.setItem(SK_GUIAS, JSON.stringify(actualizadas));
    }
  }, [guias]);

  function save(nuevas: GuiaSavean[]) {
    setGuias(nuevas);
    localStorage.setItem(SK_GUIAS, JSON.stringify(nuevas));
  }

  const crearGuia = (data: Omit<GuiaSavean, 'id' | 'numero' | 'token' | 'estado' | 'fechaEmision' | 'fechaVencimiento'>): GuiaSavean => {
    const fechaEmision = new Date().toISOString();
    const nueva: GuiaSavean = {
      ...data,
      id: `guia-${Date.now()}`,
      numero: generarNumero(guias),
      token: generarToken(),
      estado: 'pendiente',
      fechaEmision,
      fechaVencimiento: addDias(fechaEmision, 20),
    };
    save([...guias, nueva]);
    return nueva;
  };

  const verificarGuia = (id: string, barreraId: string, inspectorUsuario: string, inspectorNombre: string) => {
    const barrera = barreras.find(b => b.id === barreraId);
    save(guias.map(g =>
      g.id === id && g.estado === 'pendiente'
        ? { ...g, estado: 'verificada', fechaVerificacion: new Date().toISOString(), barreraId, barrieraNombre: barrera?.nombre, inspectorUsuario, inspectorNombre }
        : g
    ));
  };

  const denegarGuia = (id: string, barreraId: string, inspectorUsuario: string, inspectorNombre: string, motivo: string) => {
    const barrera = barreras.find(b => b.id === barreraId);
    save(guias.map(g =>
      g.id === id && g.estado === 'pendiente'
        ? { ...g, estado: 'denegada', fechaVerificacion: new Date().toISOString(), barreraId, barrieraNombre: barrera?.nombre, inspectorUsuario, inspectorNombre, motivoDenegacion: motivo }
        : g
    ));
  };

  const modificarYVerificarGuia = (id: string, barreraId: string, inspectorUsuario: string, inspectorNombre: string, cambios: Partial<GuiaSavean>) => {
    const barrera = barreras.find(b => b.id === barreraId);
    save(guias.map(g =>
      g.id === id && g.estado === 'pendiente'
        ? { ...g, ...cambios, estado: 'verificada', fechaVerificacion: new Date().toISOString(), barreraId, barrieraNombre: barrera?.nombre, inspectorUsuario, inspectorNombre }
        : g
    ));
  };

  const obtenerGuia = (id: string) => guias.find(g => g.id === id);

  const obtenerGuiaPorNumero = (numero: string) =>
    guias.find(g => g.numero.toLowerCase() === numero.toLowerCase().trim());

  const agregarBarrerista = (b: Omit<Barrerista, 'id'>) => {
    const nuevo = { ...b, id: `br-${Date.now()}` };
    const actualizados = [...barreristas, nuevo];
    setBarreristas(actualizados);
    localStorage.setItem(SK_BARRERISTAS, JSON.stringify(actualizados));
  };

  const desactivarBarrerista = (id: string) => {
    const actualizados = barreristas.map(b => b.id === id ? { ...b, activo: false } : b);
    setBarreristas(actualizados);
    localStorage.setItem(SK_BARRERISTAS, JSON.stringify(actualizados));
  };

  const eliminarBarrerista = (id: string) => {
    const actualizados = barreristas.filter(b => b.id !== id);
    setBarreristas(actualizados);
    localStorage.setItem(SK_BARRERISTAS, JSON.stringify(actualizados));
  };

  const agregarBarrera = (b: Omit<Barrera, 'id'>) => {
    const nueva = { ...b, id: `bar-${Date.now()}` };
    const actualizadas = [...barreras, nueva];
    setBarreras(actualizadas);
    localStorage.setItem(SK_BARRERAS, JSON.stringify(actualizadas));
  };

  return (
    <SaveanContext.Provider value={{
      guias, barreras, barreristas,
      crearGuia, verificarGuia, denegarGuia, modificarYVerificarGuia,
      obtenerGuia, obtenerGuiaPorNumero,
      agregarBarrerista, desactivarBarrerista, eliminarBarrerista, agregarBarrera,
    }}>
      {children}
    </SaveanContext.Provider>
  );
}

export function useSavean(): SaveanContextType {
  const ctx = useContext(SaveanContext);
  if (!ctx) throw new Error('useSavean debe usarse dentro de SaveanProvider');
  return ctx;
}
