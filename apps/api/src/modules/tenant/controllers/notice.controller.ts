import type { Request, Response } from "express";
import { ZodError } from "zod";
import {
  CreateTenantNoticeDto,
  NoticeParamsDto,
  UpdateNoticeStatusDto,
} from "@property-platform/contracts";
import { NotFoundException } from "../../finance/services/finance.service.js";
import {
  BadRequestException,
  createNotice,
  updateNoticeStatus,
} from "../services/notice.service.js";

function handleError(res: Response, error: unknown): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", issues: error.issues },
    });
    return;
  }

  if (error instanceof BadRequestException) {
    res.status(400).json({
      error: { code: "BAD_REQUEST", message: error.message },
    });
    return;
  }

  if (error instanceof NotFoundException) {
    res.status(403).json({
      error: { code: "FORBIDDEN", message: "Notice not found for this property" },
    });
    return;
  }

  res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
}

/** Create a tenant move-out notice within the caller's property. */
export async function createNoticeHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const body = CreateTenantNoticeDto.parse(req.body);
    const scope = res.locals.propertyId as string;

    if (body.propertyId !== scope) {
      res.status(403).json({
        error: { code: "FORBIDDEN", message: "Property scope mismatch" },
      });
      return;
    }

    const notice = await createNotice({
      leaseId: body.leaseId,
      propertyId: body.propertyId,
      tenantId: body.tenantId,
      noticeDate: body.noticeDate,
      intendedMoveOutDate: body.intendedMoveOutDate,
      reason: body.reason,
    });

    res.status(201).json({ data: notice });
  } catch (error) {
    handleError(res, error);
  }
}

/** Approve/reject/withdraw a notice within the caller's property. */
export async function updateNoticeStatusHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = NoticeParamsDto.parse(req.params);
    const body = UpdateNoticeStatusDto.parse(req.body);
    const scope = res.locals.propertyId as string;

    const notice = await updateNoticeStatus(
      id,
      scope,
      body.status,
      body.reviewedBy,
    );

    res.status(200).json({ data: notice });
  } catch (error) {
    handleError(res, error);
  }
}