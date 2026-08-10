-- Agrega el rol 'supervisor' al ENUM de la tabla usuarios
ALTER TABLE usuarios MODIFY COLUMN rol ENUM('admin', 'contribuidor', 'inspector', 'supervisor') NOT NULL DEFAULT 'contribuidor';
