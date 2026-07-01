import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env.js';
import { corsOptions } from './config/cors.js';
import { getDatabaseStatus } from './config/db.js';
import { authRouter } from './routes/authRoutes.js';
import { examRouter } from './routes/examRoutes.js';
import { paragraphRouter } from './routes/paragraphRoutes.js';
import { resultRouter } from './routes/resultRoutes.js';
import { adminRouter } from './routes/adminRoutes.js';
import analyticsRouter from './routes/analyticsRoutes.js';
import { errorHandler, notFound } from './middleware/error.js';

export const app = express();
app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '500kb' }));
if (env.nodeEnv !== 'test') app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'TypePath API is running successfully.',
    status: 'online',
    version: '1.0.0'
  });
});

const healthCheck = (_req, res) => {
  const database = getDatabaseStatus();
  const isHealthy = database === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    status: isHealthy ? 'healthy' : 'unhealthy',
    database,
    server: 'running'
  });
};

app.get('/health', healthCheck);
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: 'draft-8', legacyHeaders: false }));
app.get('/api/health', healthCheck);
app.use('/api/auth', authRouter);
app.use('/api/exams', examRouter);
app.use('/api/paragraphs', paragraphRouter);
app.use('/api/results', resultRouter);
app.use('/api/admin', adminRouter);
app.use('/api/analytics', analyticsRouter);
app.use(notFound);
app.use(errorHandler);
