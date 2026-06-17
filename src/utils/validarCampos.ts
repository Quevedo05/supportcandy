import { CampoFormulario, ErroresCampos, ValoresCampos } from '../types/formularios';

function esCampoVisible(campo: CampoFormulario, campos: CampoFormulario[], valores: ValoresCampos): boolean {
  if (!campo.condicion) return true;
  const controlador = campos.find((c) => c.campo === campo.condicion!.campo);
  if (!controlador) return false;
  return campo.condicion.valor.includes(valores[controlador.id] ?? '');
}

export function validarRespuestasCampos(
  campos: CampoFormulario[],
  valores: ValoresCampos
): ErroresCampos {
  const errores: ErroresCampos = {};

  for (const campo of campos) {
    if (!esCampoVisible(campo, campos, valores)) continue;

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
