const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/connection');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'El email es requerido' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'La contraseña es requerida' });
    }

    const emailNorm = email.trim().toLowerCase();

    const [rows] = await pool.query(
      'SELECT usuarioId, nombre, email, password_hash, rol, modulo, activo FROM usuarios WHERE email = ?',
      [emailNorm]
    );

    // Same message for not-found and wrong-password to prevent user enumeration
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    const usuario = rows[0];

    if (!usuario.activo) {
      return res.status(401).json({ error: 'Usuario inactivo. Contacte al administrador.' });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    const token = jwt.sign(
      {
        usuarioId: usuario.usuarioId,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        modulo: usuario.modulo || 'tickets',
      },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    // Convert JWT expiry string to seconds for the frontend
    let expiresInSeconds = 86400;
    if (typeof expiresIn === 'string') {
      const match = expiresIn.match(/^(\d+)(h|m|s|d)?$/);
      if (match) {
        const val = parseInt(match[1], 10);
        const unit = match[2] || 's';
        const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
        expiresInSeconds = val * (multipliers[unit] || 1);
      }
    }

    return res.status(200).json({
      token,
      usuario: {
        usuarioId: usuario.usuarioId,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        modulo: usuario.modulo || 'tickets',
      },
      expiresIn: expiresInSeconds,
    });
  } catch (err) {
    console.error('[POST /auth/login]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
