import { z } from "zod";

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
  Amount: z.number().nonnegative(),
  PhoneNumber: z.string().min(1),
});
export type MpesaCallbackDto = z.infer<typeof MpesaCallbackDto>;

export const RecordPaymentDto = z.object({
  leaseId: z.string().uuid(),
  propertyId: z.string().uuid(),
  amount: z.number().nonnegative(),
  method: z.enum(["MPESA", "CASH", "BANK"]),
  reference: z.string().min(1).max(100),
});
export type RecordPaymentDto = z.infer<typeof RecordPaymentDto>;

export const LeaseBalanceParamsDto = z.object({
  leaseId: z.string().uuid(),
});
export type LeaseBalanceParamsDto = z.infer<typeof LeaseBalanceParamsDto>;