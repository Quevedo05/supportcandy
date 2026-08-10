const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db/connection');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

function soloComite(req, res, next) {
  if (req.usuario.modulo !== 'comite') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
}

// GET /api/comite/tickets
router.get('/tickets', autenticar, soloComite, async (req, res) => {
  try {
    const [userRows] = await pool.query(
      'SELECT formularioId FROM usuarios WHERE usuarioId = ?',
      [req.usuario.usuarioId]
    );
    if (userRows.length === 0 || !userRows[0].formularioId) {
      return res.json({ tickets: [] });
    }

    const [rows] = await pool.query(
      `SELECT t.ticketId, t.numero, t.ciudadano_nombre, t.ciudadano_email,
              t.ciudadano_telefono, t.ciudadano_dni, t.tipo_tramite,
              t.numero_legajo, t.numero_acta, t.descripcion, t.etapa, t.fecha_creacion,
              f.programa AS formulario_programa
       FROM tickets t
       LEFT JOIN formularios f ON f.formularioId = t.formularioId
       WHERE t.formularioId = ?
         AND t.etapa = 'Comité de análisis'
         AND t.eliminado = 0
       ORDER BY t.fecha_creacion DESC`,
      [userRows[0].formularioId]
    );

    return res.json({
      tickets: rows.map((t) => ({
        ticketId: t.ticketId,
        numero: t.numero,
        ciudadanoNombre: t.ciudadano_nombre,
        ciudadanoEmail: t.ciudadano_email,
        ciudadanoTelefono: t.ciudadano_telefono,
        ciudadanoDni: t.ciudadano_dni,
        tipoTramite: t.tipo_tramite,
        numeroLegajo: t.numero_legajo,
        numeroActa: t.numero_acta,
        descripcion: t.descripcion,
        etapa: t.etapa,
        fechaCreacion: t.fecha_creacion,
        programa: t.formulario_programa,
      })),
    });
  } catch (err) {
    console.error('[GET /comite/tickets]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/comite/tickets/:ticketId/comentarios
router.get('/tickets/:ticketId/comentarios', autenticar, soloComite, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const [userRows] = await pool.query(
      'SELECT formularioId FROM usuarios WHERE usuarioId = ?',
      [req.usuario.usuarioId]
    );
    if (userRows.length === 0 || !userRows[0].formularioId) {
      return res.status(403).json({ error: 'Sin acceso' });
    }

    const [ticketRows] = await pool.query(
      'SELECT ticketId FROM tickets WHERE ticketId = ? AND formularioId = ? AND eliminado = 0',
      [ticketId, userRows[0].formularioId]
    );
    if (ticketRows.length === 0) return res.status(404).json({ error: 'Ticket no encontrado' });

    const [rows] = await pool.query(
      `SELECT c.comentarioId, c.contenido, c.adjuntos, c.fecha, c.autor_id, c.tipo, u.nombre
       FROM comentarios c
       JOIN usuarios u ON u.usuarioId = c.autor_id
       WHERE c.ticketId = ? AND c.tipo IN ('comentario', 'comite')
       ORDER BY c.fecha ASC`,
      [ticketId]
    );

    return res.json({
      comentarios: rows.map((c) => ({
        id: c.comentarioId,
        autor: c.nombre,
        autorId: c.autor_id,
        contenido: c.contenido,
        adjuntos: c.adjuntos ? JSON.parse(c.adjuntos) : [],
        fecha: c.fecha,
        tipo: c.tipo,
      })),
    });
  } catch (err) {
    console.error('[GET /comite/tickets/:ticketId/comentarios]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/comite/tickets/:ticketId/comentarios
router.post('/tickets/:ticketId/comentarios', autenticar, soloComite, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { contenido } = req.body;

    if (!contenido || !contenido.trim()) {
      return res.status(400).json({ error: 'El comentario no puede estar vacío' });
    }

    const [userRows] = await pool.query(
      'SELECT formularioId FROM usuarios WHERE usuarioId = ?',
      [req.usuario.usuarioId]
    );
    if (userRows.length === 0 || !userRows[0].formularioId) {
      return res.status(403).json({ error: 'Sin acceso' });
    }

    const [ticketRows] = await pool.query(
      'SELECT ticketId FROM tickets WHERE ticketId = ? AND formularioId = ? AND eliminado = 0',
      [ticketId, userRows[0].formularioId]
    );
    if (ticketRows.length === 0) return res.status(404).json({ error: 'Ticket no encontrado' });

    const comentarioId = uuidv4();
    await pool.query(
      `INSERT INTO comentarios (comentarioId, ticketId, autor_id, contenido, tipo)
       VALUES (?, ?, ?, ?, 'comite')`,
      [comentarioId, ticketId, req.usuario.usuarioId, contenido.trim()]
    );

    return res.status(201).json({
      id: comentarioId,
      autor: req.usuario.nombre,
      autorId: req.usuario.usuarioId,
      contenido: contenido.trim(),
      fecha: new Date(),
    });
  } catch (err) {
    console.error('[POST /comite/tickets/:ticketId/comentarios]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
