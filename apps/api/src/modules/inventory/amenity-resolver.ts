import type { AmenityAssignmentMode, InventoryLevel } from "@prisma/client";

/**
 * Minimal assignment shape consumed by the resolver. The resolver is pure:
 * it never touches the database, so it is trivially unit-testable.
 */
export interface AmenityAssignmentLike {
  amenityId: string;
  level: InventoryLevel;
  mode: AmenityAssignmentMode;
}

export type AmenitySource = "EXPLICIT" | "INHERITED" | "EXCLUDED";

export interface ResolvedAmenity {
  amenityId: string;
  source: AmenitySource;
  /** True when the value comes from an ancestor level (not the target). */
  inherited: boolean;
}

interface AmenityState {
  included: boolean;
  level: InventoryLevel;
}

/**
 * Resolve the effective amenity set for a target.
 *
 * Assignments are applied from least to most specific
 * (PROPERTY -> BUILDING -> UNIT). `INCLUDE` adds an amenity, `EXCLUDE`
 * removes it. The most specific assignment wins. `EXCLUDE` is distinct
 * from having no assignment (which means "inherit").
 */
export function resolveAmenities(
  property: AmenityAssignmentLike[],
  building: AmenityAssignmentLike[],
  unit: AmenityAssignmentLike[],
): ResolvedAmenity[] {
  const state = new Map<string, AmenityState>();

  const apply = (assignments: AmenityAssignmentLike[]): void => {
    for (const assignment of assignments) {
      state.set(assignment.amenityId, {
        included: assignment.mode === "INCLUDE",
        level: assignment.level,
      });
    }
  };

  apply(property);
  apply(building);
  apply(unit);

  const result: ResolvedAmenity[] = [];
  for (const [amenityId, current] of state) {
    if (current.included) {
      const inherited = current.level !== "UNIT";
      result.push({
        amenityId,
        source: inherited ? "INHERITED" : "EXPLICIT",
        inherited,
      });
    } else {
      result.push({ amenityId, source: "EXCLUDED", inherited: false });
    }
  }

  result.sort((a, b) => a.amenityId.localeCompare(b.amenityId));
  return result;
}