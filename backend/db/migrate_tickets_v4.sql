-- =============================================================================
-- Migración v4: Papelera de reciclaje para tickets (soft delete)
--
-- Ejecutar en producción:
--   sudo mysql agencia_calidad < db/migrate_tickets_v4.sql
-- =============================================================================

USE agencia_calidad;

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS eliminado         TINYINT(1) NOT NULL DEFAULT 0 AFTER leido,
  ADD COLUMN IF NOT EXISTS fecha_eliminacion DATETIME NULL AFTER eliminado;

CREATE INDEX IF NOT EXISTS idx_tickets_eliminado ON tickets (eliminado);
