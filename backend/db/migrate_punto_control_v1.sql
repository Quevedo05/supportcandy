-- =============================================================================
-- Migración Punto de Control v1
--   Crea la tabla de transportes cárnicos y agrega los roles punto_control y dev
--   al ENUM de usuarios.
--
-- Ejecutar en producción:
--   sudo mysql agencia_calidad < db/migrate_punto_control_v1.sql
-- =============================================================================

USE agencia_calidad;

-- ─── 1. Agregar roles punto_control y dev a usuarios ─────────────────────────
ALTER TABLE usuarios
  MODIFY COLUMN rol ENUM('admin','contribuidor','inspector','supervisor','operativo','sanidad','punto_control','dev')
    NOT NULL DEFAULT 'contribuidor';

-- ─── 2. Tabla de seguimiento de cargas cárnicas ───────────────────────────────
CREATE TABLE IF NOT EXISTS transportes_carnicos (
  id                VARCHAR(36)   NOT NULL,
  numero            VARCHAR(30)   NULL,
  barrera_id        VARCHAR(36)   NOT NULL,
  barrera_nombre    VARCHAR(100)  NOT NULL DEFAULT '',
  inspector_id      VARCHAR(36)   NOT NULL,
  inspector_nombre  VARCHAR(100)  NOT NULL DEFAULT '',
  fecha_cruce       DATETIME      NOT NULL,
  patente           VARCHAR(20)   NULL,
  empresa_origen    VARCHAR(150)  NULL,
  senasa_numero     VARCHAR(50)   NULL,
  telefono_chofer   VARCHAR(30)   NULL,
  tipo_carga_detalle VARCHAR(200) NULL,
  destino_comercial VARCHAR(200)  NULL,
  destino_tipo      VARCHAR(100)  NULL,
  estado            ENUM('en_transito','recibido','no_recibido','alerta') NOT NULL DEFAULT 'en_transito',
  fecha_recepcion   DATETIME      NULL,
  observaciones     TEXT          NULL,
  ingreso_id        VARCHAR(36)   NULL,
  creado_en         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tc_numero (numero),
  KEY idx_tc_estado (estado),
  KEY idx_tc_barrera (barrera_id),
  KEY idx_tc_fecha (fecha_cruce),
  CONSTRAINT fk_tc_ingreso FOREIGN KEY (ingreso_id)
    REFERENCES ingresos_savean (ingresoId) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
