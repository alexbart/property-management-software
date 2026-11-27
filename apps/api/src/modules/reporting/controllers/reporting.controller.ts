import type { Request, Response } from "express";
import { ZodError } from "zod";
import {
  MaintenanceExportQueryDto,
  ReceiptParamsDto,
  ReportParamsDto,
} from "@property-platform/contracts";
import {
  ConflictException,
  NotFoundException,
} from "../../finance/services/finance.service.js";
import { generateRentRollCsv } from "../services/rent-roll.service.js";
import { generatePaymentReceiptPdf } from "../services/receipt.service.js";
import { generateMaintenanceCsv } from "../services/maintenance-export.service.js";

function scopePropertyId(res: Response): string {
  return res.locals.propertyId as string;
}

function forbidden(res: Response): void {
  res.status(403).json({
    error: { code: "FORBIDDEN", message: "Property scope mismatch" },
  });
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
      error: { code: "FORBIDDEN", message: "Resource not found for this property" },
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

export async function rentRollHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { propertyId } = ReportParamsDto.parse(req.params);
    const scope = scopePropertyId(res);
    if (propertyId !== scope) {
      forbidden(res);
      return;
    }

    const { filename, content, mimeType } =
      await generateRentRollCsv(propertyId);

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(content);
  } catch (error) {
    handleError(res, error);
  }
}

export async function receiptHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { paymentId } = ReceiptParamsDto.parse(req.params);
    const scope = scopePropertyId(res);

    const { filename, buffer, mimeType } = await generatePaymentReceiptPdf(
      paymentId,
      scope,
    );

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(buffer);
  } catch (error) {
    handleError(res, error);
  }
}

export async function maintenanceHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { propertyId } = ReportParamsDto.parse(req.params);
    const scope = scopePropertyId(res);
    if (propertyId !== scope) {
      forbidden(res);
      return;
    }

    const { startDate, endDate } = MaintenanceExportQueryDto.parse(req.query);

    const { filename, content, mimeType } = await generateMaintenanceCsv(
      propertyId,
      startDate,
      endDate,
    );

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(content);
  } catch (error) {
    handleError(res, error);
  }
}