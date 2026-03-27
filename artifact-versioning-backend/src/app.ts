import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { authMiddleware } from './middleware/auth.stub.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import projectsRouter from './routes/projects.js';
import artifactsRouter from './routes/artifacts.js';
import versionsRouter from './routes/versions.js';
import searchRouter from './routes/search.js';
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';
import { pingS3 } from './storage/s3.js';

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (env.CORS_ORIGINS ?? 'http://localhost:5173').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: env.MAX_UPLOAD_BYTES }));
// Note: raw body parsing for version uploads is handled in the route itself

// ─── Auth stub ────────────────────────────────────────────────────────────────
app.use(authMiddleware);

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  let dbStatus: 'connected' | 'error' = 'error';
  let s3Status: 'connected' | 'error' = 'error';

  try {
    await db.execute(sql`SELECT 1`);
    dbStatus = 'connected';
  } catch { /* leave as error */ }

  const s3Ok = await pingS3(2000);
  s3Status = s3Ok ? 'connected' : 'error';

  res.status(200).json({
    status: 'ok',
    db: dbStatus,
    s3: s3Status,
    uptime_seconds: Math.floor(process.uptime()),
  });
});

// ─── API v1 routes ────────────────────────────────────────────────────────────
const v1 = express.Router();

v1.use('/projects', projectsRouter);
v1.use('/artifacts', artifactsRouter);

// Version routes nested under artifacts
v1.use('/artifacts/:id/versions', versionsRouter);
// Lineage is at /artifacts/:id/lineage — handled in versions router via mergeParams
v1.use('/artifacts/:id/lineage', async (req, res, next) => {
  // Redirect to lineage handler in versionsRouter
  req.url = '/lineage';
  versionsRouter(req, res, next);
});
// Tags are at /artifacts/:id/tags — handled in versions router
v1.use('/artifacts/:id/tags', async (req, res, next) => {
  req.url = `/tags${req.url === '/' ? '' : req.url}`;
  versionsRouter(req, res, next);
});

v1.use('/search', searchRouter);

app.use('/api/v1', v1);

// ─── 404 + global error ───────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
