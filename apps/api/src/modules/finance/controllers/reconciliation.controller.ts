import type { Request, Response } from "express";
import { ZodError } from "zod";
import {
  ReconciliationParamsDto,
  ReconciliationQueryDto,
} from "@property-platform/contracts";
import { NotFoundException } from "../services/finance.service.js";
import { getPropertyReconciliation } from "../services/reconciliation.service.js";

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
        message: "Property not found for this scope",
      },
    });
    return;
  }

  res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
}

/** Property-scoped financial reconciliation over a date range. */
export async function getReconciliationHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { propertyId } = ReconciliationParamsDto.parse(req.params);
    const { startDate, endDate } = ReconciliationQueryDto.parse(req.query);
    const scope = res.locals.propertyId as string;

    if (propertyId !== scope) {
      res.status(403).json({
        error: { code: "FORBIDDEN", message: "Property scope mismatch" },
      });
      return;
    }

    const summary = await getPropertyReconciliation(
      propertyId,
      startDate,
      endDate,
    );

    res.status(200).json({ data: summary });
  } catch (error) {
    handleError(res, error);
  }
}