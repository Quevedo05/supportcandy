-- =============================================================================
-- Migración Solicitudes v1
--   Permite a inspectores habilitados enviar solicitudes de insumos o generales
--
-- Ejecutar en producción:
--   sudo mysql agencia_calidad < db/migrate_solicitudes_v1.sql
-- =============================================================================

USE agencia_calidad;

-- Permiso individual por usuario
ALTER TABLE usuarios
  ADD COLUMN puede_solicitar TINYINT(1) NOT NULL DEFAULT 0 AFTER puede_editar_datos;

-- Tabla de solicitudes
CREATE TABLE IF NOT EXISTS solicitudes_savean (
  solicitudId    VARCHAR(36)   NOT NULL,
  usuario_id     VARCHAR(36)   NOT NULL,
  usuario_nombre VARCHAR(100)  NOT NULL DEFAULT '',
  barrera_nombre VARCHAR(100)  NOT NULL DEFAULT '',
  tipo           ENUM('insumos','otra') NOT NULL,
  descripcion    TEXT          NOT NULL,
  estado         ENUM('pendiente','en_proceso','resuelta') NOT NULL DEFAULT 'pendiente',
  creado_en      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resuelto_en    DATETIME      NULL,
  resuelto_por   VARCHAR(100)  NULL,
  PRIMARY KEY (solicitudId),
  KEY idx_sol_usuario (usuario_id),
  KEY idx_sol_estado  (estado),
  KEY idx_sol_fecha   (creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
