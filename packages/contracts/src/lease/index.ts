import { z } from "zod";

// Money is transported as a JSON number and converted to an exact
// Prisma.Decimal at the API boundary (never used as a JS float for math).
const money = z.number().nonnegative();

export const CreateLeaseDto = z.object({
  tenantId: z.string().uuid(),
  unitId: z.string().uuid(),
  propertyId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  noticePeriodDays: z.number().int().positive().optional(),
  rentAmount: money,
  depositAmount: money,
});
export type CreateLeaseDto = z.infer<typeof CreateLeaseDto>;

export const ActivateLeaseDto = z.object({});
export type ActivateLeaseDto = z.infer<typeof ActivateLeaseDto>;

export const TerminateLeaseDto = z.object({
  terminationDate: z.coerce.date(),
});
export type TerminateLeaseDto = z.infer<typeof TerminateLeaseDto>;

export const LeaseParamsDto = z.object({
  id: z.string().uuid(),
});
export type LeaseParamsDto = z.infer<typeof LeaseParamsDto>;