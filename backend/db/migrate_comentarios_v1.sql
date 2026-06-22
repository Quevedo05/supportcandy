-- Migración: agregar columna adjuntos a comentarios
-- Los adjuntos se guardan como JSON array de objetos { nombre, tipo, tamano, contenido (base64 dataURL) }
ALTER TABLE comentarios ADD COLUMN adjuntos LONGTEXT NULL AFTER contenido;
