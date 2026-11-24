import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Prisma, PrismaClient } from "@prisma/client";
import { app } from "../../../app.js";

const prisma = new PrismaClient();
const run = `m007-recon-${Date.now()}`;

describe.skipIf(!process.env.DATABASE_URL)("reconciliation API", () => {
  let landlordId!: string;
  let propertyAId!: string;
  let propertyBId!: string;
  let startDate!: string;
  let endDate!: string;

  beforeAll(async () => {
    const now = new Date();
    startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

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

    await prisma.ledgerEntry.create({
      data: {
        leaseId: lease.id,
        propertyId: propertyAId,
        type: "RENT",
        amount: new Prisma.Decimal("20000.00"),
        description: "Rent",
        effectiveDate: now,
      },
    });

    await prisma.payment.create({
      data: {
        leaseId: lease.id,
        propertyId: propertyAId,
        amount: new Prisma.Decimal("15000.00"),
        method: "MPESA",
        reference: `REF-${run}`,
        status: "COMPLETED",
        receivedAt: now,
      },
    });

    await prisma.maintenanceTicket.create({
      data: {
        propertyId: propertyAId,
        unitId: unit.id,
        initiatedBy: "MANAGER",
        initiatorId: "user-1",
        title: "Leak",
        description: "Fix leak",
        status: "RESOLVED",
        actualCost: new Prisma.Decimal("2500.00"),
        resolvedAt: now,
      },
    });
  });

  afterAll(async () => {
    if (propertyAId) {
      await prisma.ledgerEntry.deleteMany({ where: { propertyId: propertyAId } });
      await prisma.payment.deleteMany({ where: { propertyId: propertyAId } });
      await prisma.maintenanceTicket.deleteMany({
        where: { propertyId: propertyAId },
      });
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

  it("returns aggregated totals within scope", async () => {
    const response = await request(app)
      .get(
        `/api/v1/finance/properties/${propertyAId}/reconciliation?startDate=${encodeURIComponent(
          startDate,
        )}&endDate=${encodeURIComponent(endDate)}`,
      )
      .set("x-property-id", propertyAId)
      .expect(200);

    const data = response.body.data;
    expect(Number(data.totalRentDue)).toBe(20000);
    expect(Number(data.totalCollected)).toBe(15000);
    expect(Number(data.totalMaintenanceExpenses)).toBe(2500);
    expect(Number(data.estimatedNOI)).toBe(12500);
  });

  it("rejects cross-property reconciliation access", async () => {
    await request(app)
      .get(
        `/api/v1/finance/properties/${propertyAId}/reconciliation?startDate=${encodeURIComponent(
          startDate,
        )}&endDate=${encodeURIComponent(endDate)}`,
      )
      .set("x-property-id", propertyBId)
      .expect(403);
  });
});