import { z } from "zod";

export const TenantIdParamsDto = z.object({
  id: z.string().uuid(),
});
export type TenantIdParamsDto = z.infer<typeof TenantIdParamsDto>;

export const TenantRiskProfileDto = z.object({
  riskScore: z.number().int().nonnegative(),
  riskFlags: z.array(z.string()),
});
export type TenantRiskProfileDto = z.infer<typeof TenantRiskProfileDto>;