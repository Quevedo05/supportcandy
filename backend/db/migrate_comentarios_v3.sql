-- Migración: permitir autor_id NULL para poder eliminar usuarios con comentarios asociados
-- Los comentarios quedan huérfanos (autor_id = NULL) pero se conservan en el historial del ticket
ALTER TABLE comentarios MODIFY COLUMN autor_id VARCHAR(36) NULL;
ALTER TABLE comentarios DROP FOREIGN KEY fk_comentarios_autor;
ALTER TABLE comentarios ADD CONSTRAINT fk_comentarios_autor
  FOREIGN KEY (autor_id) REFERENCES usuarios(usuarioId) ON DELETE SET NULL;
