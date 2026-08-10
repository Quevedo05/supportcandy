-- migrate_usuarios_v3.sql
-- Agrega columna formularioId a usuarios para vincular usuarios de comité a un programa
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS formularioId VARCHAR(36) NULL DEFAULT NULL;
