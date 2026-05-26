function soloAdmin(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({
      error: 'No autenticado',
      codigo: 'NO_AUTENTICADO',
    });
  }

  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({
      error: 'Acceso denegado. Se requieren permisos de administrador.',
      codigo: 'PERMISO_INSUFICIENTE',
    });
  }

  next();
}

module.exports = { soloAdmin };
