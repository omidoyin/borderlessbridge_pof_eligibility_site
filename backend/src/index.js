require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { pool, pingDatabase } = require('./database/pool');
const submissionsRouter = require('./routes/submissions');

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ── Trust proxy (required for accurate IP behind Render/Heroku/Supabase) ─────
app.set('trust proxy', 1);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001', 'https://borderlessbridge.veleonex.com'],
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Global limiter: 120 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

app.use(globalLimiter);

// ── Health routes ─────────────────────────────────────────────────────────────

// Basic API liveness check (no DB, for uptime pings)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'borderlessbridge-api', timestamp: new Date().toISOString() });
});

// DB heartbeat — wakes up Supabase connection pool & increments counter
app.get('/api/borderlessbridgeheart', async (_req, res) => {
  try {
    await pool.query(
      'UPDATE borderlessbridgeheart SET last_ping = CURRENT_TIMESTAMP, counter = counter + 1 WHERE id = 1'
    );
    res.status(200).json({ status: 'alive', heart: 'beating' });
  } catch (err) {
    console.error('[Heart] Heartbeat check failed:', err.message);
    res.status(500).json({ error: 'Heartbeat failed' });
  }
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/submissions', submissionsRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n🚀 BorderlessBridge API running on http://localhost:${PORT}`);
  console.log(`   Health:    http://localhost:${PORT}/api/health`);
  console.log(`   Heartbeat: http://localhost:${PORT}/api/borderlessbridgeheart`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);

  // Warm up the DB connection on startup
  try {
    await pingDatabase();
    console.log('   ✅ Supabase DB connection OK');
  } catch (err) {
    console.warn('   ⚠️  DB ping failed on startup:', err.message);
  }
});
