import type { NextFunction, Request, Response } from "express";
import { getSessionUser } from "../modules/auth/services/auth.service.js";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

/** 401 unless a valid, active session user exists. */
export async function requireAuth(
/**
 * Placeholder authentication.
 *
 * Real authentication/authorization is deferred to ADR-004. Until then the
 * caller's identity is supplied via the `x-user-id` header so user-scoped
 * isolation and rate limiting can be exercised and tested. This MUST be
 * replaced by proper auth middleware before production exposure.
 * isolation can be exercised and tested. This MUST be replaced by proper auth
 * middleware before production exposure.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // The gated dev bypass may have already established a synthetic user.
  if (res.locals.user) {
    next();
    return;
  }

  const userId = req.session.userId;

  if (!userId) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED" } });
    return;
  }

  const user = await getSessionUser(userId);

  if (!user || !user.active) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED" } });
    return;
  }

  res.locals.user = user;
  res.locals.userId = user.id;
  next();
}