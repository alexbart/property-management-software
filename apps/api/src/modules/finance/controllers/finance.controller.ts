import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import {
  LeaseBalanceParamsDto,
  MpesaCallbackDto,
  RecordPaymentDto,
} from "@property-platform/contracts";
import { prisma } from "../../../database/prisma.js";
import {
  ConflictException,
  getLeaseBalance,
  NotFoundException,
  recordPayment,
} from "../services/finance.service.js";

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

async function resolveActiveLeaseByPhone(phone: string) {
  const tenant = await prisma.tenant.findFirst({ where: { phone } });
  if (!tenant) {
    return null;
  }
  return prisma.lease.findFirst({
    where: { tenantId: tenant.id, status: "ACTIVE" },
  });
}

/**
 * Public Safaricom Darara webhook. Always returns 200 for handled callbacks so
 * Safaricom does not retry; duplicates are absorbed by payment idempotency.
 */
export async function mpesaWebhookHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const body = MpesaCallbackDto.parse(req.body);

    if (body.ResultCode !== 0) {
      res.status(200).json({ status: "ignored", reason: "non-success result" });
      return;
    }

    const lease = await resolveActiveLeaseByPhone(body.PhoneNumber);
    if (!lease) {
      res
        .status(200)
        .json({ status: "ignored", reason: "no active lease for phone" });
      return;
    }

    const payment = await recordPayment(
      lease.id,
      lease.propertyId,
      new Prisma.Decimal(String(body.Amount)),
      "MPESA",
      body.CheckoutRequestID,
    );

    res.status(200).json({ data: payment });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", issues: error.issues },
      });
      return;
    }

    if (error instanceof ConflictException) {
      // Reference already used for another lease: acknowledge to stop retries.
      res.status(200).json({ status: "duplicate" });
      return;
    }

    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
}

/** Authenticated manual (CASH/BANK) payment creation. */
export async function createManualPaymentHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const body = RecordPaymentDto.parse(req.body);
    const scope = scopePropertyId(res);

    if (body.propertyId !== scope) {
      res.status(403).json({
        error: { code: "FORBIDDEN", message: "Property scope mismatch" },
      });
      return;
    }

    const payment = await recordPayment(
      body.leaseId,
      body.propertyId,
      new Prisma.Decimal(String(body.amount)),
      body.method,
      body.reference,
    );

    res.status(201).json({ data: payment });
  } catch (error) {
    handleError(res, error);
  }
}

/** Authenticated arrears lookup for a lease within the caller's property. */
export async function getBalanceHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { leaseId } = LeaseBalanceParamsDto.parse(req.params);
    const balance = await getLeaseBalance(leaseId, scopePropertyId(res));
    res.status(200).json({ data: balance });
  } catch (error) {
    handleError(res, error);
  }
}