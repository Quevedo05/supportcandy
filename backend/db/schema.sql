-- =============================================================================
-- Agencia Calidad San Juan - Database Schema
-- MySQL 8.0+
--
-- How to run (as MySQL root):
--   mysql -u root -p < db/schema.sql
--
-- After running schema, seed default data:
--   npm run seed
-- =============================================================================

CREATE DATABASE IF NOT EXISTS agencia_calidad
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Uncomment and fill in to create the application user (run as root):
-- CREATE USER IF NOT EXISTS 'agencia_user'@'localhost' IDENTIFIED BY 'your_password';
-- GRANT ALL PRIVILEGES ON agencia_calidad.* TO 'agencia_user'@'localhost';
-- FLUSH PRIVILEGES;

USE agencia_calidad;

-- ─────────────────────────────────────────────────────────────────────────────
-- usuarios
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  usuarioId       VARCHAR(36)   NOT NULL,
  nombre          VARCHAR(100)  NOT NULL,
  email           VARCHAR(255)  NOT NULL,
  password_hash   VARCHAR(255)  NOT NULL,
  rol             ENUM('admin', 'contribuidor') NOT NULL DEFAULT 'contribuidor',
  activo          TINYINT(1)    NOT NULL DEFAULT 1,
  creado_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (usuarioId),
  UNIQUE KEY uq_usuarios_email (email),
  INDEX idx_usuarios_rol (rol),
  INDEX idx_usuarios_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- formularios
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS formularios (
  formularioId    VARCHAR(36)   NOT NULL,
  programa        VARCHAR(255)  NOT NULL,
  descripcion     VARCHAR(500)  NOT NULL DEFAULT '',
  activo          TINYINT(1)    NOT NULL DEFAULT 1,
  creado_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (formularioId),
  INDEX idx_formularios_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- tickets
--
-- id_seq is the AUTO_INCREMENT primary key — its value is used as `numero`
-- (the citizen-facing tracking number) immediately after each INSERT.
-- This avoids race conditions since AUTO_INCREMENT is guaranteed sequential.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id_seq              INT           NOT NULL AUTO_INCREMENT,
  ticketId            VARCHAR(36)   NOT NULL,
  titulo              VARCHAR(200)  NOT NULL,
  descripcion         TEXT          NOT NULL,
  estado              ENUM('abierto', 'en_progreso', 'cerrado') NOT NULL DEFAULT 'abierto',
  prioridad           ENUM('baja', 'media', 'alta', 'critica')  NOT NULL DEFAULT 'media',
  asignado_a          VARCHAR(36)   NULL,
  formularioId        VARCHAR(36)   NULL,
  ciudadano_nombre    VARCHAR(200)  NULL,
  ciudadano_email     VARCHAR(255)  NULL,
  ciudadano_telefono  VARCHAR(50)   NULL,
  fecha_creacion      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_cierre        DATETIME      NULL,
  numero              INT           NOT NULL DEFAULT 0,
  PRIMARY KEY (id_seq),
  UNIQUE KEY uq_tickets_ticketId (ticketId),
  UNIQUE KEY uq_tickets_numero (numero),
  INDEX idx_tickets_estado (estado),
  INDEX idx_tickets_formularioId (formularioId),
  INDEX idx_tickets_asignado_a (asignado_a),
  CONSTRAINT fk_tickets_asignado
    FOREIGN KEY (asignado_a) REFERENCES usuarios(usuarioId) ON DELETE SET NULL,
  CONSTRAINT fk_tickets_formulario
    FOREIGN KEY (formularioId) REFERENCES formularios(formularioId) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- comentarios
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comentarios (
  comentarioId  VARCHAR(36)  NOT NULL,
  ticketId      VARCHAR(36)  NOT NULL,
  autor_id      VARCHAR(36)  NOT NULL,
  contenido     TEXT         NOT NULL,
  fecha         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (comentarioId),
  INDEX idx_comentarios_ticketId (ticketId),
  CONSTRAINT fk_comentarios_ticket
    FOREIGN KEY (ticketId) REFERENCES tickets(ticketId) ON DELETE CASCADE,
  CONSTRAINT fk_comentarios_autor
    FOREIGN KEY (autor_id) REFERENCES usuarios(usuarioId) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
