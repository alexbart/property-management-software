import { z } from "zod";

export const amenityCategorySchema = z.enum(["FEATURE", "AMENITY", "UTILITY"]);
export type AmenityCategoryDto = z.infer<typeof amenityCategorySchema>;

export const policyValueTypeSchema = z.enum([
  "BOOLEAN",
  "ENUM",
  "INTEGER",
  "TEXT",
]);
export type PolicyValueTypeDto = z.infer<typeof policyValueTypeSchema>;

export const createAmenitySchema = z.object({
  key: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  category: amenityCategorySchema,
});
export type CreateAmenityDto = z.infer<typeof createAmenitySchema>;

export const updateAmenitySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  category: amenityCategorySchema.optional(),
});
export type UpdateAmenityDto = z.infer<typeof updateAmenitySchema>;

export const createPolicyDefinitionSchema = z
  .object({
    key: z.string().min(1).max(64),
    name: z.string().min(1).max(120),
    valueType: policyValueTypeSchema,
    enumValues: z.array(z.string().min(1).max(64)).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.valueType === "ENUM" && value.enumValues.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["enumValues"],
        message: "enumValues must be provided when valueType is ENUM",
      });
    }
  });
export type CreatePolicyDefinitionDto = z.infer<
  typeof createPolicyDefinitionSchema
>;

export const updatePolicyDefinitionSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    enumValues: z.array(z.string().min(1).max(64)).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.enumValues && value.enumValues.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["enumValues"],
        message: "enumValues cannot be empty when provided",
      });
    }
  });
export type UpdatePolicyDefinitionDto = z.infer<
  typeof updatePolicyDefinitionSchema
>;

export const amenityDtoSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  name: z.string(),
  category: amenityCategorySchema,
});
export type AmenityDto = z.infer<typeof amenityDtoSchema>;

export const policyDefinitionDtoSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  name: z.string(),
  valueType: policyValueTypeSchema,
  enumValues: z.array(z.string()),
});
export type PolicyDefinitionDto = z.infer<typeof policyDefinitionDtoSchema>;