import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import repoRoutes from './routes/repo.routes';
import reviewRoutes from './routes/review.routes';
import commentRoutes from './routes/comment.routes';

const app = express();

app.use(helmet());

// CRITICAL FIX: Validate origin against whitelist
const allowedOrigins = (process.env.ALLOWED_ORIGINS || config.clientUrl).split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS not allowed for origin: ${origin}`));
      }
    },
    credentials: true,
  })
);

app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/', healthRoutes);
app.use('/auth', authRoutes);
app.use('/repos', repoRoutes);
app.use('/review', reviewRoutes);
app.use('/comments', commentRoutes);

// Global error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const error = err instanceof Error ? err : new Error('Unknown error');
  console.error('[Error Handler]', error.message);
  res.status(500).json({
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? error.message : undefined,
  });
});

export default app;
