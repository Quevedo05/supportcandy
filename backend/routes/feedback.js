'use strict';
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db/connection');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

function soloDev(req, res, next) {
  if (req.usuario?.rol !== 'dev') {
    return res.status(403).json({ error: 'Acceso denegado.' });
  }
  next();
}

// POST /api/feedback — cualquier usuario autenticado
router.post('/', autenticar, async (req, res) => {
  const { tipo, mensaje } = req.body;
  if (!tipo || !['problema', 'sugerencia'].includes(tipo)) {
    return res.status(400).json({ error: 'tipo debe ser "problema" o "sugerencia".' });
  }
  if (!mensaje || !mensaje.trim()) {
    return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
  }
  try {
    const id = uuidv4();
    await pool.query(
      `INSERT INTO feedback (id, tipo, mensaje, usuario_id, usuario_nombre, usuario_email, usuario_rol, usuario_modulo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        tipo,
        mensaje.trim(),
        req.usuario.usuarioId,
        req.usuario.nombre,
        req.usuario.email,
        req.usuario.rol,
        req.usuario.modulo,
      ]
    );
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[POST /feedback]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/feedback — solo dev
router.get('/', autenticar, soloDev, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, tipo, mensaje, usuario_id, usuario_nombre, usuario_email,
              usuario_rol, usuario_modulo, leido, creado_en
       FROM feedback
       ORDER BY creado_en DESC`
    );
    return res.json({ feedback: rows });
  } catch (err) {
    console.error('[GET /feedback]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/feedback/:id/leido — solo dev
router.patch('/:id/leido', autenticar, soloDev, async (req, res) => {
  try {
    await pool.query('UPDATE feedback SET leido = 1 WHERE id = ?', [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /feedback/:id/leido]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/feedback/:id — solo dev
router.delete('/:id', autenticar, soloDev, async (req, res) => {
  try {
    await pool.query('DELETE FROM feedback WHERE id = ?', [req.params.id]);
    return res.status(204).send();
  } catch (err) {
    console.error('[DELETE /feedback/:id]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
