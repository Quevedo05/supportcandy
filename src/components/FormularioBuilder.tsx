import { useState } from 'react';
import { ChevronLeft, Trash2, X, Search } from 'lucide-react';
import { CampoFormulario, Formulario, TipoCampo, InfoFormulario } from '../types/formularios';

interface FormularioBuilderProps {
  formulario: Formulario;
  onGuardar: (campos: CampoFormulario[], info: InfoFormulario) => void;
  onCancelar: () => void;
}

const TIPO_LABELS: Record<TipoCampo, string> = {
  texto: 'Texto',
  textarea: 'Texto Largo',
  numero: 'Número',
  fecha: 'Fecha',
  selector: 'Lista (Selector)',
  archivo: 'Archivo',
};


function slugificar(label: string): string {
  return 'cf_' + label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 40);
}

function generarId(): string {
  return `campo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Modal Nuevo/Editar Campo ─────────────────────────────────────────────────
interface ModalCampoProps {
  campo: CampoFormulario | null;
  onGuardar: (c: CampoFormulario) => void;
  onCancelar: () => void;
}

function ModalCampo({ campo, onGuardar, onCancelar }: ModalCampoProps) {
  const esNuevo = !campo;
  const [form, setForm] = useState<CampoFormulario>(
    campo ?? {
      id: generarId(),
      label: '',
      campo: '',
      tipo: '' as TipoCampo,
      requerido: false,
      orden: 0,
      opciones: [],
      descripcion: '',
      longitudMaxima: undefined,
    }
  );
  const [err, setErr] = useState('');

  const set = (partial: Partial<CampoFormulario>) =>
    setForm((prev) => ({ ...prev, ...partial }));

  const handleNombreChange = (nombre: string) => {
    set({ label: nombre, campo: esNuevo ? slugificar(nombre) : form.campo });
  };

  const handleContinuar = () => {
    if (!form.label.trim()) { setErr('El nombre es obligatorio.'); return; }
    if (!form.tipo) { setErr('Seleccioná un tipo.'); return; }
    if (form.tipo === 'selector' && (!form.opciones || form.opciones.length === 0)) {
      setErr('Un selector necesita al menos una opción.'); return;
    }
    onGuardar(form);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-800">Información del Campo</h3>
          <button onClick={onCancelar} className="text-gray-500 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Nombre */}
          <div className="flex items-center gap-4">
            <label className="w-28 text-sm text-[#8B0000] font-medium flex-shrink-0">Nombre</label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => handleNombreChange(e.target.value)}
              className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* Descripción */}
          <div className="flex items-start gap-4">
            <label className="w-28 text-sm text-[#8B0000] font-medium flex-shrink-0 pt-1">Descripción</label>
            <textarea
              value={form.descripcion ?? ''}
              onChange={(e) => set({ descripcion: e.target.value })}
              rows={3}
              className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm resize-y focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* Campo (slug) */}
          <div className="flex items-start gap-4">
            <label className="w-28 text-sm text-[#8B0000] font-medium flex-shrink-0 pt-1">Campo</label>
            <div className="flex-1">
              <div className="flex items-center border border-gray-300 rounded overflow-hidden">
                <div className="px-2 py-1.5 bg-gray-100 border-r border-gray-300">
                  <Search size={14} className="text-gray-500" />
                </div>
                <input
                  type="text"
                  value={form.campo}
                  onChange={(e) => set({ campo: e.target.value })}
                  className="flex-1 px-3 py-1.5 text-sm focus:outline-none"
                />
              </div>
              <p className="text-xs text-blue-500 mt-1">Campo personalizado (Contribuyentes)</p>
            </div>
          </div>

          {/* Tipo */}
          <div className="flex items-center gap-4">
            <label className="w-28 text-sm text-[#8B0000] font-medium flex-shrink-0">Tipo</label>
            <select
              value={form.tipo}
              onChange={(e) => set({ tipo: e.target.value as TipoCampo })}
              className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
            >
              <option value="">Seleccione un Tipo</option>
              {(Object.entries(TIPO_LABELS) as [TipoCampo, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Long. Máxima — solo texto */}
          {(form.tipo === 'texto' || form.tipo === 'textarea') && (
            <div className="flex items-center gap-4">
              <label className="w-28 text-sm text-[#8B0000] font-medium flex-shrink-0">Long. Máxima</label>
              <input
                type="number"
                min={1}
                value={form.longitudMaxima ?? ''}
                onChange={(e) => set({ longitudMaxima: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Sin límite"
                className="w-32 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
          )}

          {/* Opciones — selector */}
          {form.tipo === 'selector' && (
            <OpcionesEditor
              opciones={form.opciones ?? []}
              onUpdate={(opciones) => set({ opciones })}
            />
          )}

          {/* Campo Requerido */}
          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              id="req-modal"
              checked={form.requerido}
              onChange={(e) => set({ requerido: e.target.checked })}
              className="w-4 h-4 accent-blue-600"
            />
            <label htmlFor="req-modal" className="text-sm text-gray-700">Campo Requerido</label>
          </div>

          {err && <p className="text-xs text-red-600">{err}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleContinuar}
            className="px-5 py-2 bg-[#2196F3] hover:bg-[#1976D2] text-white text-sm font-medium rounded transition-colors"
          >
            Continuar
          </button>
          <button
            onClick={onCancelar}
            className="px-5 py-2 bg-[#F44336] hover:bg-[#D32F2F] text-white text-sm font-medium rounded transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Editor opciones para selector ───────────────────────────────────────────
function OpcionesEditor({ opciones, onUpdate }: { opciones: string[]; onUpdate: (o: string[]) => void }) {
  const [nueva, setNueva] = useState('');
  return (
    <div className="flex items-start gap-4">
      <label className="w-28 text-sm text-[#8B0000] font-medium flex-shrink-0 pt-1">Opciones</label>
      <div className="flex-1 space-y-2">
        {opciones.map((op, i) => (
          <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-3 py-1.5">
            <span className="flex-1 text-sm text-gray-700">{op}</span>
            <button onClick={() => onUpdate(opciones.filter((_, j) => j !== i))} type="button">
              <X size={13} className="text-red-500" />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            type="text"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && nueva.trim()) { onUpdate([...opciones, nueva.trim()]); setNueva(''); e.preventDefault(); } }}
            placeholder="Nueva opción..."
            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
          />
          <button
            type="button"
            onClick={() => { if (nueva.trim()) { onUpdate([...opciones, nueva.trim()]); setNueva(''); } }}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sección con header gris ──────────────────────────────────────────────────
function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded overflow-hidden">
      <div className="bg-gray-100 border-b border-gray-200 px-5 py-2.5">
        <span className="text-sm font-medium text-gray-700">{titulo}</span>
      </div>
      <div className="bg-white px-5 py-5">{children}</div>
    </div>
  );
}

// ─── Fila formulario (label izquierda + input derecha) ────────────────────────
function FormRow({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-5 py-2.5 border-b border-gray-100 last:border-0">
      <div className="w-36 flex-shrink-0 text-sm text-gray-700 pt-1.5">{label}</div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function FormularioBuilder({ formulario, onGuardar, onCancelar }: FormularioBuilderProps) {
  const [info, setInfo] = useState<InfoFormulario>({
    nombre: formulario.nombre ?? '',
    programa: formulario.programa ?? '',
    personasFisicas: formulario.personasFisicas ?? true,
    personasJuridicas: formulario.personasJuridicas ?? false,
    activo: formulario.activo,
  });
  const [campos, setCampos] = useState<CampoFormulario[]>(
    [...(formulario.campos ?? [])].sort((a, b) => a.orden - b.orden)
  );
  const [modalCampo, setModalCampo] = useState<CampoFormulario | null | 'nuevo'>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const setInfoField = (partial: Partial<InfoFormulario>) =>
    setInfo((prev) => ({ ...prev, ...partial }));

  const abrirNuevo = () => setModalCampo('nuevo');

  const abrirEditar = (c: CampoFormulario) => {
    setEditandoId(c.id);
    setModalCampo(c);
  };

  const cerrarModal = () => {
    setModalCampo(null);
    setEditandoId(null);
  };

  const guardarCampo = (c: CampoFormulario) => {
    if (editandoId) {
      setCampos((prev) => prev.map((x) => x.id === editandoId ? { ...c, id: editandoId, orden: x.orden } : x));
    } else {
      setCampos((prev) => [...prev, { ...c, orden: prev.length + 1 }]);
    }
    cerrarModal();
  };

  const eliminarCampo = (id: string) =>
    setCampos((prev) => prev.filter((c) => c.id !== id).map((c, i) => ({ ...c, orden: i + 1 })));

  const mover = (id: string, dir: -1 | 1) => {
    const idx = campos.findIndex((c) => c.id === id);
    const next = idx + dir;
    if (next < 0 || next >= campos.length) return;
    const arr = [...campos];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    setCampos(arr.map((c, i) => ({ ...c, orden: i + 1 })));
  };

  const handleGuardar = () => onGuardar(campos, info);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={onCancelar}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800"
          type="button"
        >
          <ChevronLeft size={16} /> Volver a formularios
        </button>
        <button
          onClick={handleGuardar}
          className="px-5 py-2 bg-[#2196F3] hover:bg-[#1976D2] text-white text-sm font-medium rounded transition-colors"
          type="button"
        >
          Guardar formulario
        </button>
      </div>

      {/* Sección 1: Información */}
      <Seccion titulo="Información del Formulario">
        <FormRow label="Programa">
          <input
            type="text"
            value={info.programa}
            onChange={(e) => setInfoField({ programa: e.target.value.toUpperCase() })}
            placeholder="Ej: COSECHA Y ACARREO 2026"
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400 uppercase"
          />
        </FormRow>

        <FormRow label="Nombre">
          <input
            type="text"
            value={info.nombre}
            onChange={(e) => setInfoField({ nombre: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
          />
        </FormRow>

        <FormRow>
          <div className="space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={info.personasFisicas}
                onChange={(e) => setInfoField({ personasFisicas: e.target.checked })}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm text-gray-700">Formulario para Personas Físicas</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={info.personasJuridicas}
                onChange={(e) => setInfoField({ personasJuridicas: e.target.checked })}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm text-gray-700">Formulario para Personas Jurídicas</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!info.activo}
                onChange={(e) => setInfoField({ activo: !e.target.checked })}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm text-gray-700">Inactivo</span>
            </label>
          </div>
        </FormRow>
      </Seccion>

      {/* Sección 2: Campos */}
      <Seccion titulo="Campos del Formulario">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {['Orden', 'Nombre', 'Campo', 'Tipo', 'Long. Máxima', 'Requerido', ''].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-600 pb-2 pr-4 last:pr-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-sm text-gray-400">
                    Sin campos. Hacé clic en "Nuevo Campo" para agregar.
                  </td>
                </tr>
              ) : (
                campos.map((c, idx) => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => abrirEditar(c)}>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => mover(c.id, -1)} disabled={idx === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">▲</button>
                        <span className="w-5 text-center text-gray-600">{c.orden}</span>
                        <button onClick={() => mover(c.id, 1)} disabled={idx === campos.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">▼</button>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-gray-800">{c.label}</td>
                    <td className="py-2.5 pr-4 text-gray-500 font-mono text-xs">{c.campo}</td>
                    <td className="py-2.5 pr-4 text-gray-600">{TIPO_LABELS[c.tipo] ?? c.tipo}</td>
                    <td className="py-2.5 pr-4 text-gray-500 text-center">{c.longitudMaxima ?? '—'}</td>
                    <td className="py-2.5 pr-4">
                      <input type="checkbox" checked={c.requerido} readOnly className="w-4 h-4 accent-blue-600 cursor-default" />
                    </td>
                    <td className="py-2.5" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => eliminarCampo(c.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <button
            onClick={abrirNuevo}
            type="button"
            className="px-4 py-2 bg-[#2196F3] hover:bg-[#1976D2] text-white text-sm font-medium rounded transition-colors"
          >
            Nuevo Campo
          </button>
        </div>
      </Seccion>

      {/* Modal */}
      {modalCampo !== null && (
        <ModalCampo
          campo={modalCampo === 'nuevo' ? null : modalCampo}
          onGuardar={guardarCampo}
          onCancelar={cerrarModal}
        />
      )}
    </div>
  );
}
