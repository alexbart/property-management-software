import { describe, expect, it } from "vitest";
import type { AmenityAssignmentLike } from "./amenity-resolver.js";
import { resolveAmenities } from "./amenity-resolver.js";

const include = (
  amenityId: string,
  level: AmenityAssignmentLike["level"],
): AmenityAssignmentLike => ({ amenityId, level, mode: "INCLUDE" });

const exclude = (
  amenityId: string,
  level: AmenityAssignmentLike["level"],
): AmenityAssignmentLike => ({ amenityId, level, mode: "EXCLUDE" });

describe("resolveAmenities", () => {
  it("inherits a property amenity down to a unit", () => {
    const result = resolveAmenities([include("lift", "PROPERTY")], [], []);

    expect(result).toEqual([
      { amenityId: "lift", source: "INHERITED", inherited: true },
    ]);
  });

  it("marks a unit-level include as explicit", () => {
    const result = resolveAmenities([], [], [include("parking", "UNIT")]);

    expect(result).toEqual([
      { amenityId: "parking", source: "EXPLICIT", inherited: false },
    ]);
  });

  it("marks a building-level include as inherited for a unit", () => {
    const result = resolveAmenities([], [include("lift", "BUILDING")], []);

    expect(result).toEqual([
      { amenityId: "lift", source: "INHERITED", inherited: true },
    ]);
  });

  it("lets a unit EXCLUDE remove an inherited amenity", () => {
    const result = resolveAmenities(
      [include("lift", "PROPERTY")],
      [],
      [exclude("lift", "UNIT")],
    );

    expect(result).toEqual([
      { amenityId: "lift", source: "EXCLUDED", inherited: false },
    ]);
  });

  it("lets a building EXCLUDE stop a property include", () => {
    const result = resolveAmenities(
      [include("borehole", "PROPERTY")],
      [exclude("borehole", "BUILDING")],
      [],
    );

    expect(result).toEqual([
      { amenityId: "borehole", source: "EXCLUDED", inherited: false },
    ]);
  });

  it("omits amenities with no assignment at any level", () => {
    const result = resolveAmenities([], [], []);

    expect(result).toEqual([]);
  });

  it("applies the most specific assignment when several exist", () => {
    const result = resolveAmenities(
      [include("lift", "PROPERTY")],
      [exclude("lift", "BUILDING")],
      [include("lift", "UNIT")],
    );

    expect(result).toEqual([
      { amenityId: "lift", source: "EXPLICIT", inherited: false },
    ]);
  });

  it("returns a deterministic, sorted result", () => {
    const result = resolveAmenities(
      [include("zeta", "PROPERTY"), include("alpha", "PROPERTY")],
      [],
      [],
    );

    expect(result.map((entry) => entry.amenityId)).toEqual(["alpha", "zeta"]);
  });
});