import { z } from "zod";

export const LoginDto = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof LoginDto>;

export const RegisterDto = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  role: z.enum(["PLATFORM_ADMIN", "LANDLORD", "MANAGER", "TENANT"]),
});
export type RegisterDto = z.infer<typeof RegisterDto>;

export const SessionUserDto = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["PLATFORM_ADMIN", "LANDLORD", "MANAGER", "TENANT"]),
  propertyMemberships: z.array(
    z.object({
      propertyId: z.string().uuid(),
      role: z.enum(["LANDLORD", "MANAGER"]),
    }),
  ),
  tenantLink: z
    .object({
      tenantId: z.string().uuid(),
    })
    .nullable(),
});
export type SessionUserDto = z.infer<typeof SessionUserDto>;