const express = require('express');
const os = require('os');
const { exec } = require('child_process');
const { pool } = require('../db/connection');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

router.use(autenticar, (req, res, next) => {
  if (req.usuario.rol !== 'dev' && req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
});

function getCpuPct() {
  return new Promise(resolve => {
    const snap = os.cpus().map(c => ({ ...c.times }));
    setTimeout(() => {
      const cpus = os.cpus();
      let idleD = 0, totalD = 0;
      cpus.forEach((cpu, i) => {
        const s = snap[i];
        Object.entries(cpu.times).forEach(([k, v]) => {
          const d = v - (s[k] || 0);
          totalD += d;
          if (k === 'idle') idleD += d;
        });
      });
      resolve(totalD > 0 ? Math.round((1 - idleD / totalD) * 1000) / 10 : 0);
    }, 200);
  });
}

function getDisk() {
  return new Promise(resolve => {
    exec('df -k / 2>/dev/null | tail -1', (err, out) => {
      if (err || !out) return resolve(null);
      const p = out.trim().split(/\s+/);
      if (p.length < 5) return resolve(null);
      resolve({
        total: +p[1] * 1024,
        used:  +p[2] * 1024,
        avail: +p[3] * 1024,
        pct:   parseInt(p[4], 10),
      });
    });
  });
}

// GET /api/sistema/metricas
router.get('/metricas', async (_req, res) => {
  try {
    const [cpuPct, disk] = await Promise.all([getCpuPct(), getDisk()]);
    let dbOk = false;
    try { await pool.query('SELECT 1'); dbOk = true; } catch {}

    const mt = os.totalmem(), mf = os.freemem(), mu = mt - mf;
    res.json({
      cpu: { pct: cpuPct, cores: os.cpus().length, model: os.cpus()[0]?.model ?? 'N/A' },
      mem: { total: mt, used: mu, pct: Math.round(mu / mt * 1000) / 10 },
      disk,
      uptime: { system: Math.round(os.uptime()), process: Math.round(process.uptime()) },
      node: { version: process.version, platform: process.platform },
      db: { ok: dbOk },
      ts: Date.now(),
    });
  } catch (err) {
    console.error('[GET /sistema/metricas]', err);
    res.status(500).json({ error: 'Error obteniendo métricas' });
  }
});

// GET /api/sistema/resumen
router.get('/resumen', async (_req, res) => {
  try {
    const [[u]] = await pool.query('SELECT COUNT(*) AS n FROM usuarios WHERE activo = 1 AND rol != "dev"');
    const [[t]] = await pool.query('SELECT COUNT(*) AS n FROM tickets WHERE eliminado = 0');
    const [[f]] = await pool.query('SELECT COUNT(*) AS n FROM feedback WHERE leido = 0');
    const [[b]] = await pool.query('SELECT COUNT(*) AS n FROM barreras_savean WHERE activa = 1');
    const [[g]] = await pool.query("SELECT COUNT(*) AS n FROM guias_savean WHERE estado = 'pendiente'");
    res.json({ usuarios: u.n, tickets: t.n, feedbackNoLeido: f.n, barreras: b.n, guiasPendientes: g.n });
  } catch (err) {
    console.error('[GET /sistema/resumen]', err);
    res.status(500).json({ error: 'Error' });
  }
});

module.exports = router;
