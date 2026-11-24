import { describe, expect, it } from "vitest";
import type { PolicyAssignmentLike } from "./policy-resolver.js";
import { resolvePolicies } from "./policy-resolver.js";

const setBool = (
  policyId: string,
  level: PolicyAssignmentLike["level"],
  value: boolean,
): PolicyAssignmentLike => ({
  policyId,
  level,
  mode: "SET",
  valueType: "BOOLEAN",
  valueBool: value,
});

const setEnum = (
  policyId: string,
  level: PolicyAssignmentLike["level"],
  value: string,
): PolicyAssignmentLike => ({
  policyId,
  level,
  mode: "SET",
  valueType: "ENUM",
  valueEnum: value,
});

const setInt = (
  policyId: string,
  level: PolicyAssignmentLike["level"],
  value: number,
): PolicyAssignmentLike => ({
  policyId,
  level,
  mode: "SET",
  valueType: "INTEGER",
  valueInt: value,
});

const setText = (
  policyId: string,
  level: PolicyAssignmentLike["level"],
  value: string,
): PolicyAssignmentLike => ({
  policyId,
  level,
  mode: "SET",
  valueType: "TEXT",
  valueText: value,
});

const exclude = (
  policyId: string,
  level: PolicyAssignmentLike["level"],
): PolicyAssignmentLike => ({
  policyId,
  level,
  mode: "EXCLUDE",
  valueType: "BOOLEAN",
});

describe("resolvePolicies", () => {
  it("inherits a property policy down to a unit", () => {
    const result = resolvePolicies([setBool("pets_allowed", "PROPERTY", false)], [], []);

    expect(result).toEqual([
      {
        policyId: "pets_allowed",
        source: "INHERITED",
        inherited: true,
        value: { kind: "BOOLEAN", value: false },
      },
    ]);
  });

  it("lets a unit SET override an inherited value as explicit", () => {
    const result = resolvePolicies(
      [setBool("pets_allowed", "PROPERTY", false)],
      [],
      [setBool("pets_allowed", "UNIT", true)],
    );

    expect(result).toEqual([
      {
        policyId: "pets_allowed",
        source: "EXPLICIT",
        inherited: false,
        value: { kind: "BOOLEAN", value: true },
      },
    ]);
  });

  it("uses a building SET when the unit has none", () => {
    const result = resolvePolicies(
      [setInt("max_occupants", "PROPERTY", 4)],
      [setInt("max_occupants", "BUILDING", 2)],
      [],
    );

    expect(result).toEqual([
      {
        policyId: "max_occupants",
        source: "INHERITED",
        inherited: true,
        value: { kind: "INTEGER", value: 2 },
      },
    ]);
  });

  it("returns EXCLUDED with a null value when the unit excludes", () => {
    const result = resolvePolicies(
      [setBool("smoking_allowed", "PROPERTY", true)],
      [],
      [exclude("smoking_allowed", "UNIT")],
    );

    expect(result).toEqual([
      {
        policyId: "smoking_allowed",
        source: "EXCLUDED",
        inherited: false,
        value: null,
      },
    ]);
  });

  it("lets a building EXCLUDE stop a property SET", () => {
    const result = resolvePolicies(
      [setEnum("gender_policy", "PROPERTY", "ANY")],
      [exclude("gender_policy", "BUILDING")],
      [],
    );

    expect(result).toEqual([
      {
        policyId: "gender_policy",
        source: "EXCLUDED",
        inherited: false,
        value: null,
      },
    ]);
  });

  it("omits policies with no assignment at any level", () => {
    const result = resolvePolicies([], [], []);

    expect(result).toEqual([]);
  });

  it("preserves the typed value kind for each value type", () => {
    const result = resolvePolicies(
      [
        setEnum("gender_policy", "PROPERTY", "FEMALE_ONLY"),
        setText("visitors_policy", "PROPERTY", "Sign in at the gate"),
      ],
      [],
      [],
    );

    expect(result).toEqual([
      {
        policyId: "gender_policy",
        source: "INHERITED",
        inherited: true,
        value: { kind: "ENUM", value: "FEMALE_ONLY" },
      },
      {
        policyId: "visitors_policy",
        source: "INHERITED",
        inherited: true,
        value: { kind: "TEXT", value: "Sign in at the gate" },
      },
    ]);
  });

  it("throws when a SET assignment is missing its typed value", () => {
    const broken: PolicyAssignmentLike = {
      policyId: "pets_allowed",
      level: "UNIT",
      mode: "SET",
      valueType: "BOOLEAN",
      valueBool: null,
    };

    expect(() => resolvePolicies([], [], [broken])).toThrow(
      /Missing value for policy pets_allowed/,
    );
  });
});