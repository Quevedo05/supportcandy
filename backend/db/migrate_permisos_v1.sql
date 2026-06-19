-- =============================================================================
-- Migración permisos v1: columna puede_editar_datos para agentes operativos
--
-- Ejecutar en producción:
--   sudo mysql agencia_calidad < db/migrate_permisos_v1.sql
-- =============================================================================

USE agencia_calidad;

ALTER TABLE usuarios
  ADD COLUMN puede_editar_datos TINYINT(1) NOT NULL DEFAULT 0
  AFTER estados_asignados;
