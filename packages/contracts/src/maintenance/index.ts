import { z } from "zod";
import { decimalAmount } from "../finance/index.js";

export const CreateMaintenanceTicketDto = z.object({
  propertyId: z.string().uuid(),
  unitId: z.string().uuid(),
  initiatedBy: z.enum(["TENANT", "MANAGER"]),
  initiatorId: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  estimatedCost: decimalAmount.nullable().optional(),
});
export type CreateMaintenanceTicketDto = z.infer<
  typeof CreateMaintenanceTicketDto
>;

export const UpdateTicketStatusDto = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CANCELLED"]),
  resolutionNotes: z.string().max(5000).optional(),
});
export type UpdateTicketStatusDto = z.infer<typeof UpdateTicketStatusDto>;

export const UpdateTicketCostDto = z.object({
  actualCost: decimalAmount,
});
export type UpdateTicketCostDto = z.infer<typeof UpdateTicketCostDto>;

export const MaintenanceListQueryDto = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CANCELLED"]).optional(),
});
export type MaintenanceListQueryDto = z.infer<typeof MaintenanceListQueryDto>;

export const MaintenanceTicketParamsDto = z.object({
  id: z.string().uuid(),
});
export type MaintenanceTicketParamsDto = z.infer<
  typeof MaintenanceTicketParamsDto
>;