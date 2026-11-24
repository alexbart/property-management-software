import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Prisma, PrismaClient } from "@prisma/client";
import { app } from "../../../app.js";

const prisma = new PrismaClient();
const run = `m006-risk-${Date.now()}`;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe.skipIf(!process.env.DATABASE_URL)("tenant risk API", () => {
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
      },
    });
    tenantId = tenant.id;

    const lease = await prisma.lease.create({
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

    await prisma.ledgerEntry.create({
      data: {
        leaseId: lease.id,
        propertyId: propertyAId,
        type: "RENT",
        amount: new Prisma.Decimal("12000.00"),
        description: "January rent",
        effectiveDate: new Date(Date.now() - 60 * MS_PER_DAY),
      },
    });
  });

  afterAll(async () => {
    if (propertyAId) {
      await prisma.ledgerEntry.deleteMany({ where: { propertyId: propertyAId } });
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

  it("evaluates and returns an updated risk profile", async () => {
    const response = await request(app)
      .post(`/api/v1/tenants/${tenantId}/evaluate-risk`)
      .set("x-property-id", propertyAId)
      .expect(200);

    // 50 (arrears) + 10 (late) = 60.
    expect(response.body.data.riskScore).toBe(60);
    expect(response.body.data.riskFlags).toContain("HIGH_RISK");
    expect(response.body.data.riskFlags).toContain("CHRONIC_LATE");

    const profile = await request(app)
      .get(`/api/v1/tenants/${tenantId}/risk-profile`)
      .set("x-property-id", propertyAId)
      .expect(200);

    expect(profile.body.data.riskScore).toBe(60);
    expect(profile.body.data.riskFlags).toContain("HIGH_RISK");
  });

  it("rejects cross-property risk access", async () => {
    await request(app)
      .post(`/api/v1/tenants/${tenantId}/evaluate-risk`)
      .set("x-property-id", propertyBId)
      .expect(403);

    await request(app)
      .get(`/api/v1/tenants/${tenantId}/risk-profile`)
      .set("x-property-id", propertyBId)
      .expect(403);
  });
});