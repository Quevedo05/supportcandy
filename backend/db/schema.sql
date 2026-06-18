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
-- Migration for existing installs: ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS modulo VARCHAR(50) NOT NULL DEFAULT 'tickets';
CREATE TABLE IF NOT EXISTS usuarios (
  usuarioId       VARCHAR(36)   NOT NULL,
  nombre          VARCHAR(100)  NOT NULL,
  email           VARCHAR(255)  NOT NULL,
  password_hash   VARCHAR(255)  NOT NULL,
  rol                    ENUM('admin', 'contribuidor', 'inspector') NOT NULL DEFAULT 'contribuidor',
  modulo                 VARCHAR(50)   NOT NULL DEFAULT 'tickets',
  activo                 TINYINT(1)    NOT NULL DEFAULT 1,
  estados_asignados      JSON          NULL,
  invitation_token       VARCHAR(64)   NULL,
  invitation_expires_at  DATETIME      NULL,
  creado_en              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (usuarioId),
  UNIQUE KEY uq_usuarios_email (email),
  INDEX idx_usuarios_rol (rol),
  INDEX idx_usuarios_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- formularios
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS formularios (
  formularioId      VARCHAR(36)   NOT NULL,
  nombre            VARCHAR(255)  NOT NULL DEFAULT '',
  programa          VARCHAR(255)  NOT NULL,
  descripcion       VARCHAR(500)  NOT NULL DEFAULT '',
  activo            TINYINT(1)    NOT NULL DEFAULT 1,
  campos            JSON          NULL,
  personas_fisicas  TINYINT(1)    NOT NULL DEFAULT 1,
  personas_juridicas TINYINT(1)   NOT NULL DEFAULT 0,
  creado_en         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
  ciudadano_dni       VARCHAR(20)   NULL,
  tipo_tramite        VARCHAR(100)  NULL,
  numero_legajo       VARCHAR(100)  NULL,
  numero_acta         VARCHAR(100)  NULL,
  leido               TINYINT(1)    NOT NULL DEFAULT 0,
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
-- SAVEAN — Guías de origen fitosanitario
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS barreras_savean (
  barreraId     VARCHAR(36)   NOT NULL,
  nombre        VARCHAR(255)  NOT NULL,
  ruta          VARCHAR(100)  NULL,
  kilometro     VARCHAR(50)   NULL,
  departamento  VARCHAR(100)  NULL,
  activa        TINYINT(1)    NOT NULL DEFAULT 1,
  PRIMARY KEY (barreraId),
  INDEX idx_barreras_activa (activa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS barreristas_savean (
  barreristId  VARCHAR(36)   NOT NULL,
  nombre       VARCHAR(255)  NOT NULL,
  usuario      VARCHAR(100)  NOT NULL,
  activo       TINYINT(1)    NOT NULL DEFAULT 1,
  PRIMARY KEY (barreristId),
  INDEX idx_barreristas_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS guias_savean (
  guiaId                    VARCHAR(36)                                       NOT NULL,
  numero                    VARCHAR(30)                                       NOT NULL,
  token                     VARCHAR(64)                                       NOT NULL,
  estado                    ENUM('pendiente','verificada','vencida','denegada') NOT NULL DEFAULT 'pendiente',
  fecha_emision             DATETIME                                          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_vencimiento         DATETIME                                          NOT NULL,
  fecha_verificacion        DATETIME                                          NULL,
  remitente_nombre          VARCHAR(255)                                      NOT NULL,
  remitente_renspa          VARCHAR(100)                                      NULL,
  remitente_inv             VARCHAR(100)                                      NULL,
  remitente_tipo            VARCHAR(100)                                      NULL,
  destinatario_nombre       VARCHAR(255)                                      NOT NULL,
  destino_tipo              ENUM('externo','interno')                         NOT NULL,
  destino_pais              VARCHAR(100)                                      NULL,
  destino_punto_salida      VARCHAR(255)                                      NULL,
  destino_mercado_interno   VARCHAR(100)                                      NULL,
  destino_provincia         VARCHAR(100)                                      NULL,
  items                     JSON                                              NOT NULL,
  transporte_empresa        VARCHAR(255)                                      NULL,
  transporte_conductor      VARCHAR(255)                                      NOT NULL,
  transporte_tipo           VARCHAR(50)                                       NULL,
  transporte_camion_patente VARCHAR(20)                                       NOT NULL,
  transporte_acoplado_patente VARCHAR(20)                                     NULL,
  transporte_precintos      VARCHAR(255)                                      NULL,
  barrera_id                VARCHAR(36)                                       NULL,
  barrera_nombre            VARCHAR(255)                                      NULL,
  inspector_usuario         VARCHAR(255)                                      NULL,
  inspector_nombre          VARCHAR(255)                                      NULL,
  motivo_denegacion         TEXT                                              NULL,
  email_contacto            VARCHAR(255)                                      NULL,
  creado_en                 DATETIME                                          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en            DATETIME                                          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (guiaId),
  UNIQUE KEY uq_guias_numero (numero),
  UNIQUE KEY uq_guias_token (token),
  INDEX idx_guias_estado (estado),
  INDEX idx_guias_fecha_emision (fecha_emision)
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
