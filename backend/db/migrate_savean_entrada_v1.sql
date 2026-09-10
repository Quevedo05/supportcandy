-- =============================================================================
-- Migración SAVEAN Entrada v1
--   Nuevas tablas para el flujo de entrada a la provincia:
--     1. planillas_control_savean   — planilla diaria por barrera
--     2. entradas_planilla_savean   — cada vehículo registrado en la planilla
--     3. ingresos_savean            — acta + declaración jurada (si aplica)
--   Nuevo rol 'sanidad' en tabla usuarios
--
-- Ejecutar en producción:
--   sudo mysql agencia_calidad < db/migrate_savean_entrada_v1.sql
-- =============================================================================

USE agencia_calidad;

-- ─── 1. Agregar rol 'sanidad' a usuarios ─────────────────────────────────────
ALTER TABLE usuarios
  MODIFY COLUMN rol ENUM('admin','contribuidor','inspector','supervisor','operativo','sanidad')
    NOT NULL DEFAULT 'contribuidor';

-- ─── 2. Planilla diaria de control ───────────────────────────────────────────
-- Una planilla por barrera por día. Se cierra automáticamente a las 00:00.
CREATE TABLE IF NOT EXISTS planillas_control_savean (
  planillaId    VARCHAR(36)   NOT NULL,
  barrera_id    VARCHAR(36)   NOT NULL,
  barrera_nombre VARCHAR(100) NOT NULL DEFAULT '',
  fecha         DATE          NOT NULL,
  hora_inicio   TIME          NOT NULL,
  hora_cierre   TIME          NULL,
  estado        ENUM('abierta','cerrada') NOT NULL DEFAULT 'abierta',
  serie         VARCHAR(20)   NOT NULL DEFAULT '01',
  numero_serie  INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  creado_en     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (planillaId),
  UNIQUE KEY uq_planilla_barrera_fecha (barrera_id, fecha),
  KEY idx_planilla_fecha (fecha),
  KEY idx_planilla_estado (estado),
  KEY numero_serie (numero_serie)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 3. Filas de la planilla (cada vehículo que pasa) ────────────────────────
CREATE TABLE IF NOT EXISTS entradas_planilla_savean (
  entradaId       VARCHAR(36)   NOT NULL,
  planilla_id     VARCHAR(36)   NOT NULL,
  tipo_vehiculo   ENUM('auto','colectivo','camion') NOT NULL,
  patente         VARCHAR(20)   NOT NULL,
  procedencia     VARCHAR(100)  NOT NULL DEFAULT '',
  decomiso_kg     DECIMAL(10,2) NULL,
  decomiso_fruta  VARCHAR(100)  NULL,
  inspector_id    VARCHAR(36)   NOT NULL,
  inspector_nombre VARCHAR(100) NOT NULL DEFAULT '',
  -- si se generó acta completa, queda vinculada acá
  ingreso_id      VARCHAR(36)   NULL,
  fecha_hora      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (entradaId),
  KEY idx_entrada_planilla (planilla_id),
  KEY idx_entrada_inspector (inspector_id),
  CONSTRAINT fk_entrada_planilla FOREIGN KEY (planilla_id)
    REFERENCES planillas_control_savean (planillaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 4. Ingreso completo: acta + declaración jurada ──────────────────────────
CREATE TABLE IF NOT EXISTS ingresos_savean (
  ingresoId               VARCHAR(36)   NOT NULL,
  numero                  VARCHAR(30)   NULL,          -- ENTRADA-2026-00001
  entrada_id              VARCHAR(36)   NULL,          -- fila de planilla que lo originó
  barrera_id              VARCHAR(36)   NOT NULL,
  barrera_nombre          VARCHAR(100)  NOT NULL DEFAULT '',
  inspector_id            VARCHAR(36)   NOT NULL,
  inspector_nombre        VARCHAR(100)  NOT NULL DEFAULT '',
  fecha_hora              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- ── Acta Fitozoosanitaria ──
  acta_tipo               ENUM('inspeccion','rechazo','decomiso','infraccion','constatacion') NOT NULL,
  acta_control            VARCHAR(100)  NULL,
  localidad               VARCHAR(100)  NULL,
  departamento            VARCHAR(100)  NULL,
  provincia               VARCHAR(100)  NULL,
  interesado_nombre       VARCHAR(150)  NULL,
  interesado_dni          VARCHAR(20)   NULL,
  interesado_domicilio    VARCHAR(200)  NULL,
  interesado_localidad    VARCHAR(100)  NULL,
  interesado_provincia    VARCHAR(100)  NULL,
  vehiculo                VARCHAR(100)  NULL,
  chasis                  VARCHAR(50)   NULL,
  acoplado                VARCHAR(50)   NULL,
  procedente_de           VARCHAR(100)  NULL,
  destino                 VARCHAR(100)  NULL,
  declaracion             TEXT          NULL,

  -- ── Declaración Jurada de Productos Vegetales ──
  remitente_nombre        VARCHAR(150)  NULL,
  remitente_cuit          VARCHAR(20)   NULL,
  remitente_localidad_cod VARCHAR(10)   NULL,
  remitente_provincia_cod VARCHAR(10)   NULL,
  destinatario_nombre     VARCHAR(150)  NULL,
  destinatario_cuit       VARCHAR(20)   NULL,
  destinatario_localidad_cod VARCHAR(10) NULL,
  destinatario_provincia_cod VARCHAR(10) NULL,
  destino_tipo            ENUM('industria','exportacion','transito') NULL,
  productos               JSON          NULL,   -- [{codigo, nombre, cant_bultos, kg_bulto, kg_totales}]
  transporte_empresa      VARCHAR(150)  NULL,
  transporte_cuit         VARCHAR(20)   NULL,
  transporte_patente      VARCHAR(20)   NULL,
  transporte_acoplado     VARCHAR(20)   NULL,
  transporte_licencia     VARCHAR(30)   NULL,

  -- ── Email y PDF ──
  email_conductor         VARCHAR(255)  NULL,
  pdf_enviado             TINYINT(1)    NOT NULL DEFAULT 0,

  creado_en               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (ingresoId),
  UNIQUE KEY uq_ingreso_numero (numero),
  KEY idx_ingreso_barrera (barrera_id),
  KEY idx_ingreso_inspector (inspector_id),
  KEY idx_ingreso_fecha (fecha_hora),
  CONSTRAINT fk_ingreso_entrada FOREIGN KEY (entrada_id)
    REFERENCES entradas_planilla_savean (entradaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
