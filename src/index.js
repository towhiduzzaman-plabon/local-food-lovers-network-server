// server/index.js
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
dotenv.config();

// DEV only: self-signed TLS allow (যদি .env এ ALLOW_INSECURE_TLS=true থাকে)
if (process.env.ALLOW_INSECURE_TLS === 'true') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

import purchaseRoutes from './routes/purchases.routes.js';
import reviewRoutes from './routes/reviews.routes.js';
import favoriteRoutes from './routes/favorites.routes.js';
import authRoutes from './routes/auth.routes.js';
import { initDB } from './db.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// multiple origins দিলে কমা-সেপারেটেড
const rawOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
const ALLOWED_ORIGINS = rawOrigin.split(',').map(s => s.trim());

// proxy/https cookie জন্য
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan('dev'));

// CORS (credentials সহ)
const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // mobile app/curl
    const ok = ALLOWED_ORIGINS.includes(origin);
    cb(ok ? null : new Error('CORS blocked'), ok ? true : undefined);
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Health
app.get('/api/ping', (_req, res) => res.json({ ok: true }));
app.get('/api/health', (_req, res) => res.json({ ok: true, db: true, port: PORT }));

// Routes
app.use('/api/reviews', reviewRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/purchases', purchaseRoutes);

// 404 for unknown API
app.use('/api', (_req, res) => res.status(404).json({ message: 'Not found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  const msg = err.message || 'Server error';
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(status).json({ message: msg, ...(isDev && { stack: err.stack }) });
});

// Start after DB init
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`✅ CORS allow: ${ALLOWED_ORIGINS.join(', ')}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect MongoDB on startup:', err.message);
    process.exit(1);
  });
