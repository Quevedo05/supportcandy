-- =============================================================================
-- Migración SAVEAN v3 — fix numeración duplicada
--
-- Ejecutar en producción:
--   sudo mysql agencia_calidad < /var/www/sistema/backend/db/migrate_savean_v3.sql
-- =============================================================================

USE agencia_calidad;

-- Normaliza registros históricos que quedaron con tipo_producto NULL
-- (creados antes de que existiera la columna). Se asumen cárnicos
-- porque vegetales siempre enviaron el campo desde el frontend.
UPDATE ingresos_savean
  SET tipo_producto = 'carnico'
WHERE tipo_producto IS NULL;
