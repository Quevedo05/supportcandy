-- =============================================================================
-- Migración v6: Ampliar límites de campos de texto en tickets
--
-- titulo: VARCHAR(200) → VARCHAR(1000)  (asuntos largos excedían el límite)
-- numero_legajo: VARCHAR(100) → VARCHAR(255)
-- numero_acta: VARCHAR(100) → VARCHAR(255)
-- ciudadano_nombre: VARCHAR(200) → VARCHAR(500)
--
-- Ejecutar en producción:
--   cd /var/www/sistema/backend && sudo mysql agencia_calidad < db/migrate_tickets_v6.sql
-- =============================================================================

USE agencia_calidad;

ALTER TABLE tickets
  MODIFY COLUMN titulo           VARCHAR(1000) NOT NULL,
  MODIFY COLUMN numero_legajo    VARCHAR(255)  NULL,
  MODIFY COLUMN numero_acta      VARCHAR(255)  NULL,
  MODIFY COLUMN ciudadano_nombre VARCHAR(500)  NULL;
