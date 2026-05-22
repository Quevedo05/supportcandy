import { useState } from 'react';
import { useSavean } from '../context/SaveanContext';
import { useAuth } from '../../../context/AuthContext';
import { ChevronLeft, CheckCircle2, AlertCircle, Printer } from 'lucide-react';

interface SaveanDetalleProps {
  declaracionId: string;
  onVolver: () => void;
}

export function SaveanDetalle({ declaracionId, onVolver }: SaveanDetalleProps) {
  const { obtenerDeclaracion, validarDeclaracion, observarDeclaracion } = useSavean();
  const { usuario } = useAuth();
  const [observaciones, setObservaciones] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);

  const declaracion = obtenerDeclaracion(declaracionId);

  if (!declaracion) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Declaración no encontrada</p>
        <button
          onClick={onVolver}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Volver
        </button>
      </div>
    );
  }

  const handleValidar = () => {
    validarDeclaracion(declaracionId, usuario?.nombre || 'Inspector');
  };

  const handleObservar = () => {
    if (observaciones.trim()) {
      observarDeclaracion(declaracionId, observaciones);
      setObservaciones('');
      setMostrarModal(false);
    }
  };

  const handleImprimirPDF = () => {
    // En una implementación real, aquí se generaría un PDF
    // Por ahora, abrimos la ventana de impresión del navegador
    window.print();
  };

  const formatearFecha = (fecha: string): string => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onVolver}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          type="button"
        >
          <ChevronLeft size={18} />
          Volver
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{declaracion.numero}</h2>
          <p className="text-sm text-gray-600">Detalles de la declaración fitosanitaria</p>
        </div>
        <span
          className={`px-4 py-2 rounded-full text-sm font-medium ${obtenerBadgeEstado(
            declaracion.estado
          )}`}
        >
          {obtenerLabelEstado(declaracion.estado)}
        </span>
      </div>

      {/* Info banner según estado */}
      {declaracion.estado === 'pendiente' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-700">
            <strong>⚠️ Esta declaración está pendiente.</strong> Revisa los datos y valida o registra observaciones.
          </p>
        </div>
      )}

      {declaracion.estado === 'validada' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700">
            <strong>✓ Validada por:</strong> {declaracion.inspectorNombre} en{' '}
            {declaracion.fechaValidacion ? formatearFecha(declaracion.fechaValidacion) : 'fecha no disponible'}
          </p>
        </div>
      )}

      {declaracion.estado === 'observada' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">
            <strong>⚠️ Observaciones:</strong> {declaracion.observaciones}
          </p>
          <p className="text-xs text-red-600 mt-2">
            Registrado el {declaracion.fechaValidacion ? formatearFecha(declaracion.fechaValidacion) : 'fecha no disponible'}
          </p>
        </div>
      )}

      {/* Secciones de datos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Datos del conductor */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos del Conductor</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500">Nombre</p>
              <p className="text-sm font-medium text-gray-900">{declaracion.conductorNombre}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">DNI</p>
              <p className="text-sm font-medium text-gray-900">{declaracion.conductorDni}</p>
            </div>
            {declaracion.conductorCuil && (
              <div>
                <p className="text-xs text-gray-500">CUIL</p>
                <p className="text-sm font-medium text-gray-900">{declaracion.conductorCuil}</p>
              </div>
            )}
          </div>
        </div>

        {/* Datos del vehículo */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos del Vehículo</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500">Patente Vehículo</p>
              <p className="text-sm font-medium text-gray-900">{declaracion.patenteVehiculo}</p>
            </div>
            {declaracion.patenteAcoplado && (
              <div>
                <p className="text-xs text-gray-500">Patente Acoplado</p>
                <p className="text-sm font-medium text-gray-900">{declaracion.patenteAcoplado}</p>
              </div>
            )}
            {declaracion.empresaTransporte && (
              <div>
                <p className="text-xs text-gray-500">Empresa de Transporte</p>
                <p className="text-sm font-medium text-gray-900">{declaracion.empresaTransporte}</p>
              </div>
            )}
          </div>
        </div>

        {/* Datos del cargamento */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos del Cargamento</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500">Especie</p>
              <p className="text-sm font-medium text-gray-900">{declaracion.especie}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Variedad</p>
              <p className="text-sm font-medium text-gray-900">{declaracion.variedad}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Cantidad (kg)</p>
              <p className="text-sm font-medium text-gray-900">{declaracion.cantidadKg}</p>
            </div>
            {declaracion.cantidadBultos && (
              <div>
                <p className="text-xs text-gray-500">Cantidad de Bultos</p>
                <p className="text-sm font-medium text-gray-900">{declaracion.cantidadBultos}</p>
              </div>
            )}
            {declaracion.tipoEnvase && (
              <div>
                <p className="text-xs text-gray-500">Tipo de Envase</p>
                <p className="text-sm font-medium text-gray-900">{declaracion.tipoEnvase}</p>
              </div>
            )}
          </div>
        </div>

        {/* Datos de ruta y barrera */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ruta y Barrera</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500">Localidad de Origen</p>
              <p className="text-sm font-medium text-gray-900">{declaracion.localidadOrigen}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Localidad de Destino</p>
              <p className="text-sm font-medium text-gray-900">{declaracion.localidadDestino}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Provincia de Destino</p>
              <p className="text-sm font-medium text-gray-900">{declaracion.provinciaDestino}</p>
            </div>
            {declaracion.barrierFitosanitaria && (
              <div>
                <p className="text-xs text-gray-500">Barrera Fitosanitaria</p>
                <p className="text-sm font-medium text-gray-900">{declaracion.barrierFitosanitaria}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Acciones */}
      {declaracion.estado === 'pendiente' && (
        <div className="flex gap-3">
          <button
            onClick={handleValidar}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
            type="button"
          >
            <CheckCircle2 size={18} />
            Validar Declaración
          </button>
          <button
            onClick={() => setMostrarModal(true)}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition"
            type="button"
          >
            <AlertCircle size={18} />
            Registrar Observación
          </button>
          <button
            onClick={handleImprimirPDF}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
            type="button"
          >
            <Printer size={18} />
            Imprimir
          </button>
        </div>
      )}

      {declaracion.estado === 'validada' && (
        <div className="flex gap-3">
          <button
            onClick={handleImprimirPDF}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
            type="button"
          >
            <Printer size={18} />
            Imprimir Comprobante
          </button>
        </div>
      )}

      {/* Modal de observación */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Registrar Observación</h3>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Describe los motivos de la observación..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setMostrarModal(false);
                  setObservaciones('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
                type="button"
              >
                Cancelar
              </button>
              <button
                onClick={handleObservar}
                disabled={!observaciones.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
