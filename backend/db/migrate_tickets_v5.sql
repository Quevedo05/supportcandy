-- =============================================================================
-- Migración v5: Dos correcciones
--   1. numero pasa a NULL para evitar conflicto de constraint UNIQUE con valor 0
--      (el INSERT ya no usa 0 como placeholder; sigue usando el id_seq)
--   2. Agrega columna eliminado_por que faltaba en la migración v4
--
-- Ejecutar en producción:
--   sudo mysql agencia_calidad < db/migrate_tickets_v5.sql
-- =============================================================================

USE agencia_calidad;

-- 1. Hacer numero nullable para que el INSERT no use 0 como placeholder temporal
ALTER TABLE tickets
  MODIFY COLUMN numero INT NULL DEFAULT NULL;

-- 2. Corregir cualquier ticket atascado con numero=0 (de creaciones fallidas previas)
UPDATE tickets SET numero = id_seq WHERE numero = 0;

-- 3. Agregar columna eliminado_por (faltaba en v4)
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS eliminado_por VARCHAR(255) NULL AFTER fecha_eliminacion;
