import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env.js';
import { authRouter } from './routes/authRoutes.js';
import { examRouter } from './routes/examRoutes.js';
import { paragraphRouter } from './routes/paragraphRoutes.js';
import { resultRouter } from './routes/resultRoutes.js';
import { adminRouter } from './routes/adminRoutes.js';
import analyticsRouter from './routes/analyticsRoutes.js';
import { errorHandler, notFound } from './middleware/error.js';

export const app = express();
app.set('trust proxy', 1);
app.use(helmet());
const allowedOrigins = env.clientUrl.split(',').map((item) => item.trim());
if (env.nodeEnv !== 'production') allowedOrigins.push('http://localhost:5173', 'http://127.0.0.1:5173');
const uniqueAllowedOrigins = [...new Set(allowedOrigins.filter(Boolean))];
const isAllowedOrigin = (origin) => uniqueAllowedOrigins.some((allowedOrigin) => {
  if (allowedOrigin === '*') return env.nodeEnv !== 'production';
  if (allowedOrigin === origin) return true;
  if (!allowedOrigin.includes('*')) return false;
  const pattern = new RegExp(`^${allowedOrigin.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
  return pattern.test(origin);
});
app.use(cors({
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: false
}));
app.use(compression());
app.use(express.json({ limit: '100kb' }));
if (env.nodeEnv !== 'test') app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: 'draft-8', legacyHeaders: false }));
app.get('/api/health', (_req, res) => res.json({ success: true, status: 'healthy' }));
app.use('/api/auth', authRouter);
app.use('/api/exams', examRouter);
app.use('/api/paragraphs', paragraphRouter);
app.use('/api/results', resultRouter);
app.use('/api/admin', adminRouter);
app.use('/api/analytics', analyticsRouter);
app.use(notFound);
app.use(errorHandler);
