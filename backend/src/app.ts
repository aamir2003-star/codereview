import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import repoRoutes from './routes/repo.routes';
import reviewRoutes from './routes/review.routes';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/', healthRoutes);
app.use('/auth', authRoutes);
app.use('/repos', repoRoutes);
app.use('/review', reviewRoutes);

export default app;
