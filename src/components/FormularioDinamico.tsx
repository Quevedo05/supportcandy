import { CampoFormulario, ErroresCampos, ValoresCampos } from '../types/formularios';

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
    }
  };

  const spacingClass = modo === 'publico' ? 'space-y-6' : 'space-y-4';

  return (
    <div className={spacingClass}>
      {[...campos]
        .sort((a, b) => a.orden - b.orden)
        .map((campo) => (
          <div key={campo.id}>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {campo.label}
              {campo.requerido && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderInput(campo)}
            {errores?.[campo.id] && (
              <p className="text-xs text-red-600 mt-1">{errores[campo.id]}</p>
            )}
          </div>
        ))}
    </div>
  );
}
