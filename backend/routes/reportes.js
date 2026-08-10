const express = require('express');
const { pool } = require('../db/connection');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

function soloSupervisor(req, res, next) {
  if (req.usuario.rol !== 'supervisor' && req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado: se requiere rol de supervisor o admin' });
  }
  next();
}

// GET /api/reportes/resumen
router.get('/resumen', autenticar, soloSupervisor, async (req, res) => {
  try {
    const [[totalesRow]] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN etapa = 'Cerrado' THEN 1 ELSE 0 END) AS cerrados,
         SUM(CASE WHEN (etapa IS NULL OR etapa != 'Cerrado') THEN 1 ELSE 0 END) AS abiertos,
         SUM(CASE WHEN fecha_creacion >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS ultimos30dias
       FROM tickets WHERE eliminado = 0`
    );

    const [porEtapa] = await pool.query(
      `SELECT COALESCE(etapa, 'Sin etapa') AS etapa, COUNT(*) AS total
       FROM tickets WHERE eliminado = 0
       GROUP BY etapa ORDER BY total DESC`
    );

    const [porEstado] = await pool.query(
      `SELECT estado, COUNT(*) AS total
       FROM tickets WHERE eliminado = 0
       GROUP BY estado ORDER BY total DESC`
    );

    const [porPrograma] = await pool.query(
      `SELECT COALESCE(f.programa, 'Sin programa') AS programa, COUNT(*) AS total
       FROM tickets t
       LEFT JOIN formularios f ON f.formularioId = t.formularioId
       WHERE t.eliminado = 0
       GROUP BY f.programa ORDER BY total DESC`
    );

    const [porPrioridad] = await pool.query(
      `SELECT COALESCE(prioridad, 'sin_prioridad') AS prioridad, COUNT(*) AS total
       FROM tickets WHERE eliminado = 0
       GROUP BY prioridad ORDER BY total DESC`
    );

    return res.json({ totales: totalesRow, porEtapa, porEstado, porPrograma, porPrioridad });
  } catch (err) {
    console.error('[GET /reportes/resumen]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/reportes/por-agente
router.get('/por-agente', autenticar, soloSupervisor, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT agentes, etapa FROM tickets WHERE eliminado = 0 AND agentes IS NOT NULL AND agentes != '[]'`
    );

    const conteo = {};
    for (const row of rows) {
      let agentes = [];
      try { agentes = JSON.parse(row.agentes || '[]'); } catch { agentes = []; }
      for (const agente of agentes) {
        if (!agente) continue;
        if (!conteo[agente]) conteo[agente] = { nombre: agente, total: 0, abiertos: 0, cerrados: 0 };
        conteo[agente].total++;
        if (row.etapa === 'Cerrado') conteo[agente].cerrados++;
        else conteo[agente].abiertos++;
      }
    }

    const agentes = Object.values(conteo).sort((a, b) => b.total - a.total);
    return res.json({ agentes });
  } catch (err) {
    console.error('[GET /reportes/por-agente]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/reportes/por-periodo
router.get('/por-periodo', autenticar, soloSupervisor, async (req, res) => {
  try {
    const [meses] = await pool.query(
      `SELECT
         DATE_FORMAT(fecha_creacion, '%Y-%m') AS mes,
         COUNT(*) AS creados,
         SUM(CASE WHEN etapa = 'Cerrado' THEN 1 ELSE 0 END) AS cerrados
       FROM tickets
       WHERE eliminado = 0 AND fecha_creacion >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY mes ORDER BY mes ASC`
    );
    return res.json({ meses });
  } catch (err) {
    console.error('[GET /reportes/por-periodo]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/reportes/tiempo-resolucion
router.get('/tiempo-resolucion', autenticar, soloSupervisor, async (req, res) => {
  try {
    // Tiempo de resolución usando el primer evento_etapa donde nueva='Cerrado'
    const [cierresRaw] = await pool.query(
      `SELECT c.ticketId, MIN(c.fecha) AS fecha_cierre, t.fecha_creacion,
              COALESCE(f.programa, 'Sin programa') AS programa
       FROM comentarios c
       JOIN tickets t ON t.ticketId = c.ticketId
       LEFT JOIN formularios f ON f.formularioId = t.formularioId
       WHERE c.tipo = 'evento_etapa'
         AND JSON_UNQUOTE(JSON_EXTRACT(c.contenido, '$.nueva')) = 'Cerrado'
         AND t.eliminado = 0
       GROUP BY c.ticketId, t.fecha_creacion, f.programa`
    );

    let global = { promedioDias: null, minDias: null, maxDias: null, total: 0 };
    const progMap = {};

    if (cierresRaw.length > 0) {
      const dias = cierresRaw.map((r) => {
        const d = (new Date(r.fecha_cierre) - new Date(r.fecha_creacion)) / (1000 * 60 * 60 * 24);
        if (!progMap[r.programa]) progMap[r.programa] = [];
        progMap[r.programa].push(d);
        return d;
      });
      global = {
        promedioDias: Math.round(dias.reduce((a, b) => a + b, 0) / dias.length * 10) / 10,
        minDias: Math.round(Math.min(...dias) * 10) / 10,
        maxDias: Math.round(Math.max(...dias) * 10) / 10,
        total: dias.length,
      };
    }

    const porPrograma = Object.entries(progMap).map(([programa, dias]) => ({
      programa,
      promedioDias: Math.round(dias.reduce((a, b) => a + b, 0) / dias.length * 10) / 10,
      total: dias.length,
    })).sort((a, b) => a.promedioDias - b.promedioDias);

    // Tiempo promedio en cada etapa (requiere eventos registrados con tipo='evento_etapa')
    const [eventosEtapa] = await pool.query(
      `SELECT ticketId, contenido, fecha FROM comentarios
       WHERE tipo = 'evento_etapa' ORDER BY ticketId ASC, fecha ASC`
    );

    const ticketEventos = {};
    for (const e of eventosEtapa) {
      if (!ticketEventos[e.ticketId]) ticketEventos[e.ticketId] = [];
      try {
        ticketEventos[e.ticketId].push({ data: JSON.parse(e.contenido), fecha: new Date(e.fecha) });
      } catch { /* ignorar entradas malformadas */ }
    }

    const tiemposPorEtapa = {};
    for (const evts of Object.values(ticketEventos)) {
      for (let i = 1; i < evts.length; i++) {
        const etapaAnterior = evts[i].data && evts[i].data.anterior;
        if (!etapaAnterior) continue;
        const horas = (evts[i].fecha - evts[i - 1].fecha) / (1000 * 60 * 60);
        if (horas < 0 || horas > 8760) continue; // descartar anomalías > 1 año
        if (!tiemposPorEtapa[etapaAnterior]) tiemposPorEtapa[etapaAnterior] = [];
        tiemposPorEtapa[etapaAnterior].push(horas);
      }
    }

    const porEtapa = Object.entries(tiemposPorEtapa).map(([etapa, horas]) => ({
      etapa,
      promedioHoras: Math.round(horas.reduce((a, b) => a + b, 0) / horas.length * 10) / 10,
      promedioDias: Math.round(horas.reduce((a, b) => a + b, 0) / horas.length / 24 * 10) / 10,
      muestras: horas.length,
    })).sort((a, b) => b.promedioDias - a.promedioDias);

    return res.json({ global, porPrograma, porEtapa });
  } catch (err) {
    console.error('[GET /reportes/tiempo-resolucion]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/reportes/exportar — descarga CSV con todos los tickets
router.get('/exportar', autenticar, soloSupervisor, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         t.numero, t.ciudadano_nombre, t.ciudadano_dni, t.ciudadano_email, t.ciudadano_telefono,
         t.tipo_tramite, t.numero_legajo, t.numero_acta,
         COALESCE(f.programa, 'Sin programa') AS programa,
         t.estado, t.etapa, t.prioridad,
         t.agentes, t.importe,
         DATE_FORMAT(t.fecha_creacion, '%d/%m/%Y %H:%i') AS fecha_creacion,
         DATE_FORMAT(t.fecha_cierre, '%d/%m/%Y %H:%i') AS fecha_cierre,
         DATEDIFF(NOW(), t.fecha_creacion) AS dias_abierto
       FROM tickets t
       LEFT JOIN formularios f ON f.formularioId = t.formularioId
       WHERE t.eliminado = 0
       ORDER BY t.fecha_creacion DESC`
    );

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      'Nro', 'Nombre', 'DNI', 'Email', 'Teléfono',
      'Tipo trámite', 'Nro legajo', 'Nro acta', 'Programa',
      'Estado', 'Etapa', 'Prioridad', 'Agentes', 'Importe',
      'Fecha creación', 'Fecha cierre', 'Días abierto',
    ];

    const lines = [headers.map(escapeCsv).join(',')];
    for (const r of rows) {
      let agentes = '';
      try { agentes = JSON.parse(r.agentes || '[]').join('; '); } catch { agentes = ''; }
      lines.push([
        r.numero, r.ciudadano_nombre, r.ciudadano_dni, r.ciudadano_email, r.ciudadano_telefono,
        r.tipo_tramite, r.numero_legajo, r.numero_acta, r.programa,
        r.estado, r.etapa, r.prioridad, agentes, r.importe,
        r.fecha_creacion, r.fecha_cierre, r.dias_abierto,
      ].map(escapeCsv).join(','));
    }

    const csv = '﻿' + lines.join('\r\n'); // BOM para Excel
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="tickets_${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(csv);
  } catch (err) {
    console.error('[GET /reportes/exportar]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
