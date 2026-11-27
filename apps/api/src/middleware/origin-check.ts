import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

/**
 * CSRF defence for mutating routes. Requests with no Origin/Referer (for
 * example the Safaricom webhook) are allowed; browser requests must match
 * WEB_ORIGIN.
 */
export function originCheck(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    next();
    return;
  }

  const source = req.get("origin") ?? req.get("referer");
  if (!source) {
    next();
    return;
  }

  try {
    if (new URL(source).origin === new URL(env.WEB_ORIGIN).origin) {
      next();
      return;
    }
  } catch {
    // Fall through to rejection.
  }

  res.status(403).json({ error: { code: "CSRF_DENIED" } });
}