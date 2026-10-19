import { Request, Response, NextFunction } from 'express';
import { cache } from '../cache/cache.manager';

interface IRateLimitOptions {
  windowSeconds?: number;
  maxRequests?: number;
}

export function rateLimiter(options: IRateLimitOptions = {}) {
  const windowSeconds = options.windowSeconds || 60;
  const maxRequests = options.maxRequests || 100;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `ratelimit:${ip}`;

    const currentCount = (await cache.get<number>(key)) || 0;

    if (currentCount >= maxRequests) {
      res.status(429).json({
        error: 'Too many requests. Please slow down and try again later.',
        retryAfterSeconds: windowSeconds,
      });
      return;
    }

    await cache.set(key, currentCount + 1, { ttlSeconds: windowSeconds });

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - currentCount - 1));

    next();
  };
}
