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

const startServer = async () => {
  await connectDB();

  server.listen(config.port, () => {
    console.log(`[Server] Running on http://localhost:${config.port}`);
    console.log(`[Environment] ${config.nodeEnv}`);
  });
};

startServer();
