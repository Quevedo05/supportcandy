const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db/connection');
const { autenticar } = require('../middleware/auth');
const { soloAdmin } = require('../middleware/adminOnly');
const { soloModulo } = require('../middleware/soloModulo');

const soloTickets = soloModulo('tickets');

const router = express.Router();

function parseJson(val) {
  if (!val) return [];
  try { return typeof val === 'string' ? JSON.parse(val) : val; }
  catch { return []; }
}

function formatFormulario(row) {
  return {
    id: row.formularioId,
    formularioId: row.formularioId,
    nombre: row.nombre || row.programa || '',
    programa: row.programa || '',
    descripcion: row.descripcion || '',
    activo: Boolean(row.activo),
    personasFisicas: row.personas_fisicas !== undefined ? Boolean(row.personas_fisicas) : true,
    personasJuridicas: row.personas_juridicas !== undefined ? Boolean(row.personas_juridicas) : false,
    campos: parseJson(row.campos),
    creadoEn: row.creado_en instanceof Date ? row.creado_en.toISOString() : (row.creado_en ?? null),
    actualizadoEn: row.actualizado_en instanceof Date ? row.actualizado_en.toISOString() : (row.actualizado_en ?? null),
  };
}

// GET /api/formularios/publicos/activos — PUBLIC (no JWT)
// Must be registered before /:formularioId to prevent Express matching
// the literal "publicos" as a formularioId param.
router.get('/publicos/activos', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT formularioId, nombre, programa, descripcion, activo, campos, personas_fisicas, personas_juridicas
       FROM formularios
       WHERE activo = 1
       ORDER BY creado_en ASC`
    );
    return res.status(200).json({ formularios: rows.map(formatFormulario) });
  } catch (err) {
    console.error('[GET /formularios/publicos/activos]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/formularios — JWT required
router.get('/', autenticar, soloTickets, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT formularioId, nombre, programa, descripcion, activo, campos, personas_fisicas, personas_juridicas, creado_en, actualizado_en
       FROM formularios
       ORDER BY creado_en ASC`
    );
    return res.status(200).json({ formularios: rows.map(formatFormulario) });
  } catch (err) {
    console.error('[GET /formularios]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/formularios — JWT + admin required
router.post('/', autenticar, soloTickets, soloAdmin, async (req, res) => {
  try {
    const {
      nombre = '',
      programa = '',
      descripcion = '',
      activo = false,
      personasFisicas = true,
      personasJuridicas = false,
      campos = [],
    } = req.body;

    const formularioId = uuidv4();
    await pool.query(
      `INSERT INTO formularios (formularioId, nombre, programa, descripcion, activo, campos, personas_fisicas, personas_juridicas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        formularioId,
        nombre.trim(),
        programa.trim(),
        descripcion.trim(),
        activo ? 1 : 0,
        JSON.stringify(campos),
        personasFisicas ? 1 : 0,
        personasJuridicas ? 1 : 0,
      ]
    );

    const [rows] = await pool.query(
      `SELECT formularioId, nombre, programa, descripcion, activo, campos, personas_fisicas, personas_juridicas, creado_en, actualizado_en
       FROM formularios WHERE formularioId = ?`,
      [formularioId]
    );
    return res.status(201).json(formatFormulario(rows[0]));
  } catch (err) {
    console.error('[POST /formularios]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/formularios/:formularioId/toggle-activo — JWT + admin required
router.patch('/:formularioId/toggle-activo', autenticar, soloTickets, soloAdmin, async (req, res) => {
  try {
    const { formularioId } = req.params;
    const [rows] = await pool.query(
      'SELECT formularioId, activo FROM formularios WHERE formularioId = ?',
      [formularioId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Formulario no encontrado' });

    const nuevoEstado = rows[0].activo ? 0 : 1;
    await pool.query('UPDATE formularios SET activo = ? WHERE formularioId = ?', [nuevoEstado, formularioId]);

    const [updated] = await pool.query(
      `SELECT formularioId, nombre, programa, descripcion, activo, campos, personas_fisicas, personas_juridicas, creado_en, actualizado_en
       FROM formularios WHERE formularioId = ?`,
      [formularioId]
    );
    return res.status(200).json(formatFormulario(updated[0]));
  } catch (err) {
    console.error('[PATCH /formularios/:id/toggle-activo]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/formularios/:formularioId — update info and/or campos — JWT + admin required
router.patch('/:formularioId', autenticar, soloTickets, soloAdmin, async (req, res) => {
  try {
    const { formularioId } = req.params;
    const [rows] = await pool.query(
      'SELECT formularioId FROM formularios WHERE formularioId = ?',
      [formularioId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Formulario no encontrado' });

    const { nombre, programa, descripcion, activo, personasFisicas, personasJuridicas, campos } = req.body;
    const sets = [];
    const vals = [];

    if (nombre !== undefined)           { sets.push('nombre = ?');            vals.push(nombre); }
    if (programa !== undefined)         { sets.push('programa = ?');          vals.push(programa); }
    if (descripcion !== undefined)      { sets.push('descripcion = ?');       vals.push(descripcion); }
    if (activo !== undefined)           { sets.push('activo = ?');            vals.push(activo ? 1 : 0); }
    if (personasFisicas !== undefined)  { sets.push('personas_fisicas = ?');  vals.push(personasFisicas ? 1 : 0); }
    if (personasJuridicas !== undefined){ sets.push('personas_juridicas = ?');vals.push(personasJuridicas ? 1 : 0); }
    if (campos !== undefined)           { sets.push('campos = ?');            vals.push(JSON.stringify(campos)); }

    if (sets.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });

    vals.push(formularioId);
    await pool.query(`UPDATE formularios SET ${sets.join(', ')} WHERE formularioId = ?`, vals);

    const [updated] = await pool.query(
      `SELECT formularioId, nombre, programa, descripcion, activo, campos, personas_fisicas, personas_juridicas, creado_en, actualizado_en
       FROM formularios WHERE formularioId = ?`,
      [formularioId]
    );
    return res.status(200).json(formatFormulario(updated[0]));
  } catch (err) {
    console.error('[PATCH /formularios/:id]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/formularios/:formularioId — JWT + admin required
router.delete('/:formularioId', autenticar, soloTickets, soloAdmin, async (req, res) => {
  try {
    const { formularioId } = req.params;
    const [rows] = await pool.query(
      'SELECT formularioId FROM formularios WHERE formularioId = ?',
      [formularioId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Formulario no encontrado' });
    await pool.query('DELETE FROM formularios WHERE formularioId = ?', [formularioId]);
    return res.status(204).send();
  } catch (err) {
    console.error('[DELETE /formularios/:id]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/formularios/:formularioId — PUBLIC (for citizen form rendering)
// Must be registered after all static and sub-path routes.
router.get('/:formularioId', async (req, res) => {
  try {
    const { formularioId } = req.params;
    const [rows] = await pool.query(
      `SELECT formularioId, nombre, programa, descripcion, activo, campos, personas_fisicas, personas_juridicas, creado_en, actualizado_en
       FROM formularios WHERE formularioId = ?`,
      [formularioId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Formulario no encontrado' });
    return res.status(200).json(formatFormulario(rows[0]));
  } catch (err) {
    console.error('[GET /formularios/:id]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
