import type { Request, Response } from "express";
import { z } from "zod";
import {
  createAmenitySchema,
  createPolicyDefinitionSchema,
  updateAmenitySchema,
  updatePolicyDefinitionSchema,
} from "@property-platform/contracts";
import {
  toAmenityDto,
  toPolicyDefinitionDto,
  toResolvedAmenityDto,
  toResolvedPolicyDto,
} from "./dto.js";
import {
  createAmenity,
  createPolicyDefinition,
  deactivateAmenity,
  deactivatePolicyDefinition,
  getEffectiveConfig,
  InventoryConflictError,
  InventoryNotFoundError,
  listAmenities as listAmenityCatalogue,
  listPolicyDefinitions as listPolicyCatalogue,
  updateAmenity,
  updatePolicyDefinition,
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

function mutationError(res: Response, error: unknown): void {
  if (error instanceof z.ZodError) {
    badRequest(res, error);
    return;
  }
  if (error instanceof InventoryConflictError) {
    res.status(409).json({ error: { code: "CONFLICT", message: error.message } });
    return;
  }
  if (error instanceof InventoryNotFoundError) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: error.message } });
    return;
  }
  res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
}

function idParam(req: Request): string {
  return String(req.params.id);
}

/** POST /api/v1/inventory/amenities */
export async function createAmenityHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const input = createAmenitySchema.parse(req.body);
    const amenity = await createAmenity(input);
    res.status(201).json({ data: toAmenityDto(amenity) });
  } catch (error) {
    mutationError(res, error);
  }
}

/** PATCH /api/v1/inventory/amenities/:id */
export async function updateAmenityHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const input = updateAmenitySchema.parse(req.body);
    const amenity = await updateAmenity(idParam(req), input);
    res.status(200).json({ data: toAmenityDto(amenity) });
  } catch (error) {
    mutationError(res, error);
  }
}

/** DELETE /api/v1/inventory/amenities/:id (deactivate) */
export async function deactivateAmenityHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    await deactivateAmenity(idParam(req));
    res.status(204).send();
  } catch (error) {
    mutationError(res, error);
  }
}

/** POST /api/v1/inventory/policies */
export async function createPolicyHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const input = createPolicyDefinitionSchema.parse(req.body);
    const policy = await createPolicyDefinition(input);
    res.status(201).json({ data: toPolicyDefinitionDto(policy) });
  } catch (error) {
    mutationError(res, error);
  }
}

/** PATCH /api/v1/inventory/policies/:id */
export async function updatePolicyHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const input = updatePolicyDefinitionSchema.parse(req.body);
    const policy = await updatePolicyDefinition(idParam(req), input);
    res.status(200).json({ data: toPolicyDefinitionDto(policy) });
  } catch (error) {
    mutationError(res, error);
  }
}

/** DELETE /api/v1/inventory/policies/:id (deactivate) */
export async function deactivatePolicyHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    await deactivatePolicyDefinition(idParam(req));
    res.status(204).send();
  } catch (error) {
    mutationError(res, error);
  }
}