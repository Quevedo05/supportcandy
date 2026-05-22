import { useState } from 'react';
import {
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Plus,
  X,
  Trash2,
  Settings,
  FileText,
  GripVertical,
} from 'lucide-react';
import { CampoFormulario, Formulario, TipoCampo } from '../types/formularios';

interface FormularioBuilderProps {
  formulario: Formulario;
  onGuardar: (campos: CampoFormulario[]) => void;
  onCancelar: () => void;
}

// Helpers
function generarIdCampo(): string {
  return `campo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizarOrdenes(campos: CampoFormulario[]): CampoFormulario[] {
  return campos.map((c, i) => ({ ...c, orden: i + 1 }));
}

function validarCampos(campos: CampoFormulario[]): Record<string, string> {
  const errores: Record<string, string> = {};
  campos.forEach((c) => {
    if (!c.label.trim()) {
      errores[c.id] = 'El campo necesita una etiqueta';
    }
    if (c.tipo === 'selector' && (!c.opciones || c.opciones.length === 0)) {
      errores[c.id] = 'Un selector necesita al menos una opción';
    }
  });
  return errores;
}

// Sub-component: Editor de opciones para selectores
interface OpcionesEditorProps {
  opciones: string[];
  onUpdate: (opciones: string[]) => void;
}

function OpcionesEditor({ opciones, onUpdate }: OpcionesEditorProps) {
  const [nuevaOpcion, setNuevaOpcion] = useState('');

  const agregarOpcion = () => {
    if (nuevaOpcion.trim()) {
      onUpdate([...opciones, nuevaOpcion.trim()]);
      setNuevaOpcion('');
    }
  };

  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-2 block">
        Opciones del selector
      </label>
      <ul className="space-y-1 mb-3">
        {opciones.map((op, i) => (
          <li key={i} className="flex items-center gap-2 bg-white border border-gray-200 rounded px-3 py-2">
            <span className="flex-1 text-sm text-gray-700">{op}</span>
            <button
              onClick={() => onUpdate(opciones.filter((_, j) => j !== i))}
              className="p-1 hover:bg-red-50 rounded transition"
              type="button"
            >
              <X size={14} className="text-red-600" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          type="text"
          value={nuevaOpcion}
          onChange={(e) => setNuevaOpcion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              agregarOpcion();
              e.preventDefault();
            }
          }}
          placeholder="Nueva opción..."
          className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm"
        />
        <button
          onClick={agregarOpcion}
          className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition flex items-center gap-1"
          type="button"
        >
          <Plus size={14} /> Agregar
        </button>
      </div>
    </div>
  );
}

// Sub-component: Fila de editor de campo
interface CampoEditorRowProps {
  campo: CampoFormulario;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (partial: Partial<CampoFormulario>) => void;
  onEliminar: () => void;
  onMoverArriba: () => void;
  onMoverAbajo: () => void;
  error?: string;
  esElPrimero: boolean;
  esElUltimo: boolean;
}

function CampoEditorRow({
  campo,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onEliminar,
  onMoverArriba,
  onMoverAbajo,
  error,
  esElPrimero,
  esElUltimo,
}: CampoEditorRowProps) {
  const tipoLabels: Record<TipoCampo, string> = {
    texto: 'Texto corto',
    textarea: 'Texto largo',
    numero: 'Número',
    fecha: 'Fecha',
    selector: 'Selector',
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3 hover:shadow-sm transition">
        <GripVertical size={18} className="text-gray-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium text-gray-900">{campo.label || 'Sin etiqueta'}</p>
          <p className="text-xs text-gray-500">{tipoLabels[campo.tipo]}</p>
        </div>
        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
          {tipoLabels[campo.tipo]}
        </span>
        {campo.requerido && (
          <span className="text-xs text-red-600 font-semibold">Requerido</span>
        )}
        <div className="flex gap-1 ml-2">
          <button
            onClick={onMoverArriba}
            disabled={esElPrimero}
            className="p-2 hover:bg-gray-100 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Mover arriba"
            type="button"
          >
            <ChevronUp size={16} className="text-gray-600" />
          </button>
          <button
            onClick={onMoverAbajo}
            disabled={esElUltimo}
            className="p-2 hover:bg-gray-100 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Mover abajo"
            type="button"
          >
            <ChevronDown size={16} className="text-gray-600" />
          </button>
          <button
            onClick={onToggleExpand}
            className="p-2 hover:bg-blue-50 rounded transition"
            title="Editar"
            type="button"
          >
            <ChevronDown
              size={16}
              className={`text-blue-600 transition ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
          <button
            onClick={onEliminar}
            className="p-2 hover:bg-red-50 rounded transition"
            title="Eliminar"
            type="button"
          >
            <Trash2 size={16} className="text-red-600" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="bg-slate-50 border border-gray-200 border-t-0 rounded-b-lg p-4 space-y-4 -mt-2 relative z-10">
          {/* Etiqueta + Tipo + Requerido */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Etiqueta del campo
              </label>
              <input
                type="text"
                value={campo.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Tipo
              </label>
              <select
                value={campo.tipo}
                onChange={(e) => onUpdate({ tipo: e.target.value as TipoCampo })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              >
                <option value="texto">Texto corto</option>
                <option value="textarea">Texto largo</option>
                <option value="numero">Número / DNI</option>
                <option value="fecha">Fecha</option>
                <option value="selector">Selector (lista)</option>
              </select>
            </div>
            <div className="flex items-end gap-2 pb-0">
              <input
                type="checkbox"
                id={`req-${campo.id}`}
                checked={campo.requerido}
                onChange={(e) => onUpdate({ requerido: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor={`req-${campo.id}`} className="text-sm font-medium text-gray-700">
                Requerido
              </label>
            </div>
          </div>

          {/* Placeholder (solo para texto/textarea/numero) */}
          {['texto', 'textarea', 'numero'].includes(campo.tipo) && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Texto de ayuda (placeholder)
              </label>
              <input
                type="text"
                value={campo.placeholder ?? ''}
                onChange={(e) => onUpdate({ placeholder: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
          )}

          {/* Opciones editor (solo para selector) */}
          {campo.tipo === 'selector' && (
            <OpcionesEditor
              opciones={campo.opciones ?? []}
              onUpdate={(opciones) => onUpdate({ opciones })}
            />
          )}

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>
      )}
    </>
  );
}

// Main component: FormularioBuilder
export function FormularioBuilder({
  formulario,
  onGuardar,
  onCancelar,
}: FormularioBuilderProps) {
  const [campos, setCampos] = useState<CampoFormulario[]>(
    [...(formulario.campos ?? [])].sort((a, b) => a.orden - b.orden)
  );
  const [campoExpandido, setCampoExpandido] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const agregarCampo = () => {
    const nuevoCampo: CampoFormulario = {
      id: generarIdCampo(),
      label: '',
      tipo: 'texto',
      requerido: false,
      orden: campos.length + 1,
      opciones: [],
    };
    const nuevosCampos = normalizarOrdenes([...campos, nuevoCampo]);
    setCampos(nuevosCampos);
    setCampoExpandido(nuevoCampo.id);
  };

  const eliminarCampo = (id: string) => {
    const nuevosCampos = normalizarOrdenes(campos.filter((c) => c.id !== id));
    setCampos(nuevosCampos);
    if (campoExpandido === id) setCampoExpandido(null);
  };

  const moverCampoArriba = (id: string) => {
    const idx = campos.findIndex((c) => c.id === id);
    if (idx > 0) {
      const nuevosCampos = [...campos];
      [nuevosCampos[idx], nuevosCampos[idx - 1]] = [
        nuevosCampos[idx - 1],
        nuevosCampos[idx],
      ];
      setCampos(normalizarOrdenes(nuevosCampos));
    }
  };

  const moverCampoAbajo = (id: string) => {
    const idx = campos.findIndex((c) => c.id === id);
    if (idx < campos.length - 1) {
      const nuevosCampos = [...campos];
      [nuevosCampos[idx], nuevosCampos[idx + 1]] = [
        nuevosCampos[idx + 1],
        nuevosCampos[idx],
      ];
      setCampos(normalizarOrdenes(nuevosCampos));
    }
  };

  const actualizarCampo = (id: string, partial: Partial<CampoFormulario>) => {
    const nuevosCampos = campos.map((c) =>
      c.id === id ? { ...c, ...partial } : c
    );
    setCampos(nuevosCampos);
  };

  const handleGuardar = () => {
    const erroresValidacion = validarCampos(campos);
    if (Object.keys(erroresValidacion).length > 0) {
      setErrores(erroresValidacion);
      return;
    }
    onGuardar(campos);
  };

  return (
    <div className="space-y-6">
      {/* Header con botones */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onCancelar}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          type="button"
        >
          <ChevronLeft size={18} />
          Volver
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">
            Editar campos: {formulario.programa}
          </h2>
        </div>
        <button
          onClick={handleGuardar}
          className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
          type="button"
        >
          <Settings size={18} />
          Guardar campos
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          <strong>ℹ️ Vista previa:</strong> El formulario que verá el ciudadano tendrá{' '}
          <strong>{campos.length} campo(s)</strong> en el orden que configures aquí.
        </p>
      </div>

      {/* Lista de campos o empty state */}
      {campos.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 font-medium mb-4">Sin campos configurados</p>
          <p className="text-gray-500 text-sm mb-6">Agrega el primer campo para comenzar</p>
          <button
            onClick={agregarCampo}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            type="button"
          >
            <Plus size={18} /> Agregar primer campo
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {campos.map((campo, idx) => (
            <CampoEditorRow
              key={campo.id}
              campo={campo}
              isExpanded={campoExpandido === campo.id}
              onToggleExpand={() =>
                setCampoExpandido((prev) => (prev === campo.id ? null : campo.id))
              }
              onUpdate={(partial) => actualizarCampo(campo.id, partial)}
              onEliminar={() => eliminarCampo(campo.id)}
              onMoverArriba={() => moverCampoArriba(campo.id)}
              onMoverAbajo={() => moverCampoAbajo(campo.id)}
              error={errores[campo.id]}
              esElPrimero={idx === 0}
              esElUltimo={idx === campos.length - 1}
            />
          ))}
        </div>
      )}

      {/* Botón para agregar campo */}
      <button
        onClick={agregarCampo}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-blue-300 text-blue-700 font-medium rounded-lg hover:bg-blue-50 transition"
        type="button"
      >
        <Plus size={20} /> Agregar campo
      </button>
    </div>
  );
}
