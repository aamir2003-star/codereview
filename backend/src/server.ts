import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { config } from './config/env';
import { connectDB } from './config/db';
import { setIO } from './sockets/socket.instance';
import { setupReviewSockets } from './sockets/review.socket';

const server = http.createServer(app);

const defaultOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001'];
const configuredOrigins = (process.env.ALLOWED_ORIGINS || config.clientUrl).split(',').map((o) => o.trim());
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...configuredOrigins]));

// Setup Socket.io
export const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        config.nodeEnv === 'development' ||
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        return callback(null, origin);
      }
      return callback(null, origin);
    },
    methods: ['GET', 'POST', 'PATCH'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 30000,
  pingInterval: 15000,
  connectTimeout: 15000,
});

setIO(io);
setupReviewSockets(io);

// Start HTTP server immediately (don't wait for DB)
server.listen(config.port, () => {
  console.log(`[Server] Running on http://localhost:${config.port}`);
  console.log(`[Environment] ${config.nodeEnv}`);
});

// Connect to MongoDB asynchronously without blocking startup
// DB connection failures won't crash the server, but queries will fail
connectDB().catch((err) => {
  console.error('[Startup] MongoDB connection failed, but server is running:', err instanceof Error ? err.message : err);
});
