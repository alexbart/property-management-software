import type { NextFunction, Request, Response } from "express";
import { getSessionUser } from "../modules/auth/services/auth.service.js";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

/** 401 unless a valid, active session user exists. */
export async function requireAuth(
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