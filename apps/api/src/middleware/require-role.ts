import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import type { SessionUser } from "../modules/auth/services/auth.service.js";

/**
 * Guard a mutation by role. PLATFORM_ADMIN is always allowed. Otherwise the
 * membership role (set by requirePropertyScope) or the global role is checked.
 */
export function requireRole(allowed: UserRole[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const user = res.locals.user as SessionUser | undefined;

    if (!user) {
      res.status(401).json({ error: { code: "UNAUTHENTICATED" } });
      return;
    }

    if (user.role === "PLATFORM_ADMIN") {
      next();
      return;
    }

    const effectiveRole =
      (res.locals.membershipRole as UserRole | undefined) ?? user.role;

    if (!allowed.includes(effectiveRole)) {
      res.status(403).json({ error: { code: "FORBIDDEN" } });
      return;
    }

    next();
  };
}