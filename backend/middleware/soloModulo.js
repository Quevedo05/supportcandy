function soloModulo(modulo) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado', codigo: 'NO_AUTENTICADO' });
    }
    // El rol dev tiene acceso a todos los módulos
    if (req.usuario.rol === 'dev') return next();
    if (req.usuario.modulo !== modulo) {
      return res.status(403).json({ error: 'Acceso denegado. Módulo incorrecto.', codigo: 'MODULO_INCORRECTO' });
    }
    next();
  };
}

module.exports = { soloModulo };
