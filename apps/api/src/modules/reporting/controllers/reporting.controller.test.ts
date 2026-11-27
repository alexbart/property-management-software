import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Prisma, PrismaClient } from "@prisma/client";
import { app } from "../../../app.js";

const prisma = new PrismaClient();
const run = `m014-api-${Date.now()}`;
const userId = "user-m014";

describe.skipIf(!process.env.DATABASE_URL)("reporting API", () => {
  let landlordId!: string;
  let propertyAId!: string;
  let propertyBId!: string;
  let unitAId!: string;
  let tenantId!: string;
  let leaseId!: string;
  let paymentId!: string;
  let otherPaymentId!: string;

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
        standardRent: new Prisma.Decimal("15000.00"),
      },
    });
    unitAId = unit.id;

    const tenant = await prisma.tenant.create({
      data: {
        firstName: "Jane",
        lastName: "Doe",
        phone: "0712345678",
        idNumber: `ID-${run}`,
      },
    });
    tenantId = tenant.id;

    const lease = await prisma.lease.create({
      data: {
        tenantId,
        unitId: unitAId,
        propertyId: propertyAId,
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-12-31T00:00:00.000Z"),
        rentAmount: new Prisma.Decimal("15000.00"),
        depositAmount: new Prisma.Decimal("15000.00"),
        status: "ACTIVE",
      },
    });
    leaseId = lease.id;

    const payment = await prisma.payment.create({
      data: {
        leaseId,
        propertyId: propertyAId,
        amount: new Prisma.Decimal("15000.00"),
        method: "MPESA",
        reference: `REF-${run}`,
        status: "COMPLETED",
        receivedAt: new Date(),
      },
    });
    paymentId = payment.id;

    // A completed payment in a different property (for the 403 case).
    const otherUnit = await prisma.unit.create({
      data: {
        propertyId: propertyBId,
        unitNumber: "B1",
        unitType: "TWO_BEDROOM",
        standardRent: new Prisma.Decimal("20000.00"),
      },
    });
    const otherLease = await prisma.lease.create({
      data: {
        tenantId,
        unitId: otherUnit.id,
        propertyId: propertyBId,
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-12-31T00:00:00.000Z"),
        rentAmount: new Prisma.Decimal("20000.00"),
        depositAmount: new Prisma.Decimal("20000.00"),
        status: "ACTIVE",
      },
    });
    const otherPayment = await prisma.payment.create({
      data: {
        leaseId: otherLease.id,
        propertyId: propertyBId,
        amount: new Prisma.Decimal("20000.00"),
        method: "CASH",
        reference: `REFB-${run}`,
        status: "COMPLETED",
        receivedAt: new Date(),
      },
    });
    otherPaymentId = otherPayment.id;

    await prisma.maintenanceTicket.create({
      data: {
        propertyId: propertyAId,
        unitId: unitAId,
        initiatedBy: "MANAGER",
        initiatorId: "user-1",
        title: "Leaking tap",
        description: "Kitchen tap leaks",
        priority: "HIGH",
        status: "RESOLVED",
        actualCost: new Prisma.Decimal("1500.00"),
      },
    });
  });

  afterAll(async () => {
    await prisma.payment.deleteMany({
      where: { reference: { in: [`REF-${run}`, `REFB-${run}`] } },
    });
    await prisma.maintenanceTicket.deleteMany({
      where: { propertyId: { in: [propertyAId, propertyBId] } },
    });
    await prisma.lease.deleteMany({
      where: { propertyId: { in: [propertyAId, propertyBId] } },
    });
    await prisma.unit.deleteMany({
      where: { propertyId: { in: [propertyAId, propertyBId] } },
    });
    await prisma.building.deleteMany({ where: { propertyId: propertyAId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
    await prisma.property.deleteMany({
      where: { id: { in: [propertyAId, propertyBId] } },
    });
    await prisma.landlord.deleteMany({ where: { id: landlordId } });
    await prisma.$disconnect();
  });

  it("downloads a rent roll CSV for a scoped property", async () => {
    const res = await request(app)
      .get(`/api/v1/reporting/properties/${propertyAId}/rent-roll.csv`)
      .set("x-user-id", userId)
      .set("x-property-id", propertyAId)
      .expect(200);

    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain("attachment");
    expect(res.text).toContain("Unit Number");
    expect(res.text).toContain("Jane Doe");
  });

  it("downloads a receipt PDF for a completed payment in scope", async () => {
    const res = await request(app)
      .get(`/api/v1/reporting/payments/${paymentId}/receipt.pdf`)
      .set("x-user-id", userId)
      .set("x-property-id", propertyAId)
      .expect(200);

    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.headers["content-disposition"]).toContain("attachment");
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("returns 403 for a receipt in a property the user does not manage", async () => {
    await request(app)
      .get(`/api/v1/reporting/payments/${otherPaymentId}/receipt.pdf`)
      .set("x-user-id", userId)
      .set("x-property-id", propertyAId)
      .expect(403);
  });

  it("returns 400 for invalid maintenance export dates", async () => {
    await request(app)
      .get(`/api/v1/reporting/properties/${propertyAId}/maintenance.csv`)
      .query({ startDate: "not-a-date", endDate: "2026-01-01" })
      .set("x-user-id", userId)
      .set("x-property-id", propertyAId)
      .expect(400);
  });

  it("downloads a maintenance CSV within a valid range", async () => {
    const res = await request(app)
      .get(`/api/v1/reporting/properties/${propertyAId}/maintenance.csv`)
      .query({ startDate: "2026-01-01", endDate: "2026-12-31" })
      .set("x-user-id", userId)
      .set("x-property-id", propertyAId)
      .expect(200);

    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text).toContain("Leaking tap");
    expect(res.text).toContain("1500.00");
  });

  it("rejects requests without authentication", async () => {
    await request(app)
      .get(`/api/v1/reporting/properties/${propertyAId}/rent-roll.csv`)
      .set("x-property-id", propertyAId)
      .expect(401);
  });
});