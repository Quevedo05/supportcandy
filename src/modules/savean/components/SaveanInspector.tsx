import { useState } from 'react';
import { useSavean } from '../context/SaveanContext';
import { CheckCircle2, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import { SaveanDetalle } from './SaveanDetalle';

type EstadoFiltro = 'todos' | 'pendiente' | 'validada' | 'observada';

export function SaveanInspector() {
  const { declaraciones } = useSavean();
  const [filtro, setFiltro] = useState<EstadoFiltro>('todos');
  const [declaracionSeleccionada, setDeclaracionSeleccionada] = useState<string | null>(null);

  // Si hay una declaración seleccionada, mostrar el detalle
  if (declaracionSeleccionada) {
    return (
      <SaveanDetalle
        declaracionId={declaracionSeleccionada}
        onVolver={() => setDeclaracionSeleccionada(null)}
      />
    );
  }

  // Filtrar declaraciones
  const declaracionesFiltradas =
    filtro === 'todos'
      ? declaraciones
      : declaraciones.filter((d) => d.estado === filtro);

  const obtenerBadgeEstado = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'validada':
        return 'bg-green-100 text-green-800';
      case 'observada':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const obtenerIconoEstado = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Clock size={16} />;
      case 'validada':
        return <CheckCircle2 size={16} />;
      case 'observada':
        return <AlertCircle size={16} />;
      default:
        return null;
    }
  };

  const obtenerLabelEstado = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'validada':
        return 'Validada';
      case 'observada':
        return 'Observada';
      default:
        return estado;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-3 rounded-xl">
          <CheckCircle2 size={32} className="text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Declaraciones Fitosanitarias</h2>
          <p className="text-sm text-gray-600">Revisa y valida las declaraciones de los camioneros</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFiltro('todos')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filtro === 'todos'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todas ({declaraciones.length})
        </button>
        <button
          onClick={() => setFiltro('pendiente')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filtro === 'pendiente'
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Pendientes ({declaraciones.filter((d) => d.estado === 'pendiente').length})
        </button>
        <button
          onClick={() => setFiltro('validada')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filtro === 'validada'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Validadas ({declaraciones.filter((d) => d.estado === 'validada').length})
        </button>
        <button
          onClick={() => setFiltro('observada')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filtro === 'observada'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Observadas ({declaraciones.filter((d) => d.estado === 'observada').length})
        </button>
      </div>

      {/* Lista de declaraciones */}
      <div className="space-y-3">
        {declaracionesFiltradas.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <Clock size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium">No hay declaraciones en este estado</p>
            <p className="text-gray-500 text-sm">Los camioneros enviarán sus declaraciones desde la landing</p>
          </div>
        ) : (
          declaracionesFiltradas.map((declaracion) => (
            <div
              key={declaracion.id}
              onClick={() => setDeclaracionSeleccionada(declaracion.id)}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{declaracion.numero}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${obtenerBadgeEstado(
                        declaracion.estado
                      )}`}
                    >
                      {obtenerIconoEstado(declaracion.estado)}
                      {obtenerLabelEstado(declaracion.estado)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-500">Conductor</p>
                      <p className="text-sm font-medium text-gray-900">{declaracion.conductorNombre}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Especie</p>
                      <p className="text-sm font-medium text-gray-900">
                        {declaracion.especie} - {declaracion.variedad}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Vehículo</p>
                      <p className="text-sm font-medium text-gray-900">{declaracion.patenteVehiculo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Cantidad</p>
                      <p className="text-sm font-medium text-gray-900">{declaracion.cantidadKg} kg</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Origen → Destino</p>
                      <p className="text-sm font-medium text-gray-900">
                        {declaracion.localidadOrigen} → {declaracion.localidadDestino}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Creado</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(declaracion.fechaCreacion).toLocaleDateString('es-AR', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {declaracion.observaciones && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-2">
                      <p className="text-xs text-yellow-700">
                        <strong>Observación:</strong> {declaracion.observaciones}
                      </p>
                    </div>
                  )}
                </div>

                <ChevronRight size={20} className="text-gray-400 flex-shrink-0 ml-4 mt-1" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resumen */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong>Resumen:</strong> {declaraciones.filter((d) => d.estado === 'pendiente').length} pendientes,{' '}
          {declaraciones.filter((d) => d.estado === 'validada').length} validadas,{' '}
          {declaraciones.filter((d) => d.estado === 'observada').length} observadas
        </p>
      </div>
    </div>
  );
}
