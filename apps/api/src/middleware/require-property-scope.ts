import type { NextFunction, Request, Response } from "express";
import { prisma } from "../database/prisma.js";
import type { SessionUser } from "../modules/auth/services/auth.service.js";

function resolvePropertyId(req: Request): string | undefined {
  const fromParams = req.params.propertyId;
  if (typeof fromParams === "string") {
    return fromParams;
  }

  const body = req.body as { propertyId?: unknown } | undefined;
  if (body && typeof body.propertyId === "string") {
    return body.propertyId;
  }

  const fromQuery = req.query.propertyId;
  return typeof fromQuery === "string" ? fromQuery : undefined;
}

/**
 * Resolve the target property and authorise the session user for it.
 *
 * PLATFORM_ADMIN may access any property. Other roles need an active
 * PropertyMembership with role LANDLORD or MANAGER. Missing/foreign resources
 * return 403 (no existence leak).
 */
export async function requirePropertyScope(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (res.locals.propertyId) {
    next();
    return;
  }

  const user = res.locals.user as SessionUser | undefined;
  if (!user) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED" } });
    return;
  }

  const propertyId = resolvePropertyId(req);
  if (!propertyId) {
    res.status(403).json({ error: { code: "FORBIDDEN" } });
    return;
  }

  if (user.role === "PLATFORM_ADMIN") {
    res.locals.propertyId = propertyId;
    next();
    return;
  }

  const membership = await prisma.propertyMembership.findFirst({
    where: {
      userId: user.id,
      propertyId,
      role: { in: ["LANDLORD", "MANAGER"] },
    },
    select: { role: true },
  });

  if (!membership) {
    res.status(403).json({ error: { code: "FORBIDDEN" } });
    return;
  }

  res.locals.propertyId = propertyId;
  res.locals.membershipRole = membership.role;
  next();
}