import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const RATE_LIMIT_STORE = new Map<string, { count: number; resetAt: number }>();

// Tight burst limiter specifically for authentication endpoints.  This only
// slows down rapid-fire request floods; the durable 10-failure / 15-minute
// hard lock is enforced in LoginThrottleService inside auth.service.login().
const AUTH_BURST_MAX = 20;
const AUTH_BURST_WINDOW_MS = 60 * 1000;

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('X-DNS-Prefetch-Control', 'on');
    res.removeHeader('X-Powered-By');

    // Rate limiting per IP
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 200;

    const key = `rate:${ip}`;
    const record = RATE_LIMIT_STORE.get(key);

    if (!record || now > record.resetAt) {
      RATE_LIMIT_STORE.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      record.count++;
      if (record.count > maxRequests) {
        res.setHeader('Retry-After', Math.ceil((record.resetAt - now) / 1000));
        res.status(429).json({
          success: false,
          error: { message: 'Too many requests. Please try again later.', statusCode: 429 },
        });
        return;
      }
    }

    // Burst limiter for authentication endpoints.  The durable 10-failed /
    // 15-minute hard lock is handled in LoginThrottleService; this window
    // just prevents an attacker from sending an unlimited stream of login
    // requests in a very short time (e.g. many per second).
    const authPaths = [
      '/auth/login',
      '/auth/register',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/password-reset/validate',
      '/auth/2fa/verify-login',
    ];
    const isAuthPath = authPaths.some((p) => req.path.includes(p));
    if (isAuthPath) {
      const burstKey = `authburst:${ip}`;
      const burst = RATE_LIMIT_STORE.get(burstKey);

      if (!burst || now > burst.resetAt) {
        RATE_LIMIT_STORE.set(burstKey, { count: 1, resetAt: now + AUTH_BURST_WINDOW_MS });
      } else {
        burst.count++;
        if (burst.count > AUTH_BURST_MAX) {
          res.setHeader('Retry-After', Math.ceil((burst.resetAt - now) / 1000));
          res.status(429).json({
            success: false,
            error: {
              message: 'Too many auth attempts. Please wait a moment and try again.',
              statusCode: 429,
            },
          });
          return;
        }
      }
    }

    // Deterministic cleanup of expired entries to bound memory usage
    if (RATE_LIMIT_STORE.size > 10000) {
      for (const [k, v] of RATE_LIMIT_STORE.entries()) {
        if (now > v.resetAt) RATE_LIMIT_STORE.delete(k);
      }
    }

    next();
  }
}
