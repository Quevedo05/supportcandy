function soloModulo(modulo) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado', codigo: 'NO_AUTENTICADO' });
    }
    if (req.usuario.modulo !== modulo) {
      return res.status(403).json({ error: 'Acceso denegado. Módulo incorrecto.', codigo: 'MODULO_INCORRECTO' });
    }
    next();
  };
}

module.exports = { soloModulo };
