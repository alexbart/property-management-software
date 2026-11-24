import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Prisma, PrismaClient } from "@prisma/client";
import { app } from "../../../app.js";

const prisma = new PrismaClient();
const run = `m004-api-${Date.now()}`;
const phone = `+2547${Date.now().toString().slice(-6)}`;
const webhookRef = `WS-${run}`;
const cashRef = `CASH-${run}`;

describe.skipIf(!process.env.DATABASE_URL)("finance API", () => {
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

    const tenant = await prisma.tenant.create({
      data: {
        firstName: "Jane",
        lastName: "Doe",
        phone,
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
  });

  afterAll(async () => {
    if (propertyAId) {
      await prisma.ledgerEntry.deleteMany({ where: { propertyId: propertyAId } });
      await prisma.payment.deleteMany({ where: { propertyId: propertyAId } });
      await prisma.lease.deleteMany({ where: { propertyId: propertyAId } });
      await prisma.unit.deleteMany({ where: { propertyId: propertyAId } });
      await prisma.building.deleteMany({ where: { propertyId: propertyAId } });
      await prisma.property.deleteMany({ where: { id: propertyAId } });
    }
    if (propertyBId) {
      await prisma.property.deleteMany({ where: { id: propertyBId } });
    }
    await prisma.idempotencyKey.deleteMany({
      where: { key: { startsWith: run } },
    });
    await prisma.tenant.deleteMany({ where: { idNumber: `ID-${run}` } });
    if (landlordId) {
      await prisma.landlord.deleteMany({ where: { id: landlordId } });
    }
    await prisma.$disconnect();
  });

  it("records a valid M-Pesa callback", async () => {
    await request(app)
      .post("/api/v1/webhooks/mpesa")
      .send({
        CheckoutRequestID: webhookRef,
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        Amount: 12000,
        PhoneNumber: phone,
      })
      .expect(200);

    const payment = await prisma.payment.findUnique({
      where: { reference: webhookRef },
    });
    expect(payment?.status).toBe("COMPLETED");

    const ledgerCount = await prisma.ledgerEntry.count({
      where: { leaseId },
    });
    expect(ledgerCount).toBe(1);
  });

  it("absorbs a duplicate M-Pesa callback without duplicating records", async () => {
    await request(app)
      .post("/api/v1/webhooks/mpesa")
      .send({
        CheckoutRequestID: webhookRef,
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        Amount: 12000,
        PhoneNumber: phone,
      })
      .expect(200);

    const paymentCount = await prisma.payment.count({
      where: { reference: webhookRef },
    });
    expect(paymentCount).toBe(1);

    const ledgerCount = await prisma.ledgerEntry.count({ where: { leaseId } });
    expect(ledgerCount).toBe(1);
  });

  it("creates a manual payment within scope and rejects cross-property", async () => {
    const created = await request(app)
      .post("/api/v1/finance/payments")
      .set("x-property-id", propertyAId)
      .send({
        leaseId,
        propertyId: propertyAId,
        amount: 5000,
        method: "CASH",
        reference: cashRef,
      })
      .expect(201);

    expect(created.body.data.status).toBe("COMPLETED");

    await request(app)
      .post("/api/v1/finance/payments")
      .set("x-property-id", propertyBId)
      .send({
        leaseId,
        propertyId: propertyAId,
        amount: 5000,
        method: "CASH",
        reference: `${cashRef}-X`,
      })
      .expect(403);
  });
});