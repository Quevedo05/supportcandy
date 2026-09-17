const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db/connection');
const { autenticar } = require('../middleware/auth');
const { soloModulo } = require('../middleware/soloModulo');
const { enviarIngresoPorEmail } = require('../services/mailer');

const router = express.Router();
const soloSavean = soloModulo('savean');

// ─── middleware de rol ────────────────────────────────────────────────────────

function soloInspector(req, res, next) {
  // soloSavean ya garantiza modulo='savean'; solo bloqueamos el rol de sanidad
  if (req.usuario?.rol === 'sanidad') {
    return res.status(403).json({ error: 'Acceso denegado.' });
  }
  next();
}

function soloAdminOSanidad(req, res, next) {
  const rolesPermitidos = ['admin', 'sanidad'];
  if (!rolesPermitidos.includes(req.usuario?.rol)) {
    return res.status(403).json({ error: 'Acceso denegado.' });
  }
  next();
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseJson(val) {
  if (!val) return [];
  try { return typeof val === 'string' ? JSON.parse(val) : val; }
  catch { return []; }
}

function formatPlanilla(row, entradas = []) {
  return {
    id: row.planillaId,
    barreraId: row.barrera_id,
    barreraNombre: row.barrera_nombre,
    fecha: row.fecha instanceof Date
      ? row.fecha.toISOString().slice(0, 10)
      : String(row.fecha).slice(0, 10),
    horaInicio: row.hora_inicio,
    horaCierre: row.hora_cierre || null,
    estado: row.estado,
    serie: row.serie,
    numeroSerie: row.numero_serie,
    creadoEn: row.creado_en,
    entradas,
  };
}

function formatEntrada(row) {
  return {
    id: row.entradaId,
    planillaId: row.planilla_id,
    tipoVehiculo: row.tipo_vehiculo,
    patente: row.patente,
    procedencia: row.procedencia,
    decomisokKg: row.decomiso_kg ? Number(row.decomiso_kg) : null,
    decomisokFruta: row.decomiso_fruta || null,
    inspectorId: row.inspector_id,
    inspectorNombre: row.inspector_nombre,
    ingresoId: row.ingreso_id || null,
    fechaHora: row.fecha_hora,
  };
}

function formatIngreso(row) {
  return {
    id: row.ingresoId,
    numero: row.numero,
    entradaId: row.entrada_id || null,
    barreraId: row.barrera_id,
    barreraNombre: row.barrera_nombre,
    inspectorId: row.inspector_id,
    inspectorNombre: row.inspector_nombre,
    fechaHora: row.fecha_hora,
    // Acta
    actaTipo: row.acta_tipo,
    actaControl: row.acta_control || null,
    localidad: row.localidad || null,
    departamento: row.departamento || null,
    provincia: row.provincia || null,
    interesadoNombre: row.interesado_nombre || null,
    interesadoDni: row.interesado_dni || null,
    interesadoDomicilio: row.interesado_domicilio || null,
    interesadoLocalidad: row.interesado_localidad || null,
    interesadoProvincia: row.interesado_provincia || null,
    vehiculo: row.vehiculo || null,
    chasis: row.chasis || null,
    acoplado: row.acoplado || null,
    procedenteDe: row.procedente_de || null,
    destino: row.destino || null,
    declaracion: row.declaracion || null,
    // Declaración jurada
    remitenteNombre: row.remitente_nombre || null,
    remitenteCuit: row.remitente_cuit || null,
    remitenteLocalidadCod: row.remitente_localidad_cod || null,
    remitenteProvinciaCod: row.remitente_provincia_cod || null,
    destinatarioNombre: row.destinatario_nombre || null,
    destinatarioCuit: row.destinatario_cuit || null,
    destinatarioLocalidadCod: row.destinatario_localidad_cod || null,
    destinatarioProvinciaCod: row.destinatario_provincia_cod || null,
    destinoTipo: row.destino_tipo || null,
    productos: parseJson(row.productos),
    transporteEmpresa: row.transporte_empresa || null,
    transporteCuit: row.transporte_cuit || null,
    transportePatente: row.transporte_patente || null,
    transporteAcoplado: row.transporte_acoplado || null,
    transporteLicencia: row.transporte_licencia || null,
    // Email
    emailConductor: row.email_conductor || null,
    pdfEnviado: Boolean(row.pdf_enviado),
    creadoEn: row.creado_en,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANILLAS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/savean/entrada/planilla-actual?barreraId=xxx
// Devuelve la planilla abierta del día para esa barrera.
// Si no existe la crea. Si la del día anterior está abierta, la cierra primero.
router.get('/planilla-actual', autenticar, soloSavean, soloInspector, async (req, res) => {
  const { barreraId } = req.query;
  if (!barreraId) return res.status(400).json({ error: 'barreraId requerido' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const hoy = new Date().toISOString().slice(0, 10);

    // Cerrar planillas abiertas de días anteriores para esta barrera
    await conn.query(
      `UPDATE planillas_control_savean
         SET estado = 'cerrada', hora_cierre = '00:00:00'
       WHERE barrera_id = ? AND estado = 'abierta' AND fecha < ?`,
      [barreraId, hoy]
    );

    // Buscar planilla de hoy
    const [[existente]] = await conn.query(
      `SELECT p.*, b.nombre AS barrera_nombre_db
         FROM planillas_control_savean p
         LEFT JOIN barreras_savean b ON b.barreraId = p.barrera_id
        WHERE p.barrera_id = ? AND p.fecha = ?`,
      [barreraId, hoy]
    );

    if (existente) {
      await conn.commit();
      conn.release();
      return res.json(formatPlanilla(existente));
    }

    // Obtener nombre de barrera
    const [[barrera]] = await conn.query(
      'SELECT nombre FROM barreras_savean WHERE barreraId = ?',
      [barreraId]
    );
    if (!barrera) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Barrera no encontrada' });
    }

    const planillaId = uuidv4();
    const ahora = new Date();
    const horaInicio = ahora.toTimeString().slice(0, 8);

    await conn.query(
      `INSERT INTO planillas_control_savean
         (planillaId, barrera_id, barrera_nombre, fecha, hora_inicio, estado, serie)
       VALUES (?, ?, ?, ?, ?, 'abierta', '01')`,
      [planillaId, barreraId, barrera.nombre, hoy, horaInicio]
    );

    await conn.commit();

    const [[nueva]] = await conn.query(
      'SELECT * FROM planillas_control_savean WHERE planillaId = ?',
      [planillaId]
    );
    conn.release();
    return res.status(201).json(formatPlanilla(nueva));
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('[GET /savean/entrada/planilla-actual]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/savean/entrada/planillas — admin + sanidad
router.get('/planillas', autenticar, soloSavean, soloAdminOSanidad, async (req, res) => {
  const { fecha, barreraId } = req.query;
  try {
    let sql = `
      SELECT p.*,
        (SELECT COUNT(*) FROM entradas_planilla_savean WHERE planilla_id = p.planillaId AND tipo_vehiculo = 'auto')      AS autos_count,
        (SELECT COUNT(*) FROM entradas_planilla_savean WHERE planilla_id = p.planillaId AND tipo_vehiculo = 'colectivo') AS colectivos_count,
        (SELECT COUNT(*) FROM entradas_planilla_savean WHERE planilla_id = p.planillaId AND tipo_vehiculo = 'camion')    AS camiones_count,
        (SELECT COUNT(*) FROM entradas_planilla_savean WHERE planilla_id = p.planillaId)                                 AS total_count,
        (SELECT COUNT(*) FROM entradas_planilla_savean WHERE planilla_id = p.planillaId AND ingreso_id IS NOT NULL)      AS con_acta_count
      FROM planillas_control_savean p
      WHERE 1=1`;
    const params = [];
    if (fecha) { sql += ' AND p.fecha = ?'; params.push(fecha); }
    if (barreraId) { sql += ' AND p.barrera_id = ?'; params.push(barreraId); }
    sql += ' ORDER BY p.fecha DESC, p.creado_en DESC';

    const [rows] = await pool.query(sql, params);
    return res.json(rows.map(r => ({
      ...formatPlanilla(r),
      autosCount:      Number(r.autos_count),
      colectivosCount: Number(r.colectivos_count),
      camionesCount:   Number(r.camiones_count),
      totalCount:      Number(r.total_count),
      conActaCount:    Number(r.con_acta_count),
    })));
  } catch (err) {
    console.error('[GET /savean/entrada/planillas]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/savean/entrada/planillas/:id — con entradas
router.get('/planillas/:id', autenticar, soloSavean, soloAdminOSanidad, async (req, res) => {
  try {
    const [[planilla]] = await pool.query(
      'SELECT * FROM planillas_control_savean WHERE planillaId = ?',
      [req.params.id]
    );
    if (!planilla) return res.status(404).json({ error: 'Planilla no encontrada' });

    const [entradas] = await pool.query(
      'SELECT * FROM entradas_planilla_savean WHERE planilla_id = ? ORDER BY fecha_hora ASC',
      [req.params.id]
    );

    return res.json(formatPlanilla(planilla, entradas.map(formatEntrada)));
  } catch (err) {
    console.error('[GET /savean/entrada/planillas/:id]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ENTRADAS DE PLANILLA (registro de cada vehículo)
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/savean/entrada/entradas
// Registra un vehículo en la planilla del día.
router.post('/entradas', autenticar, soloSavean, soloInspector, async (req, res) => {
  const { planillaId, tipoVehiculo, patente, procedencia, decomisoCg, decomisoCFruta } = req.body;

  if (!planillaId || !tipoVehiculo || !patente || !procedencia) {
    return res.status(400).json({ error: 'planillaId, tipoVehiculo, patente y procedencia son obligatorios.' });
  }
  if (!['auto', 'colectivo', 'camion'].includes(tipoVehiculo)) {
    return res.status(400).json({ error: 'tipoVehiculo inválido.' });
  }

  try {
    const [[planilla]] = await pool.query(
      `SELECT * FROM planillas_control_savean WHERE planillaId = ? AND estado = 'abierta'`,
      [planillaId]
    );
    if (!planilla) return res.status(404).json({ error: 'Planilla no encontrada o ya cerrada.' });

    const entradaId = uuidv4();
    await pool.query(
      `INSERT INTO entradas_planilla_savean
         (entradaId, planilla_id, tipo_vehiculo, patente, procedencia,
          decomiso_kg, decomiso_fruta, inspector_id, inspector_nombre)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entradaId, planillaId, tipoVehiculo,
        patente.trim().toUpperCase(), procedencia.trim(),
        decomisoCg || null, decomisoCFruta || null,
        req.usuario.usuarioId, req.usuario.nombre || req.usuario.email,
      ]
    );

    const [[row]] = await pool.query(
      'SELECT * FROM entradas_planilla_savean WHERE entradaId = ?',
      [entradaId]
    );
    return res.status(201).json(formatEntrada(row));
  } catch (err) {
    console.error('[POST /savean/entrada/entradas]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// INGRESOS (acta + declaración jurada)
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/savean/entrada/ingresos
router.post('/ingresos', autenticar, soloSavean, soloInspector, async (req, res) => {
  const {
    entradaId, barreraId, barreraNombre,
    // Acta
    actaTipo, actaControl, localidad, departamento, provincia,
    interesadoNombre, interesadoDni,
    interesadoDomicilio, interesadoLocalidad, interesadoProvincia,
    vehiculo, chasis, acoplado, procedenteDe, destino, declaracion,
    // Declaración jurada
    remitenteNombre, remitenteCuit, remitenteLocalidadCod, remitenteProvinciaCod,
    destinatarioNombre, destinatarioCuit, destinatarioLocalidadCod, destinatarioProvinciaCod,
    destinoTipo, productos = [],
    transporteEmpresa, transporteCuit, transportePatente, transporteAcoplado, transporteLicencia,
    // Email
    emailConductor,
  } = req.body;

  if (!barreraId || !actaTipo) {
    return res.status(400).json({ error: 'barreraId y actaTipo son obligatorios.' });
  }
  const tiposValidos = ['inspeccion', 'rechazo', 'decomiso', 'infraccion', 'constatacion'];
  if (!tiposValidos.includes(actaTipo)) {
    return res.status(400).json({ error: 'actaTipo inválido.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const ingresoId = uuidv4();
    const ahora = new Date();
    const anio = ahora.getFullYear();

    const [[{ total }]] = await conn.query(
      'SELECT COUNT(*) AS total FROM ingresos_savean WHERE YEAR(fecha_hora) = ?',
      [anio]
    );
    const numero = `ENTRADA-${anio}-${String(Number(total) + 1).padStart(5, '0')}`;

    const inspectorNombre = req.usuario.nombre || req.usuario.email;

    await conn.query(
      `INSERT INTO ingresos_savean (
        ingresoId, numero, entrada_id,
        barrera_id, barrera_nombre, inspector_id, inspector_nombre, fecha_hora,
        acta_tipo, acta_control, localidad, departamento, provincia,
        interesado_nombre, interesado_dni,
        interesado_domicilio, interesado_localidad, interesado_provincia,
        vehiculo, chasis, acoplado, procedente_de, destino, declaracion,
        remitente_nombre, remitente_cuit, remitente_localidad_cod, remitente_provincia_cod,
        destinatario_nombre, destinatario_cuit, destinatario_localidad_cod, destinatario_provincia_cod,
        destino_tipo, productos,
        transporte_empresa, transporte_cuit, transporte_patente, transporte_acoplado, transporte_licencia,
        email_conductor, pdf_enviado
      ) VALUES (
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?, ?,
        ?, 0
      )`,
      [
        ingresoId, numero, entradaId || null,
        barreraId, barreraNombre || '',
        req.usuario.usuarioId, inspectorNombre, ahora,
        actaTipo, actaControl || null, localidad || null, departamento || null, provincia || null,
        interesadoNombre || null, interesadoDni || null,
        interesadoDomicilio || null, interesadoLocalidad || null, interesadoProvincia || null,
        vehiculo || null, chasis || null, acoplado || null, procedenteDe || null, destino || null, declaracion || null,
        remitenteNombre || null, remitenteCuit || null, remitenteLocalidadCod || null, remitenteProvinciaCod || null,
        destinatarioNombre || null, destinatarioCuit || null, destinatarioLocalidadCod || null, destinatarioProvinciaCod || null,
        destinoTipo || null, productos.length ? JSON.stringify(productos) : null,
        transporteEmpresa || null, transporteCuit || null, transportePatente || null,
        transporteAcoplado || null, transporteLicencia || null,
        emailConductor || null,
      ]
    );

    // Vincular con la fila de planilla si corresponde
    if (entradaId) {
      await conn.query(
        'UPDATE entradas_planilla_savean SET ingreso_id = ? WHERE entradaId = ?',
        [ingresoId, entradaId]
      );
    }

    await conn.commit();

    const [[row]] = await conn.query('SELECT * FROM ingresos_savean WHERE ingresoId = ?', [ingresoId]);
    conn.release();

    const ingreso = formatIngreso(row);

    // Enviar PDF por email si hay correo (asíncrono, no bloquea respuesta)
    if (emailConductor) {
      enviarIngresoPorEmail(ingreso).catch(err =>
        console.error('[Email ingreso SAVEAN]', err)
      );
    }

    return res.status(201).json(ingreso);
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('[POST /savean/entrada/ingresos]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/savean/entrada/planillas/:id/pdf — admin + sanidad
router.get('/planillas/:id/pdf', autenticar, soloSavean, soloAdminOSanidad, async (req, res) => {
  try {
    const [[planilla]] = await pool.query(
      'SELECT * FROM planillas_control_savean WHERE planillaId = ?',
      [req.params.id]
    );
    if (!planilla) return res.status(404).json({ error: 'Planilla no encontrada' });

    const [entradasRows] = await pool.query(
      'SELECT * FROM entradas_planilla_savean WHERE planilla_id = ? ORDER BY fecha_hora ASC',
      [req.params.id]
    );

    const { generarPdfPlanilla } = require('../services/pdfPlanilla');
    const pdfBuffer = await generarPdfPlanilla(
      formatPlanilla(planilla),
      entradasRows.map(formatEntrada)
    );

    const fecha = planilla.fecha instanceof Date
      ? planilla.fecha.toISOString().slice(0, 10)
      : String(planilla.fecha).slice(0, 10);
    const nombre = planilla.barrera_nombre || 'barrera';
    const filename = `Planilla-${nombre}-${fecha}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('[GET /savean/entrada/planillas/:id/pdf]', err);
    return res.status(500).json({ error: 'Error al generar PDF' });
  }
});

// GET /api/savean/entrada/ingresos — admin + sanidad
router.get('/ingresos', autenticar, soloSavean, soloAdminOSanidad, async (req, res) => {
  const { fecha, barreraId, actaTipo } = req.query;
  try {
    let sql = 'SELECT * FROM ingresos_savean WHERE 1=1';
    const params = [];
    if (fecha) { sql += ' AND DATE(fecha_hora) = ?'; params.push(fecha); }
    if (barreraId) { sql += ' AND barrera_id = ?'; params.push(barreraId); }
    if (actaTipo) { sql += ' AND acta_tipo = ?'; params.push(actaTipo); }
    sql += ' ORDER BY fecha_hora DESC';

    const [rows] = await pool.query(sql, params);
    return res.json(rows.map(formatIngreso));
  } catch (err) {
    console.error('[GET /savean/entrada/ingresos]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/savean/entrada/ingresos/:id
router.get('/ingresos/:id', autenticar, soloSavean, soloAdminOSanidad, async (req, res) => {
  try {
    const [[row]] = await pool.query(
      'SELECT * FROM ingresos_savean WHERE ingresoId = ?',
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Ingreso no encontrado' });
    return res.json(formatIngreso(row));
  } catch (err) {
    console.error('[GET /savean/entrada/ingresos/:id]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/savean/entrada/ingresos/:id/pdf
router.get('/ingresos/:id/pdf', autenticar, soloSavean, async (req, res) => {
  try {
    const [[row]] = await pool.query(
      'SELECT * FROM ingresos_savean WHERE ingresoId = ?',
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Ingreso no encontrado' });

    const { generarPdfIngreso } = require('../services/pdfIngreso');
    const pdfBuffer = await generarPdfIngreso(formatIngreso(row));
    const filename = `${row.numero || row.ingresoId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('[GET /savean/entrada/ingresos/:id/pdf]', err);
    return res.status(500).json({ error: 'Error al generar PDF' });
  }
});

module.exports = router;
