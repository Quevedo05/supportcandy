-- =============================================================================
-- Migración SAVEAN No Pago v1
--   Agrega seguimiento de actas "no pagó" y su posterior pago
--
-- Ejecutar en producción:
--   sudo mysql agencia_calidad < db/migrate_savean_nopago_v1.sql
-- =============================================================================

USE agencia_calidad;

ALTER TABLE ingresos_savean
  ADD COLUMN no_pago        TINYINT(1)                       NOT NULL DEFAULT 0         AFTER pdf_enviado,
  ADD COLUMN monto_no_pago  DECIMAL(10,2)                    NULL                       AFTER no_pago,
  ADD COLUMN pago_estado    ENUM('pendiente','pagado')        NOT NULL DEFAULT 'pendiente' AFTER monto_no_pago,
  ADD COLUMN pago_lugar     VARCHAR(200)                     NULL                       AFTER pago_estado,
  ADD COLUMN pago_fecha     DATE                             NULL                       AFTER pago_lugar,
  ADD KEY idx_no_pago (no_pago, pago_estado);
