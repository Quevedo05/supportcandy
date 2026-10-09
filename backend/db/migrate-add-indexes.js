/**
 * Migración: agregar índices para mejorar performance de consultas frecuentes.
 *
 * Ejecutar en el servidor:
 *   node backend/db/migrate-add-indexes.js
 *
 * Es seguro correr más de una vez — usa IF NOT EXISTS en cada índice.
 */
require('dotenv').config();
const { pool } = require('./connection');

const indexes = [
  // comentarios — el query más costoso: abre un ticket y descarga todos sus comentarios
  { table: 'comentarios', name: 'idx_comentarios_ticketId',   sql: 'ALTER TABLE comentarios ADD INDEX idx_comentarios_ticketId (ticketId)' },
  // tipo se usa en el reporte de tiempo de resolución (WHERE tipo = 'evento_etapa')
  { table: 'comentarios', name: 'idx_comentarios_tipo',       sql: 'ALTER TABLE comentarios ADD INDEX idx_comentarios_tipo (tipo)' },

  // tickets — filtros usados en cada listado
  { table: 'tickets', name: 'idx_tickets_eliminado',          sql: 'ALTER TABLE tickets ADD INDEX idx_tickets_eliminado (eliminado)' },
  { table: 'tickets', name: 'idx_tickets_formularioId',       sql: 'ALTER TABLE tickets ADD INDEX idx_tickets_formularioId (formularioId)' },
  { table: 'tickets', name: 'idx_tickets_estado',             sql: 'ALTER TABLE tickets ADD INDEX idx_tickets_estado (estado)' },
  { table: 'tickets', name: 'idx_tickets_fecha_creacion',     sql: 'ALTER TABLE tickets ADD INDEX idx_tickets_fecha_creacion (fecha_creacion)' },
  // combinado para el filtro principal: eliminado=0 ORDER BY fecha_creacion DESC
  { table: 'tickets', name: 'idx_tickets_eliminado_fecha',    sql: 'ALTER TABLE tickets ADD INDEX idx_tickets_eliminado_fecha (eliminado, fecha_creacion)' },

  // guias_savean — auto-vencimiento corre en cada GET de guías (UPDATE WHERE estado+fecha)
  { table: 'guias_savean', name: 'idx_guias_estado_vencimiento', sql: 'ALTER TABLE guias_savean ADD INDEX idx_guias_estado_vencimiento (estado, fecha_vencimiento)' },
  // token se consulta en cada escaneo de QR (endpoint público)
  { table: 'guias_savean', name: 'idx_guias_token',            sql: 'ALTER TABLE guias_savean ADD INDEX idx_guias_token (token)' },
];

async function existeIndice(conn, table, name) {
  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.STATISTICS
     WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
    [table, name]
  );
  return rows.length > 0;
}

async function migrate() {
  console.log('Iniciando migración: agregar índices de performance...\n');
  const conn = await pool.getConnection();
  let creados = 0;
  let saltados = 0;

  try {
    for (const idx of indexes) {
      const existe = await existeIndice(conn, idx.table, idx.name);
      if (existe) {
        console.log(`  ↷  Ya existe: ${idx.table}.${idx.name}`);
        saltados++;
      } else {
        await conn.query(idx.sql);
        console.log(`  ✓  Creado:    ${idx.table}.${idx.name}`);
        creados++;
      }
    }
  } finally {
    conn.release();
    await pool.end();
  }

  console.log(`\nMigración completada. Creados: ${creados}, ya existían: ${saltados}.`);
}

migrate().catch((err) => {
  console.error('Error en migración:', err.message);
  process.exit(1);
});
