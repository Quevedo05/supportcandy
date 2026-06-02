import { useState } from 'react';
import { useFormularios } from '../context/FormulariosContext';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { FormularioBuilder } from './FormularioBuilder';

export function FormulariosPanel() {
  const { formularios, actualizarCampos, actualizarInfo, crearFormulario, eliminarFormulario } = useFormularios();
  const [formularioEditando, setFormularioEditando] = useState<string | null>(null);

  if (formularioEditando) {
    const formulario = formularios.find((f) => f.id === formularioEditando);
    if (!formulario) return null;
    return (
      <FormularioBuilder
        formulario={formulario}
        onGuardar={(campos, info) => {
          actualizarCampos(formulario.id, campos);
          actualizarInfo(formulario.id, info);
          setFormularioEditando(null);
        }}
        onCancelar={() => setFormularioEditando(null)}
      />
    );
  }

  const handleNuevo = () => {
    const id = crearFormulario();
    setFormularioEditando(id);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText size={24} className="text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-800">Formularios</h2>
        </div>
        <button
          onClick={handleNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-[#2196F3] hover:bg-[#1976D2] text-white text-sm font-medium rounded transition-colors"
        >
          <Plus size={15} /> Nuevo Formulario
        </button>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded overflow-hidden bg-white">
        <div className="bg-gray-100 border-b border-gray-200 px-5 py-2.5">
          <span className="text-sm font-medium text-gray-700">Lista de Formularios</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left text-xs font-semibold text-gray-600 px-5 py-3">Nombre</th>
              <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3">Programa</th>
              <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3">Campos</th>
              <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3">Estado</th>
              <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3">P. Físicas</th>
              <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3">P. Jurídicas</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {formularios.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">
                  No hay formularios. Creá uno con "Nuevo Formulario".
                </td>
              </tr>
            ) : (
              formularios.map((f) => (
                <tr
                  key={f.id}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setFormularioEditando(f.id)}
                >
                  <td className="px-5 py-3 font-medium text-gray-800">{f.nombre || f.programa || '(sin nombre)'}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{f.programa || '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{f.campos?.length ?? 0}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${f.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {f.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input type="checkbox" checked={f.personasFisicas ?? false} readOnly className="w-4 h-4 accent-blue-600 cursor-default" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input type="checkbox" checked={f.personasJuridicas ?? false} readOnly className="w-4 h-4 accent-blue-600 cursor-default" />
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        if (window.confirm('¿Eliminar este formulario?')) eliminarFormulario(f.id);
                      }}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
