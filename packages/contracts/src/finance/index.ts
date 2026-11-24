import { z } from "zod";

// Money is transported as a decimal string (or a JSON number for convenience)
// and normalised to a string so the API can build an exact Prisma.Decimal.
// Never perform floating-point arithmetic on money.
export const decimalAmount = z
  .union([
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Amount must be a decimal with up to 2 places"),
    z.number().nonnegative(),
  ])
  .transform((value) => (typeof value === "number" ? value.toString() : value));

/**
 * Normalised Safaricom Daraja STK Push / B2C callback. A real Darara adapter
 * maps the nested `Body.stkCallback.CallbackMetadata.Item[]` payload into this
 * flat shape before validation.
 */
export const MpesaCallbackDto = z.object({
  CheckoutRequestID: z.string().min(1),
  MerchantRequestID: z.string().optional(),
  ResultCode: z.number().int(),
  ResultDesc: z.string(),
  Amount: decimalAmount,
  PhoneNumber: z.string().min(1),
});
export type MpesaCallbackDto = z.infer<typeof MpesaCallbackDto>;

export const RecordPaymentDto = z.object({
  leaseId: z.string().uuid(),
  propertyId: z.string().uuid(),
  amount: decimalAmount,
  method: z.enum(["MPESA", "CASH", "BANK"]),
  reference: z.string().min(1).max(100),
});
export type RecordPaymentDto = z.infer<typeof RecordPaymentDto>;

export const LeaseBalanceParamsDto = z.object({
  leaseId: z.string().uuid(),
});
export type LeaseBalanceParamsDto = z.infer<typeof LeaseBalanceParamsDto>;

export const ArrearsParamsDto = z.object({
  leaseId: z.string().uuid(),
});
export type ArrearsParamsDto = z.infer<typeof ArrearsParamsDto>;

// Money is transported as an exact decimal string; never a JS float.
export const ArrearsSummaryDto = z.object({
  totalDue: z.string(),
  totalPaid: z.string(),
  currentBalance: z.string(),
  daysOverdue: z.number().int().nonnegative(),
  penaltyAccrued: z.string(),
});
export type ArrearsSummaryDto = z.infer<typeof ArrearsSummaryDto>;