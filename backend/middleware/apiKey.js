'use strict';

function autenticarApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const claveEsperada = process.env.RIVADAVIA_API_KEY;

  if (!claveEsperada) {
    console.error('[apiKey] RIVADAVIA_API_KEY no configurada en variables de entorno');
    return res.status(503).json({ error: 'Integración no disponible.' });
  }

  if (!apiKey || apiKey !== claveEsperada) {
    return res.status(401).json({ error: 'API Key inválida o ausente.', codigo: 'API_KEY_INVALIDA' });
  }

  next();
}

module.exports = { autenticarApiKey };
