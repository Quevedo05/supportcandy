const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db/connection');
const { autenticar } = require('../middleware/auth');
const { soloModulo } = require('../middleware/soloModulo');

const soloTickets = soloModulo('tickets');

const SUPERVISORES_EMAILS = ['precio@calidadsj.com.ar', 'vcastro@calidadsj.com.ar'];

const router = express.Router();

function formatTicket(row) {
  return {
    ticketId: row.ticketId,
    numero: row.numero,
    titulo: row.titulo,
    descripcion: row.descripcion,
    estado: row.estado,
    etapa: row.etapa || null,
    agentes: row.agentes ? JSON.parse(row.agentes) : [],
    prioridad: row.prioridad,
    asignadoA: row.asignado_a || null,
    formularioId: row.formularioId || null,
    formularioPrograma: row.formulario_programa || null,
    ciudadanoNombre: row.ciudadano_nombre || null,
    ciudadanoEmail: row.ciudadano_email || null,
    ciudadanoTelefono: row.ciudadano_telefono || null,
    ciudadanoDni: row.ciudadano_dni || null,
    tipoTramite: row.tipo_tramite || null,
    numeroLegajo: row.numero_legajo || null,
    numeroActa: row.numero_acta || null,
    fechaCreacion: row.fecha_creacion instanceof Date
      ? row.fecha_creacion.toISOString()
      : row.fecha_creacion,
    fechaCierre: row.fecha_cierre
      ? (row.fecha_cierre instanceof Date ? row.fecha_cierre.toISOString() : row.fecha_cierre)
      : null,
  };
}

// POST /api/tickets/crear-desde-formulario — PUBLIC (no JWT)
// Must be registered before /:ticketId routes so Express doesn't match
// the literal "crear-desde-formulario" as a ticketId param.
router.post('/crear-desde-formulario', async (req, res) => {
  try {
    const {
      formularioId,
      nombreCiudadano: _nombreA,
      ciudadanoNombre: _nombreB,
      emailCiudadano: _emailA,
      ciudadanoEmail: _emailB,
      telefonoCiudadano: _telA,
      ciudadanoTelefono: _telB,
      descripcion,
    } = req.body;

    const nombreCiudadano = _nombreA || _nombreB;
    const emailCiudadano = _emailA || _emailB;
    const telefonoCiudadano = _telA || _telB;

    const errores = {};
    if (!formularioId || typeof formularioId !== 'string') {
      errores.formularioId = 'El formularioId es requerido';
    }
    if (!nombreCiudadano || nombreCiudadano.trim().length < 2) {
      errores.nombreCiudadano = 'El nombre del ciudadano es requerido (mínimo 2 caracteres)';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailCiudadano || !emailRegex.test(emailCiudadano.trim())) {
      errores.emailCiudadano = 'El email del ciudadano no es válido';
    }
    if (!descripcion || descripcion.trim().length === 0) {
      errores.descripcion = 'La descripción es requerida';
    }

    if (Object.keys(errores).length > 0) {
      return res.status(400).json({ error: 'Datos inválidos', errores });
    }

    const [formRows] = await pool.query(
      'SELECT formularioId, programa, activo FROM formularios WHERE formularioId = ?',
      [formularioId]
    );

    if (formRows.length === 0) {
      return res.status(404).json({ error: 'Formulario no encontrado' });
    }
    if (!formRows[0].activo) {
      return res.status(404).json({ error: 'El formulario no está activo' });
    }

    const titulo = `Solicitud de ${nombreCiudadano.trim()} - ${formRows[0].programa}`;
    const ticketId = uuidv4();

    // Insert with numero=0 as placeholder; then set numero = id_seq (the AUTO_INCREMENT PK)
    const [result] = await pool.query(
      `INSERT INTO tickets
         (ticketId, titulo, descripcion, estado, prioridad, formularioId,
          ciudadano_nombre, ciudadano_email, ciudadano_telefono, numero)
       VALUES (?, ?, ?, 'abierto', 'media', ?, ?, ?, ?, 0)`,
      [
        ticketId,
        titulo,
        descripcion.trim(),
        formularioId,
        nombreCiudadano.trim(),
        emailCiudadano.trim().toLowerCase(),
        telefonoCiudadano ? telefonoCiudadano.trim() : null,
      ]
    );

    const idSeq = result.insertId;
    await pool.query('UPDATE tickets SET numero = ? WHERE id_seq = ?', [idSeq, idSeq]);

    return res.status(201).json({
      ticketId,
      estado: 'abierto',
      numero: idSeq,
      mensaje: `Ticket creado exitosamente. Su número de seguimiento es: ${idSeq}`,
    });
  } catch (err) {
    console.error('[POST /tickets/crear-desde-formulario]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/tickets/crear-manual — JWT required
// Permite crear tickets con programas no publicados (activo=0) desde el portal de agencia.
router.post('/crear-manual', autenticar, soloTickets, async (req, res) => {
  try {
    const {
      formularioId,
      nombre,
      dni,
      email,
      telefono,
      tipoTramite,
      legajo,
      numeroActa,
      asunto,
      descripcion,
    } = req.body;

    const errores = {};
    if (!nombre || nombre.trim().length < 2) errores.nombre = 'El nombre es requerido';
    if (!dni || !dni.trim()) errores.dni = 'El DNI es requerido';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) errores.email = 'El email no es válido';
    if (!telefono || !telefono.trim()) errores.telefono = 'El teléfono es requerido';
    const tiposTramiteValidos = ['N/A', 'ANR', 'COMPRA DE MATERIALES', 'CRÉDITO', 'HONORARIOS'];
    if (!tipoTramite || !tiposTramiteValidos.includes(tipoTramite)) errores.tipoTramite = 'Tipo de trámite inválido';
    if (!legajo || !legajo.trim()) errores.legajo = 'El número de legajo es requerido';
    if (!asunto || !asunto.trim()) errores.asunto = 'El asunto es requerido';
    if (!descripcion || !descripcion.trim()) errores.descripcion = 'La descripción es requerida';

    if (Object.keys(errores).length > 0) {
      return res.status(400).json({ error: 'Datos inválidos', errores });
    }

    if (formularioId) {
      const [formRows] = await pool.query(
        'SELECT formularioId FROM formularios WHERE formularioId = ?',
        [formularioId]
      );
      if (formRows.length === 0) {
        return res.status(404).json({ error: 'Programa no encontrado' });
      }
    }

    const ticketId = uuidv4();

    const [result] = await pool.query(
      `INSERT INTO tickets
         (ticketId, titulo, descripcion, estado, prioridad, formularioId,
          ciudadano_nombre, ciudadano_email, ciudadano_telefono,
          ciudadano_dni, tipo_tramite, numero_legajo, numero_acta, numero)
       VALUES (?, ?, ?, 'abierto', 'media', ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        ticketId,
        asunto.trim(),
        descripcion.trim(),
        formularioId || null,
        nombre.trim(),
        email.trim().toLowerCase(),
        telefono ? telefono.trim() : null,
        dni.trim(),
        tipoTramite,
        legajo.trim(),
        numeroActa ? numeroActa.trim() : null,
      ]
    );

    const idSeq = result.insertId;
    await pool.query('UPDATE tickets SET numero = ? WHERE id_seq = ?', [idSeq, idSeq]);

    const [rows] = await pool.query(
      `SELECT t.ticketId, t.numero, t.titulo, t.descripcion, t.estado, t.etapa, t.agentes, t.prioridad,
              t.asignado_a, t.formularioId, t.ciudadano_nombre, t.ciudadano_email,
              t.ciudadano_telefono, t.ciudadano_dni, t.tipo_tramite, t.numero_legajo, t.numero_acta,
              t.fecha_creacion, t.fecha_cierre,
              f.programa AS formulario_programa
       FROM tickets t
       LEFT JOIN formularios f ON f.formularioId = t.formularioId
       WHERE t.ticketId = ?`,
      [ticketId]
    );

    return res.status(201).json(formatTicket(rows[0]));
  } catch (err) {
    console.error('[POST /tickets/crear-manual]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/tickets — JWT required
router.get('/', autenticar, soloTickets, async (req, res) => {
  try {
    const { estado, formularioId, asignadoA } = req.query;
    const skip = Math.max(0, parseInt(req.query.skip || '0', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));

    const conditions = [];
    const params = [];

    if (estado) {
      const estadosValidos = ['abierto', 'en_progreso', 'cerrado'];
      if (!estadosValidos.includes(estado)) {
        return res.status(400).json({
          error: `Estado inválido. Valores permitidos: ${estadosValidos.join(', ')}`,
        });
      }
      conditions.push('t.estado = ?');
      params.push(estado);
    }

    if (formularioId) {
      conditions.push('t.formularioId = ?');
      params.push(formularioId);
    }

    if (asignadoA) {
      conditions.push('t.asignado_a = ?');
      params.push(asignadoA);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM tickets t ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT t.ticketId, t.numero, t.titulo, t.estado, t.etapa, t.agentes, t.prioridad,
              t.asignado_a, t.formularioId, t.ciudadano_nombre, t.ciudadano_email,
              t.ciudadano_telefono, t.ciudadano_dni, t.tipo_tramite, t.numero_legajo, t.numero_acta,
              t.fecha_creacion, t.fecha_cierre,
              f.programa AS formulario_programa
       FROM tickets t
       LEFT JOIN formularios f ON f.formularioId = t.formularioId
       ${whereClause}
       ORDER BY t.fecha_creacion DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, skip]
    );

    return res.status(200).json({
      tickets: rows.map(formatTicket),
      total,
      skip,
      limit,
    });
  } catch (err) {
    console.error('[GET /tickets]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/tickets/:ticketId — JWT required, retorna ticket completo con descripción
router.get('/:ticketId', autenticar, soloTickets, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const [rows] = await pool.query(
      `SELECT t.ticketId, t.numero, t.titulo, t.descripcion, t.estado, t.etapa, t.agentes, t.prioridad,
              t.asignado_a, t.formularioId, t.ciudadano_nombre, t.ciudadano_email,
              t.ciudadano_telefono, t.ciudadano_dni, t.tipo_tramite, t.numero_legajo, t.numero_acta,
              t.fecha_creacion, t.fecha_cierre,
              f.programa AS formulario_programa
       FROM tickets t
       LEFT JOIN formularios f ON f.formularioId = t.formularioId
       WHERE t.ticketId = ?`,
      [ticketId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }
    return res.status(200).json(formatTicket(rows[0]));
  } catch (err) {
    console.error('[GET /tickets/:id]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/tickets/:ticketId — JWT required
router.patch('/:ticketId', autenticar, soloTickets, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { estado, prioridad, asignadoA, etapa, agentes } = req.body;

    const [rows] = await pool.query(
      'SELECT ticketId, agentes FROM tickets WHERE ticketId = ?',
      [ticketId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    if (req.usuario.rol !== 'admin' && !SUPERVISORES_EMAILS.includes(req.usuario.email)) {
      const agentesTicket = rows[0].agentes ? JSON.parse(rows[0].agentes) : [];
      if (!agentesTicket.includes(req.usuario.nombre)) {
        return res.status(403).json({ error: 'No tenés permisos para modificar este ticket' });
      }
    }

    const setClauses = [];
    const params = [];

    if (estado !== undefined) {
      const estadosValidos = ['abierto', 'en_progreso', 'cerrado'];
      if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }
      setClauses.push('estado = ?');
      params.push(estado);
      if (estado === 'cerrado') {
        setClauses.push('fecha_cierre = NOW()');
      } else {
        setClauses.push('fecha_cierre = NULL');
      }
    }

    if (prioridad !== undefined) {
      const prioridadesValidas = ['baja', 'media', 'alta', 'critica'];
      if (!prioridadesValidas.includes(prioridad)) {
        return res.status(400).json({ error: 'Prioridad inválida' });
      }
      setClauses.push('prioridad = ?');
      params.push(prioridad);
    }

    if (asignadoA !== undefined) {
      if (asignadoA === null) {
        setClauses.push('asignado_a = NULL');
      } else {
        const [userRows] = await pool.query(
          'SELECT usuarioId FROM usuarios WHERE usuarioId = ? AND activo = 1',
          [asignadoA]
        );
        if (userRows.length === 0) {
          return res.status(404).json({ error: 'Usuario asignado no encontrado o inactivo' });
        }
        setClauses.push('asignado_a = ?');
        params.push(asignadoA);
      }
    }

    if (etapa !== undefined) {
      setClauses.push('etapa = ?');
      params.push(etapa || null);
    }

    if (agentes !== undefined) {
      setClauses.push('agentes = ?');
      params.push(Array.isArray(agentes) ? JSON.stringify(agentes) : null);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'Debe proporcionar al menos un campo para actualizar' });
    }

    params.push(ticketId);
    await pool.query(
      `UPDATE tickets SET ${setClauses.join(', ')} WHERE ticketId = ?`,
      params
    );

    const [updatedRows] = await pool.query(
      `SELECT t.ticketId, t.numero, t.titulo, t.descripcion, t.estado, t.etapa, t.agentes, t.prioridad,
              t.asignado_a, t.formularioId, t.ciudadano_nombre, t.ciudadano_email,
              t.ciudadano_telefono, t.ciudadano_dni, t.tipo_tramite, t.numero_legajo, t.numero_acta,
              t.fecha_creacion, t.fecha_cierre,
              f.programa AS formulario_programa
       FROM tickets t
       LEFT JOIN formularios f ON f.formularioId = t.formularioId
       WHERE t.ticketId = ?`,
      [ticketId]
    );

    return res.status(200).json(formatTicket(updatedRows[0]));
  } catch (err) {
    console.error('[PATCH /tickets/:id]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/tickets/:ticketId — JWT required
router.delete('/:ticketId', autenticar, soloTickets, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const [rows] = await pool.query('SELECT ticketId FROM tickets WHERE ticketId = ?', [ticketId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }
    await pool.query('DELETE FROM tickets WHERE ticketId = ?', [ticketId]);
    return res.status(200).json({ mensaje: 'Ticket eliminado' });
  } catch (err) {
    console.error('[DELETE /tickets/:id]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/tickets/:ticketId/comentarios — JWT required, cualquier usuario autenticado
router.get('/:ticketId/comentarios', autenticar, soloTickets, async (req, res) => {
  try {
    const { ticketId } = req.params;

    const [ticketRows] = await pool.query(
      'SELECT ticketId FROM tickets WHERE ticketId = ?',
      [ticketId]
    );
    if (ticketRows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    const [comentarios] = await pool.query(
      `SELECT c.comentarioId, c.ticketId, c.contenido, c.fecha,
              u.nombre AS autorNombre, u.rol AS autorRol
       FROM comentarios c
       JOIN usuarios u ON u.usuarioId = c.autor_id
       WHERE c.ticketId = ?
       ORDER BY c.fecha ASC`,
      [ticketId]
    );

    return res.status(200).json({ comentarios });
  } catch (err) {
    console.error('[GET /tickets/:id/comentarios]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/tickets/:ticketId/comentarios — JWT required, solo asignado o admin
router.post('/:ticketId/comentarios', autenticar, soloTickets, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { contenido } = req.body;

    if (!contenido || contenido.trim().length === 0) {
      return res.status(400).json({ error: 'El contenido del comentario es requerido' });
    }

    const [ticketRows] = await pool.query(
      'SELECT ticketId, agentes, asignado_a FROM tickets WHERE ticketId = ?',
      [ticketId]
    );
    if (ticketRows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    if (req.usuario.rol !== 'admin' && !SUPERVISORES_EMAILS.includes(req.usuario.email)) {
      const agentesTicket = ticketRows[0].agentes ? JSON.parse(ticketRows[0].agentes) : [];
      if (!agentesTicket.includes(req.usuario.nombre)) {
        return res.status(403).json({ error: 'Solo el agente asignado puede agregar comentarios' });
      }
    }

    const comentarioId = uuidv4();
    const now = new Date();

    await pool.query(
      `INSERT INTO comentarios (comentarioId, ticketId, autor_id, contenido, fecha)
       VALUES (?, ?, ?, ?, ?)`,
      [comentarioId, ticketId, req.usuario.usuarioId, contenido.trim(), now]
    );

    return res.status(201).json({
      comentarioId,
      ticketId,
      autorId: req.usuario.usuarioId,
      contenido: contenido.trim(),
      fecha: now.toISOString(),
    });
  } catch (err) {
    console.error('[POST /tickets/:id/comentarios]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
