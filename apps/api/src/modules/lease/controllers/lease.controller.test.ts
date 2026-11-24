import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Prisma, PrismaClient } from "@prisma/client";
import { app } from "../../../app.js";

const prisma = new PrismaClient();
const run = `m003-api-${Date.now()}`;

describe.skipIf(!process.env.DATABASE_URL)("lease API", () => {
  let landlordId!: string;
  let propertyAId!: string;
  let propertyBId!: string;
  let unitId!: string;
  let tenantId!: string;
  let lease1Id!: string;

  const leaseBody = {
    unitId: "",
    propertyId: "",
    startDate: "2026-01-01T00:00:00.000Z",
    endDate: "2026-12-31T00:00:00.000Z",
    rentAmount: 12000,
    depositAmount: 12000,
  };

  beforeAll(async () => {
    const landlord = await prisma.landlord.create({
      data: { kind: "INDIVIDUAL", name: `LL-${run}` },
    });
    landlordId = landlord.id;

    const propertyA = await prisma.property.create({
      data: {
        reference: `A-${run}`,
        name: `PropA-${run}`,
        propertyType: "APARTMENT",
        county: "Nairobi",
        landlordId,
      },
    });
    propertyAId = propertyA.id;

    const propertyB = await prisma.property.create({
      data: {
        reference: `B-${run}`,
        name: `PropB-${run}`,
        propertyType: "STANDALONE_HOUSE",
        county: "Kiambu",
        landlordId,
      },
    });
    propertyBId = propertyB.id;

    const building = await prisma.building.create({
      data: { propertyId: propertyAId, name: "Block A", buildingType: "BLOCK" },
    });

    const unit = await prisma.unit.create({
      data: {
        propertyId: propertyAId,
        buildingId: building.id,
        unitNumber: "A1",
        unitType: "ONE_BEDROOM",
        standardRent: new Prisma.Decimal("12000.00"),
      },
    });
    unitId = unit.id;

    const tenant = await prisma.tenant.create({
      data: {
        firstName: "Jane",
        lastName: "Doe",
        phone: "+254700000000",
        idNumber: `ID-${run}`,
      },
    });
    tenantId = tenant.id;
  });

  afterAll(async () => {
    if (propertyAId) {
      await prisma.lease.deleteMany({ where: { propertyId: propertyAId } });
      await prisma.unit.deleteMany({ where: { propertyId: propertyAId } });
      await prisma.building.deleteMany({ where: { propertyId: propertyAId } });
      await prisma.property.deleteMany({ where: { id: propertyAId } });
    }
    if (propertyBId) {
      await prisma.property.deleteMany({ where: { id: propertyBId } });
    }
    if (tenantId) {
      await prisma.tenant.deleteMany({ where: { id: tenantId } });
    }
    if (landlordId) {
      await prisma.landlord.deleteMany({ where: { id: landlordId } });
    }
    await prisma.$disconnect();
  });

  it("creates and activates a lease", async () => {
    const created = await request(app)
      .post("/api/v1/leases")
      .set("x-property-id", propertyAId)
      .send({ ...leaseBody, tenantId, unitId, propertyId: propertyAId })
      .expect(201);

    lease1Id = created.body.data.id;
    expect(created.body.data.status).toBe("DRAFT");

    const activated = await request(app)
      .post(`/api/v1/leases/${lease1Id}/activate`)
      .set("x-property-id", propertyAId)
      .expect(200);

    expect(activated.body.data.status).toBe("ACTIVE");
  });

  it("returns 409 when activating a second lease for the same unit", async () => {
    const created = await request(app)
      .post("/api/v1/leases")
      .set("x-property-id", propertyAId)
      .send({ ...leaseBody, tenantId, unitId, propertyId: propertyAId })
      .expect(201);

    const conflict = await request(app)
      .post(`/api/v1/leases/${created.body.data.id}/activate`)
      .set("x-property-id", propertyAId)
      .expect(409);

    expect(conflict.body.error.message).toBe("Unit already has an active lease");
  });

  it("returns 403 when modifying a lease outside the caller's property", async () => {
    await request(app)
      .post(`/api/v1/leases/${lease1Id}/activate`)
      .set("x-property-id", propertyBId)
      .expect(403);
  });
});