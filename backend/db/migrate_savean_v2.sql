-- =============================================================================
-- Migración SAVEAN v2 — consolidada y segura (idempotente)
--   Compatible con MySQL 5.7+
--
-- Ejecutar en producción:
--   sudo mysql agencia_calidad < /var/www/sistema/backend/db/migrate_savean_v2.sql
-- =============================================================================

USE agencia_calidad;

-- ─── Procedimiento helper: agrega columna solo si no existe ──────────────────
DROP PROCEDURE IF EXISTS _add_col;
DELIMITER $$
CREATE PROCEDURE _add_col(IN tbl VARCHAR(64), IN col VARCHAR(64), IN col_def TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col
  ) THEN
    SET @_sql = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN ', col_def);
    PREPARE _s FROM @_sql;
    EXECUTE _s;
    DEALLOCATE PREPARE _s;
  END IF;
END$$
DELIMITER ;

-- ─── 1. tipo_producto ─────────────────────────────────────────────────────────
CALL _add_col('ingresos_savean', 'tipo_producto',
  'tipo_producto VARCHAR(20) NULL AFTER acta_tipo');

-- ─── 2. Columnas de No Pago ───────────────────────────────────────────────────
CALL _add_col('ingresos_savean', 'no_pago',
  'no_pago TINYINT(1) NOT NULL DEFAULT 0 AFTER pdf_enviado');
CALL _add_col('ingresos_savean', 'monto_no_pago',
  'monto_no_pago DECIMAL(10,2) NULL AFTER no_pago');
CALL _add_col('ingresos_savean', 'pago_estado',
  "pago_estado ENUM('pendiente','pagado') NOT NULL DEFAULT 'pendiente' AFTER monto_no_pago");
CALL _add_col('ingresos_savean', 'pago_lugar',
  'pago_lugar VARCHAR(200) NULL AFTER pago_estado');
CALL _add_col('ingresos_savean', 'pago_fecha',
  'pago_fecha DATE NULL AFTER pago_lugar');

-- ─── 3. Índice no_pago (ignorar si ya existe) ────────────────────────────────
DROP PROCEDURE IF EXISTS _add_idx;
DELIMITER $$
CREATE PROCEDURE _add_idx(IN tbl VARCHAR(64), IN idx VARCHAR(64), IN idx_def TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx
  ) THEN
    SET @_sql = CONCAT('ALTER TABLE `', tbl, '` ADD KEY ', idx_def);
    PREPARE _s FROM @_sql;
    EXECUTE _s;
    DEALLOCATE PREPARE _s;
  END IF;
END$$
DELIMITER ;

CALL _add_idx('ingresos_savean', 'idx_no_pago', 'idx_no_pago (no_pago, pago_estado)');

-- ─── 4. Roles punto_control y dev en usuarios ─────────────────────────────────
ALTER TABLE usuarios
  MODIFY COLUMN rol ENUM('admin','contribuidor','inspector','supervisor','operativo','sanidad','punto_control','dev')
    NOT NULL DEFAULT 'contribuidor';

-- ─── 5. Tabla transportes_carnicos ───────────────────────────────────────────
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

-- ─── Limpieza ─────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS _add_col;
DROP PROCEDURE IF EXISTS _add_idx;
