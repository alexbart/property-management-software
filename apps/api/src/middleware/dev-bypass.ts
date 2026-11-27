import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

/**
 * Development/test-only auth bypass.
 *
 * When NODE_ENV !== 'production' AND AUTH_DEV_BYPASS=true, a synthetic
 * PLATFORM_ADMIN user is injected so automated tests and local callers can
 * exercise the API without a login:
 * - `x-user-id` authenticates as a synthetic PLATFORM_ADMIN with that id
 *   (preserves per-user isolation in tests). Without it the request stays
 *   unauthenticated (401).
 * - `x-property-id` (only alongside `x-user-id`) sets the property scope.
 *
 * In production the headers are ignored entirely.
 */
export function devBypass(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (env.NODE_ENV !== "production" && env.AUTH_DEV_BYPASS) {
    const userId = req.get("x-user-id");

    if (userId) {
      const propertyHeader = req.get("x-property-id");
      if (propertyHeader) {
        res.locals.propertyId = propertyHeader;
      }

      res.locals.user = {
        id: userId,
        email: "dev@local",
        role: "PLATFORM_ADMIN",
        active: true,
        propertyMemberships: [],
        tenantLink: null,
      };
      res.locals.userId = userId;
      res.locals.devBypass = true;
    }
  }

  next();
}