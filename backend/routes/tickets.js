const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db/connection');
const { autenticar } = require('../middleware/auth');
const { soloModulo } = require('../middleware/soloModulo');
const { enviarAsignacionTicket } = require('../services/mailer');

const soloTickets = soloModulo('tickets');

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
    importe: row.importe != null ? Number(row.importe) : null,
    codigoExterno: row.codigo_externo || null,
    observaciones: row.observaciones || null,
    leido: row.leido === 1 || row.leido === true,
    eliminado: row.eliminado === 1 || row.eliminado === true,
    eliminadoPor: row.eliminado_por || null,
    fechaEliminacion: row.fecha_eliminacion
      ? (row.fecha_eliminacion instanceof Date ? row.fecha_eliminacion.toISOString() : row.fecha_eliminacion)
      : null,
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
              t.importe, t.codigo_externo, t.observaciones,
              t.leido, t.fecha_creacion, t.fecha_cierre,
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
    const limit = Math.min(2000, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const incluirEliminados = req.query.incluir_eliminados === '1';

    const conditions = [];
    const params = [];

    if (!incluirEliminados) {
      conditions.push('t.eliminado = 0');
    }

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
              t.importe, t.codigo_externo, t.observaciones,
              t.leido, t.eliminado, t.eliminado_por, t.fecha_eliminacion, t.fecha_creacion, t.fecha_cierre,
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

// GET /api/tickets/consultar/:numero — público, sin auth, para que el ciudadano consulte su estado
router.get('/consultar/:numero', async (req, res) => {
  try {
    const numero = parseInt(req.params.numero, 10);
    if (!numero || isNaN(numero)) {
      return res.status(400).json({ error: 'Número de trámite inválido' });
    }
    const [rows] = await pool.query(
      `SELECT t.numero, t.titulo, t.estado, t.etapa, t.fecha_creacion,
              f.programa AS formulario_programa
       FROM tickets t
       LEFT JOIN formularios f ON f.formularioId = t.formularioId
       WHERE t.numero = ?`,
      [numero]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No se encontró ningún trámite con ese número' });
    }
    const t = rows[0];
    return res.status(200).json({
      numero: t.numero,
      programa: t.formulario_programa || t.titulo || 'Sin programa',
      estado: t.etapa || (t.estado === 'cerrado' ? 'Cerrado' : 'Solicitud inicial'),
      fechaIngreso: t.fecha_creacion,
    });
  } catch (err) {
    console.error('[GET /tickets/consultar/:numero]', err);
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
              t.importe, t.codigo_externo, t.observaciones,
              t.leido, t.fecha_creacion, t.fecha_cierre,
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
    const { estado, prioridad, asignadoA, etapa, agentes, descripcion, ciudadanoNombre, ciudadanoEmail, ciudadanoTelefono, ciudadanoDni, legajo, numeroActa, importe, codigoExterno, observaciones, formularioId: nuevoFormularioId } = req.body;

    const [rows] = await pool.query(
      'SELECT ticketId, agentes FROM tickets WHERE ticketId = ?',
      [ticketId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    if (req.usuario.rol !== 'admin') {
      const agentesTicket = rows[0].agentes ? JSON.parse(rows[0].agentes) : [];
      const estaAsignado = agentesTicket.includes(req.usuario.nombre);
      if (!estaAsignado && !req.usuario.puedeEditarDatos) {
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

    if (descripcion !== undefined) {
      if (req.usuario.rol !== 'admin' && !req.usuario.puedeEditarDatos) {
        return res.status(403).json({ error: 'No tenés permiso para editar los datos de la solicitud' });
      }
      setClauses.push('descripcion = ?');
      params.push(descripcion);
    }

    if (ciudadanoNombre !== undefined || ciudadanoEmail !== undefined || ciudadanoTelefono !== undefined || ciudadanoDni !== undefined) {
      if (req.usuario.rol !== 'admin' && !req.usuario.puedeEditarDatos) {
        return res.status(403).json({ error: 'Solo los supervisores pueden editar datos del solicitante' });
      }
      if (ciudadanoNombre !== undefined) { setClauses.push('ciudadano_nombre = ?'); params.push(ciudadanoNombre || null); }
      if (ciudadanoEmail !== undefined) { setClauses.push('ciudadano_email = ?'); params.push(ciudadanoEmail || null); }
      if (ciudadanoTelefono !== undefined) { setClauses.push('ciudadano_telefono = ?'); params.push(ciudadanoTelefono || null); }
      if (ciudadanoDni !== undefined) { setClauses.push('ciudadano_dni = ?'); params.push(ciudadanoDni || null); }
    }

    if (legajo !== undefined || numeroActa !== undefined) {
      if (req.usuario.rol !== 'admin' && !req.usuario.puedeEditarDatos) {
        return res.status(403).json({ error: 'Solo los supervisores pueden editar datos del legajo' });
      }
      if (legajo !== undefined) { setClauses.push('numero_legajo = ?'); params.push(legajo || null); }
      if (numeroActa !== undefined) { setClauses.push('numero_acta = ?'); params.push(numeroActa || null); }
    }

    if (importe !== undefined || codigoExterno !== undefined || observaciones !== undefined) {
      if (req.usuario.rol !== 'admin' && !req.usuario.puedeEditarDatos) {
        return res.status(403).json({ error: 'Solo los supervisores pueden editar estos campos' });
      }
      if (importe !== undefined) { setClauses.push('importe = ?'); params.push(importe !== null && importe !== '' ? Number(importe) : null); }
      if (codigoExterno !== undefined) { setClauses.push('codigo_externo = ?'); params.push(codigoExterno || null); }
      if (observaciones !== undefined) { setClauses.push('observaciones = ?'); params.push(observaciones || null); }
    }

    if (nuevoFormularioId !== undefined) {
      if (req.usuario.rol !== 'admin' && !req.usuario.puedeEditarDatos) {
        return res.status(403).json({ error: 'Solo los supervisores pueden cambiar el programa del ticket' });
      }
      const [formRows] = await pool.query(
        'SELECT formularioId, programa FROM formularios WHERE formularioId = ?',
        [nuevoFormularioId]
      );
      if (formRows.length === 0) {
        return res.status(404).json({ error: 'Formulario no encontrado' });
      }
      setClauses.push('formularioId = ?');
      params.push(nuevoFormularioId);
      // Actualizar el título del ticket para reflejar el nuevo programa
      const [ticketRow] = await pool.query('SELECT ciudadano_nombre FROM tickets WHERE ticketId = ?', [ticketId]);
      if (ticketRow.length > 0) {
        const nuevoTitulo = `Solicitud de ${ticketRow[0].ciudadano_nombre} - ${formRows[0].programa}`;
        setClauses.push('titulo = ?');
        params.push(nuevoTitulo);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'Debe proporcionar al menos un campo para actualizar' });
    }

    const agentesAnteriores = rows[0].agentes ? JSON.parse(rows[0].agentes) : [];

    params.push(ticketId);
    await pool.query(
      `UPDATE tickets SET ${setClauses.join(', ')} WHERE ticketId = ?`,
      params
    );

    // Notificar por email y registrar evento cuando cambian los agentes
    if (agentes !== undefined && Array.isArray(agentes)) {
      const agregados = agentes.filter((n) => !agentesAnteriores.includes(n));
      const removidos = agentesAnteriores.filter((n) => !agentes.includes(n));

      if (agregados.length > 0 || removidos.length > 0) {
        let textoEvento = '';
        if (removidos.length > 0 && agregados.length > 0) {
          textoEvento = `Derivó a ${agregados.join(', ')} (quitó a ${removidos.join(', ')})`;
        } else if (agregados.length > 0) {
          textoEvento = `Agregó como agente: ${agregados.join(', ')}`;
        } else {
          textoEvento = `Quitó como agente: ${removidos.join(', ')}`;
        }
        await pool.query(
          `INSERT INTO comentarios (comentarioId, ticketId, autor_id, contenido, adjuntos, tipo, fecha)
           VALUES (?, ?, ?, ?, NULL, 'evento_agente', ?)`,
          [uuidv4(), ticketId, req.usuario.usuarioId, textoEvento, new Date()]
        );
      }

      if (agregados.length > 0) {
        const [ticketInfoRows] = await pool.query(
          'SELECT numero, titulo, ciudadano_nombre FROM tickets WHERE ticketId = ?',
          [ticketId]
        );
        const ticketInfo = ticketInfoRows[0];
        const [usuariosRows] = await pool.query(
          'SELECT nombre, email FROM usuarios WHERE nombre IN (?) AND activo = 1',
          [agregados]
        );
        for (const u of usuariosRows) {
          enviarAsignacionTicket({ nombre: u.nombre, email: u.email, ticket: ticketInfo })
            .catch((err) => console.error('[Mailer] Error notificando asignación:', err.message));
        }
      }
    }

    const [updatedRows] = await pool.query(
      `SELECT t.ticketId, t.numero, t.titulo, t.descripcion, t.estado, t.etapa, t.agentes, t.prioridad,
              t.asignado_a, t.formularioId, t.ciudadano_nombre, t.ciudadano_email,
              t.ciudadano_telefono, t.ciudadano_dni, t.tipo_tramite, t.numero_legajo, t.numero_acta,
              t.importe, t.codigo_externo, t.observaciones,
              t.leido, t.fecha_creacion, t.fecha_cierre,
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

// PATCH /api/tickets/:ticketId/leido — JWT required, marca ticket como leído/no leído
router.patch('/:ticketId/leido', autenticar, soloTickets, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { leido } = req.body;

    if (typeof leido !== 'boolean') {
      return res.status(400).json({ error: 'El campo "leido" debe ser booleano' });
    }

    const [rows] = await pool.query('SELECT ticketId FROM tickets WHERE ticketId = ?', [ticketId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    await pool.query('UPDATE tickets SET leido = ? WHERE ticketId = ?', [leido ? 1 : 0, ticketId]);

    return res.status(200).json({ ticketId, leido });
  } catch (err) {
    console.error('[PATCH /tickets/:id/leido]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/tickets/:ticketId — JWT required (soft delete — mueve a papelera)
router.delete('/:ticketId', autenticar, soloTickets, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const [rows] = await pool.query('SELECT ticketId FROM tickets WHERE ticketId = ?', [ticketId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }
    await pool.query(
      'UPDATE tickets SET eliminado = 1, fecha_eliminacion = NOW(), eliminado_por = ? WHERE ticketId = ?',
      [req.usuario.nombre, ticketId]
    );
    return res.status(200).json({ mensaje: 'Ticket movido a la papelera' });
  } catch (err) {
    console.error('[DELETE /tickets/:id]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/tickets/:ticketId/restaurar — JWT required (restaura desde papelera)
router.patch('/:ticketId/restaurar', autenticar, soloTickets, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const [rows] = await pool.query('SELECT ticketId FROM tickets WHERE ticketId = ?', [ticketId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }
    await pool.query(
      'UPDATE tickets SET eliminado = 0, fecha_eliminacion = NULL, eliminado_por = NULL WHERE ticketId = ?',
      [ticketId]
    );
    return res.status(200).json({ mensaje: 'Ticket restaurado' });
  } catch (err) {
    console.error('[PATCH /tickets/:id/restaurar]', err);
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

    const [rows] = await pool.query(
      `SELECT c.comentarioId, c.ticketId, c.contenido, c.adjuntos, c.fecha, c.tipo,
              c.autor_id AS autorId, u.nombre AS autorNombre, u.rol AS autorRol
       FROM comentarios c
       JOIN usuarios u ON u.usuarioId = c.autor_id
       WHERE c.ticketId = ?
       ORDER BY c.fecha ASC`,
      [ticketId]
    );

    const comentarios = rows.map((c) => ({
      ...c,
      adjuntos: c.adjuntos ? JSON.parse(c.adjuntos) : [],
    }));

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
    const { contenido, adjuntos } = req.body;

    const tieneTexto = contenido && contenido.trim().length > 0;
    const tieneAdjuntos = Array.isArray(adjuntos) && adjuntos.length > 0;
    if (!tieneTexto && !tieneAdjuntos) {
      return res.status(400).json({ error: 'El comentario debe tener texto o archivos adjuntos' });
    }

    const [ticketRows] = await pool.query(
      'SELECT ticketId, agentes, asignado_a FROM tickets WHERE ticketId = ?',
      [ticketId]
    );
    if (ticketRows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    if (req.usuario.rol !== 'admin') {
      const agentesTicket = ticketRows[0].agentes ? JSON.parse(ticketRows[0].agentes) : [];
      if (!agentesTicket.includes(req.usuario.nombre)) {
        return res.status(403).json({ error: 'Solo el agente asignado puede agregar comentarios' });
      }
    }

    const comentarioId = uuidv4();
    const now = new Date();

    const adjuntosJson = tieneAdjuntos ? JSON.stringify(adjuntos) : null;

    await pool.query(
      `INSERT INTO comentarios (comentarioId, ticketId, autor_id, contenido, adjuntos, fecha)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [comentarioId, ticketId, req.usuario.usuarioId, tieneTexto ? contenido.trim() : '', adjuntosJson, now]
    );

    return res.status(201).json({
      comentarioId,
      ticketId,
      autorId: req.usuario.usuarioId,
      contenido: tieneTexto ? contenido.trim() : '',
      adjuntos: adjuntos ?? [],
      fecha: now.toISOString(),
    });
  } catch (err) {
    console.error('[POST /tickets/:id/comentarios]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/tickets/:ticketId/comentarios/:comentarioId — solo el autor puede editar sus adjuntos
router.patch('/:ticketId/comentarios/:comentarioId', autenticar, soloTickets, async (req, res) => {
  try {
    const { ticketId, comentarioId } = req.params;
    const { adjuntos } = req.body;

    if (!Array.isArray(adjuntos)) {
      return res.status(400).json({ error: 'adjuntos debe ser un array' });
    }

    const [rows] = await pool.query(
      'SELECT autor_id FROM comentarios WHERE comentarioId = ? AND ticketId = ?',
      [comentarioId, ticketId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Comentario no encontrado' });
    if (rows[0].autor_id !== req.usuario.usuarioId) {
      return res.status(403).json({ error: 'Solo el autor puede editar este comentario' });
    }

    await pool.query(
      'UPDATE comentarios SET adjuntos = ? WHERE comentarioId = ?',
      [adjuntos.length > 0 ? JSON.stringify(adjuntos) : null, comentarioId]
    );

    return res.status(200).json({ ok: true, adjuntos });
  } catch (err) {
    console.error('[PATCH /tickets/:id/comentarios/:cid]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/tickets/:ticketId/comentarios/:comentarioId — autor o admin puede eliminar
router.delete('/:ticketId/comentarios/:comentarioId', autenticar, soloTickets, async (req, res) => {
  try {
    const { ticketId, comentarioId } = req.params;

    const [rows] = await pool.query(
      'SELECT autor_id, tipo FROM comentarios WHERE comentarioId = ? AND ticketId = ?',
      [comentarioId, ticketId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Comentario no encontrado' });

    if (rows[0].autor_id !== req.usuario.usuarioId && req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo el autor puede eliminar este comentario' });
    }

    await pool.query('DELETE FROM comentarios WHERE comentarioId = ?', [comentarioId]);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[DELETE /tickets/:id/comentarios/:cid]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
