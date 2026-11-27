import { z } from "zod";

export const TenantIdParamsDto = z.object({
  id: z.string().uuid(),
});
export type TenantIdParamsDto = z.infer<typeof TenantIdParamsDto>;

export const TenantListQueryDto = z.object({
  propertyId: z.string().uuid().optional(),
});
export type TenantListQueryDto = z.infer<typeof TenantListQueryDto>;

export const TenantRiskSummaryDto = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  riskScore: z.number().int(),
  riskFlags: z.array(z.string()),
});
export type TenantRiskSummaryDto = z.infer<typeof TenantRiskSummaryDto>;

export const TenantListDto = z.array(TenantRiskSummaryDto);
export type TenantListDto = z.infer<typeof TenantListDto>;

export const TenantRiskProfileDto = z.object({
  riskScore: z.number().int().nonnegative(),
  riskFlags: z.array(z.string()),
});
export type TenantRiskProfileDto = z.infer<typeof TenantRiskProfileDto>;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MINIMUM_NOTICE_DAYS = 30;

export const CreateTenantNoticeDto = z
  .object({
    leaseId: z.string().uuid(),
    propertyId: z.string().uuid(),
    tenantId: z.string().uuid(),
    noticeDate: z.coerce.date(),
    intendedMoveOutDate: z.coerce.date(),
    reason: z.string().max(500).optional(),
  })
  .refine(
    (data) =>
      data.intendedMoveOutDate.getTime() - data.noticeDate.getTime() >=
      MINIMUM_NOTICE_DAYS * MS_PER_DAY,
    {
      message: `Notice must be at least ${MINIMUM_NOTICE_DAYS} days before the intended move-out date`,
      path: ["intendedMoveOutDate"],
    },
  );
export type CreateTenantNoticeDto = z.infer<typeof CreateTenantNoticeDto>;

export const NoticeParamsDto = z.object({
  id: z.string().uuid(),
});
export type NoticeParamsDto = z.infer<typeof NoticeParamsDto>;

export const UpdateNoticeStatusDto = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "WITHDRAWN"]),
  reviewedBy: z.string().max(64).optional(),
});
export type UpdateNoticeStatusDto = z.infer<typeof UpdateNoticeStatusDto>;