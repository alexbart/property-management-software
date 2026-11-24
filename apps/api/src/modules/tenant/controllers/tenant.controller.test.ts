import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Prisma, PrismaClient } from "@prisma/client";
import { app } from "../../../app.js";

const prisma = new PrismaClient();
const run = `m010-tenants-${Date.now()}`;

describe.skipIf(!process.env.DATABASE_URL)("tenant list API", () => {
  let landlordId!: string;
  let propertyAId!: string;
  let propertyBId!: string;
  let tenantId!: string;

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

    const unit = await prisma.unit.create({
      data: {
        propertyId: propertyAId,
        unitNumber: "A1",
        unitType: "ONE_BEDROOM",
        standardRent: new Prisma.Decimal("12000.00"),
      },
    });

    const tenant = await prisma.tenant.create({
      data: {
        firstName: "Jane",
        lastName: "Doe",
        phone: `+2547${Date.now().toString().slice(-6)}`,
        idNumber: `ID-${run}`,
        riskScore: 60,
        riskFlags: ["HIGH_RISK"],
      },
    });
    tenantId = tenant.id;

    await prisma.lease.create({
      data: {
        tenantId,
        unitId: unit.id,
        propertyId: propertyAId,
        startDate: new Date("2026-01-01T00:00:00Z"),
        endDate: new Date("2026-12-31T00:00:00Z"),
        rentAmount: new Prisma.Decimal("12000.00"),
        depositAmount: new Prisma.Decimal("12000.00"),
        status: "ACTIVE",
      },
    });
  });

  afterAll(async () => {
    if (propertyAId) {
      await prisma.lease.deleteMany({ where: { propertyId: propertyAId } });
      await prisma.unit.deleteMany({ where: { propertyId: propertyAId } });
      await prisma.property.deleteMany({ where: { id: propertyAId } });
    }
    if (propertyBId) {
      await prisma.property.deleteMany({ where: { id: propertyBId } });
    }
    await prisma.tenant.deleteMany({ where: { idNumber: `ID-${run}` } });
    if (landlordId) {
      await prisma.landlord.deleteMany({ where: { id: landlordId } });
    }
    await prisma.$disconnect();
  });

  it("returns tenants for the scoped property ranked by risk", async () => {
    const response = await request(app)
      .get("/api/v1/tenants")
      .set("x-property-id", propertyAId)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(tenantId);
    expect(response.body.data[0].riskScore).toBe(60);
    expect(response.body.data[0].riskFlags).toContain("HIGH_RISK");
  });

  it("rejects cross-property access", async () => {
    await request(app)
      .get(`/api/v1/tenants?propertyId=${propertyAId}`)
      .set("x-property-id", propertyBId)
      .expect(403);
  });
});