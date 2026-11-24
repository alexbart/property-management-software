import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Prisma, PrismaClient } from "@prisma/client";
import { app } from "../../app.js";

const prisma = new PrismaClient();
const run = `m002b-api-${Date.now()}`;
const reference = `A-${run}`;

describe.skipIf(!process.env.DATABASE_URL)("inventory API", () => {
  let landlordId!: string;
  let propertyId!: string;
  let buildingId!: string;
  let unitId!: string;
  let liftId!: string;
  let parkingId!: string;
  let petsId!: string;

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

    const building = await prisma.building.create({
      data: { propertyId, name: "Block A", buildingType: "BLOCK" },
    });
    buildingId = building.id;

    const unit = await prisma.unit.create({
      data: {
        propertyId,
        buildingId,
        unitNumber: "A1",
        unitType: "ONE_BEDROOM",
        standardRent: new Prisma.Decimal("12000.00"),
      },
    });
    unitId = unit.id;

    const lift = await prisma.amenity.create({
      data: { key: `lift-${run}`, name: "Lift", category: "AMENITY" },
    });
    liftId = lift.id;

    const parking = await prisma.amenity.create({
      data: { key: `parking-${run}`, name: "Parking", category: "UTILITY" },
    });
    parkingId = parking.id;

    const pets = await prisma.policyDefinition.create({
      data: {
        key: `pets-${run}`,
        name: "Pets allowed",
        valueType: "BOOLEAN",
      },
    });
    petsId = pets.id;

    await prisma.amenityAssignment.create({
      data: { amenityId: liftId, level: "PROPERTY", propertyId, mode: "INCLUDE" },
    });
    await prisma.amenityAssignment.create({
      data: { amenityId: parkingId, level: "UNIT", propertyId, unitId, mode: "INCLUDE" },
    });
    await prisma.policyAssignment.create({
      data: {
        policyId: petsId,
        valueType: "BOOLEAN",
        level: "PROPERTY",
        propertyId,
        mode: "SET",
        valueBool: false,
      },
    });
    await prisma.policyAssignment.create({
      data: {
        policyId: petsId,
        valueType: "BOOLEAN",
        level: "UNIT",
        propertyId,
        unitId,
        mode: "SET",
        valueBool: true,
      },
    });
  });

  afterAll(async () => {
    if (propertyId) {
      await prisma.policyAssignment.deleteMany({ where: { propertyId } });
      await prisma.amenityAssignment.deleteMany({ where: { propertyId } });
      await prisma.unit.deleteMany({ where: { propertyId } });
      await prisma.building.deleteMany({ where: { propertyId } });
      await prisma.property.deleteMany({ where: { id: propertyId } });
    }
    if (petsId) {
      await prisma.policyDefinition.deleteMany({ where: { id: petsId } });
    }
    if (liftId) {
      await prisma.amenity.deleteMany({ where: { id: liftId } });
    }
    if (parkingId) {
      await prisma.amenity.deleteMany({ where: { id: parkingId } });
    }
    if (landlordId) {
      await prisma.landlord.deleteMany({ where: { id: landlordId } });
    }
    await prisma.$disconnect();
  });

  it("lists the amenity catalogue", async () => {
    const response = await request(app)
      .get("/api/v1/inventory/amenities")
      .expect(200);

    const keys = (response.body.data as { key: string }[]).map((a) => a.key);
    expect(keys).toContain(`lift-${run}`);
    expect(keys).toContain(`parking-${run}`);
  });

  it("lists the policy catalogue", async () => {
    const response = await request(app)
      .get("/api/v1/inventory/policies")
      .expect(200);

    const keys = (response.body.data as { key: string }[]).map((p) => p.key);
    expect(keys).toContain(`pets-${run}`);
  });

  it("derives effective configuration for a unit", async () => {
    const response = await request(app)
      .get("/api/v1/inventory/effective")
      .query({ level: "UNIT", propertyId, buildingId, unitId })
      .expect(200);

    const amenities = response.body.data
      .amenities as { amenityId: string; source: string }[];
    const policies = response.body.data
      .policies as { policyId: string; source: string; value: unknown }[];

    expect(amenities).toEqual(
      expect.arrayContaining([
        { amenityId: liftId, source: "INHERITED", inherited: true },
        { amenityId: parkingId, source: "EXPLICIT", inherited: false },
      ]),
    );
    expect(policies).toEqual([
      {
        policyId: petsId,
        source: "EXPLICIT",
        inherited: false,
        value: { kind: "BOOLEAN", value: true },
      },
    ]);
  });

  it("rejects an effective query missing the unit id", async () => {
    await request(app)
      .get("/api/v1/inventory/effective")
      .query({ level: "UNIT", propertyId })
      .expect(400);
  });
});