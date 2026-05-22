import { useState } from 'react';
import { useFormularios } from '../context/FormulariosContext';
import { CheckCircle2, Circle, FileText, Settings } from 'lucide-react';
import { FormularioBuilder } from './FormularioBuilder';

export function FormulariosPanel() {
  const { formularios, activarFormulario, desactivarFormulario, actualizarCampos, obtenerCampos } = useFormularios();
  const [formularioEditando, setFormularioEditando] = useState<string | null>(null);

  // Si estamos editando un formulario, mostrar el builder
  if (formularioEditando) {
    const formulario = formularios.find((f) => f.id === formularioEditando);
    if (!formulario) return null;
    return (
      <FormularioBuilder
        formulario={formulario}
        onGuardar={(campos) => {
          actualizarCampos(formulario.id, campos);
          setFormularioEditando(null);
        }}
        onCancelar={() => setFormularioEditando(null)}
      />
    );
  }

  const formatearFecha = (fecha: string): string => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-gradient-to-br from-green-600 to-emerald-600 p-3 rounded-xl">
          <FileText size={32} className="text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Gestión de Formularios</h2>
          <p className="text-sm text-gray-600">Administra los formularios públicos para cada programa</p>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          <strong>ℹ️ Nota:</strong> Los formularios activos estarán disponibles en la landing pública.
          Cuando los ciudadanos completen un formulario, se creará un ticket automáticamente en el sistema.
        </p>
      </div>

      {/* Formularios */}
      <div className="grid gap-4">
        {formularios.map((formulario) => {
          const cantidadCampos = obtenerCampos(formulario.id).length;
          return (
            <div
              key={formulario.id}
              className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                {/* Información del formulario */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{formulario.programa}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        formulario.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {formulario.activo ? '✓ Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">{formulario.descripcion}</p>

                  <div className="text-xs text-gray-500 space-y-1 mb-2">
                    <p>Creado: {formatearFecha(formulario.creadoEn)}</p>
                    <p>Actualizado: {formatearFecha(formulario.actualizadoEn)}</p>
                  </div>

                  <p className="text-xs text-slate-600 mt-2">
                    {cantidadCampos === 0
                      ? '📋 Sin campos configurados'
                      : `📋 ${cantidadCampos} campo(s) configurado(s)`}
                  </p>
                </div>

              {/* Botones de acción */}
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => setFormularioEditando(formulario.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition duration-200"
                  title="Editar campos del formulario"
                >
                  <Settings size={18} />
                  Editar campos
                </button>
                <button
                  onClick={() => {
                    if (formulario.activo) {
                      desactivarFormulario(formulario.id);
                    } else {
                      activarFormulario(formulario.id);
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition duration-200 ${
                    formulario.activo
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {formulario.activo ? (
                    <>
                      <CheckCircle2 size={18} />
                      Desactivar
                    </>
                  ) : (
                    <>
                      <Circle size={18} />
                      Activar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Resumen */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong>Resumen:</strong> {formularios.filter((f) => f.activo).length} de{' '}
          {formularios.length} formularios activos
        </p>
      </div>
    </div>
  );
}
