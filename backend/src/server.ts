import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { config } from './config/env';
import { connectDB } from './config/db';
import { setIO } from './sockets/socket.instance';
import { setupReviewSockets } from './sockets/review.socket';

const server = http.createServer(app);

// Setup Socket.io
export const io = new Server(server, {
  cors: {
    origin: config.clientUrl,
    methods: ['GET', 'POST', 'PATCH'],
    credentials: true,
  },
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
