import { CampoFormulario, ErroresCampos, ValoresCampos } from '../types/formularios';

export function validarRespuestasCampos(
  campos: CampoFormulario[],
  valores: ValoresCampos
): ErroresCampos {
  const errores: ErroresCampos = {};

  for (const campo of campos) {
    const valor = valores[campo.id]?.trim() ?? '';

    // Validar requeridos
    if (campo.requerido && !valor) {
      errores[campo.id] = `"${campo.label}" es obligatorio`;
      continue;
    }

    // Validar tipo número si hay valor
    if (valor && campo.tipo === 'numero' && isNaN(Number(valor))) {
      errores[campo.id] = `"${campo.label}" debe ser un número`;
    }
  }

  return errores;
}
