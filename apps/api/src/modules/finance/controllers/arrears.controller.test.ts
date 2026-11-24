import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Prisma, PrismaClient } from "@prisma/client";
import { app } from "../../../app.js";

const prisma = new PrismaClient();
const run = `m006-arrears-${Date.now()}`;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe.skipIf(!process.env.DATABASE_URL)("arrears API", () => {
  let landlordId!: string;
  let propertyAId!: string;
  let propertyBId!: string;
  let leaseId!: string;

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

    const lease = await prisma.lease.create({
      data: {
        tenantId: tenant.id,
        unitId: unit.id,
        propertyId: propertyAId,
        startDate: new Date("2026-01-01T00:00:00Z"),
        endDate: new Date("2026-12-31T00:00:00Z"),
        rentAmount: new Prisma.Decimal("12000.00"),
        depositAmount: new Prisma.Decimal("12000.00"),
        status: "ACTIVE",
      },
    });
    leaseId = lease.id;

    // 60 days old: 30-day grace leaves 30 days overdue.
    await prisma.ledgerEntry.create({
      data: {
        leaseId,
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

  it("returns the calculated arrears summary within scope", async () => {
    const response = await request(app)
      .get(`/api/v1/finance/leases/${leaseId}/arrears`)
      .set("x-property-id", propertyAId)
      .expect(200);

    const data = response.body.data;
    expect(Number(data.totalDue)).toBe(12000);
    expect(Number(data.currentBalance)).toBe(12000);
    expect(data.daysOverdue).toBe(30);
    expect(Number(data.penaltyAccrued)).toBeCloseTo(10800, 2);
  });

  it("rejects cross-property arrears access", async () => {
    await request(app)
      .get(`/api/v1/finance/leases/${leaseId}/arrears`)
      .set("x-property-id", propertyBId)
      .expect(403);
  });
});