import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import {
  CreateMaintenanceTicketDto,
  MaintenanceListQueryDto,
  MaintenanceTicketParamsDto,
  UpdateTicketCostDto,
  UpdateTicketStatusDto,
} from "@property-platform/contracts";
import {
  ConflictException,
  createTicket,
  getTicket,
  listTickets,
  NotFoundException,
  updateTicketCost,
  updateTicketStatus,
} from "../services/maintenance.service.js";

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
      error: { code: "FORBIDDEN", message: "Ticket not found for this property" },
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

export async function createTicketHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const body = CreateMaintenanceTicketDto.parse(req.body);
    const scope = scopePropertyId(res);

    if (body.propertyId !== scope) {
      res.status(403).json({
        error: { code: "FORBIDDEN", message: "Property scope mismatch" },
      });
      return;
    }

    const ticket = await createTicket({
      propertyId: body.propertyId,
      unitId: body.unitId,
      initiatedBy: body.initiatedBy,
      initiatorId: body.initiatorId,
      title: body.title,
      description: body.description,
      priority: body.priority,
      estimatedCost: body.estimatedCost
        ? new Prisma.Decimal(body.estimatedCost)
        : null,
    });

    res.status(201).json({ data: ticket });
  } catch (error) {
    handleError(res, error);
  }
}

export async function listTicketsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const query = MaintenanceListQueryDto.parse(req.query);
    const tickets = await listTickets(scopePropertyId(res), query.status);
    res.status(200).json({ data: tickets });
  } catch (error) {
    handleError(res, error);
  }
}

export async function getTicketHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = MaintenanceTicketParamsDto.parse(req.params);
    const ticket = await getTicket(id, scopePropertyId(res));
    res.status(200).json({ data: ticket });
  } catch (error) {
    handleError(res, error);
  }
}

export async function updateStatusHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = MaintenanceTicketParamsDto.parse(req.params);
    const body = UpdateTicketStatusDto.parse(req.body);

    const terminal = body.status === "RESOLVED" || body.status === "CANCELLED";
    if (terminal && (!body.resolutionNotes || body.resolutionNotes.trim() === "")) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "resolutionNotes is required for RESOLVED/CANCELLED",
        },
      });
      return;
    }

    const ticket = await updateTicketStatus(
      id,
      scopePropertyId(res),
      body.status,
      body.resolutionNotes,
    );
    res.status(200).json({ data: ticket });
  } catch (error) {
    handleError(res, error);
  }
}

export async function updateCostHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = MaintenanceTicketParamsDto.parse(req.params);
    const body = UpdateTicketCostDto.parse(req.body);
    const ticket = await updateTicketCost(
      id,
      scopePropertyId(res),
      new Prisma.Decimal(body.actualCost),
    );
    res.status(200).json({ data: ticket });
  } catch (error) {
    handleError(res, error);
  }
}