import type { NextFunction, Request, Response } from "express";

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
): void {
  const userId = req.header("x-user-id");

  if (!userId) {
    res.status(401).json({
      error: { code: "UNAUTHENTICATED", message: "Missing user identity" },
    });
    return;
  }

  res.locals.userId = userId;
  next();
}