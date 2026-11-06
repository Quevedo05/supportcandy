const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db/connection');
const { autenticar } = require('../middleware/auth');
const { soloModulo } = require('../middleware/soloModulo');

const router = express.Router();
const soloSavean = soloModulo('savean');

function formatSolicitud(r) {
  return {
    id:           r.solicitudId,
    usuarioNombre: r.usuario_nombre,
    barrNombre:   r.barrera_nombre,
    tipo:         r.tipo,
    descripcion:  r.descripcion,
    estado:       r.estado,
    creadoEn:     r.creado_en,
    resueltoEn:   r.resuelto_en  || null,
    resueltoPor:  r.resuelto_por || null,
  };
}

// GET /api/savean/solicitudes
// admin/dev → todas  |  inspector con puedeSolicitar → propias
router.get('/', autenticar, soloSavean, async (req, res) => {
  try {
    const { rol, usuarioId, puedeSolicitar } = req.usuario;
    const esAdmin = ['admin', 'dev'].includes(rol);

    if (!esAdmin && !puedeSolicitar) {
      return res.status(403).json({ error: 'Acceso denegado.' });
    }

    let rows;
    if (esAdmin) {
      [rows] = await pool.query(
        `SELECT solicitudId, usuario_id, usuario_nombre, barrera_nombre, tipo,
                descripcion, estado, creado_en, resuelto_en, resuelto_por
         FROM solicitudes_savean
         ORDER BY creado_en DESC
         LIMIT 500`
      );
    } else {
      [rows] = await pool.query(
        `SELECT solicitudId, usuario_id, usuario_nombre, barrera_nombre, tipo,
                descripcion, estado, creado_en, resuelto_en, resuelto_por
         FROM solicitudes_savean
         WHERE usuario_id = ?
         ORDER BY creado_en DESC`,
        [usuarioId]
      );
    }

    return res.json(rows.map(formatSolicitud));
  } catch (err) {
    console.error('[GET /savean/solicitudes]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/savean/solicitudes
router.post('/', autenticar, soloSavean, async (req, res) => {
  try {
    const { puedeSolicitar, usuarioId, nombre } = req.usuario;

    if (!puedeSolicitar) {
      return res.status(403).json({ error: 'No tenés permiso para enviar solicitudes.' });
    }

    const { tipo, descripcion } = req.body;

    if (!tipo || !['insumos', 'otra'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de solicitud inválido.' });
    }
    if (!descripcion || !String(descripcion).trim()) {
      return res.status(400).json({ error: 'La descripción es requerida.' });
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO solicitudes_savean (solicitudId, usuario_id, usuario_nombre, tipo, descripcion)
       VALUES (?, ?, ?, ?, ?)`,
      [id, usuarioId, nombre || '', tipo, String(descripcion).trim()]
    );

    return res.status(201).json({ id });
  } catch (err) {
    console.error('[POST /savean/solicitudes]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/savean/solicitudes/:id/estado
router.patch('/:id/estado', autenticar, soloSavean, async (req, res) => {
  try {
    const { rol, nombre } = req.usuario;

    if (!['admin', 'dev'].includes(rol)) {
      return res.status(403).json({ error: 'Acceso denegado.' });
    }

    const { estado } = req.body;
    if (!estado || !['pendiente', 'en_proceso', 'resuelta'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido.' });
    }

    const [existing] = await pool.query(
      'SELECT solicitudId FROM solicitudes_savean WHERE solicitudId = ?',
      [req.params.id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    if (estado === 'resuelta') {
      await pool.query(
        `UPDATE solicitudes_savean
         SET estado = ?, resuelto_en = NOW(), resuelto_por = ?
         WHERE solicitudId = ?`,
        [estado, nombre || '', req.params.id]
      );
    } else {
      await pool.query(
        `UPDATE solicitudes_savean SET estado = ? WHERE solicitudId = ?`,
        [estado, req.params.id]
      );
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /savean/solicitudes/:id/estado]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
