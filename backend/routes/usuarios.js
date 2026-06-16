const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db/connection');
const { autenticar } = require('../middleware/auth');
const { soloAdmin } = require('../middleware/adminOnly');
const { soloModulo } = require('../middleware/soloModulo');
const { enviarInvitacion } = require('../services/mailer');

const router = express.Router();

// Todas las rutas de usuarios son exclusivas del módulo tickets
router.use(autenticar, soloModulo('tickets'), soloAdmin);

function formatUsuario(row) {
  return {
    usuarioId: row.usuarioId,
    nombre: row.nombre,
    email: row.email,
    rol: row.rol,
    modulo: row.modulo || 'tickets',
    activo: Boolean(row.activo),
    estadosAsignados: row.estados_asignados ? JSON.parse(row.estados_asignados) : [],
    creadoEn: row.creado_en instanceof Date ? row.creado_en.toISOString() : row.creado_en,
    actualizadoEn: row.actualizado_en instanceof Date ? row.actualizado_en.toISOString() : row.actualizado_en,
  };
}

// GET /api/usuarios
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT usuarioId, nombre, email, rol, modulo, activo, estados_asignados, creado_en, actualizado_en FROM usuarios ORDER BY creado_en ASC'
    );
    return res.status(200).json({
      usuarios: rows.map(formatUsuario),
      total: rows.length,
    });
  } catch (err) {
    console.error('[GET /usuarios]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/usuarios — crea usuario y envía invitación por email
router.post('/', async (req, res) => {
  try {
    const { nombre, email, rol, modulo = 'tickets' } = req.body;

    const errores = {};
    if (!nombre || nombre.trim().length < 2) errores.nombre = 'El nombre debe tener al menos 2 caracteres';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) errores.email = 'El email no es válido';
    if (!rol || !['admin', 'contribuidor', 'inspector'].includes(rol)) errores.rol = 'Rol inválido';
    if (!['tickets', 'savean'].includes(modulo)) errores.modulo = 'Módulo inválido';

    if (Object.keys(errores).length > 0) {
      return res.status(400).json({ error: 'Datos inválidos', errores });
    }

    const emailNorm = email.trim().toLowerCase();
    const [existing] = await pool.query('SELECT usuarioId FROM usuarios WHERE email = ?', [emailNorm]);
    if (existing.length > 0) return res.status(409).json({ error: 'Este email ya está registrado' });

    const usuarioId = uuidv4();
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO usuarios (usuarioId, nombre, email, password_hash, rol, modulo, activo, invitation_token, invitation_expires_at)
       VALUES (?, ?, ?, '', ?, ?, 1, ?, ?)`,
      [usuarioId, nombre.trim(), emailNorm, rol, modulo, token, expires]
    );

    try {
      await enviarInvitacion({ nombre: nombre.trim(), email: emailNorm, token, modulo, rol });
    } catch (mailErr) {
      console.error('[Mailer] Error enviando invitación:', mailErr.message);
      // No fallar el request si el mail falla — el admin puede reenviar
    }

    const [newRows] = await pool.query(
      'SELECT usuarioId, nombre, email, rol, modulo, activo, creado_en, actualizado_en FROM usuarios WHERE usuarioId = ?',
      [usuarioId]
    );

    return res.status(201).json({ ...formatUsuario(newRows[0]), invitacionEnviada: true });
  } catch (err) {
    console.error('[POST /usuarios]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/usuarios/:usuarioId/estados-asignados
router.patch('/:usuarioId/estados-asignados', async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const { estados } = req.body;

    if (!Array.isArray(estados)) {
      return res.status(400).json({ error: 'estados debe ser un array' });
    }

    const [rows] = await pool.query('SELECT usuarioId FROM usuarios WHERE usuarioId = ?', [usuarioId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    await pool.query('UPDATE usuarios SET estados_asignados = ? WHERE usuarioId = ?', [JSON.stringify(estados), usuarioId]);
    return res.status(200).json({ usuarioId, estadosAsignados: estados });
  } catch (err) {
    console.error('[PATCH /usuarios/:id/estados-asignados]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/usuarios/:usuarioId/toggle-activo
router.patch('/:usuarioId/toggle-activo', async (req, res) => {
  try {
    const { usuarioId } = req.params;

    if (req.usuario.usuarioId === usuarioId) {
      return res.status(403).json({ error: 'No puede desactivar su propia cuenta' });
    }

    const [rows] = await pool.query(
      'SELECT usuarioId, activo FROM usuarios WHERE usuarioId = ?',
      [usuarioId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const nuevoEstado = rows[0].activo ? 0 : 1;
    await pool.query('UPDATE usuarios SET activo = ? WHERE usuarioId = ?', [nuevoEstado, usuarioId]);

    return res.status(200).json({
      usuarioId,
      activo: Boolean(nuevoEstado),
    });
  } catch (err) {
    console.error('[PATCH /usuarios/:id/toggle-activo]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/usuarios/:usuarioId
router.delete('/:usuarioId', async (req, res) => {
  try {
    const { usuarioId } = req.params;

    if (req.usuario.usuarioId === usuarioId) {
      return res.status(403).json({ error: 'No puede eliminar su propia cuenta' });
    }

    const [rows] = await pool.query(
      'SELECT usuarioId FROM usuarios WHERE usuarioId = ?',
      [usuarioId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await pool.query('DELETE FROM usuarios WHERE usuarioId = ?', [usuarioId]);

    return res.status(204).send();
  } catch (err) {
    // FK constraint: user has authored comments, can't delete
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        error: 'No se puede eliminar el usuario porque tiene comentarios asociados. Desactívelo en su lugar.',
      });
    }
    console.error('[DELETE /usuarios/:id]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
