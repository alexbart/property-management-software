import type { InventoryLevel } from "@prisma/client";
import { prisma } from "../../database/prisma.js";
import { resolveAmenities } from "./amenity-resolver.js";
import { resolvePolicies } from "./policy-resolver.js";

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