-- =============================================================================
-- Migración SAVEAN v2 — consolidada y segura (idempotente)
--   Aplica todos los cambios pendientes de nopago + punto_control
--   Se puede correr aunque parte de los cambios ya exista (no rompe nada).
--
-- Ejecutar en producción:
--   sudo mysql agencia_calidad < /var/www/sistema/backend/db/migrate_savean_v2.sql
-- =============================================================================

USE agencia_calidad;

-- ─── 1. tipo_producto en ingresos_savean (podría no existir) ──────────────────
ALTER TABLE ingresos_savean
  ADD COLUMN IF NOT EXISTS tipo_producto VARCHAR(20) NULL AFTER acta_tipo;

-- ─── 2. Columnas de No Pago en ingresos_savean ───────────────────────────────
ALTER TABLE ingresos_savean
  ADD COLUMN IF NOT EXISTS no_pago       TINYINT(1)                      NOT NULL DEFAULT 0           AFTER pdf_enviado,
  ADD COLUMN IF NOT EXISTS monto_no_pago DECIMAL(10,2)                   NULL                         AFTER no_pago,
  ADD COLUMN IF NOT EXISTS pago_estado   ENUM('pendiente','pagado')       NOT NULL DEFAULT 'pendiente' AFTER monto_no_pago,
  ADD COLUMN IF NOT EXISTS pago_lugar    VARCHAR(200)                     NULL                         AFTER pago_estado,
  ADD COLUMN IF NOT EXISTS pago_fecha    DATE                             NULL                         AFTER pago_lugar;

-- Índice (ignorar si ya existe)
ALTER TABLE ingresos_savean
  ADD KEY IF NOT EXISTS idx_no_pago (no_pago, pago_estado);

-- ─── 3. Roles punto_control y dev en usuarios ─────────────────────────────────
ALTER TABLE usuarios
  MODIFY COLUMN rol ENUM('admin','contribuidor','inspector','supervisor','operativo','sanidad','punto_control','dev')
    NOT NULL DEFAULT 'contribuidor';

-- ─── 4. Tabla transportes_carnicos ───────────────────────────────────────────
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
