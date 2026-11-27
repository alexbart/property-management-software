import type { NextFunction, Request, Response } from "express";
import { prisma } from "../database/prisma.js";
import type { SessionUser } from "../modules/auth/services/auth.service.js";

/**
 * Resolve the acting tenant from TenantLink and authorise access to the
 * requested resource. A tenant may only act on its own lease/property.
 */
export async function requireTenantScope(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (res.locals.devBypass) {
    next();
    return;
  }

  const user = res.locals.user as SessionUser | undefined;
  if (!user) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED" } });
    return;
  }

  const link = await prisma.tenantLink.findUnique({
    where: { userId: user.id },
    select: { tenantId: true },
  });

  if (!link) {
    res.status(403).json({ error: { code: "FORBIDDEN" } });
    return;
  }

  res.locals.tenantId = link.tenantId;

  const leaseId = req.params.leaseId;
  if (typeof leaseId === "string") {
    const lease = await prisma.lease.findFirst({
      where: { id: leaseId, tenantId: link.tenantId },
      select: { propertyId: true },
    });

    if (!lease) {
      res.status(403).json({ error: { code: "FORBIDDEN" } });
      return;
    }

    res.locals.propertyId = lease.propertyId;
    next();
    return;
  }

  const body = req.body as { propertyId?: unknown } | undefined;
  const propertyId =
    body && typeof body.propertyId === "string"
      ? body.propertyId
      : undefined;

  if (propertyId) {
    const lease = await prisma.lease.findFirst({
      where: { tenantId: link.tenantId, propertyId },
      select: { id: true },
    });

    if (!lease) {
      res.status(403).json({ error: { code: "FORBIDDEN" } });
      return;
    }

    res.locals.propertyId = propertyId;
  }

  next();
}