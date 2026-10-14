require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { testConnection } = require('./db/connection');

const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');
const ticketsRoutes = require('./routes/tickets');
const formulariosRoutes = require('./routes/formularios');
const saveanRoutes = require('./routes/savean');
const saveanEntradaRoutes = require('./routes/savean-entrada');
const saveanPuntoControlRoutes = require('./routes/savean-punto-control');
const comiteRoutes = require('./routes/comite');
const reportesRoutes = require('./routes/reportes');
const configRoutes = require('./routes/config');

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// Confiar en el primer proxy (nginx) para que express-rate-limit use la IP real del cliente
app.set('trust proxy', 1);

// ─── HTTPS redirect (producción) ─────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// ─── Helmet (HTTP security headers) ──────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// ─── CORS ────────────────────────────────────────────────────────────────────
// CORS_ORIGIN is a comma-separated list of allowed origins
const allowedOrigins = [
  ...(process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean),
  'http://localhost:5173',
  'http://localhost:4173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Postman, curl, mobile apps)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/formularios', formulariosRoutes);
app.use('/api/savean', saveanRoutes);
app.use('/api/savean/entrada', saveanEntradaRoutes);
app.use('/api/savean/punto-control', saveanPuntoControlRoutes);
app.use('/api/comite', comiteRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/config', configRoutes);

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
// 4-parameter signature is required by Express to recognise this as an error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({ error: 'El archivo adjunto es demasiado grande. Máximo permitido: 50 MB por solicitud.' });
  }
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ error: 'Origen no permitido.' });
  }
  console.error('[UNHANDLED ERROR]', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ─── Auto-migration: etapas_ticket + config_sistema ──────────────────────────
async function runMigrations() {
  const { pool } = require('./db/connection');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS etapas_ticket (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      nombre     VARCHAR(100) NOT NULL,
      orden      INT          NOT NULL DEFAULT 0,
      color      VARCHAR(7)   NOT NULL DEFAULT '#6B7280',
      bg_color   VARCHAR(7)   NOT NULL DEFAULT '#F9FAFB',
      es_cierre  TINYINT(1)   NOT NULL DEFAULT 0,
      activa     TINYINT(1)   NOT NULL DEFAULT 1,
      creado_en  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_etapa_nombre (nombre)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS config_sistema (
      clave       VARCHAR(100) NOT NULL,
      valor       TEXT,
      descripcion VARCHAR(255),
      PRIMARY KEY (clave)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const etapas = [
    ['Solicitud inicial',            1,  '#F97316', '#FFF7ED', 0],
    ['Revisión de documentación',    2,  '#EAB308', '#FEFCE8', 0],
    ['Documentación observada',      3,  '#EF4444', '#FEF2F2', 0],
    ['Veraz',                        4,  '#06B6D4', '#ECFEFF', 0],
    ['Externo/ Comite de selección', 5,  '#F97316', '#FFF7ED', 0],
    ['Comité de análisis',           6,  '#8B5CF6', '#F5F3FF', 0],
    ['Contrato',                     7,  '#6366F1', '#EEF2FF', 0],
    ['Simulador',                    8,  '#3B82F6', '#EFF6FF', 0],
    ['Firma de contrato',            9,  '#EC4899', '#FDF2F8', 0],
    ['Certificación de firma',       10, '#D946EF', '#FDF4FF', 0],
    ['Transferencia',                11, '#22C55E', '#F0FDF4', 0],
    ['Seguimiento de verificable',   12, '#14B8A6', '#F0FDFA', 0],
    ['Seguimiento de cobranzas',     13, '#F59E0B', '#FFFBEB', 0],
    ['Sin fondo',                    14, '#EF4444', '#FEF2F2', 0],
    ['Cerrado',                      15, '#6B7280', '#F9FAFB', 1],
  ];

  for (const [nombre, orden, color, bg_color, es_cierre] of etapas) {
    await pool.query(
      'INSERT IGNORE INTO etapas_ticket (nombre, orden, color, bg_color, es_cierre) VALUES (?, ?, ?, ?, ?)',
      [nombre, orden, color, bg_color, es_cierre]
    );
  }

  console.log('✓ Migración etapas_ticket completada');
}

// ─── Startup ──────────────────────────────────────────────────────────────────
async function start() {
  try {
    await testConnection();
    await runMigrations();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Allowed CORS origins: ${allowedOrigins.join(', ') || '(none configured)'}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
