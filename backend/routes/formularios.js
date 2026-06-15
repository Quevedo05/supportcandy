const express = require('express');
const { pool } = require('../db/connection');
const { autenticar } = require('../middleware/auth');
const { soloAdmin } = require('../middleware/adminOnly');

const router = express.Router();

function formatFormulario(row) {
  return {
    formularioId: row.formularioId,
    programa: row.programa,
    descripcion: row.descripcion,
    activo: Boolean(row.activo),
    creadoEn: row.creado_en instanceof Date ? row.creado_en.toISOString() : row.creado_en,
    actualizadoEn: row.actualizado_en instanceof Date ? row.actualizado_en.toISOString() : row.actualizado_en,
  };
}

// GET /api/formularios/publicos/activos — PUBLIC (no JWT)
// Must be registered before /:formularioId to prevent Express matching
// the literal "publicos" as a formularioId param.
router.get('/publicos/activos', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT formularioId, programa, descripcion, activo
       FROM formularios
       WHERE activo = 1
       ORDER BY creado_en ASC`
    );
    return res.status(200).json({
      formularios: rows.map((row) => ({
        id: row.formularioId,
        formularioId: row.formularioId,
        nombre: row.programa,
        programa: row.programa,
        descripcion: row.descripcion,
        activo: Boolean(row.activo),
      })),
    });
  } catch (err) {
    console.error('[GET /formularios/publicos/activos]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/formularios — JWT required
router.get('/', autenticar, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT formularioId, programa, descripcion, activo, creado_en, actualizado_en
       FROM formularios
       ORDER BY creado_en ASC`
    );
    return res.status(200).json({
      formularios: rows.map(formatFormulario),
    });
  } catch (err) {
    console.error('[GET /formularios]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/formularios/:formularioId/toggle-activo — JWT + admin required
router.patch('/:formularioId/toggle-activo', autenticar, soloAdmin, async (req, res) => {
  try {
    const { formularioId } = req.params;

    const [rows] = await pool.query(
      'SELECT formularioId, activo FROM formularios WHERE formularioId = ?',
      [formularioId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Formulario no encontrado' });
    }

    const nuevoEstado = rows[0].activo ? 0 : 1;
    await pool.query(
      'UPDATE formularios SET activo = ? WHERE formularioId = ?',
      [nuevoEstado, formularioId]
    );

    const [updatedRows] = await pool.query(
      'SELECT actualizado_en FROM formularios WHERE formularioId = ?',
      [formularioId]
    );

    return res.status(200).json({
      formularioId,
      activo: Boolean(nuevoEstado),
      actualizadoEn: updatedRows[0].actualizado_en instanceof Date
        ? updatedRows[0].actualizado_en.toISOString()
        : updatedRows[0].actualizado_en,
    });
  } catch (err) {
    console.error('[PATCH /formularios/:id/toggle-activo]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
