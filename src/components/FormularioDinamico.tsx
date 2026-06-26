import { useState } from 'react';
import { CampoFormulario, ErroresCampos, ValoresCampos } from '../types/formularios';

const EXPLICACION_CHEQUE = `Documentación a adjuntar para la evaluación crediticia del garante:

• En caso de presentar cheque de pago diferido físico, deberá adjuntarse una fotografía clara del cheque en blanco, donde se visualicen correctamente sus datos identificatorios.

• En caso de presentar cheque electrónico (Echeq), deberá adjuntarse una captura de pantalla de la simulación del cheque, en la que consten de manera visible la razón social o nombre y apellido del librador y su CUIT.

La documentación requerida será utilizada exclusivamente para verificar la situación crediticia de la persona física o jurídica que postula como garante del crédito.

En caso de aprobarse el crédito, el cheque de pago diferido presentado como garantía deberá ser completado y entregado en la Agencia Calidad San Juan al momento de la firma del convenio correspondiente.`;

interface FormularioDinamicoProps {
  campos: CampoFormulario[];
  valores: ValoresCampos;
  errores?: ErroresCampos;
  onChange: (campoId: string, valor: string) => void;
  modo?: 'staff' | 'publico';
  disabled?: boolean;
}

export function FormularioDinamico({
  campos,
  valores,
  errores,
  onChange,
  modo = 'staff',
  disabled = false,
}: FormularioDinamicoProps) {
  const [tooltipChequeVisible, setTooltipChequeVisible] = useState(false);

  const renderInput = (campo: CampoFormulario) => {
    const base = 'w-full px-3 py-2 border rounded-md text-sm';
    const errorClass = errores?.[campo.id]
      ? 'border-red-400 bg-red-50'
      : 'border-slate-300';
    const cls = `${base} ${errorClass}`;
    const val = valores[campo.id] ?? '';

    switch (campo.tipo) {
      case 'texto':
        return (
          <input
            type="text"
            value={val}
            placeholder={campo.placeholder}
            onChange={(e) => onChange(campo.id, e.target.value)}
            className={cls}
            disabled={disabled}
          />
        );
      case 'textarea':
        return (
          <textarea
            value={val}
            rows={3}
            placeholder={campo.placeholder}
            onChange={(e) => onChange(campo.id, e.target.value)}
            className={cls}
            disabled={disabled}
          />
        );
      case 'numero':
        return (
          <input
            type="number"
            value={val}
            placeholder={campo.placeholder}
            onChange={(e) => onChange(campo.id, e.target.value)}
            className={cls}
            disabled={disabled}
          />
        );
      case 'fecha':
        return (
          <input
            type="date"
            value={val}
            onChange={(e) => onChange(campo.id, e.target.value)}
            className={cls}
            disabled={disabled}
          />
        );
      case 'selector':
        return (
          <select
            value={val}
            onChange={(e) => onChange(campo.id, e.target.value)}
            className={cls}
            disabled={disabled}
          >
            <option value="">Seleccionar...</option>
            {(campo.opciones ?? []).map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
        );
      case 'archivo':
        return (
          <input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => onChange(campo.id, ev.target?.result as string ?? '');
              reader.readAsDataURL(file);
            }}
            className={`${cls} py-1.5 file:mr-3 file:px-3 file:py-1 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100`}
            disabled={disabled}
          />
        );
    }
  };

  const spacingClass = modo === 'publico' ? 'space-y-6' : 'space-y-4';

  const camposOrdenados = [...campos].sort((a, b) => a.orden - b.orden);

  const esCampoVisible = (campo: CampoFormulario): boolean => {
    if (!campo.condicion) return true;
    const campoControlador = camposOrdenados.find((c) => c.campo === campo.condicion!.campo);
    if (!campoControlador) return false;
    const valorActual = valores[campoControlador.id] ?? '';
    return campo.condicion.valor.includes(valorActual);
  };

  return (
    <>
      {tooltipChequeVisible && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setTooltipChequeVisible(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-slate-900 mb-3 text-base">
              Garantía - Copia del Cheque
            </h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {EXPLICACION_CHEQUE}
            </p>
            <button
              type="button"
              onClick={() => setTooltipChequeVisible(false)}
              className="mt-5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      <div className={spacingClass}>
        {camposOrdenados.map((campo) => {
          if (!esCampoVisible(campo)) return null;
          return (
            <div key={campo.id}>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {campo.label}
                {campo.requerido && <span className="text-red-500 ml-1">*</span>}
                {campo.campo === 'cf_garantia_cheque' && (
                  <button
                    type="button"
                    onClick={() => setTooltipChequeVisible(true)}
                    className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    ❔ ¿Por qué pedimos esto?
                  </button>
                )}
              </label>
              {renderInput(campo)}
              {errores?.[campo.id] && (
                <p className="text-xs text-red-600 mt-1">{errores[campo.id]}</p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
