import { useState } from 'react';
import { useSavean } from '../context/SaveanContext';
import { ChevronLeft, ChevronRight, Check, Plus, Trash2, Search } from 'lucide-react';

const API_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('sc_token') || '';
}

// ─── Catálogo de provincias SAG ───────────────────────────────────────────────
const PROVINCIAS_SAG = [
  { cod: '02', nombre: 'Capital Federal / CABA' },
  { cod: '06', nombre: 'Buenos Aires' },
  { cod: '10', nombre: 'Catamarca' },
  { cod: '22', nombre: 'Chaco' },
  { cod: '26', nombre: 'Chubut' },
  { cod: '14', nombre: 'Córdoba' },
  { cod: '18', nombre: 'Corrientes' },
  { cod: '30', nombre: 'Entre Ríos' },
  { cod: '34', nombre: 'Formosa' },
  { cod: '38', nombre: 'Jujuy' },
  { cod: '42', nombre: 'La Pampa' },
  { cod: '46', nombre: 'La Rioja' },
  { cod: '50', nombre: 'Mendoza' },
  { cod: '54', nombre: 'Misiones' },
  { cod: '58', nombre: 'Neuquén' },
  { cod: '62', nombre: 'Río Negro' },
  { cod: '66', nombre: 'Salta' },
  { cod: '70', nombre: 'San Juan' },
  { cod: '74', nombre: 'San Luis' },
  { cod: '78', nombre: 'Santa Cruz' },
  { cod: '82', nombre: 'Santa Fe' },
  { cod: '86', nombre: 'Santiago del Estero' },
  { cod: '94', nombre: 'Tierra del Fuego' },
  { cod: '90', nombre: 'Tucumán' },
];

// ─── Localidades argentinas ───────────────────────────────────────────────────
const LOCALIDADES_ARG = [
  // Buenos Aires
  '9 de Julio', 'Azul', 'Bahía Blanca', 'Campana', 'Chascomús', 'Chivilcoy', 'Junín',
  'La Plata', 'Lanús', 'Lomas de Zamora', 'Luján', 'Mar del Plata', 'Mercedes', 'Morón',
  'Olavarría', 'Pergamino', 'Pilar', 'Quilmes', 'San Isidro', 'San Nicolás de los Arroyos',
  'Tandil', 'Tigre', 'Zárate',
  // CABA
  'Ciudad Autónoma de Buenos Aires',
  // Catamarca
  'Andalgalá', 'Belén', 'San Fernando del Valle de Catamarca', 'Santa María',
  // Chaco
  'Presidencia Roque Sáenz Peña', 'Resistencia',
  // Chubut
  'Comodoro Rivadavia', 'Esquel', 'Puerto Madryn', 'Rawson (Chubut)', 'Trelew',
  // Córdoba
  'Bell Ville', 'Córdoba', 'Río Cuarto', 'Río Tercero', 'San Francisco', 'Villa María',
  // Corrientes
  'Corrientes', 'Goya', 'Mercedes (Corrientes)',
  // Entre Ríos
  'Concordia', 'Gualeguaychú', 'Paraná',
  // Formosa
  'Clorinda', 'Formosa',
  // Jujuy
  'Palpalá', 'San Pedro de Jujuy', 'San Salvador de Jujuy',
  // La Pampa
  'General Pico', 'Santa Rosa',
  // La Rioja
  'Chilecito', 'La Rioja',
  // Mendoza
  'General Alvear', 'Godoy Cruz', 'Guaymallén', 'Las Heras', 'Luján de Cuyo',
  'Maipú', 'Mendoza', 'San Martín (Mendoza)', 'San Rafael', 'Tunuyán',
  // Misiones
  'Posadas',
  // Neuquén
  'Cutral Có', 'Neuquén', 'San Martín de los Andes', 'Zapala',
  // Río Negro
  'Allen', 'Cipolletti', 'General Roca', 'San Carlos de Bariloche', 'Viedma',
  // Salta
  'Cafayate', 'Orán', 'Salta', 'Tartagal',
  // San Juan
  'Albardón', 'Angaco', 'Calingasta', 'Caucete', 'Chimbas', 'Iglesia',
  'Jáchal', 'Rawson (San Juan)', 'Rivadavia', 'San Juan', 'Santa Lucía',
  'Sarmiento (San Juan)', 'Valle Fértil', 'Zonda',
  // San Luis
  'Merlo', 'San Luis', 'Villa Mercedes',
  // Santa Cruz
  'Caleta Olivia', 'Río Gallegos',
  // Santa Fe
  'Rafaela', 'Rosario', 'Santa Fe', 'Santo Tomé', 'Venado Tuerto', 'Villa Constitución',
  // Santiago del Estero
  'La Banda', 'Santiago del Estero',
  // Tierra del Fuego
  'Río Grande', 'Ushuaia',
  // Tucumán
  'Concepción (Tucumán)', 'San Miguel de Tucumán', 'Tafí Viejo', 'Yerba Buena',
].sort((a, b) => a.localeCompare(b, 'es'));

// ─── Catálogo de productos SAG ────────────────────────────────────────────────
const PRODUCTOS_SAG = [
  { codigo: 1, nombre: 'Aceituna' }, { codigo: 2, nombre: 'Acelga' },
  { codigo: 3, nombre: 'Achicoria' }, { codigo: 88, nombre: 'Acusy' },
  { codigo: 5, nombre: 'Ajo' }, { codigo: 4, nombre: 'Ají' },
  { codigo: 6, nombre: 'Albahaca' }, { codigo: 7, nombre: 'Alcaucil' },
  { codigo: 103, nombre: 'Alcayota' }, { codigo: 83, nombre: 'Alfalfa' },
  { codigo: 8, nombre: 'Almendra' }, { codigo: 9, nombre: 'Ananá' },
  { codigo: 10, nombre: 'Apio' }, { codigo: 89, nombre: 'Arándano' },
  { codigo: 85, nombre: 'Aromáticas' }, { codigo: 11, nombre: 'Arveja' },
  { codigo: 12, nombre: 'Avellano' }, { codigo: 109, nombre: 'Babaco' },
  { codigo: 13, nombre: 'Banana' }, { codigo: 14, nombre: 'Batata' },
  { codigo: 15, nombre: 'Berenjena' }, { codigo: 106, nombre: 'Bergamota' },
  { codigo: 16, nombre: 'Berro' }, { codigo: 18, nombre: 'Bruselas' },
  { codigo: 17, nombre: 'Brócoli' }, { codigo: 92, nombre: 'Carambola' },
  { codigo: 19, nombre: 'Cardo' }, { codigo: 20, nombre: 'Castaña' },
  { codigo: 21, nombre: 'Cebolla' }, { codigo: 22, nombre: 'Cebolla Verdeo' },
  { codigo: 23, nombre: 'Cereza' }, { codigo: 24, nombre: 'Champignon' },
  { codigo: 25, nombre: 'Chauchas' }, { codigo: 26, nombre: 'Chirimoya' },
  { codigo: 27, nombre: 'Choclo' }, { codigo: 104, nombre: 'Cibullete' },
  { codigo: 93, nombre: 'Cidra' }, { codigo: 102, nombre: 'Cilantro' },
  { codigo: 28, nombre: 'Ciruela' }, { codigo: 86, nombre: 'Coco' },
  { codigo: 29, nombre: 'Coliflor' }, { codigo: 30, nombre: 'Damasco' },
  { codigo: 31, nombre: 'Durazno' }, { codigo: 32, nombre: 'Echalote' },
  { codigo: 33, nombre: 'Endivia' }, { codigo: 84, nombre: 'Escarola' },
  { codigo: 34, nombre: 'Espárrago' }, { codigo: 35, nombre: 'Espinaca' },
  { codigo: 36, nombre: 'Frambuesa' }, { codigo: 114, nombre: 'Frutas Finas' },
  { codigo: 37, nombre: 'Frutillas' }, { codigo: 38, nombre: 'Granada' },
  { codigo: 115, nombre: 'Guanábana' }, { codigo: 39, nombre: 'Guayaba' },
  { codigo: 40, nombre: 'Guinda' }, { codigo: 41, nombre: 'Haba' },
  { codigo: 42, nombre: 'Higo' }, { codigo: 43, nombre: 'Hinojo' },
  { codigo: 44, nombre: 'Kakí' }, { codigo: 45, nombre: 'Kinoto' },
  { codigo: 46, nombre: 'Kiwi' }, { codigo: 47, nombre: 'Lechuga' },
  { codigo: 48, nombre: 'Lima' }, { codigo: 49, nombre: 'Limón' },
  { codigo: 50, nombre: 'Litchi' }, { codigo: 94, nombre: 'Lucuma' },
  { codigo: 110, nombre: 'Mamón' }, { codigo: 51, nombre: 'Mandarina' },
  { codigo: 87, nombre: 'Mandioca' }, { codigo: 52, nombre: 'Mango' },
  { codigo: 53, nombre: 'Manzana' }, { codigo: 96, nombre: 'Maracuyá' },
  { codigo: 54, nombre: 'Melón' }, { codigo: 55, nombre: 'Membrillo' },
  { codigo: 105, nombre: 'Mineola' }, { codigo: 56, nombre: 'Naranja' },
  { codigo: 57, nombre: 'Níspero' }, { codigo: 101, nombre: 'Nabo' },
  { codigo: 58, nombre: 'Nuez' }, { codigo: 59, nombre: 'Palta' },
  { codigo: 60, nombre: 'Papa' }, { codigo: 61, nombre: 'Papaya' },
  { codigo: 108, nombre: 'Pasionaria' }, { codigo: 62, nombre: 'Pelón' },
  { codigo: 63, nombre: 'Pepino' }, { codigo: 111, nombre: 'Pepino Dulce' },
  { codigo: 64, nombre: 'Pera' }, { codigo: 65, nombre: 'Perejil' },
  { codigo: 66, nombre: 'Pimiento' }, { codigo: 67, nombre: 'Pomelo' },
  { codigo: 68, nombre: 'Puerro' }, { codigo: 69, nombre: 'Rabanito' },
  { codigo: 70, nombre: 'Radicha' }, { codigo: 71, nombre: 'Remolacha' },
  { codigo: 72, nombre: 'Repollo' }, { codigo: 73, nombre: 'Sandía' },
  { codigo: 82, nombre: 'Soja' }, { codigo: 74, nombre: 'Tomate Perita' },
  { codigo: 75, nombre: 'Tomate Redondo' }, { codigo: 76, nombre: 'Tuna' },
  { codigo: 112, nombre: 'Uchuva' }, { codigo: 77, nombre: 'Uva' },
  { codigo: 78, nombre: 'Zanahoria' }, { codigo: 79, nombre: 'Zapallito' },
  { codigo: 80, nombre: 'Zapallo' }, { codigo: 81, nombre: 'Zapallo Anquito' },
  { codigo: 107, nombre: 'Papa Semilla' }, { codigo: 95, nombre: 'Cajones Vacíos' },
];

interface ProductoIngresado {
  codigo: number;
  nombre: string;
  cant_bultos: number;
  kg_bulto: number;
  kg_totales: number;
}

// ─── estilos compartidos ───────────────────────────────────────────────────────
const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent';
const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1';
const btnPrimary = 'flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50';
const btnSecondary = 'flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-lg transition';

// ─── Step 1: Registro en planilla ─────────────────────────────────────────────
interface Step1Data {
  barreraId: string;
  tipoVehiculo: 'auto' | 'colectivo' | 'camion' | '';
  patente: string;
  procedencia: string;
  decomisoCg: string;
  decomisoCFruta: string;
  generarActa: boolean;
  esCargaCarnica: boolean;
}

function Step1({
  data, onChange, barreras, planillaId, onPlanillaCreada, onEntradaCreada, onNext, onCancelar,
}: {
  data: Step1Data;
  onChange: (d: Partial<Step1Data>) => void;
  barreras: { id: string; nombre: string; activa: boolean }[];
  planillaId: string;
  onPlanillaCreada: (id: string) => void;
  onEntradaCreada: (id: string) => void;
  onNext: () => void;
  onCancelar: () => void;
}) {
  const [cargando, setCargando] = useState(false);
  const [err, setErr] = useState('');

  const handleBarreraChange = async (barreraId: string) => {
    onChange({ barreraId });
    if (!barreraId) return;
    try {
      const res = await fetch(`${API_URL}/savean/entrada/planilla-actual?barreraId=${barreraId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (res.ok) {
        onPlanillaCreada(data.id);
      } else {
        setErr(`Error al obtener planilla (${res.status}): ${data.error || JSON.stringify(data)}`);
      }
    } catch (e: any) {
      setErr(`Error de conexión al obtener planilla: ${e?.message || e}`);
    }
  };

  const handleGuardar = async () => {
    if (!data.barreraId || !data.tipoVehiculo || !data.patente.trim() || !data.procedencia.trim()) {
      setErr('Completá barrera, tipo de vehículo, patente y procedencia.');
      return;
    }
    if (!planillaId) { setErr('No se pudo obtener la planilla del día. Seleccioná la barrera.'); return; }
    setCargando(true);
    setErr('');
    try {
      const res = await fetch(`${API_URL}/savean/entrada/entradas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          planillaId,
          tipoVehiculo: data.tipoVehiculo,
          patente: data.patente,
          procedencia: data.procedencia,
          decomisoCg: data.decomisoCg ? parseFloat(data.decomisoCg) : null,
          decomisoCFruta: data.decomisoCFruta || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); setErr(d.error || 'Error al registrar.'); return; }
      const entrada = await res.json();
      onEntradaCreada(entrada.id);
      if (data.generarActa) {
        onNext();
      } else {
        onChange({ tipoVehiculo: '', patente: '', procedencia: '', decomisoCg: '', decomisoCFruta: '', generarActa: false });
        setErr('');
        alert('Vehículo registrado en la planilla.');
      }
    } catch { setErr('Error de conexión.'); }
    finally { setCargando(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Paso 1 de 3</p>
        <h2 className="text-base font-bold text-gray-900">Registro en planilla de control</h2>
        <p className="text-xs text-gray-500 mt-0.5">Completá los datos del vehículo que ingresa</p>
      </div>

      {/* Barrera */}
      <div>
        <label className={labelCls}>Barrera *</label>
        <select className={inputCls} value={data.barreraId} onChange={e => handleBarreraChange(e.target.value)}>
          <option value="">Seleccioná una barrera</option>
          {barreras.filter(b => b.activa).map(b => (
            <option key={b.id} value={b.id}>{b.nombre}</option>
          ))}
        </select>
      </div>

      {/* Tipo de vehículo */}
      <div>
        <label className={labelCls}>Tipo de vehículo *</label>
        <div className="grid grid-cols-3 gap-2">
          {(['auto', 'colectivo', 'camion'] as const).map(t => (
            <button
              key={t}
              onClick={() => onChange({ tipoVehiculo: t })}
              className={`py-2.5 rounded-lg border text-sm font-semibold transition ${
                data.tipoVehiculo === t
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'border-gray-300 text-gray-600 hover:border-green-400'
              }`}
            >
              {t === 'auto' ? 'Auto' : t === 'colectivo' ? 'Colectivo' : 'Camión'}
            </button>
          ))}
        </div>
      </div>

      {/* Patente y Procedencia */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Patente *</label>
          <input className={inputCls} placeholder="ABC123" value={data.patente}
            onChange={e => onChange({ patente: e.target.value.toUpperCase() })} />
        </div>
        <div>
          <label className={labelCls}>Procedencia *</label>
          <input className={inputCls} placeholder="Mendoza, San Luis..." value={data.procedencia}
            onChange={e => onChange({ procedencia: e.target.value })} />
        </div>
      </div>

      {/* Decomiso (opcional) */}
      <div>
        <label className={labelCls}>Decomiso (si corresponde)</label>
        <div className="grid grid-cols-2 gap-3">
          <input className={inputCls} type="number" placeholder="Kg decomisados" value={data.decomisoCg}
            onChange={e => onChange({ decomisoCg: e.target.value })} />
          <input className={inputCls} placeholder="Tipo de fruta/vegetal" value={data.decomisoCFruta}
            onChange={e => onChange({ decomisoCFruta: e.target.value })} />
        </div>
      </div>

      {/* ¿Generar acta? */}
      {data.tipoVehiculo !== '' && (
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer">
            <input type="checkbox" checked={data.generarActa}
              onChange={e => onChange({ generarActa: e.target.checked, esCargaCarnica: e.target.checked ? data.esCargaCarnica : false })}
              className="w-4 h-4 accent-green-600" />
            <span className="text-sm font-medium text-green-800">
              Continuar con Acta + Declaración Jurada de Productos
            </span>
          </label>

          {data.generarActa && (
            <label className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg cursor-pointer ml-4">
              <input type="checkbox" checked={data.esCargaCarnica}
                onChange={e => onChange({ esCargaCarnica: e.target.checked })}
                className="w-4 h-4 accent-red-600" />
              <div>
                <span className="text-sm font-semibold text-red-800">Lleva carga cárnica (SENASA)</span>
                <p className="text-xs text-red-500 mt-0.5">Activa el seguimiento para el Punto de Control</p>
              </div>
            </label>
          )}
        </div>
      )}

      {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</p>}

      <div className="flex gap-3 pt-2">
        <button onClick={onCancelar} className={btnSecondary}><ChevronLeft size={15} />Cancelar</button>
        <button onClick={handleGuardar} disabled={cargando} className={btnPrimary}>
          {cargando ? 'Guardando...' : data.generarActa ? <><span>Siguiente</span><ChevronRight size={15} /></> : <><Check size={15} /><span>Registrar vehículo</span></>}
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Acta Fitozoosanitaria ────────────────────────────────────────────
interface Step2Data {
  actaTipo: string;
  actaControl: string;
  localidad: string;
  departamento: string;
  provincia: string;
  interesadoNombre: string;
  interesadoDni: string;
  interesadoDomicilio: string;
  interesadoLocalidad: string;
  interesadoProvincia: string;
  vehiculo: string;
  chasis: string;
  acoplado: string;
  procedenteDe: string;
  destino: string;
  declaracion: string;
}

function Step2({ data, onChange, onNext, onBack }: {
  data: Step2Data;
  onChange: (d: Partial<Step2Data>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const tipos = [
    { v: 'inspeccion', l: 'Inspección' },
    { v: 'rechazo', l: 'Rechazo' },
    { v: 'decomiso', l: 'Decomiso' },
    { v: 'infraccion', l: 'Infracción' },
    { v: 'constatacion', l: 'Constatación' },
  ];

  const handleNext = () => {
    if (!data.actaTipo) { alert('Seleccioná el tipo de acta.'); return; }
    onNext();
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Paso 2 de 3</p>
        <h2 className="text-base font-bold text-gray-900">Acta Fitozoosanitaria</h2>
      </div>

      {/* Tipo de acta */}
      <div>
        <label className={labelCls}>Tipo de acta *</label>
        <div className="flex flex-wrap gap-2">
          {tipos.map(t => (
            <button key={t.v} onClick={() => onChange({ actaTipo: t.v })}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition ${
                data.actaTipo === t.v ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 text-gray-600 hover:border-green-400'
              }`}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Control</label>
        <input className={inputCls} value={data.actaControl} onChange={e => onChange({ actaControl: e.target.value })} />
      </div>

      {/* Lugar */}
      <div className="border-t pt-4">
        <p className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">Lugar del control</p>
        <div className="grid grid-cols-3 gap-3">
          <div><label className={labelCls}>Localidad</label>
            <input className={inputCls} value={data.localidad} onChange={e => onChange({ localidad: e.target.value })} /></div>
          <div><label className={labelCls}>Departamento</label>
            <input className={inputCls} value={data.departamento} onChange={e => onChange({ departamento: e.target.value })} /></div>
          <div><label className={labelCls}>Provincia</label>
            <input className={inputCls} value={data.provincia} onChange={e => onChange({ provincia: e.target.value })} /></div>
        </div>
      </div>

      {/* Interesado */}
      <div className="border-t pt-4">
        <p className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">Interesado</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><label className={labelCls}>Nombre completo</label>
            <input className={inputCls} value={data.interesadoNombre} onChange={e => onChange({ interesadoNombre: e.target.value })} /></div>
          <div><label className={labelCls}>DNI</label>
            <input className={inputCls} value={data.interesadoDni} onChange={e => onChange({ interesadoDni: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className={labelCls}>Domicilio</label>
            <input className={inputCls} value={data.interesadoDomicilio} onChange={e => onChange({ interesadoDomicilio: e.target.value })} /></div>
          <div><label className={labelCls}>Localidad</label>
            <input className={inputCls} value={data.interesadoLocalidad} onChange={e => onChange({ interesadoLocalidad: e.target.value })} /></div>
          <div><label className={labelCls}>Provincia</label>
            <input className={inputCls} value={data.interesadoProvincia} onChange={e => onChange({ interesadoProvincia: e.target.value })} /></div>
        </div>
      </div>

      {/* Vehículo */}
      <div className="border-t pt-4">
        <p className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">Vehículo</p>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div><label className={labelCls}>Vehículo</label>
            <input className={inputCls} value={data.vehiculo} onChange={e => onChange({ vehiculo: e.target.value })} /></div>
          <div><label className={labelCls}>Chasis N°</label>
            <input className={inputCls} value={data.chasis} onChange={e => onChange({ chasis: e.target.value })} /></div>
          <div><label className={labelCls}>Acoplado N°</label>
            <input className={inputCls} value={data.acoplado} onChange={e => onChange({ acoplado: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Procedente de</label>
            <input className={inputCls} value={data.procedenteDe} onChange={e => onChange({ procedenteDe: e.target.value })} /></div>
          <div><label className={labelCls}>Destino</label>
            <input className={inputCls} value={data.destino} onChange={e => onChange({ destino: e.target.value })} /></div>
        </div>
      </div>

      {/* Declaración */}
      <div className="border-t pt-4">
        <label className={labelCls}>El señor declara</label>
        <textarea className={inputCls + ' resize-none'} rows={4}
          value={data.declaracion} onChange={e => onChange({ declaracion: e.target.value })} />
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className={btnSecondary}><ChevronLeft size={15} />Atrás</button>
        <button onClick={handleNext} className={btnPrimary}>Siguiente<ChevronRight size={15} /></button>
      </div>
    </div>
  );
}

// ─── Step 3: Declaración Jurada de Productos ──────────────────────────────────
interface Step3Data {
  remitenteNombre: string;
  remitenteCuit: string;
  remitenteLocalidadCod: string;
  remitenteProvinciaCod: string;
  destinatarioNombre: string;
  destinatarioCuit: string;
  destinatarioLocalidadCod: string;
  destinatarioProvinciaCod: string;
  destinoTipo: string;
  productos: ProductoIngresado[];
  transporteEmpresa: string;
  transporteCuit: string;
  transportePatente: string;
  transporteAcoplado: string;
  transporteLicencia: string;
  emailConductor: string;
  // Detalle carga cárnica (activado desde Step 1)
  senasaNumero: string;
  telefonoChofer: string;
  destinoComercial: string;
  tipoCargaDetalle: string;
  destinoTipoCarnico: string;
}

function Step3({ data, onChange, onBack, onSubmit, cargando, esCargaCarnica }: {
  data: Step3Data;
  onChange: (d: Partial<Step3Data>) => void;
  onBack: () => void;
  onSubmit: () => void;
  cargando: boolean;
  esCargaCarnica: boolean;
}) {
  const [busqueda, setBusqueda] = useState('');
  const [mostrarBuscador, setMostrarBuscador] = useState(false);

  const productosFiltrados = PRODUCTOS_SAG.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    String(p.codigo).includes(busqueda)
  ).filter(p => !data.productos.find(ip => ip.codigo === p.codigo));

  const agregarProducto = (prod: typeof PRODUCTOS_SAG[0]) => {
    onChange({
      productos: [...data.productos, { codigo: prod.codigo, nombre: prod.nombre, cant_bultos: 0, kg_bulto: 0, kg_totales: 0 }],
    });
    setBusqueda('');
    setMostrarBuscador(false);
  };

  const actualizarProducto = (codigo: number, campo: keyof ProductoIngresado, valor: number) => {
    onChange({
      productos: data.productos.map(p => {
        if (p.codigo !== codigo) return p;
        const updated = { ...p, [campo]: valor };
        if (campo === 'cant_bultos' || campo === 'kg_bulto') {
          updated.kg_totales = Number((updated.cant_bultos * updated.kg_bulto).toFixed(2));
        }
        return updated;
      }),
    });
  };

  const quitarProducto = (codigo: number) => {
    onChange({ productos: data.productos.filter(p => p.codigo !== codigo) });
  };

  const totalKg = data.productos.reduce((s, p) => s + p.kg_totales, 0);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Paso 3 de 3</p>
        <h2 className="text-base font-bold text-gray-900">Declaración Jurada de Productos Vegetales</h2>
      </div>

      {/* Remitente */}
      <div>
        <p className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">Remitente</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><label className={labelCls}>Nombre</label>
            <input className={inputCls} value={data.remitenteNombre} onChange={e => onChange({ remitenteNombre: e.target.value })} /></div>
          <div><label className={labelCls}>CUIT</label>
            <input className={inputCls} value={data.remitenteCuit} onChange={e => onChange({ remitenteCuit: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Localidad</label>
            <select className={inputCls} value={data.remitenteLocalidadCod} onChange={e => onChange({ remitenteLocalidadCod: e.target.value })}>
              <option value="">Seleccioná localidad</option>
              {LOCALIDADES_ARG.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Provincia</label>
            <select className={inputCls} value={data.remitenteProvinciaCod} onChange={e => onChange({ remitenteProvinciaCod: e.target.value })}>
              <option value="">Seleccioná provincia</option>
              {PROVINCIAS_SAG.map(p => (
                <option key={p.cod} value={p.cod}>{p.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Destinatario */}
      <div className="border-t pt-4">
        <p className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">Destinatario</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><label className={labelCls}>Nombre</label>
            <input className={inputCls} value={data.destinatarioNombre} onChange={e => onChange({ destinatarioNombre: e.target.value })} /></div>
          <div><label className={labelCls}>CUIT</label>
            <input className={inputCls} value={data.destinatarioCuit} onChange={e => onChange({ destinatarioCuit: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><label className={labelCls}>Localidad</label>
            <select className={inputCls} value={data.destinatarioLocalidadCod} onChange={e => onChange({ destinatarioLocalidadCod: e.target.value })}>
              <option value="">Seleccioná localidad</option>
              {LOCALIDADES_ARG.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Provincia</label>
            <select className={inputCls} value={data.destinatarioProvinciaCod} onChange={e => onChange({ destinatarioProvinciaCod: e.target.value })}>
              <option value="">Seleccioná provincia</option>
              {PROVINCIAS_SAG.map(p => (
                <option key={p.cod} value={p.cod}>{p.nombre}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Tipo de destino</label>
          <div className="flex gap-2">
            {[{ v: 'industria', l: 'Industria' }, { v: 'exportacion', l: 'Exportación' }, { v: 'transito', l: 'Tránsito' }].map(t => (
              <button key={t.v} onClick={() => onChange({ destinoTipo: t.v })}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition ${
                  data.destinoTipo === t.v ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 text-gray-600 hover:border-green-400'
                }`}>{t.l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Productos */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Productos</p>
          <button onClick={() => setMostrarBuscador(v => !v)}
            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-semibold">
            <Plus size={13} />Agregar producto
          </button>
        </div>

        {mostrarBuscador && (
          <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="relative mb-2">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="w-full pl-7 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                placeholder="Buscar producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} autoFocus />
            </div>
            <div className="max-h-40 overflow-y-auto divide-y divide-gray-100">
              {productosFiltrados.slice(0, 20).map(p => (
                <button key={p.codigo} onClick={() => agregarProducto(p)}
                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-green-50 flex items-center justify-between">
                  <span>{p.nombre}</span>
                  <span className="text-xs text-gray-400">{p.codigo}</span>
                </button>
              ))}
              {productosFiltrados.length === 0 && <p className="text-xs text-gray-400 py-2 px-2">Sin resultados</p>}
            </div>
          </div>
        )}

        {data.productos.length > 0 ? (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-1 text-xs font-semibold text-gray-500 uppercase px-2">
              <span className="col-span-4">Producto</span>
              <span className="col-span-2 text-right">Bultos</span>
              <span className="col-span-2 text-right">Kg/bulto</span>
              <span className="col-span-3 text-right">Kg total</span>
              <span className="col-span-1"></span>
            </div>
            {data.productos.map(p => (
              <div key={p.codigo} className="grid grid-cols-12 gap-1 items-center bg-gray-50 rounded-lg px-2 py-1.5">
                <span className="col-span-4 text-sm font-medium text-gray-800 truncate">{p.nombre}</span>
                <input type="number" min="0"
                  className="col-span-2 text-right border border-gray-300 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                  value={p.cant_bultos || ''}
                  onChange={e => actualizarProducto(p.codigo, 'cant_bultos', Number(e.target.value))} />
                <input type="number" min="0" step="0.1"
                  className="col-span-2 text-right border border-gray-300 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                  value={p.kg_bulto || ''}
                  onChange={e => actualizarProducto(p.codigo, 'kg_bulto', Number(e.target.value))} />
                <span className="col-span-3 text-right text-sm font-semibold text-gray-700">{p.kg_totales.toFixed(1)} kg</span>
                <button onClick={() => quitarProducto(p.codigo)} className="col-span-1 flex justify-center text-red-400 hover:text-red-600">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <div className="flex justify-end pt-1 pr-2">
              <span className="text-sm font-bold text-gray-700">Total: {totalKg.toFixed(1)} kg</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic py-2">Agregá al menos un producto para la declaración jurada.</p>
        )}
      </div>

      {/* Transporte */}
      <div className="border-t pt-4">
        <p className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">Transporte</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><label className={labelCls}>Empresa</label>
            <input className={inputCls} value={data.transporteEmpresa} onChange={e => onChange({ transporteEmpresa: e.target.value })} /></div>
          <div><label className={labelCls}>CUIT transportista</label>
            <input className={inputCls} value={data.transporteCuit} onChange={e => onChange({ transporteCuit: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className={labelCls}>Patente camión</label>
            <input className={inputCls} value={data.transportePatente} onChange={e => onChange({ transportePatente: e.target.value.toUpperCase() })} /></div>
          <div><label className={labelCls}>Acoplado</label>
            <input className={inputCls} value={data.transporteAcoplado} onChange={e => onChange({ transporteAcoplado: e.target.value.toUpperCase() })} /></div>
          <div><label className={labelCls}>Licencia conducir</label>
            <input className={inputCls} value={data.transporteLicencia} onChange={e => onChange({ transporteLicencia: e.target.value })} /></div>
        </div>
      </div>

      {/* Email */}
      <div className="border-t pt-4">
        <label className={labelCls}>Email del conductor (opcional)</label>
        <input className={inputCls} type="email" placeholder="conductor@ejemplo.com"
          value={data.emailConductor} onChange={e => onChange({ emailConductor: e.target.value })} />
        {!data.emailConductor && (
          <p className="text-xs text-gray-400 mt-1">
            Sin email, el conductor puede solicitar la copia en agenciacalidadsanjuan.com.ar
          </p>
        )}
      </div>

      {/* Carga cárnica — sólo si fue activada en Step 1 */}
      {esCargaCarnica && (
      <div className="border-t pt-4">
        <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          Carga cárnica (SENASA)
        </p>
        <div>
          <div className="space-y-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>N° SENASA / DTE</label>
                <input className={inputCls} placeholder="DT-E-0XXX-YYYYYYY"
                  value={data.senasaNumero} onChange={e => onChange({ senasaNumero: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Teléfono del chofer</label>
                <input className={inputCls} type="tel" placeholder="264 XXX XXXX"
                  value={data.telefonoChofer} onChange={e => onChange({ telefonoChofer: e.target.value })} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Detalle de la carga</label>
              <input className={inputCls} placeholder="Media res, cuartos, menudencias..."
                value={data.tipoCargaDetalle} onChange={e => onChange({ tipoCargaDetalle: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Destino comercial</label>
              <input className={inputCls} placeholder="Nombre del frigorífico o carnicería"
                value={data.destinoComercial} onChange={e => onChange({ destinoComercial: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Tipo de destino</label>
              <div className="flex gap-2">
                {[{ v: 'interno', l: 'Interno (SJ)' }, { v: 'externo', l: 'Fuera de SJ' }].map(t => (
                  <button key={t.v} type="button" onClick={() => onChange({ destinoTipoCarnico: t.v })}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition ${
                      data.destinoTipoCarnico === t.v
                        ? 'bg-red-600 border-red-600 text-white'
                        : 'border-gray-300 text-gray-600 hover:border-red-400'
                    }`}>{t.l}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className={btnSecondary} disabled={cargando}><ChevronLeft size={15} />Atrás</button>
        <button onClick={onSubmit} disabled={cargando} className={btnPrimary}>
          <Check size={15} />
          {cargando ? 'Generando acta...' : 'Finalizar y generar acta'}
        </button>
      </div>
    </div>
  );
}

// ─── Pantalla de éxito ────────────────────────────────────────────────────────
function PantallaExito({ numero, emailEnviado, onNuevo }: { numero: string; emailEnviado: boolean; onNuevo: () => void }) {
  return (
    <div className="text-center space-y-5 py-8">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <Check size={32} className="text-green-600" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-900">Acta generada</h2>
        <p className="text-2xl font-bold text-green-600 mt-1">{numero}</p>
      </div>
      {emailEnviado
        ? <p className="text-sm text-gray-600">Se envió el PDF al correo del conductor.</p>
        : <p className="text-sm text-gray-500">El conductor puede solicitar la copia en <strong>agenciacalidadsanjuan.com.ar</strong></p>
      }
      <button onClick={onNuevo} className={btnPrimary + ' mx-auto'}>
        <Plus size={15} />Nuevo ingreso
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function SaveanEntrada({ onVolver }: { onVolver: () => void }) {
  const { barreras } = useSavean();

  const [paso, setPaso] = useState<1 | 2 | 3 | 'ok'>(1);
  const [planillaId, setPlanillaId] = useState('');
  const [entradaId, setEntradaId] = useState('');
  const [cargando, setCargando] = useState(false);
  const [err, setErr] = useState('');
  const [ingresoNumero, setIngresoNumero] = useState('');
  const [emailEnviado, setEmailEnviado] = useState(false);

  const [step1, setStep1] = useState<Step1Data>({
    barreraId: '', tipoVehiculo: '', patente: '', procedencia: '',
    decomisoCg: '', decomisoCFruta: '', generarActa: false, esCargaCarnica: false,
  });
  const [step2, setStep2] = useState<Step2Data>({
    actaTipo: '', actaControl: '', localidad: '', departamento: '', provincia: '',
    interesadoNombre: '', interesadoDni: '', interesadoDomicilio: '',
    interesadoLocalidad: '', interesadoProvincia: '',
    vehiculo: '', chasis: '', acoplado: '', procedenteDe: '', destino: '', declaracion: '',
  });
  const [step3, setStep3] = useState<Step3Data>({
    remitenteNombre: '', remitenteCuit: '', remitenteLocalidadCod: '', remitenteProvinciaCod: '',
    destinatarioNombre: '', destinatarioCuit: '', destinatarioLocalidadCod: '', destinatarioProvinciaCod: '',
    destinoTipo: '', productos: [],
    transporteEmpresa: '', transporteCuit: '', transportePatente: '', transporteAcoplado: '', transporteLicencia: '',
    emailConductor: '',
    senasaNumero: '', telefonoChofer: '', destinoComercial: '', tipoCargaDetalle: '', destinoTipoCarnico: '',
  });

  const handleSubmit = async () => {
    setCargando(true);
    setErr('');
    try {
      const barrera = barreras.find(b => b.id === step1.barreraId);
      const payload = {
        entradaId: entradaId || null,
        barreraId: step1.barreraId,
        barreraNombre: barrera?.nombre || '',
        esCargaCarnica: step1.esCargaCarnica,
        ...step2,
        ...step3,
      };
      const res = await fetch(`${API_URL}/savean/entrada/ingresos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'Error al crear el ingreso.'); return; }
      setIngresoNumero(data.numero);
      setEmailEnviado(Boolean(step3.emailConductor));
      setPaso('ok');
    } catch { setErr('Error de conexión.'); }
    finally { setCargando(false); }
  };

  const resetear = () => {
    setPaso(1);
    setPlanillaId('');
    setEntradaId('');
    setIngresoNumero('');
    setEmailEnviado(false);
    setStep1({ barreraId: step1.barreraId, tipoVehiculo: '', patente: '', procedencia: '', decomisoCg: '', decomisoCFruta: '', generarActa: false, esCargaCarnica: false });
    setStep2({ actaTipo: '', actaControl: '', localidad: '', departamento: '', provincia: '', interesadoNombre: '', interesadoDni: '', interesadoDomicilio: '', interesadoLocalidad: '', interesadoProvincia: '', vehiculo: '', chasis: '', acoplado: '', procedenteDe: '', destino: '', declaracion: '' });
    setStep3({ remitenteNombre: '', remitenteCuit: '', remitenteLocalidadCod: '', remitenteProvinciaCod: '', destinatarioNombre: '', destinatarioCuit: '', destinatarioLocalidadCod: '', destinatarioProvinciaCod: '', destinoTipo: '', productos: [], transporteEmpresa: '', transporteCuit: '', transportePatente: '', transporteAcoplado: '', transporteLicencia: '', emailConductor: '', senasaNumero: '', telefonoChofer: '', destinoComercial: '', tipoCargaDetalle: '', destinoTipoCarnico: '' });
  };

  // Barra de progreso
  const progreso = paso === 1 ? 33 : paso === 2 ? 66 : paso === 3 ? 100 : 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onVolver} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <ChevronLeft size={16} />Volver
        </button>
        <h1 className="text-lg font-bold text-gray-900">Entrada a la Provincia</h1>
      </div>

      {paso !== 'ok' && (
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-5">
          <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${progreso}%` }} />
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        {paso === 1 && (
          <Step1
            data={step1} onChange={d => setStep1(p => ({ ...p, ...d }))}
            barreras={barreras} planillaId={planillaId}
            onPlanillaCreada={setPlanillaId}
            onEntradaCreada={setEntradaId}
            onNext={() => setPaso(2)} onCancelar={onVolver}
          />
        )}
        {paso === 2 && (
          <Step2
            data={step2} onChange={d => setStep2(p => ({ ...p, ...d }))}
            onNext={() => setPaso(3)} onBack={() => setPaso(1)}
          />
        )}
        {paso === 3 && (
          <Step3
            data={step3} onChange={d => setStep3(p => ({ ...p, ...d }))}
            onBack={() => setPaso(2)} onSubmit={handleSubmit} cargando={cargando}
            esCargaCarnica={step1.esCargaCarnica}
          />
        )}
        {paso === 'ok' && (
          <PantallaExito numero={ingresoNumero} emailEnviado={emailEnviado} onNuevo={resetear} />
        )}
        {err && <p className="text-xs text-red-600 mt-3 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</p>}
      </div>
    </div>
  );
}
