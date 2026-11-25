import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

/**
 * Development-only scope bypass.
 *
 * When NODE_ENV !== 'production' AND AUTH_DEV_BYPASS=true, a synthetic
 * PLATFORM_ADMIN user is injected so that automated tests and local callers
 * can exercise the API without a login. If the x-property-id header is also
 * present, it is honoured as the property scope.
 *
 * In production the header is ignored entirely.
 */
export function devBypass(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (env.NODE_ENV !== "production" && env.AUTH_DEV_BYPASS) {
    const header = req.get("x-property-id");
    if (header) {
      res.locals.propertyId = header;
    }
    // Synthetic platform admin so dev/test callers can exercise mutations
    // without a login. Never active in production.
    res.locals.user = {
      id: "dev-user",
      email: "dev@local",
      role: "PLATFORM_ADMIN",
      active: true,
      propertyMemberships: [],
      tenantLink: null,
    };
    res.locals.devBypass = true;
  }

  next();
}