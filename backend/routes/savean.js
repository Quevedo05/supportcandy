const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db/connection');
const { autenticar } = require('../middleware/auth');
const { soloAdmin } = require('../middleware/adminOnly');
const { soloModulo } = require('../middleware/soloModulo');

const soloSavean = soloModulo('savean');

const router = express.Router();

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseJson(val) {
  if (!val) return [];
  try { return typeof val === 'string' ? JSON.parse(val) : val; }
  catch { return []; }
}

function toIso(val) {
  if (!val) return undefined;
  return val instanceof Date ? val.toISOString() : val;
}

function formatGuia(row) {
  return {
    id: row.guiaId,
    numero: row.numero,
    token: row.token,
    estado: row.estado,
    fechaEmision: toIso(row.fecha_emision),
    fechaVencimiento: toIso(row.fecha_vencimiento),
    fechaVerificacion: toIso(row.fecha_verificacion),
    remitenteNombre: row.remitente_nombre,
    remitenteRenspa: row.remitente_renspa || undefined,
    remitenteInv: row.remitente_inv || undefined,
    remitenteTipo: row.remitente_tipo || undefined,
    destinatarioNombre: row.destinatario_nombre,
    destinoTipo: row.destino_tipo,
    destinoPais: row.destino_pais || undefined,
    destinoPuntoSalida: row.destino_punto_salida || undefined,
    destinoMercadoInterno: row.destino_mercado_interno || undefined,
    destinoProvincia: row.destino_provincia || undefined,
    items: parseJson(row.items),
    transporteEmpresa: row.transporte_empresa || undefined,
    transporteConductor: row.transporte_conductor,
    transporteTipo: row.transporte_tipo || undefined,
    transporteCamionPatente: row.transporte_camion_patente,
    transporteAcopladoPatente: row.transporte_acoplado_patente || undefined,
    transportePrecintos: row.transporte_precintos || undefined,
    barreraId: row.barrera_id || undefined,
    barrieraNombre: row.barrera_nombre || undefined,
    inspectorUsuario: row.inspector_usuario || undefined,
    inspectorNombre: row.inspector_nombre || undefined,
    motivoDenegacion: row.motivo_denegacion || undefined,
    emailContacto: row.email_contacto || undefined,
  };
}

function formatBarrera(row) {
  return {
    id: row.barreraId,
    nombre: row.nombre,
    ruta: row.ruta || undefined,
    kilometro: row.kilometro || undefined,
    departamento: row.departamento || undefined,
    activa: Boolean(row.activa),
  };
}

function formatBarrerista(row) {
  return {
    id: row.barreristId,
    nombre: row.nombre,
    usuario: row.usuario,
    activo: Boolean(row.activo),
  };
}

// ─── guias ───────────────────────────────────────────────────────────────────

// POST /api/savean/guias — PUBLIC (citizen submits from landing page)
router.post('/guias', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      remitenteNombre, remitenteRenspa, remitenteInv, remitenteTipo,
      destinatarioNombre, destinoTipo,
      destinoPais, destinoPuntoSalida, destinoMercadoInterno, destinoProvincia,
      items = [],
      transporteEmpresa, transporteConductor, transporteTipo,
      transporteCamionPatente, transporteAcopladoPatente, transportePrecintos,
      emailContacto,
    } = req.body;

    if (!remitenteNombre || !destinatarioNombre || !destinoTipo || !transporteConductor || !transporteCamionPatente) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const guiaId = uuidv4();
    const token = crypto.randomBytes(32).toString('hex');

    const ahora = new Date();
    const anio = ahora.getFullYear();
    const [[{ total }]] = await conn.query(
      'SELECT COUNT(*) AS total FROM guias_savean WHERE YEAR(fecha_emision) = ?',
      [anio]
    );
    const numero = `SAVEAN-${anio}-${String(Number(total) + 1).padStart(5, '0')}`;

    const fechaVencimiento = new Date(ahora.getTime() + 20 * 86400000);

    await conn.query(
      `INSERT INTO guias_savean (
        guiaId, numero, token, estado, fecha_emision, fecha_vencimiento,
        remitente_nombre, remitente_renspa, remitente_inv, remitente_tipo,
        destinatario_nombre, destino_tipo, destino_pais, destino_punto_salida,
        destino_mercado_interno, destino_provincia,
        items,
        transporte_empresa, transporte_conductor, transporte_tipo,
        transporte_camion_patente, transporte_acoplado_patente, transporte_precintos,
        email_contacto
      ) VALUES (?, ?, ?, 'pendiente', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        guiaId, numero, token, ahora, fechaVencimiento,
        remitenteNombre,
        remitenteRenspa || null, remitenteInv || null, remitenteTipo || null,
        destinatarioNombre, destinoTipo,
        destinoPais || null, destinoPuntoSalida || null,
        destinoMercadoInterno || null, destinoProvincia || null,
        JSON.stringify(items),
        transporteEmpresa || null, transporteConductor, transporteTipo || null,
        transporteCamionPatente,
        transporteAcopladoPatente || null, transportePrecintos || null,
        emailContacto || null,
      ]
    );

    await conn.commit();

    const [[row]] = await conn.query('SELECT * FROM guias_savean WHERE guiaId = ?', [guiaId]);
    conn.release();
    return res.status(201).json(formatGuia(row));
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('[POST /savean/guias]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/savean/guias — AUTH (inspector/admin)
router.get('/guias', autenticar, soloSavean, async (_req, res) => {
  try {
    // Auto-expire overdue pending guias
    await pool.query(
      `UPDATE guias_savean SET estado = 'vencida' WHERE estado = 'pendiente' AND fecha_vencimiento < NOW()`
    );
    const [rows] = await pool.query('SELECT * FROM guias_savean ORDER BY fecha_emision DESC');
    return res.json({ guias: rows.map(formatGuia) });
  } catch (err) {
    console.error('[GET /savean/guias]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/savean/guias/token/:token — PUBLIC (QR code / citizen check)
// Must be before /:id param routes to avoid Express conflict
router.get('/guias/token/:token', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM guias_savean WHERE token = ?', [req.params.token]);
    if (rows.length === 0) return res.status(404).json({ error: 'Guía no encontrada' });
    return res.json(formatGuia(rows[0]));
  } catch (err) {
    console.error('[GET /savean/guias/token/:token]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/savean/guias/:id/verificar — AUTH
router.patch('/guias/:id/verificar', autenticar, soloSavean, async (req, res) => {
  try {
    const { id } = req.params;
    const { barreraId } = req.body;
    if (!barreraId) return res.status(400).json({ error: 'barreraId es obligatorio' });

    const [rows] = await pool.query('SELECT estado FROM guias_savean WHERE guiaId = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Guía no encontrada' });
    if (rows[0].estado !== 'pendiente') return res.status(409).json({ error: 'La guía no está en estado pendiente' });

    const [barreras] = await pool.query('SELECT nombre FROM barreras_savean WHERE barreraId = ?', [barreraId]);
    const barrieraNombre = barreras[0]?.nombre ?? null;
    const inspectorNombre = req.usuario.nombre || req.usuario.email;

    await pool.query(
      `UPDATE guias_savean
       SET estado = 'verificada', fecha_verificacion = NOW(),
           barrera_id = ?, barrera_nombre = ?,
           inspector_usuario = ?, inspector_nombre = ?
       WHERE guiaId = ?`,
      [barreraId, barrieraNombre, req.usuario.email, inspectorNombre, id]
    );

    const [[updated]] = await pool.query('SELECT * FROM guias_savean WHERE guiaId = ?', [id]);
    return res.json(formatGuia(updated));
  } catch (err) {
    console.error('[PATCH /savean/guias/:id/verificar]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/savean/guias/:id/denegar — AUTH
router.patch('/guias/:id/denegar', autenticar, soloSavean, async (req, res) => {
  try {
    const { id } = req.params;
    const { barreraId, motivo } = req.body;
    if (!barreraId || !motivo) return res.status(400).json({ error: 'barreraId y motivo son obligatorios' });

    const [rows] = await pool.query('SELECT estado FROM guias_savean WHERE guiaId = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Guía no encontrada' });
    if (rows[0].estado !== 'pendiente') return res.status(409).json({ error: 'La guía no está en estado pendiente' });

    const [barreras] = await pool.query('SELECT nombre FROM barreras_savean WHERE barreraId = ?', [barreraId]);
    const barrieraNombre = barreras[0]?.nombre ?? null;
    const inspectorNombre = req.usuario.nombre || req.usuario.email;

    await pool.query(
      `UPDATE guias_savean
       SET estado = 'denegada', fecha_verificacion = NOW(),
           barrera_id = ?, barrera_nombre = ?,
           inspector_usuario = ?, inspector_nombre = ?,
           motivo_denegacion = ?
       WHERE guiaId = ?`,
      [barreraId, barrieraNombre, req.usuario.email, inspectorNombre, motivo, id]
    );

    const [[updated]] = await pool.query('SELECT * FROM guias_savean WHERE guiaId = ?', [id]);
    return res.json(formatGuia(updated));
  } catch (err) {
    console.error('[PATCH /savean/guias/:id/denegar]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/savean/guias/:id/modificar-verificar — AUTH
router.patch('/guias/:id/modificar-verificar', autenticar, soloSavean, async (req, res) => {
  try {
    const { id } = req.params;
    const { barreraId, cambios = {} } = req.body;
    if (!barreraId) return res.status(400).json({ error: 'barreraId es obligatorio' });

    const [rows] = await pool.query('SELECT estado FROM guias_savean WHERE guiaId = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Guía no encontrada' });
    if (rows[0].estado !== 'pendiente') return res.status(409).json({ error: 'La guía no está en estado pendiente' });

    const [barreras] = await pool.query('SELECT nombre FROM barreras_savean WHERE barreraId = ?', [barreraId]);
    const barrieraNombre = barreras[0]?.nombre ?? null;
    const inspectorNombre = req.usuario.nombre || req.usuario.email;

    const sets = [
      "estado = 'verificada'",
      'fecha_verificacion = NOW()',
      'barrera_id = ?', 'barrera_nombre = ?',
      'inspector_usuario = ?', 'inspector_nombre = ?',
    ];
    const vals = [barreraId, barrieraNombre, req.usuario.email, inspectorNombre];

    if (cambios.transporteConductor !== undefined)       { sets.push('transporte_conductor = ?');        vals.push(cambios.transporteConductor); }
    if (cambios.transporteCamionPatente !== undefined)   { sets.push('transporte_camion_patente = ?');   vals.push(cambios.transporteCamionPatente); }
    if (cambios.transporteAcopladoPatente !== undefined) { sets.push('transporte_acoplado_patente = ?'); vals.push(cambios.transporteAcopladoPatente || null); }
    if (cambios.transportePrecintos !== undefined)       { sets.push('transporte_precintos = ?');        vals.push(cambios.transportePrecintos || null); }

    vals.push(id);
    await pool.query(`UPDATE guias_savean SET ${sets.join(', ')} WHERE guiaId = ?`, vals);

    const [[updated]] = await pool.query('SELECT * FROM guias_savean WHERE guiaId = ?', [id]);
    return res.json(formatGuia(updated));
  } catch (err) {
    console.error('[PATCH /savean/guias/:id/modificar-verificar]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── barreras ─────────────────────────────────────────────────────────────────

// GET /api/savean/barreras — PUBLIC
router.get('/barreras', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM barreras_savean WHERE activa = 1 ORDER BY nombre ASC');
    return res.json({ barreras: rows.map(formatBarrera) });
  } catch (err) {
    console.error('[GET /savean/barreras]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/savean/barreras — AUTH + admin
router.post('/barreras', autenticar, soloSavean, soloAdmin, async (req, res) => {
  try {
    const { nombre, ruta, kilometro, departamento, activa = true } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre es obligatorio' });
    const barreraId = uuidv4();
    await pool.query(
      'INSERT INTO barreras_savean (barreraId, nombre, ruta, kilometro, departamento, activa) VALUES (?, ?, ?, ?, ?, ?)',
      [barreraId, nombre, ruta || null, kilometro || null, departamento || null, activa ? 1 : 0]
    );
    const [[row]] = await pool.query('SELECT * FROM barreras_savean WHERE barreraId = ?', [barreraId]);
    return res.status(201).json(formatBarrera(row));
  } catch (err) {
    console.error('[POST /savean/barreras]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── barreristas ──────────────────────────────────────────────────────────────

// GET /api/savean/barreristas — AUTH
router.get('/barreristas', autenticar, soloSavean, async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM barreristas_savean ORDER BY nombre ASC');
    return res.json({ barreristas: rows.map(formatBarrerista) });
  } catch (err) {
    console.error('[GET /savean/barreristas]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/savean/barreristas — AUTH + admin
router.post('/barreristas', autenticar, soloSavean, soloAdmin, async (req, res) => {
  try {
    const { nombre, usuario, activo = true } = req.body;
    if (!nombre || !usuario) return res.status(400).json({ error: 'nombre y usuario son obligatorios' });
    const barreristId = uuidv4();
    await pool.query(
      'INSERT INTO barreristas_savean (barreristId, nombre, usuario, activo) VALUES (?, ?, ?, ?)',
      [barreristId, nombre, usuario, activo ? 1 : 0]
    );
    const [[row]] = await pool.query('SELECT * FROM barreristas_savean WHERE barreristId = ?', [barreristId]);
    return res.status(201).json(formatBarrerista(row));
  } catch (err) {
    console.error('[POST /savean/barreristas]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/savean/barreristas/:id — AUTH + admin
router.patch('/barreristas/:id', autenticar, soloSavean, soloAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, usuario, activo } = req.body;
    const sets = [];
    const vals = [];
    if (nombre !== undefined)  { sets.push('nombre = ?');  vals.push(nombre); }
    if (usuario !== undefined) { sets.push('usuario = ?'); vals.push(usuario); }
    if (activo !== undefined)  { sets.push('activo = ?');  vals.push(activo ? 1 : 0); }
    if (sets.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    vals.push(id);
    const [result] = await pool.query(`UPDATE barreristas_savean SET ${sets.join(', ')} WHERE barreristId = ?`, vals);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Barrerista no encontrado' });
    const [[row]] = await pool.query('SELECT * FROM barreristas_savean WHERE barreristId = ?', [id]);
    return res.json(formatBarrerista(row));
  } catch (err) {
    console.error('[PATCH /savean/barreristas/:id]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/savean/barreristas/:id — AUTH + admin
router.delete('/barreristas/:id', autenticar, soloSavean, soloAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM barreristas_savean WHERE barreristId = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Barrerista no encontrado' });
    return res.status(204).send();
  } catch (err) {
    console.error('[DELETE /savean/barreristas/:id]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
