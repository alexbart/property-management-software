import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

/**
 * Development-only scope bypass.
 *
 * When NODE_ENV !== 'production' AND AUTH_DEV_BYPASS=true, the x-property-id
 * header is honoured as a property scope and a synthetic PLATFORM_ADMIN user is
 * injected so that automated tests and local callers can exercise the API
 * without a login.
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
      // Only set synthetic user when x-property-id header is explicitly provided
      res.locals.propertyId = header;
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
  }

  next();
}