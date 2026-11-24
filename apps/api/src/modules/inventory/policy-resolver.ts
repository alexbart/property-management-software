import type {
  InventoryLevel,
  PolicyAssignmentMode,
  PolicyValueType,
} from "@prisma/client";

/**
 * Minimal assignment shape consumed by the resolver. The resolver is pure:
 * it never touches the database, so it is trivially unit-testable.
 */
export interface PolicyAssignmentLike {
  policyId: string;
  level: InventoryLevel;
  mode: PolicyAssignmentMode;
  valueType: PolicyValueType;
  valueBool?: boolean | null;
  valueEnum?: string | null;
  valueInt?: number | null;
  valueText?: string | null;
}

export type PolicyValue =
  | { kind: "BOOLEAN"; value: boolean }
  | { kind: "ENUM"; value: string }
  | { kind: "INTEGER"; value: number }
  | { kind: "TEXT"; value: string };

export type PolicySource = "EXPLICIT" | "INHERITED" | "EXCLUDED";

export interface ResolvedPolicy {
  policyId: string;
  source: PolicySource;
  /** True when the value comes from an ancestor level (not the target). */
  inherited: boolean;
  /** Null when the policy is explicitly excluded. */
  value: PolicyValue | null;
}

function toMap(
  assignments: PolicyAssignmentLike[],
): Map<string, PolicyAssignmentLike> {
  const map = new Map<string, PolicyAssignmentLike>();
  for (const assignment of assignments) {
    map.set(assignment.policyId, assignment);
  }
  return map;
}

function requireValue<T>(
  value: T | null | undefined,
  policyId: string,
): T {
  if (value === null || value === undefined) {
    throw new Error(`Missing value for policy ${policyId}`);
  }
  return value;
}

function toPolicyValue(assignment: PolicyAssignmentLike): PolicyValue {
  switch (assignment.valueType) {
    case "BOOLEAN":
      return {
        kind: "BOOLEAN",
        value: requireValue(assignment.valueBool, assignment.policyId),
      };
    case "ENUM":
      return {
        kind: "ENUM",
        value: requireValue(assignment.valueEnum, assignment.policyId),
      };
    case "INTEGER":
      return {
        kind: "INTEGER",
        value: requireValue(assignment.valueInt, assignment.policyId),
      };
    case "TEXT":
      return {
        kind: "TEXT",
        value: requireValue(assignment.valueText, assignment.policyId),
      };
  }
}

/**
 * Resolve the effective policy set for a target.
 *
 * Policies are resolved from most to least specific (UNIT -> BUILDING ->
 * PROPERTY); the first `SET` wins. `EXCLUDE` at a level stops inheritance
 * and yields an explicit "not set" result. A policy with no assignment at
 * any level is omitted (it inherits nothing).
 */
export function resolvePolicies(
  property: PolicyAssignmentLike[],
  building: PolicyAssignmentLike[],
  unit: PolicyAssignmentLike[],
): ResolvedPolicy[] {
  const byLevel: Record<InventoryLevel, Map<string, PolicyAssignmentLike>> = {
    PROPERTY: toMap(property),
    BUILDING: toMap(building),
    UNIT: toMap(unit),
  };

  const policyIds = new Set<string>();
  for (const level of Object.keys(byLevel) as InventoryLevel[]) {
    for (const policyId of byLevel[level].keys()) {
      policyIds.add(policyId);
    }
  }

  const precedence: InventoryLevel[] = ["UNIT", "BUILDING", "PROPERTY"];
  const result: ResolvedPolicy[] = [];

  for (const policyId of policyIds) {
    for (const level of precedence) {
      const assignment = byLevel[level].get(policyId);
      if (!assignment) {
        continue;
      }

      if (assignment.mode === "EXCLUDE") {
        result.push({
          policyId,
          source: "EXCLUDED",
          inherited: false,
          value: null,
        });
      } else {
        const inherited = level !== "UNIT";
        result.push({
          policyId,
          source: inherited ? "INHERITED" : "EXPLICIT",
          inherited,
          value: toPolicyValue(assignment),
        });
      }
      break;
    }
  }

  result.sort((a, b) => a.policyId.localeCompare(b.policyId));
  return result;
}