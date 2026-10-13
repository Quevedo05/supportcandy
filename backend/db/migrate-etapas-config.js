require('dotenv').config();
const { pool } = require('./connection');

const etapasInicial = [
  { nombre: 'Solicitud inicial',             orden: 1,  color: '#F97316', bg_color: '#FFF7ED', es_cierre: 0 },
  { nombre: 'Revisión de documentación',     orden: 2,  color: '#EAB308', bg_color: '#FEFCE8', es_cierre: 0 },
  { nombre: 'Documentación observada',       orden: 3,  color: '#EF4444', bg_color: '#FEF2F2', es_cierre: 0 },
  { nombre: 'Veraz',                         orden: 4,  color: '#06B6D4', bg_color: '#ECFEFF', es_cierre: 0 },
  { nombre: 'Externo/ Comite de selección',  orden: 5,  color: '#F97316', bg_color: '#FFF7ED', es_cierre: 0 },
  { nombre: 'Comité de análisis',            orden: 6,  color: '#8B5CF6', bg_color: '#F5F3FF', es_cierre: 0 },
  { nombre: 'Contrato',                      orden: 7,  color: '#6366F1', bg_color: '#EEF2FF', es_cierre: 0 },
  { nombre: 'Simulador',                     orden: 8,  color: '#3B82F6', bg_color: '#EFF6FF', es_cierre: 0 },
  { nombre: 'Firma de contrato',             orden: 9,  color: '#EC4899', bg_color: '#FDF2F8', es_cierre: 0 },
  { nombre: 'Certificación de firma',        orden: 10, color: '#D946EF', bg_color: '#FDF4FF', es_cierre: 0 },
  { nombre: 'Transferencia',                 orden: 11, color: '#22C55E', bg_color: '#F0FDF4', es_cierre: 0 },
  { nombre: 'Seguimiento de verificable',    orden: 12, color: '#14B8A6', bg_color: '#F0FDFA', es_cierre: 0 },
  { nombre: 'Seguimiento de cobranzas',      orden: 13, color: '#F59E0B', bg_color: '#FFFBEB', es_cierre: 0 },
  { nombre: 'Sin fondo',                     orden: 14, color: '#EF4444', bg_color: '#FEF2F2', es_cierre: 0 },
  { nombre: 'Cerrado',                       orden: 15, color: '#6B7280', bg_color: '#F9FAFB', es_cierre: 1 },
];

const configInicial = [
  ['nombre_sistema',  'Agencia de Calidad San Juan',                       'Nombre que aparece en emails y encabezados'],
  ['url_sistema',     'https://sistema.agenciacalidadsanjuan.com.ar',       'URL pública del sistema'],
  ['horas_invitacion', '48',                                                'Horas de validez del link de invitación'],
];

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS etapas_ticket (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        nombre     VARCHAR(100) NOT NULL,
        orden      INT          NOT NULL DEFAULT 0,
        color      VARCHAR(7)   NOT NULL DEFAULT '#6B7280',
        bg_color   VARCHAR(7)   NOT NULL DEFAULT '#F9FAFB',
        es_cierre  TINYINT(1)   NOT NULL DEFAULT 0,
        activa     TINYINT(1)   NOT NULL DEFAULT 1,
        creado_en  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_etapa_nombre (nombre)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Tabla etapas_ticket creada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS config_sistema (
        clave       VARCHAR(100) NOT NULL,
        valor       TEXT,
        descripcion VARCHAR(255),
        PRIMARY KEY (clave)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Tabla config_sistema creada');

    for (const e of etapasInicial) {
      await pool.query(
        'INSERT IGNORE INTO etapas_ticket (nombre, orden, color, bg_color, es_cierre) VALUES (?, ?, ?, ?, ?)',
        [e.nombre, e.orden, e.color, e.bg_color, e.es_cierre]
      );
    }
    console.log(`✓ ${etapasInicial.length} etapas insertadas`);

    for (const [clave, valor, descripcion] of configInicial) {
      await pool.query(
        'INSERT IGNORE INTO config_sistema (clave, valor, descripcion) VALUES (?, ?, ?)',
        [clave, valor, descripcion]
      );
    }
    console.log('✓ Configuración inicial insertada');

    console.log('\n✅ Migración completada exitosamente');
    process.exit(0);
  } catch (err) {
    console.error('Error en migración:', err);
    process.exit(1);
  }
}

migrate();
