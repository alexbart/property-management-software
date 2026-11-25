import type { Request, Response } from "express";
import { ZodError } from "zod";
import { TenantIdParamsDto } from "@property-platform/contracts";
import { prisma } from "../../../database/prisma.js";
import { NotFoundException } from "../../finance/services/finance.service.js";
import { evaluateAndUpdateRiskScore } from "../services/tenant-risk.service.js";

function handleError(res: Response, error: unknown): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", issues: error.issues },
    });
    return;
  }

  if (error instanceof NotFoundException) {
    res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Tenant not found for this property",
      },
    });
    return;
  }

  res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
}

/** Recompute and persist a tenant's risk profile within the caller's property. */
export async function evaluateRiskHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = TenantIdParamsDto.parse(req.params);
    const propertyId = res.locals.propertyId as string;
    const result = await evaluateAndUpdateRiskScore(id, propertyId);

    res.status(200).json({
      data: { riskScore: result.riskScore, riskFlags: result.riskFlags },
});
  } catch (error) {
    handleError(res, error);
  }
}

/** List tenants with leases in the caller's property, ranked by risk. */
export async function listTenantsHandler(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const scope = res.locals.propertyId as string;
    const tenants = await prisma.tenant.findMany({
      where: { leases: { some: { propertyId: scope } } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        riskScore: true,
        riskFlags: true,
      },
      orderBy: { riskScore: "desc" },
    });

    res.status(200).json({ data: tenants });
  } catch (error) {
    handleError(res, error);
  }
}

/** Read a tenant's current risk profile within the caller's property. */
export async function getRiskProfileHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = TenantIdParamsDto.parse(req.params);
    const propertyId = res.locals.propertyId as string;

    const tenant = await prisma.tenant.findFirst({
      where: { id, leases: { some: { propertyId } } },
      select: { riskScore: true, riskFlags: true },
    });

    if (!tenant) {
      throw new NotFoundException(
        `Tenant ${id} not found for property ${propertyId}`,
      );
    }

    res.status(200).json({
      data: { riskScore: tenant.riskScore, riskFlags: tenant.riskFlags },
    });
  } catch (error) {
    handleError(res, error);
  }
}