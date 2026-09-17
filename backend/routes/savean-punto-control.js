'use strict';
const express = require('express');
const { pool } = require('../db/connection');
const { autenticar } = require('../middleware/auth');
const { soloModulo } = require('../middleware/soloModulo');

const router = express.Router();
const soloSavean = soloModulo('savean');

function soloPuntoControl(req, res, next) {
  const roles = ['punto_control', 'admin', 'dev'];
  if (!roles.includes(req.usuario?.rol)) {
    return res.status(403).json({ error: 'Acceso denegado.' });
  }
  next();
}

function formatTransporte(row) {
  return {
    id: row.id,
    numero: row.numero,
    barreraId: row.barrera_id,
    barreraNombre: row.barrera_nombre,
    inspectorId: row.inspector_id,
    inspectorNombre: row.inspector_nombre,
    fechaCruce: row.fecha_cruce,
    patente: row.patente,
    empresaOrigen: row.empresa_origen || null,
    senasaNumero: row.senasa_numero || null,
    telefonoChofer: row.telefono_chofer || null,
    tipoCargaDetalle: row.tipo_carga_detalle || null,
    destinoComercial: row.destino_comercial || null,
    destinoTipo: row.destino_tipo || null,
    estado: row.estado,
    fechaRecepcion: row.fecha_recepcion || null,
    observaciones: row.observaciones || null,
    ingresoId: row.ingreso_id || null,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
  };
}

// GET /api/savean/punto-control/transportes
router.get('/transportes', autenticar, soloSavean, soloPuntoControl, async (req, res) => {
  const { estado, barreraId, patente, empresa, fechaDesde, fechaHasta } = req.query;
  try {
    let sql = 'SELECT * FROM transportes_carnicos WHERE 1=1';
    const params = [];
    if (estado)     { sql += ' AND estado = ?';              params.push(estado); }
    if (barreraId)  { sql += ' AND barrera_id = ?';          params.push(barreraId); }
    if (patente)    { sql += ' AND patente LIKE ?';           params.push(`%${patente}%`); }
    if (empresa)    { sql += ' AND empresa_origen LIKE ?';    params.push(`%${empresa}%`); }
    if (fechaDesde) { sql += ' AND fecha_cruce >= ?';         params.push(fechaDesde); }
    if (fechaHasta) { sql += ' AND fecha_cruce <= ?';         params.push(`${fechaHasta} 23:59:59`); }
    sql += ' ORDER BY fecha_cruce DESC';

    const [rows] = await pool.query(sql, params);
    return res.json(rows.map(formatTransporte));
  } catch (err) {
    console.error('[GET /savean/punto-control/transportes]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/savean/punto-control/transportes/:id/recibir
router.patch('/transportes/:id/recibir', autenticar, soloSavean, soloPuntoControl, async (req, res) => {
  const { observaciones } = req.body;
  try {
    const [[row]] = await pool.query('SELECT * FROM transportes_carnicos WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Transporte no encontrado' });

    await pool.query(
      `UPDATE transportes_carnicos
         SET estado = 'recibido', fecha_recepcion = NOW(),
             observaciones = ?, actualizado_en = NOW()
       WHERE id = ?`,
      [observaciones ?? row.observaciones, req.params.id]
    );
    const [[updated]] = await pool.query('SELECT * FROM transportes_carnicos WHERE id = ?', [req.params.id]);
    return res.json(formatTransporte(updated));
  } catch (err) {
    console.error('[PATCH /transportes/:id/recibir]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/savean/punto-control/transportes/:id/alerta
router.patch('/transportes/:id/alerta', autenticar, soloSavean, soloPuntoControl, async (req, res) => {
  const { observaciones } = req.body;
  try {
    const [[row]] = await pool.query('SELECT * FROM transportes_carnicos WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Transporte no encontrado' });

    await pool.query(
      `UPDATE transportes_carnicos
         SET estado = 'alerta', observaciones = ?, actualizado_en = NOW()
       WHERE id = ?`,
      [observaciones ?? row.observaciones, req.params.id]
    );
    const [[updated]] = await pool.query('SELECT * FROM transportes_carnicos WHERE id = ?', [req.params.id]);
    return res.json(formatTransporte(updated));
  } catch (err) {
    console.error('[PATCH /transportes/:id/alerta]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/savean/punto-control/transportes/:id/no-recibido
router.patch('/transportes/:id/no-recibido', autenticar, soloSavean, soloPuntoControl, async (req, res) => {
  const { observaciones } = req.body;
  try {
    const [[row]] = await pool.query('SELECT * FROM transportes_carnicos WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Transporte no encontrado' });

    await pool.query(
      `UPDATE transportes_carnicos
         SET estado = 'no_recibido', observaciones = ?, actualizado_en = NOW()
       WHERE id = ?`,
      [observaciones ?? row.observaciones, req.params.id]
    );
    const [[updated]] = await pool.query('SELECT * FROM transportes_carnicos WHERE id = ?', [req.params.id]);
    return res.json(formatTransporte(updated));
  } catch (err) {
    console.error('[PATCH /transportes/:id/no-recibido]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
