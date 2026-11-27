import type { NextFunction, Request, Response } from "express";
import { prisma } from "../database/prisma.js";
import type { SessionUser } from "../modules/auth/services/auth.service.js";

async function resolvePropertyId(req: Request): Promise<string | undefined> {
  // 1. Check explicit propertyId in params, body, or query
  const fromParams = req.params.propertyId;
  if (typeof fromParams === "string") {
    return fromParams;
  }

  const body = req.body as { propertyId?: unknown } | undefined;
  if (body && typeof body.propertyId === "string") {
    return body.propertyId;
  }

  const fromQuery = req.query.propertyId;
  if (typeof fromQuery === "string") {
    return fromQuery;
  }

  // 2. Check for leaseId and resolve property from lease
  const leaseId = req.params.leaseId;
  if (typeof leaseId === "string") {
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      select: { propertyId: true, tenantId: true },
    });
    if (lease) {
      return lease.propertyId;
    }
  }

  return undefined;
}

/**
 * Resolve the target property and authorise the session user for it.
 *
 * PLATFORM_ADMIN may access any property.
 * LANDLORD/MANAGER need an active PropertyMembership for the property.
 * TENANT may access the property of their own lease (via TenantLink).
 * Missing/foreign resources return 403 (no existence leak).
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

  const propertyId = await resolvePropertyId(req);

  if (!propertyId) {
    res.status(403).json({ error: { code: "FORBIDDEN" } });
    return;
  }

  if (user.role === "PLATFORM_ADMIN") {
    res.locals.propertyId = propertyId;
    next();
    return;
  }

  // Check property membership for LANDLORD/MANAGER
  if (user.role === "LANDLORD" || user.role === "MANAGER") {
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
    return;
  }

  // Check tenant access for TENANT role
  if (user.role === "TENANT" && user.tenantLink) {
    const lease = await prisma.lease.findFirst({
      where: {
        propertyId,
        tenantId: user.tenantLink.tenantId,
      },
      select: { id: true },
    });

    if (!lease) {
      res.status(403).json({ error: { code: "FORBIDDEN" } });
      return;
    }

    res.locals.propertyId = propertyId;
    next();
    return;
  }

  res.status(403).json({ error: { code: "FORBIDDEN" } });
}