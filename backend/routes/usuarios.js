const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db/connection');
const { autenticar } = require('../middleware/auth');
const { soloAdmin } = require('../middleware/adminOnly');
const { soloModulo } = require('../middleware/soloModulo');
const { enviarInvitacion, enviarResetPassword } = require('../services/mailer');

const router = express.Router();

// Todas las rutas requieren autenticación y módulo tickets; las de escritura requieren además soloAdmin
router.use(autenticar, soloModulo('tickets'));

function formatUsuario(row) {
  return {
    usuarioId: row.usuarioId,
    nombre: row.nombre,
    email: row.email,
    rol: row.rol,
    modulo: row.modulo || 'tickets',
    activo: Boolean(row.activo),
    estadosAsignados: row.estados_asignados ? JSON.parse(row.estados_asignados) : [],
    puedeEditarDatos: Boolean(row.puede_editar_datos),
    creadoEn: row.creado_en instanceof Date ? row.creado_en.toISOString() : row.creado_en,
    actualizadoEn: row.actualizado_en instanceof Date ? row.actualizado_en.toISOString() : row.actualizado_en,
  };
}

// GET /api/usuarios
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT usuarioId, nombre, email, rol, modulo, activo, estados_asignados, puede_editar_datos, creado_en, actualizado_en FROM usuarios ORDER BY creado_en ASC'
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
router.post('/', soloAdmin, async (req, res) => {
  try {
    const { nombre, email, rol, modulo = 'tickets', formularioId } = req.body;

    const errores = {};
    if (!nombre || nombre.trim().length < 2) errores.nombre = 'El nombre debe tener al menos 2 caracteres';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) errores.email = 'El email no es válido';
    if (!['tickets', 'savean', 'comite'].includes(modulo)) errores.modulo = 'Módulo inválido';
    if (modulo !== 'comite' && (!rol || !['admin', 'contribuidor', 'inspector', 'supervisor'].includes(rol))) {
      errores.rol = 'Rol inválido';
    }
    if (modulo === 'comite' && !formularioId) errores.formularioId = 'El programa es requerido para usuarios de comité';

    if (Object.keys(errores).length > 0) {
      return res.status(400).json({ error: 'Datos inválidos', errores });
    }

    const rolFinal = modulo === 'comite' ? 'contribuidor' : rol;
    const emailNorm = email.trim().toLowerCase();
    const [existing] = await pool.query('SELECT usuarioId FROM usuarios WHERE email = ?', [emailNorm]);
    if (existing.length > 0) return res.status(409).json({ error: 'Este email ya está registrado' });

    const usuarioId = uuidv4();
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO usuarios (usuarioId, nombre, email, password_hash, rol, modulo, activo, invitation_token, invitation_expires_at, formularioId)
       VALUES (?, ?, ?, '', ?, ?, 1, ?, ?, ?)`,
      [usuarioId, nombre.trim(), emailNorm, rolFinal, modulo, token, expires, formularioId || null]
    );

    try {
      await enviarInvitacion({ nombre: nombre.trim(), email: emailNorm, token, modulo, rol: rolFinal });
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
router.patch('/:usuarioId/estados-asignados', soloAdmin, async (req, res) => {
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
router.patch('/:usuarioId/toggle-activo', soloAdmin, async (req, res) => {
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

// PATCH /api/usuarios/:usuarioId/toggle-editar-datos
router.patch('/:usuarioId/toggle-editar-datos', soloAdmin, async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const [rows] = await pool.query(
      'SELECT usuarioId, puede_editar_datos FROM usuarios WHERE usuarioId = ?',
      [usuarioId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    const nuevo = rows[0].puede_editar_datos ? 0 : 1;
    await pool.query('UPDATE usuarios SET puede_editar_datos = ? WHERE usuarioId = ?', [nuevo, usuarioId]);
    return res.status(200).json({ usuarioId, puedeEditarDatos: Boolean(nuevo) });
  } catch (err) {
    console.error('[PATCH /usuarios/:id/toggle-editar-datos]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/usuarios/:usuarioId/rol
router.patch('/:usuarioId/rol', soloAdmin, async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const { rol } = req.body;

    if (req.usuario.usuarioId === usuarioId) {
      return res.status(403).json({ error: 'No puede cambiar su propio rol' });
    }

    const rolesValidos = ['admin', 'contribuidor', 'inspector', 'supervisor'];
    if (!rol || !rolesValidos.includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    const [rows] = await pool.query('SELECT usuarioId FROM usuarios WHERE usuarioId = ?', [usuarioId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    await pool.query('UPDATE usuarios SET rol = ? WHERE usuarioId = ?', [rol, usuarioId]);
    return res.status(200).json({ usuarioId, rol });
  } catch (err) {
    console.error('[PATCH /usuarios/:id/rol]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/usuarios/:usuarioId/resetear-password
router.patch('/:usuarioId/resetear-password', soloAdmin, async (req, res) => {
  try {
    const { usuarioId } = req.params;

    const [rows] = await pool.query(
      'SELECT usuarioId, nombre, email, rol, modulo FROM usuarios WHERE usuarioId = ?',
      [usuarioId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const u = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await pool.query(
      `UPDATE usuarios SET password_hash = '', invitation_token = ?, invitation_expires_at = ? WHERE usuarioId = ?`,
      [token, expires, usuarioId]
    );

    try {
      await enviarResetPassword({ nombre: u.nombre, email: u.email, token, modulo: u.modulo, rol: u.rol });
    } catch (mailErr) {
      console.error('[Mailer] Error enviando reset de contraseña:', mailErr.message);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[PATCH /usuarios/:id/resetear-password]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/usuarios/:usuarioId
router.delete('/:usuarioId', soloAdmin, async (req, res) => {
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

    await pool.query('UPDATE comentarios SET autor_id = NULL WHERE autor_id = ?', [usuarioId]);
    await pool.query('DELETE FROM usuarios WHERE usuarioId = ?', [usuarioId]);

    return res.status(204).send();
  } catch (err) {
    console.error('[DELETE /usuarios/:id]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
