import { z } from "zod";

// Date-only (YYYY-MM-DD) strings for maintenance export ranges.
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date");

export const MaintenanceExportQueryDto = z
  .object({
    startDate: dateString,
    endDate: dateString,
  })
  .refine(
    (value) => value.startDate <= value.endDate,
    "startDate must be on or before endDate",
  );
export type MaintenanceExportQueryDto = z.infer<
  typeof MaintenanceExportQueryDto
>;

export const ReportParamsDto = z.object({
  propertyId: z.string().uuid(),
});
export type ReportParamsDto = z.infer<typeof ReportParamsDto>;

export const ReceiptParamsDto = z.object({
  paymentId: z.string().uuid(),
});
export type ReceiptParamsDto = z.infer<typeof ReceiptParamsDto>;