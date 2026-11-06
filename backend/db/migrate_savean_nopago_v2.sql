-- =============================================================================
-- Migración SAVEAN No Pago v2
--   Agrega quién confirmó el pago (inspector que presionó "Pagó ✓")
--
-- Ejecutar en producción:
--   sudo mysql agencia_calidad < db/migrate_savean_nopago_v2.sql
-- =============================================================================

USE agencia_calidad;

ALTER TABLE ingresos_savean
  ADD COLUMN pago_confirmado_id     VARCHAR(36)   NULL  AFTER pago_fecha,
  ADD COLUMN pago_confirmado_nombre VARCHAR(100)  NULL  AFTER pago_confirmado_id;
