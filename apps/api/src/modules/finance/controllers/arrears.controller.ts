import type { Request, Response } from "express";
import { ZodError } from "zod";
import { ArrearsParamsDto } from "@property-platform/contracts";
import { calculateLeaseArrears } from "../services/arrears.service.js";
import { NotFoundException } from "../services/finance.service.js";

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

  res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
}

/** Property-scoped arrears and penalty summary for a lease. */
export async function getArrearsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { leaseId } = ArrearsParamsDto.parse(req.params);
    const propertyId = res.locals.propertyId as string;
    const arrears = await calculateLeaseArrears(leaseId, propertyId);

    res.status(200).json({
      data: {
        totalDue: arrears.totalDue.toString(),
        totalPaid: arrears.totalPaid.toString(),
        currentBalance: arrears.currentBalance.toString(),
        daysOverdue: arrears.daysOverdue,
        penaltyAccrued: arrears.penaltyAccrued.toString(),
      },
    });
  } catch (error) {
    handleError(res, error);
  }
}