import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { JwtPayload } from '../middleware/auth.middleware';
import mongoose from 'mongoose';
import { Review } from '../models/Review';

export interface AuthenticatedSocket extends Socket {
  data: {
    user?: JwtPayload;
  };
}

// Track connected users per review room: Map<reviewId, Set<username>>
const roomPresence = new Map<string, Map<string, { userId: string; username: string; avatarUrl?: string }>>();

export function setupReviewSockets(io: Server): void {
  // Socket.io Auth Middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization?.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.split(' ')[1]
        : null);

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.data.user;

    // CRITICAL: Disconnect unauthenticated sockets immediately
    if (!user) {
      console.warn(`[Socket.io] Rejecting unauthenticated connection: ${socket.id}`);
      socket.disconnect(true);
      return;
    }

    console.log(`[Socket.io] User connected: ${user?.username} (${socket.id})`);

    // Join a review room
    socket.on('join:review', async ({ reviewId }: { reviewId: string }) => {
      if (!reviewId || !mongoose.isValidObjectId(reviewId) || !user) {
        socket.emit('join:error', { error: 'Invalid review' });
        return;
      }

      const review = await Review.findOne({ _id: reviewId, requestedBy: user.userId }).select('_id').lean();
      if (!review) {
        socket.emit('join:error', { error: 'Not authorized for this review' });
        return;
      }

      const roomName = `review:${reviewId}`;
      socket.join(roomName);

      if (user) {
        if (!roomPresence.has(reviewId)) {
          roomPresence.set(reviewId, new Map());
        }
        const roomUsers = roomPresence.get(reviewId)!;
        roomUsers.set(socket.id, {
          userId: user.userId,
          username: user.username,
        });

        // Broadcast updated presence list
        const activeUsers = Array.from(
          new Map(Array.from(roomUsers.values()).map((u) => [u.userId, u])).values()
        );
        io.to(roomName).emit('presence:update', { reviewId, users: activeUsers });
      }

      console.log(`[Socket.io] ${user?.username} joined room ${roomName}`);
    });

    // Leave a review room
    socket.on('leave:review', ({ reviewId }: { reviewId: string }) => {
      if (!reviewId) return;

      const roomName = `review:${reviewId}`;
      socket.leave(roomName);

      const roomUsers = roomPresence.get(reviewId);
      if (roomUsers) {
        roomUsers.delete(socket.id);
        if (roomUsers.size === 0) roomPresence.delete(reviewId);
        const activeUsers = Array.from(
          new Map(Array.from(roomUsers.values()).map((u) => [u.userId, u])).values()
        );
        io.to(roomName).emit('presence:update', { reviewId, users: activeUsers });
      }

      console.log(`[Socket.io] ${user?.username} left room ${roomName}`);
    });

    socket.on('disconnecting', () => {
      // Clean up presence across all joined review rooms
      for (const room of socket.rooms) {
        if (room.startsWith('review:')) {
          const reviewId = room.replace('review:', '');
          const roomUsers = roomPresence.get(reviewId);
          if (roomUsers) {
            roomUsers.delete(socket.id);
            if (roomUsers.size === 0) roomPresence.delete(reviewId);
            const activeUsers = Array.from(
              new Map(Array.from(roomUsers.values()).map((u) => [u.userId, u])).values()
            );
            socket.to(room).emit('presence:update', { reviewId, users: activeUsers });
          }
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] User disconnected: ${user?.username} (${socket.id})`);
    });
  });
}
