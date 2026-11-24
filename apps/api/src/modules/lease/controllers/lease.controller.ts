import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import {
  CreateLeaseDto,
  LeaseParamsDto,
  TerminateLeaseDto,
} from "@property-platform/contracts";
import {
  activateLease,
  ConflictException,
  createLease,
  NotFoundException,
  terminateLease,
} from "../services/lease.service.js";

function scopePropertyId(res: Response): string {
  return res.locals.propertyId as string;
}

function handleError(res: Response, error: unknown): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", issues: error.issues },
    });
    return;
  }

  if (error instanceof NotFoundException) {
    // Do not reveal whether a lease exists outside the caller's property.
    res.status(403).json({
      error: { code: "FORBIDDEN", message: "Lease not found for this property" },
    });
    return;
  }

  if (error instanceof ConflictException) {
    res.status(409).json({
      error: { code: "CONFLICT", message: error.message },
    });
    return;
  }

  res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
}

export async function createLeaseHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const body = CreateLeaseDto.parse(req.body);
    const scope = scopePropertyId(res);

    if (body.propertyId !== scope) {
      res.status(403).json({
        error: { code: "FORBIDDEN", message: "Property scope mismatch" },
      });
      return;
    }

    const lease = await createLease({
      tenantId: body.tenantId,
      unitId: body.unitId,
      propertyId: body.propertyId,
      startDate: body.startDate,
      endDate: body.endDate,
      noticePeriodDays: body.noticePeriodDays,
      rentAmount: new Prisma.Decimal(String(body.rentAmount)),
      depositAmount: new Prisma.Decimal(String(body.depositAmount)),
    });

    res.status(201).json({ data: lease });
  } catch (error) {
    handleError(res, error);
  }
}

export async function activateLeaseHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = LeaseParamsDto.parse(req.params);
    const lease = await activateLease(id, scopePropertyId(res));
    res.status(200).json({ data: lease });
  } catch (error) {
    handleError(res, error);
  }
}

export async function terminateLeaseHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = LeaseParamsDto.parse(req.params);
    const body = TerminateLeaseDto.parse(req.body);
    const lease = await terminateLease(
      id,
      scopePropertyId(res),
      body.terminationDate,
    );
    res.status(200).json({ data: lease });
  } catch (error) {
    handleError(res, error);
  }
}