'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db/connection');
const { autenticarApiKey } = require('../middleware/apiKey');

const router = express.Router();

const MIME_PERMITIDOS = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf',
]);

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas solicitudes. Intente en 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function validarAdjuntos(adjuntos) {
  if (!Array.isArray(adjuntos)) return null;
  for (const adj of adjuntos) {
    if (typeof adj !== 'object' || adj === null) return 'Formato de adjunto inválido.';
    if (typeof adj.tipo !== 'string' || !MIME_PERMITIDOS.has(adj.tipo)) {
      return `Tipo de archivo no permitido: ${adj.tipo}. Se aceptan JPEG, PNG, WebP y PDF.`;
    }
  }
  return null;
}

// ─── POST /api/external/rivadavia/solicitudes ────────────────────────────────
// Rivadavia envía una solicitud completa del Plan Productivo al sistema de tickets.
router.post('/rivadavia/solicitudes', autenticarApiKey, limiter, async (req, res) => {
  try {
    const {
      // Identificación externa
      codigoExterno,
      // Paso 1 - Tus datos
      nombre,
      cuitCuil,
      telefono,
      email,
      domicilioVivienda,
      egresadoEscuelaOficios,
      // Paso 2 - Emprendimiento
      domicilioEmprendimiento,
      actividadEmprendimiento,
      inicioActividades,
      fechaInicioActividades,
      rubroEmprendimiento,
      inscriptoArca,
      // Paso 3 - Tu proyecto
      nombreProyecto,
      descripcionProyecto,
      equipoTrabajo,
      impactoProyecto,
      destinoFondos,
      comoAyudaraCompras,
      // Paso 4 - Proveedores
      proveedores,
      montoTotalSolicitado,
      // Paso 5 - Documentación
      documentos,
    } = req.body;

    // Validaciones requeridas
    const errores = {};
    if (!codigoExterno || typeof codigoExterno !== 'string') {
      errores.codigoExterno = 'El codigoExterno es requerido.';
    }
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
      errores.nombre = 'El nombre es requerido (mínimo 2 caracteres).';
    }
    if (!cuitCuil || typeof cuitCuil !== 'string') {
      errores.cuitCuil = 'El CUIT/CUIL es requerido.';
    }

    if (Object.keys(errores).length > 0) {
      return res.status(400).json({ error: 'Datos inválidos.', errores });
    }

    // Verificar duplicado por codigoExterno
    const [existente] = await pool.query(
      'SELECT ticketId, numero FROM tickets WHERE codigo_externo = ? LIMIT 1',
      [codigoExterno.trim()]
    );
    if (existente.length > 0) {
      return res.status(409).json({
        error: 'Ya existe una solicitud con ese código externo.',
        codigo: 'DUPLICADO',
        ticketId: existente[0].ticketId,
        numero: existente[0].numero,
      });
    }

    // Validar documentos si se envían
    if (documentos !== undefined) {
      const errDoc = validarAdjuntos(documentos);
      if (errDoc) return res.status(400).json({ error: errDoc });
    }

    // Validar proveedores si se envían
    if (proveedores !== undefined && !Array.isArray(proveedores)) {
      return res.status(400).json({ error: 'proveedores debe ser un array.' });
    }
    if (Array.isArray(proveedores) && proveedores.length > 4) {
      return res.status(400).json({ error: 'Se permiten como máximo 4 proveedores.' });
    }

    // Obtener primera etapa activa
    const [etapas] = await pool.query(
      'SELECT nombre FROM etapas_ticket WHERE activa = 1 ORDER BY orden ASC LIMIT 1'
    );
    const etapaInicial = etapas.length > 0 ? etapas[0].nombre : 'Solicitud inicial';

    // Construir JSON con datos específicos de Rivadavia
    const datosExternos = {
      origen: 'rivadavia',
      programa: 'Plan Productivo - Adhesión',
      paso1: {
        domicilioVivienda: domicilioVivienda || null,
        egresadoEscuelaOficios: Boolean(egresadoEscuelaOficios),
      },
      paso2: {
        domicilioEmprendimiento: domicilioEmprendimiento || null,
        actividad: actividadEmprendimiento || null,
        inicioActividades: Boolean(inicioActividades),
        fechaInicioActividades: fechaInicioActividades || null,
        rubro: rubroEmprendimiento || null,
        inscriptoArca: Boolean(inscriptoArca),
      },
      paso3: {
        nombreProyecto: nombreProyecto || null,
        descripcion: descripcionProyecto || null,
        equipoTrabajo: equipoTrabajo || null,
        impacto: impactoProyecto || null,
        destinoFondos: destinoFondos || null,
        comoAyudaraCompras: comoAyudaraCompras || null,
      },
      paso4: {
        proveedores: Array.isArray(proveedores) ? proveedores : [],
        montoTotalSolicitado: montoTotalSolicitado || null,
      },
    };

    const titulo = `Plan Productivo Rivadavia - ${nombre.trim()} - CUIT ${cuitCuil.trim()}`;
    const descripcion = descripcionProyecto
      ? descripcionProyecto.trim()
      : `Solicitud de adhesión al Plan Productivo de Rivadavia. CUIT/CUIL: ${cuitCuil.trim()}.`;

    const ticketId = uuidv4();

    const conn = await pool.getConnection();
    let idSeq;
    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        `INSERT INTO tickets
           (ticketId, titulo, descripcion, estado, prioridad, etapa,
            ciudadano_nombre, ciudadano_email, ciudadano_telefono, ciudadano_dni,
            tipo_tramite, importe, codigo_externo, origen, datos_externos)
         VALUES (?, ?, ?, 'abierto', 'media', ?, ?, ?, ?, ?, 'CRÉDITO', ?, ?, 'rivadavia', ?)`,
        [
          ticketId,
          titulo,
          descripcion,
          etapaInicial,
          nombre.trim(),
          email ? email.trim().toLowerCase() : null,
          telefono ? telefono.trim() : null,
          cuitCuil.trim(),
          montoTotalSolicitado ? Number(montoTotalSolicitado) : null,
          codigoExterno.trim(),
          JSON.stringify(datosExternos),
        ]
      );

      idSeq = result.insertId;
      await conn.query('UPDATE tickets SET numero = ? WHERE id_seq = ?', [idSeq, idSeq]);
      await conn.commit();
    } catch (dbErr) {
      await conn.rollback();
      throw dbErr;
    } finally {
      conn.release();
    }

    // Si hay documentos, crear un comentario inicial con los archivos adjuntos
    if (Array.isArray(documentos) && documentos.length > 0) {
      // Normalizar al formato interno: campo contenido (data URL) + tamano en bytes
      const adjuntosNormalizados = documentos.map((doc) => {
        const base64 = doc.datos || '';
        const contenido = base64.startsWith('data:')
          ? base64
          : `data:${doc.tipo};base64,${base64}`;
        const tamano = Math.round((base64.replace(/=+$/, '').length * 3) / 4);
        return { nombre: doc.nombre, tipo: doc.tipo, tamano, contenido };
      });

      const comentarioId = uuidv4();
      await pool.query(
        `INSERT INTO comentarios (comentarioId, ticketId, autor_id, contenido, adjuntos, tipo, fecha)
         VALUES (?, ?, NULL, ?, ?, 'sistema', ?)`,
        [
          comentarioId,
          ticketId,
          'Documentación adjuntada automáticamente desde la plataforma Rivadavia.',
          JSON.stringify(adjuntosNormalizados),
          new Date(),
        ]
      );
    }

    return res.status(201).json({
      ticketId,
      numero: idSeq,
      estado: 'abierto',
      etapa: etapaInicial,
      mensaje: 'Solicitud recibida correctamente.',
    });
  } catch (err) {
    console.error('[POST /api/external/rivadavia/solicitudes]', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ─── GET /api/external/rivadavia/solicitudes/:codigoExterno ──────────────────
// Rivadavia consulta el estado de una solicitud enviada previamente.
router.get('/rivadavia/solicitudes/:codigoExterno', autenticarApiKey, async (req, res) => {
  try {
    const { codigoExterno } = req.params;

    const [rows] = await pool.query(
      `SELECT ticketId, numero, estado, etapa, fecha_creacion
       FROM tickets
       WHERE codigo_externo = ? AND eliminado = 0
       LIMIT 1`,
      [codigoExterno]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.', codigo: 'NO_ENCONTRADO' });
    }

    const t = rows[0];
    return res.status(200).json({
      codigoExterno,
      ticketId: t.ticketId,
      numero: t.numero,
      estado: t.estado,
      etapa: t.etapa || null,
      fechaCreacion: t.fecha_creacion instanceof Date
        ? t.fecha_creacion.toISOString()
        : t.fecha_creacion,
    });
  } catch (err) {
    console.error('[GET /api/external/rivadavia/solicitudes/:cod]', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
