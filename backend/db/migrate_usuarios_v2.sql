-- =============================================================================
-- Migración v2 usuarios: columnas faltantes para el sistema de invitaciones
--
-- Ejecutar en producción:
--   sudo mysql agencia_calidad < db/migrate_usuarios_v2.sql
-- =============================================================================

USE agencia_calidad;

-- Columna para el token de invitación por email
ALTER TABLE usuarios ADD COLUMN invitation_token VARCHAR(64) NULL;

-- Columna para la fecha de expiración del token
ALTER TABLE usuarios ADD COLUMN invitation_expires_at DATETIME NULL;

-- Columna para etapas asignadas por usuario (JSON array de strings)
ALTER TABLE usuarios ADD COLUMN estados_asignados JSON NULL;

-- Agregar 'inspector' al ENUM de roles (necesario para usuarios de SAVEAN)
ALTER TABLE usuarios MODIFY COLUMN rol ENUM('admin', 'contribuidor', 'inspector') NOT NULL DEFAULT 'contribuidor';
