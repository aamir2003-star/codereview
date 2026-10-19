import express from 'express';
import compression from 'compression';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import repoRoutes from './routes/repo.routes';
import reviewRoutes from './routes/review.routes';
import commentRoutes from './routes/comment.routes';
import prExportRoutes from './routes/pr-export.routes';

const app = express();

// Rate limiting: Global protection against scraping and API abuse
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' },
});

// Stricter rate limiting for expensive AI review triggers
const reviewLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Review request limit reached. Please wait a few minutes before starting another review.' },
});

// Stricter rate limiting for OAuth & session routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
});

// Apply global rate limiter
app.use(globalLimiter);

// Enable Gzip/Brotli response compression for all API payloads (diffs, reviews, comment lists)
app.use(compression());

// Disable ETag generation to prevent 304 Not Modified responses on dynamic JSON APIs
app.set('etag', false);

// Disable Helmet's Cross-Origin-Resource-Policy restriction so frontend on port 3000 can call backend on port 5001
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
  })
);

// Development-friendly CORS with strict production whitelist
const defaultOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001'];
const configuredOrigins = (process.env.ALLOWED_ORIGINS || config.clientUrl).split(',').map((o) => o.trim());
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...configuredOrigins]));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (
        config.nodeEnv === 'development' ||
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        return callback(null, true);
      }

      // In production, reject unapproved origins
      return callback(new Error('Origin not allowed by CORS policy'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cache-Control', 'Pragma'],
  })
);

// Always send fresh responses for API calls — prevent 304 caching
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/', healthRoutes);
app.use('/auth', authLimiter, authRoutes);
app.use('/repos', repoRoutes);
app.use('/review', reviewLimiter, reviewRoutes);
app.use('/comments', commentRoutes);
app.use('/export', prExportRoutes);

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
