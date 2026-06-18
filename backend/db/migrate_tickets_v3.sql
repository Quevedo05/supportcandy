-- =============================================================================
-- Migración v3: Columna leido para tickets no leídos
--
-- Ejecutar en producción:
--   sudo mysql agencia_calidad < db/migrate_tickets_v3.sql
-- =============================================================================

USE agencia_calidad;

ALTER TABLE tickets
  ADD COLUMN leido TINYINT(1) NOT NULL DEFAULT 0 AFTER numero_acta;
