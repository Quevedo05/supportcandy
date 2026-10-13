const express = require('express');
const { pool } = require('../db/connection');
const { autenticar } = require('../middleware/auth');
const { soloAdmin } = require('../middleware/adminOnly');

const router = express.Router();

function formatEtapa(r) {
  return {
    id: r.id,
    nombre: r.nombre,
    orden: r.orden,
    color: r.color,
    bgColor: r.bg_color,
    esCierre: Boolean(r.es_cierre),
    activa: Boolean(r.activa),
  };
}

// GET /api/config/etapas — público, sin auth, usado al cargar el frontend
router.get('/etapas', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM etapas_ticket ORDER BY orden ASC');
    return res.json({ etapas: rows.map(formatEtapa) });
  } catch (err) {
    console.error('[GET /config/etapas]', err);
    return res.status(500).json({ error: 'Error al obtener etapas' });
  }
});

// POST /api/config/etapas — admin only
router.post('/etapas', autenticar, soloAdmin, async (req, res) => {
  try {
    const { nombre, color = '#6B7280', bgColor = '#F9FAFB', esCierre = false } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });

    if (esCierre) {
      await pool.query('UPDATE etapas_ticket SET es_cierre = 0 WHERE es_cierre = 1');
    }

    const [[{ maxOrden }]] = await pool.query('SELECT COALESCE(MAX(orden), 0) AS maxOrden FROM etapas_ticket');
    const orden = maxOrden + 1;

    const [result] = await pool.query(
      'INSERT INTO etapas_ticket (nombre, orden, color, bg_color, es_cierre) VALUES (?, ?, ?, ?, ?)',
      [nombre.trim(), orden, color, bgColor, esCierre ? 1 : 0]
    );

    return res.status(201).json({
      id: result.insertId, nombre: nombre.trim(), orden,
      color, bgColor, esCierre: Boolean(esCierre), activa: true,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe una etapa con ese nombre' });
    console.error('[POST /config/etapas]', err);
    return res.status(500).json({ error: 'Error al crear etapa' });
  }
});

// PUT /api/config/etapas/:id — admin only
router.put('/etapas/:id', autenticar, soloAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, color, bgColor, esCierre, activa } = req.body;

    const [rows] = await pool.query('SELECT * FROM etapas_ticket WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Etapa no encontrada' });
    const etapa = rows[0];

    const nuevoNombre = nombre?.trim() ?? etapa.nombre;

    // Si cambia el nombre, propagar el cambio a tickets y usuarios
    if (nuevoNombre !== etapa.nombre) {
      await pool.query('UPDATE tickets SET etapa = ? WHERE etapa = ?', [nuevoNombre, etapa.nombre]);
      const [usuarios] = await pool.query(
        'SELECT usuarioId, estados_asignados FROM usuarios WHERE estados_asignados IS NOT NULL AND JSON_CONTAINS(estados_asignados, ?)',
        [JSON.stringify(etapa.nombre)]
      );
      for (const u of usuarios) {
        const estados = JSON.parse(u.estados_asignados || '[]');
        const nuevos = estados.map(e => (e === etapa.nombre ? nuevoNombre : e));
        await pool.query('UPDATE usuarios SET estados_asignados = ? WHERE usuarioId = ?', [JSON.stringify(nuevos), u.usuarioId]);
      }
    }

    // Si se marca como cierre, desmarcar la anterior
    const nuevaEsCierre = esCierre !== undefined ? esCierre : Boolean(etapa.es_cierre);
    if (nuevaEsCierre && !etapa.es_cierre) {
      await pool.query('UPDATE etapas_ticket SET es_cierre = 0 WHERE es_cierre = 1');
    }

    await pool.query(
      'UPDATE etapas_ticket SET nombre = ?, color = ?, bg_color = ?, es_cierre = ?, activa = ? WHERE id = ?',
      [
        nuevoNombre,
        color ?? etapa.color,
        bgColor ?? etapa.bg_color,
        nuevaEsCierre ? 1 : 0,
        activa !== undefined ? (activa ? 1 : 0) : etapa.activa,
        id,
      ]
    );

    return res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe una etapa con ese nombre' });
    console.error('[PUT /config/etapas/:id]', err);
    return res.status(500).json({ error: 'Error al actualizar etapa' });
  }
});

// DELETE /api/config/etapas/:id — admin only
router.delete('/etapas/:id', autenticar, soloAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM etapas_ticket WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Etapa no encontrada' });
    const etapa = rows[0];

    if (etapa.es_cierre) {
      return res.status(400).json({ error: 'No se puede eliminar la etapa de cierre. Asigná otra etapa como cierre primero.' });
    }

    const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM tickets WHERE etapa = ?', [etapa.nombre]);
    if (count > 0) {
      return res.status(409).json({ error: `Hay ${count} ticket(s) en esta etapa. Reasignalos antes de eliminarla.` });
    }

    await pool.query('DELETE FROM etapas_ticket WHERE id = ?', [id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /config/etapas/:id]', err);
    return res.status(500).json({ error: 'Error al eliminar etapa' });
  }
});

// PATCH /api/config/etapas/reorder — admin only
router.patch('/etapas/reorder', autenticar, soloAdmin, async (req, res) => {
  try {
    const { orden } = req.body;
    if (!Array.isArray(orden)) return res.status(400).json({ error: 'Formato inválido' });
    for (const { id, orden: o } of orden) {
      await pool.query('UPDATE etapas_ticket SET orden = ? WHERE id = ?', [o, id]);
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /config/etapas/reorder]', err);
    return res.status(500).json({ error: 'Error al reordenar etapas' });
  }
});

// GET /api/config/sistema — admin only
router.get('/sistema', autenticar, soloAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM config_sistema');
    const config = {};
    for (const row of rows) config[row.clave] = { valor: row.valor, descripcion: row.descripcion };
    return res.json({ config });
  } catch (err) {
    console.error('[GET /config/sistema]', err);
    return res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

// PATCH /api/config/sistema — admin only
router.patch('/sistema', autenticar, soloAdmin, async (req, res) => {
  try {
    const { cambios } = req.body;
    if (!cambios || typeof cambios !== 'object') return res.status(400).json({ error: 'Formato inválido' });
    for (const [clave, valor] of Object.entries(cambios)) {
      await pool.query(
        'INSERT INTO config_sistema (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = ?',
        [clave, valor, valor]
      );
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /config/sistema]', err);
    return res.status(500).json({ error: 'Error al guardar configuración' });
  }
});

module.exports = router;
