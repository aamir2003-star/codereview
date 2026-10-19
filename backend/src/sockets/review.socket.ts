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

function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  const items = cookieHeader.split(';');
  for (const item of items) {
    const idx = item.indexOf('=');
    if (idx !== -1) {
      const key = item.substring(0, idx).trim();
      let val = item.substring(idx + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      try {
        cookies[key] = decodeURIComponent(val);
      } catch {
        cookies[key] = val;
      }
    }
  }
  return cookies;
}

export function setupReviewSockets(io: Server): void {
  // Socket.io Auth Middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const cookies = parseCookies(socket.handshake.headers.cookie);
    const cookieToken = cookies.auth_token;

    const authToken =
      socket.handshake.auth?.token && socket.handshake.auth.token !== 'cookie-session'
        ? String(socket.handshake.auth.token)
        : null;

    const headerToken = socket.handshake.headers.authorization?.startsWith('Bearer ')
      ? socket.handshake.headers.authorization.split(' ')[1]
      : null;

    // Check candidate tokens in priority order:
    // 1. HttpOnly Cookie (secure browser session)
    // 2. Auth payload
    // 3. Authorization header
    const candidates = [cookieToken, authToken, headerToken].filter(Boolean) as string[];

    if (candidates.length === 0) {
      console.warn(`[Socket.io] Auth rejected: No token found for socket ${socket.id}`);
      return next(new Error('Authentication error: No token provided'));
    }

    let verifiedUser: JwtPayload | null = null;
    let lastError: Error | null = null;

    for (const cand of candidates) {
      const cleanToken = cand.replace(/^"|"$/g, '').replace(/^Bearer\s+/i, '').trim();
      try {
        const decoded = jwt.verify(cleanToken, config.jwtSecret) as JwtPayload;
        verifiedUser = decoded;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    if (!verifiedUser) {
      console.warn(`[Socket.io] Auth rejected: Invalid JWT for socket ${socket.id}:`, lastError?.message);
      return next(new Error('Authentication error: Invalid token'));
    }

    socket.data.user = verifiedUser;
    next();
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

      const review = await Review.findOne({ _id: reviewId, requestedBy: new mongoose.Types.ObjectId(user.userId) }).select('_id').lean();
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
