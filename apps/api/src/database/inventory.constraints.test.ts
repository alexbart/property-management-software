import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma, PrismaClient } from "@prisma/client";

// These tests require a reachable PostgreSQL database (DATABASE_URL).
// They are skipped when no database is configured so the default unit
// suite stays green in environments without a database.
const prisma = new PrismaClient();
const run = `m002a-${Date.now()}`;
const reference = `T-${run}`;

describe.skipIf(!process.env.DATABASE_URL)("core inventory constraints", () => {
  let landlordId!: string;
  let propertyId!: string;
  let buildingAId!: string;
  let buildingBId!: string;
  let otherPropertyId!: string;

  beforeAll(async () => {
    const landlord = await prisma.landlord.create({
      data: { kind: "INDIVIDUAL", name: `LL-${run}` },
    });
    landlordId = landlord.id;

    const property = await prisma.property.create({
      data: {
        reference,
        name: `Prop-${run}`,
        propertyType: "APARTMENT",
        county: "Nairobi",
        landlordId,
      },
    });
    propertyId = property.id;

    const buildingA = await prisma.building.create({
      data: {
        propertyId,
        name: "Block A",
        buildingType: "BLOCK",
        floorCount: 4,
      },
    });
    buildingAId = buildingA.id;

    const buildingB = await prisma.building.create({
      data: { propertyId, name: "Block B", buildingType: "BLOCK" },
    });
    buildingBId = buildingB.id;

    // A second property used to prove the composite FK rejects a
    // building that belongs to a different property.
    const other = await prisma.property.create({
      data: {
        reference: `O-${run}`,
        name: `Other-${run}`,
        propertyType: "STANDALONE_HOUSE",
        county: "Kiambu",
        landlordId,
      },
    });
    otherPropertyId = other.id;
  });

  afterAll(async () => {
    // Guard every cleanup with an explicit ID check. If beforeAll failed
    // before an ID was assigned, the variable is undefined and Prisma would
    // omit the filter, causing an unscoped deleteMany. Never allow that.
    if (propertyId) {
      await prisma.unit.deleteMany({ where: { propertyId } });
    }
    if (otherPropertyId) {
      await prisma.unit.deleteMany({ where: { propertyId: otherPropertyId } });
    }
    if (propertyId) {
      await prisma.building.deleteMany({ where: { propertyId } });
    }
    if (propertyId) {
      await prisma.property.deleteMany({ where: { id: propertyId } });
    }
    if (otherPropertyId) {
      await prisma.property.deleteMany({ where: { id: otherPropertyId } });
    }
    if (landlordId) {
      await prisma.landlord.deleteMany({ where: { id: landlordId } });
    }
    await prisma.$disconnect();
  });

  it("persists money as an exact Decimal", async () => {
    const unit = await prisma.unit.create({
      data: {
        propertyId,
        buildingId: buildingAId,
        unitNumber: "01",
        unitType: "ONE_BEDROOM",
        bedrooms: 1,
        bathrooms: 1,
        standardRent: new Prisma.Decimal("12500.50"),
        depositRequired: new Prisma.Decimal("25000.00"),
      },
    });

    expect(unit.standardRent).toBeInstanceOf(Prisma.Decimal);
    expect(unit.standardRent.equals(new Prisma.Decimal("12500.50"))).toBe(true);
    expect(unit.depositRequired?.equals(new Prisma.Decimal("25000.00"))).toBe(true);
  });

  it("rejects a duplicate unit number within the same building", async () => {
    // Self-contained fixture: do not rely on a unit created by another test.
    const unitNumber = `DUP-${run}`;
    await prisma.unit.create({
      data: {
        propertyId,
        buildingId: buildingAId,
        unitNumber,
        unitType: "BEDSITTER",
        standardRent: new Prisma.Decimal("5000.00"),
      },
    });

    await expect(
      prisma.unit.create({
        data: {
          propertyId,
          buildingId: buildingAId,
          unitNumber,
          unitType: "BEDSITTER",
          standardRent: new Prisma.Decimal("5000.00"),
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("allows the same unit number in a different building", async () => {
    const unit = await prisma.unit.create({
      data: {
        propertyId,
        buildingId: buildingBId,
        unitNumber: "01",
        unitType: "TWO_BEDROOM",
        standardRent: new Prisma.Decimal("18000.00"),
      },
    });
    expect(unit.unitNumber).toBe("01");
  });

  it("rejects a duplicate direct unit number within a property", async () => {
    await prisma.unit.create({
      data: {
        propertyId,
        unitNumber: "D1",
        unitType: "HOUSE",
        standardRent: new Prisma.Decimal("30000.00"),
      },
    });

    await expect(
      prisma.unit.create({
        data: {
          propertyId,
          unitNumber: "D1",
          unitType: "HOUSE",
          standardRent: new Prisma.Decimal("30000.00"),
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("rejects a unit whose building belongs to another property", async () => {
    await expect(
      prisma.unit.create({
        data: {
          propertyId: otherPropertyId,
          buildingId: buildingAId,
          unitNumber: "X1",
          unitType: "ONE_BEDROOM",
          standardRent: new Prisma.Decimal("9000.00"),
        },
      }),
    ).rejects.toMatchObject({ code: "P2003" });
  });

  it("rejects a negative standard rent", async () => {
    await expect(
      prisma.unit.create({
        data: {
          propertyId,
          unitNumber: "NEG1",
          unitType: "STUDIO",
          standardRent: new Prisma.Decimal("-1.00"),
        },
      }),
    ).rejects.toThrow(/violates check constraint/);
  });

  it("rejects a size value without a size unit", async () => {
    await expect(
      prisma.unit.create({
        data: {
          propertyId,
          unitNumber: "SZ1",
          unitType: "STUDIO",
          standardRent: new Prisma.Decimal("8000.00"),
          sizeValue: new Prisma.Decimal("20.00"),
        },
      }),
    ).rejects.toThrow(/units_size_unit_required/);
  });

  it("rejects negative bedrooms", async () => {
    await expect(
      prisma.unit.create({
        data: {
          propertyId,
          unitNumber: "BR1",
          unitType: "TWO_BEDROOM",
          standardRent: new Prisma.Decimal("15000.00"),
          bedrooms: -1,
        },
      }),
    ).rejects.toThrow(/units_bedrooms_non_negative/);
  });

  it("rejects out-of-range latitude", async () => {
    await expect(
      prisma.property.create({
        data: {
          reference: `GEO-${run}`,
          name: `Geo-${run}`,
          propertyType: "BUNGALOW",
          county: "Nairobi",
          landlordId,
          latitude: new Prisma.Decimal("200.000000"),
          longitude: new Prisma.Decimal("36.800000"),
        },
      }),
    ).rejects.toThrow(/properties_latitude_range/);
  });

  it("rejects latitude without longitude", async () => {
    await expect(
      prisma.property.create({
        data: {
          reference: `GEO2-${run}`,
          name: `Geo2-${run}`,
          propertyType: "BUNGALOW",
          county: "Nairobi",
          landlordId,
          latitude: new Prisma.Decimal("-1.292100"),
        },
      }),
    ).rejects.toThrow(/properties_geo_pair/);
  });

  it("keeps the custom constraints and partial indexes after migration", async () => {
    const constraints = await prisma.$queryRawUnsafe<{ conname: string }[]>(
      `SELECT conname FROM pg_constraint
       WHERE conname IN (
         'units_building_property_fkey',
         'buildings_id_property_key',
         'units_standard_rent_non_negative',
         'units_size_unit_required',
         'units_bedrooms_non_negative',
         'properties_latitude_range',
         'properties_geo_pair'
       )`,
    );
    const names = constraints.map((row) => row.conname);
    expect(names).toEqual(
      expect.arrayContaining([
        "units_building_property_fkey",
        "buildings_id_property_key",
        "units_standard_rent_non_negative",
        "units_size_unit_required",
        "units_bedrooms_non_negative",
        "properties_latitude_range",
        "properties_geo_pair",
      ]),
    );

    const indexes = await prisma.$queryRawUnsafe<{ indexname: string }[]>(
      `SELECT indexname FROM pg_indexes
       WHERE schemaname = 'public'
         AND indexname IN ('units_building_number_key', 'units_property_number_direct_key')`,
    );
    expect(indexes.map((row) => row.indexname)).toHaveLength(2);
  });
});