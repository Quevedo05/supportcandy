const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Token de autenticación requerido',
      codigo: 'TOKEN_REQUERIDO',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = {
      usuarioId: payload.usuarioId,
      nombre: payload.nombre,
      email: payload.email,
      rol: payload.rol,
      modulo: payload.modulo,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado. Por favor, inicie sesión nuevamente.',
        codigo: 'TOKEN_EXPIRADO',
      });
    }
    return res.status(401).json({
      error: 'Token inválido',
      codigo: 'TOKEN_INVALIDO',
    });
  }
}

module.exports = { autenticar };
