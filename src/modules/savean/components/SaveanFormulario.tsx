import { useState } from 'react';
import { useSavean } from '../context/SaveanContext';
import { GuiaSavean } from '../types/savean';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';

interface ItemForm {
  id: string;
  lugarEmpaque: string;
  especie: string;
  especieNombre: string;
  variedad: string;
  vidDestino: string[];
  vidInv: string;
  tipoEnvase: string;
  cantidadBultos: string;
  cantidadKg: string;
}

const itemVacio = (): ItemForm => ({
  id: String(Date.now()),
  lugarEmpaque: '',
  especie: '',
  especieNombre: '',
  variedad: '',
  vidDestino: [],
  vidInv: '',
  tipoEnvase: '',
  cantidadBultos: '',
  cantidadKg: '',
});

const ESPECIES = ['Vid', 'Tomate', 'Pimiento', 'Olivo', 'Pistacho', 'Ajo', 'Cebolla', 'Otro'];
const VID_DESTINOS = ['Consumo fresco', 'Pasa', 'Vino', 'Mosto'];
const TIPOS_REMITENTE = ['Galpón de Empaque', 'Cámara de Frío', 'Productor', 'Industria'];
const MERCADOS_INTERNOS = ['Depósito Mayorista', 'Mercado Concentrador', 'Supermercado', 'Industria'];
const TIPOS_ENVASE = ['Cajón', 'Bolsa', 'Bins', 'Granel', 'Bandeja', 'Otro'];

const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500';
const select = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:border-orange-500';
const label = 'block text-xs font-semibold text-gray-700 mb-1';
const sectionTitle = 'text-sm font-bold text-orange-600 border-b-2 border-orange-500 pb-1 mb-3 uppercase tracking-wide';

export function SaveanFormulario({ onVolver }: { onVolver?: () => void }) {
  const { crearGuia } = useSavean();

  const [remitente, setRemitente] = useState({ nombre: '', renspa: '', tipo: '' });
  const [destinatario, setDestinario] = useState({ nombre: '', tipoDestino: '' as '' | 'externo' | 'interno', pais: '', puntoSalida: '', mercadoInterno: '', provincia: '' });
  const [email, setEmail] = useState('');
  const [items, setItems] = useState<ItemForm[]>([itemVacio()]);
  const [transporte, setTransporte] = useState({ conductor: '', empresa: '', camionPatente: '', acopladoPatente: '', tipo: '' });
  const [confirmando, setConfirmando] = useState(false);
  const [guiaCreada, setGuiaCreada] = useState<GuiaSavean | null>(null);
  const [errores, setErrores] = useState<string[]>([]);

  const actualizarItem = (id: string, campo: keyof ItemForm, valor: string | string[]) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [campo]: valor } : it));
  };

  const toggleVidDestino = (itemId: string, dest: string) => {
    setItems(prev => prev.map(it => {
      if (it.id !== itemId) return it;
      const next = it.vidDestino.includes(dest)
        ? it.vidDestino.filter(d => d !== dest)
        : [...it.vidDestino, dest];
      return { ...it, vidDestino: next };
    }));
  };

  const agregarItem = () => setItems(prev => [...prev, itemVacio()]);
  const eliminarItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));

  const validar = (): string[] => {
    const e: string[] = [];
    if (!remitente.nombre.trim()) e.push('El nombre del remitente es obligatorio.');
    if (!remitente.tipo) e.push('El tipo de remitente es obligatorio.');
    if (!destinatario.nombre.trim()) e.push('El nombre del destinatario es obligatorio.');
    if (!destinatario.tipoDestino) e.push('El tipo de destino es obligatorio.');
    if (destinatario.tipoDestino === 'externo' && !destinatario.pais.trim()) e.push('El país de destino es obligatorio.');
    if (!email.trim() || !email.includes('@')) e.push('El email de contacto es inválido.');
    if (!transporte.conductor.trim()) e.push('El nombre del transportista es obligatorio.');
    if (!transporte.camionPatente.trim()) e.push('La patente del vehículo es obligatoria.');
    if (!transporte.tipo) e.push('El tipo de transporte es obligatorio.');
    items.forEach((it, i) => {
      if (!it.especie) e.push(`Producto ${i + 1}: seleccioná la especie.`);
      if (it.especie === 'Vid' && it.vidDestino.length === 0) e.push(`Producto ${i + 1}: seleccioná el destino de Vid.`);
      if (it.especie === 'Otro' && !it.especieNombre.trim()) e.push(`Producto ${i + 1}: ingresá el nombre del cultivo.`);
    });
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validar();
    if (errs.length) { setErrores(errs); return; }
    setErrores([]);
    setConfirmando(true);
  };

  const confirmar = () => {
    const nueva = crearGuia({
      remitenteNombre: remitente.nombre,
      remitenteRenspa: remitente.renspa,
      remitenteTipo: remitente.tipo,
      destinatarioNombre: destinatario.nombre,
      destinoTipo: destinatario.tipoDestino as 'externo' | 'interno',
      destinoPais: destinatario.pais,
      destinoPuntoSalida: destinatario.puntoSalida,
      destinoMercadoInterno: destinatario.mercadoInterno,
      destinoProvincia: destinatario.provincia,
      emailContacto: email,
      items: items.map(it => ({
        id: it.id,
        lugarEmpaque: it.lugarEmpaque,
        especie: it.especie === 'Otro' ? it.especieNombre : it.especie,
        variedad: it.variedad,
        vidDestino: it.vidDestino,
        vidInv: it.vidInv,
        tipoEnvase: it.tipoEnvase,
        cantidadBultos: it.cantidadBultos ? Number(it.cantidadBultos) : undefined,
        cantidadKg: it.cantidadKg ? Number(it.cantidadKg) : undefined,
      })),
      transporteConductor: transporte.conductor,
      transporteEmpresa: transporte.empresa,
      transporteCamionPatente: transporte.camionPatente,
      transporteAcopladoPatente: transporte.acopladoPatente,
      transporteTipo: transporte.tipo,
    });
    setConfirmando(false);
    setGuiaCreada(nueva);
  };

  if (guiaCreada) {
    return (
      <div className="max-w-xl mx-auto mt-8 text-center">
        <div className="bg-white border-2 border-green-500 rounded-xl p-8 shadow">
          <CheckCircle2 size={56} className="mx-auto text-green-600 mb-4" />
          <h2 className="text-2xl font-bold text-green-700 mb-2">¡Guía registrada!</h2>
          <p className="text-gray-500 text-sm mb-4">Tu número de guía es:</p>
          <div className="text-3xl font-bold text-orange-600 mb-2">{guiaCreada.numero}</div>
          <p className="text-gray-500 text-xs mb-6">
            Válida por 20 días · Vence el{' '}
            {new Date(guiaCreada.fechaVencimiento).toLocaleDateString('es-AR')}
          </p>
          <p className="text-sm text-gray-600 mb-6">
            Presentá este número en la barrera fitosanitaria para la verificación.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                setGuiaCreada(null);
                setRemitente({ nombre: '', renspa: '', tipo: '' });
                setDestinario({ nombre: '', tipoDestino: '', pais: '', puntoSalida: '', mercadoInterno: '', provincia: '' });
                setEmail('');
                setItems([itemVacio()]);
                setTransporte({ conductor: '', empresa: '', camionPatente: '', acopladoPatente: '', tipo: '' });
              }}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-orange-700 transition"
            >
              Emitir otra guía
            </button>
            {onVolver && (
              <button
                onClick={onVolver}
                className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Volver a la lista
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-orange-600 rounded-xl px-6 py-4 mb-6 text-white">
        <h2 className="text-xl font-bold">Guía de Origen Digital — SAVEAN</h2>
        <p className="text-orange-100 text-sm mt-1">Completá el formulario para emitir tu guía de origen</p>
      </div>

      {errores.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-4">
          <p className="text-red-700 font-semibold text-sm mb-1">Corregí los siguientes errores:</p>
          <ul className="list-disc list-inside space-y-1">
            {errores.map((e, i) => <li key={i} className="text-red-600 text-sm">{e}</li>)}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Remitente */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className={sectionTitle}>Remitente de la Mercadería</p>
          <div className="space-y-3">
            <div>
              <label className={label}>Nombre y Apellido / Razón Social *</label>
              <input className={input} value={remitente.nombre} onChange={e => setRemitente(p => ({ ...p, nombre: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>RENSPA N°</label>
                <input className={input} value={remitente.renspa} onChange={e => setRemitente(p => ({ ...p, renspa: e.target.value }))} />
              </div>
              <div>
                <label className={label}>Tipo de Remitente *</label>
                <select className={select} value={remitente.tipo} onChange={e => setRemitente(p => ({ ...p, tipo: e.target.value }))}>
                  <option value="">— Seleccionar —</option>
                  {TIPOS_REMITENTE.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Destinatario */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className={sectionTitle}>Destinatario de la Mercadería</p>
          <div className="space-y-3">
            <div>
              <label className={label}>Nombre y Apellido / Razón Social *</label>
              <input className={input} value={destinatario.nombre} onChange={e => setDestinario(p => ({ ...p, nombre: e.target.value }))} />
            </div>
            <div>
              <label className={label}>Tipo de Destino *</label>
              <select className={select} value={destinatario.tipoDestino} onChange={e => setDestinario(p => ({ ...p, tipoDestino: e.target.value as '' | 'externo' | 'interno' }))}>
                <option value="">— Seleccionar —</option>
                <option value="externo">Mercado Externo</option>
                <option value="interno">Mercado Interno</option>
              </select>
            </div>
            {destinatario.tipoDestino === 'externo' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>País de Destino *</label>
                  <input className={input} value={destinatario.pais} onChange={e => setDestinario(p => ({ ...p, pais: e.target.value }))} />
                </div>
                <div>
                  <label className={label}>Punto de Salida</label>
                  <input className={input} value={destinatario.puntoSalida} onChange={e => setDestinario(p => ({ ...p, puntoSalida: e.target.value }))} />
                </div>
              </div>
            )}
            {destinatario.tipoDestino === 'interno' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Tipo de Mercado Interno</label>
                  <select className={select} value={destinatario.mercadoInterno} onChange={e => setDestinario(p => ({ ...p, mercadoInterno: e.target.value }))}>
                    <option value="">— Seleccionar —</option>
                    {MERCADOS_INTERNOS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label}>Provincia de Destino</label>
                  <input className={input} value={destinatario.provincia} onChange={e => setDestinario(p => ({ ...p, provincia: e.target.value }))} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className={sectionTitle}>Contacto</p>
          <div>
            <label className={label}>Email de Contacto *</label>
            <input type="email" className={input} placeholder="ejemplo@dominio.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
        </div>

        {/* Mercadería */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className={sectionTitle}>Mercadería</p>
          <div className="space-y-4">
            {items.map((it, idx) => (
              <div key={it.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-orange-600">Producto {idx + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => eliminarItem(it.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className={label}>Lugar de Empaque</label>
                    <input className={input} value={it.lugarEmpaque} onChange={e => actualizarItem(it.id, 'lugarEmpaque', e.target.value)} />
                  </div>
                  <div>
                    <label className={label}>Especie *</label>
                    <select className={select} value={it.especie} onChange={e => actualizarItem(it.id, 'especie', e.target.value)}>
                      <option value="">— Seleccionar —</option>
                      {ESPECIES.map(sp => <option key={sp} value={sp}>{sp}</option>)}
                    </select>
                  </div>
                </div>

                {it.especie === 'Otro' && (
                  <div className="mb-3">
                    <label className={label}>Nombre del Cultivo *</label>
                    <input className={input} value={it.especieNombre} onChange={e => actualizarItem(it.id, 'especieNombre', e.target.value)} />
                  </div>
                )}

                {it.especie === 'Vid' && (
                  <div className="space-y-3">
                    <div>
                      <label className={label}>Destino *</label>
                      <div className="flex flex-wrap gap-3">
                        {VID_DESTINOS.map(d => (
                          <label key={d} className="flex items-center gap-1.5 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={it.vidDestino.includes(d)}
                              onChange={() => toggleVidDestino(it.id, d)}
                              className="accent-orange-600"
                            />
                            {d}
                          </label>
                        ))}
                      </div>
                    </div>
                    {(it.vidDestino.includes('Vino') || it.vidDestino.includes('Mosto')) && (
                      <div>
                        <label className={label}>N° INV *</label>
                        <input className={input} value={it.vidInv} onChange={e => actualizarItem(it.id, 'vidInv', e.target.value)} />
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className={label}>Variedad</label>
                        <input className={input} value={it.variedad} onChange={e => actualizarItem(it.id, 'variedad', e.target.value)} placeholder="Ej: Malbec" />
                      </div>
                      <div>
                        <label className={label}>Cantidad (kg) *</label>
                        <input type="number" className={input} value={it.cantidadKg} onChange={e => actualizarItem(it.id, 'cantidadKg', e.target.value)} />
                      </div>
                      <div>
                        <label className={label}>Bultos / Bins</label>
                        <input type="number" className={input} value={it.cantidadBultos} onChange={e => actualizarItem(it.id, 'cantidadBultos', e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}

                {it.especie && it.especie !== 'Vid' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={label}>Variedad</label>
                        <input className={input} value={it.variedad} onChange={e => actualizarItem(it.id, 'variedad', e.target.value)} />
                      </div>
                      <div>
                        <label className={label}>Tipo de Envase *</label>
                        <select className={select} value={it.tipoEnvase} onChange={e => actualizarItem(it.id, 'tipoEnvase', e.target.value)}>
                          <option value="">— Seleccionar —</option>
                          {TIPOS_ENVASE.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={label}>Cantidad (kg) *</label>
                        <input type="number" className={input} value={it.cantidadKg} onChange={e => actualizarItem(it.id, 'cantidadKg', e.target.value)} />
                      </div>
                      <div>
                        <label className={label}>Cantidad de Bultos *</label>
                        <input type="number" className={input} value={it.cantidadBultos} onChange={e => actualizarItem(it.id, 'cantidadBultos', e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={agregarItem}
              className="flex items-center gap-2 text-orange-600 border-2 border-orange-400 border-dashed rounded-lg px-4 py-2 text-sm font-semibold hover:bg-orange-50 transition w-full justify-center"
            >
              <Plus size={16} /> Agregar producto
            </button>
          </div>
        </div>

        {/* Transporte */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className={sectionTitle}>Transporte</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Nombre del Transportista *</label>
                <input className={input} value={transporte.conductor} onChange={e => setTransporte(p => ({ ...p, conductor: e.target.value }))} />
              </div>
              <div>
                <label className={label}>Empresa de Transporte</label>
                <input className={input} value={transporte.empresa} onChange={e => setTransporte(p => ({ ...p, empresa: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Patente Vehículo *</label>
                <input className={input} placeholder="Ej: AB123CD" value={transporte.camionPatente} onChange={e => setTransporte(p => ({ ...p, camionPatente: e.target.value.toUpperCase() }))} />
              </div>
              <div>
                <label className={label}>Patente Acoplado</label>
                <input className={input} value={transporte.acopladoPatente} onChange={e => setTransporte(p => ({ ...p, acopladoPatente: e.target.value.toUpperCase() }))} />
              </div>
            </div>
            <div>
              <label className={label}>Tipo *</label>
              <div className="flex gap-6">
                {['Propio', 'Tercero'].map(t => (
                  <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="transporteTipo" value={t} checked={transporte.tipo === t} onChange={() => setTransporte(p => ({ ...p, tipo: t }))} className="accent-orange-600" />
                    {t}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl transition text-base"
        >
          Enviar Guía
        </button>
      </form>

      {/* Modal confirmación */}
      {confirmando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">¿Confirmar envío?</h3>
            <p className="text-sm text-gray-600 mb-1"><strong>Remitente:</strong> {remitente.nombre}</p>
            <p className="text-sm text-gray-600 mb-1"><strong>Destinatario:</strong> {destinatario.nombre}</p>
            <p className="text-sm text-gray-600 mb-4"><strong>Transportista:</strong> {transporte.conductor} · {transporte.camionPatente}</p>
            <p className="text-xs text-gray-500 mb-4">Verificá que todos los datos sean correctos antes de confirmar.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmando(false)} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={confirmar} className="flex-1 bg-orange-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-orange-700">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
