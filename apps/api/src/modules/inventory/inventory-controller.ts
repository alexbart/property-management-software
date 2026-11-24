import type { Request, Response } from "express";
import { z } from "zod";
import {
  toAmenityDto,
  toPolicyDefinitionDto,
  toResolvedAmenityDto,
  toResolvedPolicyDto,
} from "./dto.js";
import {
  getEffectiveConfig,
  listAmenities as listAmenityCatalogue,
  listPolicyDefinitions as listPolicyCatalogue,
} from "./inventory-service.js";

const effectiveQuerySchema = z
  .object({
    level: z.enum(["PROPERTY", "BUILDING", "UNIT"]),
    propertyId: z.string().uuid(),
    buildingId: z.string().uuid().optional(),
    unitId: z.string().uuid().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.level === "BUILDING" && !value.buildingId) {
      ctx.addIssue({
        code: "custom",
        path: ["buildingId"],
        message: "buildingId is required when level is BUILDING",
      });
    }
    if (value.level === "UNIT" && !value.unitId) {
      ctx.addIssue({
        code: "custom",
        path: ["unitId"],
        message: "unitId is required when level is UNIT",
      });
    }
  });

function badRequest(res: Response, error: z.ZodError): void {
  res.status(400).json({
    error: { code: "VALIDATION_ERROR", issues: error.issues },
  });
}

export async function listAmenities(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const amenities = await listAmenityCatalogue();
    res.status(200).json({ data: amenities.map(toAmenityDto) });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
}

export async function listPolicies(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const definitions = await listPolicyCatalogue();
    res.status(200).json({ data: definitions.map(toPolicyDefinitionDto) });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
}

export async function getEffective(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = effectiveQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    badRequest(res, parsed.error);
    return;
  }

  try {
    const { amenities, policies } = await getEffectiveConfig({
      level: parsed.data.level,
      propertyId: parsed.data.propertyId,
      buildingId: parsed.data.buildingId ?? null,
      unitId: parsed.data.unitId ?? null,
    });

    res.status(200).json({
      data: {
        amenities: amenities.map(toResolvedAmenityDto),
        policies: policies.map(toResolvedPolicyDto),
      },
    });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
}