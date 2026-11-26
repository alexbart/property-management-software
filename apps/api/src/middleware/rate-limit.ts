import type { NextFunction, Request, Response } from "express";

export interface RateLimitOptions {
  /** Maximum number of requests allowed within the window. */
  max: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

interface WindowState {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory fixed-window rate limiter keyed by a request identifier
 * (defaults to the authenticated user id in `res.locals.userId`).
 *
 * This is intentionally lightweight: it protects CPU-intensive endpoints (e.g.
 * PDF/CSV generation) from a single user spamming requests. It is per-process
 * and resets on restart; a shared store (e.g. Redis) would be required for a
 * multi-instance deployment.
 */
export function createRateLimiter(options: RateLimitOptions) {
  const { max, windowMs } = options;
  const store = new Map<string, WindowState>();

  return function rateLimit(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const key =
      (res.locals.userId as string | undefined) ??
      req.ip ??
      "anonymous";

    const now = Date.now();
    const existing = store.get(key);

    if (!existing || existing.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (existing.count >= max) {
      const retryAfterSec = Math.ceil((existing.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSec));
      res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please try again later.",
        },
      });
      return;
    }

    existing.count += 1;
    next();
  };
}