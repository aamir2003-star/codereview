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

// Development-friendly CORS with strict production whitelist
const defaultOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001'];
const configuredOrigins = (process.env.ALLOWED_ORIGINS || config.clientUrl).split(',').map((o) => o.trim());
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...configuredOrigins]));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);

      if (
        config.nodeEnv === 'development' ||
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        return callback(null, true);
      }

      return callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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
