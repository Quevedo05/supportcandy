-- =============================================================================
-- Migración v2: Columnas para tickets manuales (creados desde el portal de agencia)
--
-- Ejecutar en la base de datos de producción:
--   mysql -u <usuario> -p agencia_calidad < db/migrate_tickets_v2.sql
-- =============================================================================

USE agencia_calidad;

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS ciudadano_dni  VARCHAR(20)  NULL AFTER ciudadano_telefono,
  ADD COLUMN IF NOT EXISTS tipo_tramite   VARCHAR(100) NULL AFTER ciudadano_dni,
  ADD COLUMN IF NOT EXISTS numero_legajo  VARCHAR(100) NULL AFTER tipo_tramite,
  ADD COLUMN IF NOT EXISTS numero_acta    VARCHAR(100) NULL AFTER numero_legajo;
