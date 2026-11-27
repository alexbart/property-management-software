import type { InventoryLevel } from "@prisma/client";
import { prisma } from "../../database/prisma.js";
import { resolveAmenities } from "./amenity-resolver.js";
import { resolvePolicies } from "./policy-resolver.js";
import type {
  CreateAmenityDto,
  CreatePolicyDefinitionDto,
  UpdateAmenityDto,
  UpdatePolicyDefinitionDto,
} from "@property-platform/contracts";

export class InventoryConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InventoryConflictError";
  }
}

export class InventoryNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InventoryNotFoundError";
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2002"
  );
}

export interface EffectiveConfigTarget {
  level: InventoryLevel;
  propertyId: string;
  buildingId?: string | null;
  unitId?: string | null;
}

export async function listAmenities() {
  return prisma.amenity.findMany({
    where: { active: true, deletedAt: null },
    orderBy: { name: "asc" },
  });
}

export async function listPolicyDefinitions() {
  return prisma.policyDefinition.findMany({
    where: { active: true, deletedAt: null },
    orderBy: { name: "asc" },
  });
}

export async function createAmenity(input: CreateAmenityDto) {
  try {
    return await prisma.amenity.create({
      data: {
        key: input.key.trim(),
        name: input.name.trim(),
        category: input.category,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new InventoryConflictError("Amenity key already exists");
    }
    throw error;
  }
}

export async function updateAmenity(id: string, input: UpdateAmenityDto) {
  const existing = await prisma.amenity.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    throw new InventoryNotFoundError("Amenity not found");
  }
  return prisma.amenity.update({
    where: { id },
    data: {
      name: input.name?.trim(),
      category: input.category,
    },
  });
}

export async function deactivateAmenity(id: string) {
  const existing = await prisma.amenity.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    throw new InventoryNotFoundError("Amenity not found");
  }
  return prisma.amenity.update({
    where: { id },
    data: { active: false, deletedAt: new Date() },
  });
}

export async function createPolicyDefinition(input: CreatePolicyDefinitionDto) {
  try {
    return await prisma.policyDefinition.create({
      data: {
        key: input.key.trim(),
        name: input.name.trim(),
        valueType: input.valueType,
        enumValues: input.enumValues,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new InventoryConflictError("Policy key already exists");
    }
    throw error;
  }
}

export async function updatePolicyDefinition(
  id: string,
  input: UpdatePolicyDefinitionDto,
) {
  const existing = await prisma.policyDefinition.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    throw new InventoryNotFoundError("Policy not found");
  }
  return prisma.policyDefinition.update({
    where: { id },
    data: {
      name: input.name?.trim(),
      enumValues: input.enumValues,
    },
  });
}

export async function deactivatePolicyDefinition(id: string) {
  const existing = await prisma.policyDefinition.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    throw new InventoryNotFoundError("Policy not found");
  }
  return prisma.policyDefinition.update({
    where: { id },
    data: { active: false, deletedAt: new Date() },
  });
}

/**
 * Derive the effective amenity and policy configuration for a target by
 * loading the assignments for the property, its building (if any) and the
 * unit (if any), then delegating to the pure resolvers. Nothing is copied
 * into child rows.
 */
export async function getEffectiveConfig(target: EffectiveConfigTarget) {
  const propertyId = target.propertyId;
  const buildingId = target.buildingId ?? null;
  const unitId = target.unitId ?? null;

  const [
    propertyAmenities,
    buildingAmenities,
    unitAmenities,
    propertyPolicies,
    buildingPolicies,
    unitPolicies,
  ] = await Promise.all([
    prisma.amenityAssignment.findMany({
      where: { level: "PROPERTY", propertyId },
    }),
    buildingId
      ? prisma.amenityAssignment.findMany({
          where: { level: "BUILDING", propertyId, buildingId },
        })
      : Promise.resolve([]),
    unitId
      ? prisma.amenityAssignment.findMany({
          where: { level: "UNIT", propertyId, unitId },
        })
      : Promise.resolve([]),
    prisma.policyAssignment.findMany({
      where: { level: "PROPERTY", propertyId },
    }),
    buildingId
      ? prisma.policyAssignment.findMany({
          where: { level: "BUILDING", propertyId, buildingId },
        })
      : Promise.resolve([]),
    unitId
      ? prisma.policyAssignment.findMany({
          where: { level: "UNIT", propertyId, unitId },
        })
      : Promise.resolve([]),
  ]);

  return {
    amenities: resolveAmenities(
      propertyAmenities,
      buildingAmenities,
      unitAmenities,
    ),
    policies: resolvePolicies(
      propertyPolicies,
      buildingPolicies,
      unitPolicies,
    ),
  };
}