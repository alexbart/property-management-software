import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { Prisma, PrismaClient } from "@prisma/client";
import { app } from "../../../app.js";
import { darajaService } from "../services/daraja.service.js";

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
    // Payments are cash records only; no RENT ledger row is written.
    expect(ledgerCount).toBe(0);
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
    expect(ledgerCount).toBe(0);
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

  it("nets a rent charge and payment to zero arrears", async () => {
    const unit2 = await prisma.unit.create({
      data: {
        propertyId: propertyAId,
        unitNumber: "A2",
        unitType: "ONE_BEDROOM",
        standardRent: new Prisma.Decimal("12000.00"),
      },
    });

    const lease2 = await prisma.lease.create({
      data: {
        tenantId: (
          await prisma.tenant.findFirstOrThrow({
            where: { idNumber: `ID-${run}` },
          })
        ).id,
        unitId: unit2.id,
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
        leaseId: lease2.id,
        propertyId: propertyAId,
        type: "RENT",
        amount: new Prisma.Decimal("10000.00"),
        description: "Rent",
        effectiveDate: new Date(),
      },
    });

    await request(app)
      .post("/api/v1/finance/payments")
      .set("x-property-id", propertyAId)
      .send({
        leaseId: lease2.id,
        propertyId: propertyAId,
        amount: 10000,
        method: "CASH",
        reference: `CASH-${run}-ARREARS`,
      })
      .expect(201);

    const response = await request(app)
      .get(`/api/v1/finance/leases/${lease2.id}/arrears`)
      .set("x-property-id", propertyAId)
      .expect(200);

    expect(Number(response.body.data.totalDue)).toBe(10000);
    expect(Number(response.body.data.currentBalance)).toBe(0);
    expect(response.body.data.daysOverdue).toBe(0);
  });

  describe("STK Push Initiation", () => {
    let stkPushLeaseId: string;
    let stkPushUnitId: string;

    beforeAll(async () => {
      // Create a separate lease for STK push tests with a rent charge
      const building = await prisma.building.create({
        data: { propertyId: propertyAId, name: "Block B", buildingType: "BLOCK" },
      });

      stkPushUnitId = (await prisma.unit.create({
        data: {
          propertyId: propertyAId,
          buildingId: building.id,
          unitNumber: "B1",
          unitType: "ONE_BEDROOM",
          standardRent: new Prisma.Decimal("15000.00"),
        },
      })).id;

      const tenant = await prisma.tenant.create({
        data: {
          firstName: "John",
          lastName: "Smith",
          phone: "254712345678",
          idNumber: `ID-${run}-STK`,
        },
      });

      const lease = await prisma.lease.create({
        data: {
          tenantId: tenant.id,
          unitId: stkPushUnitId,
          propertyId: propertyAId,
          startDate: new Date("2026-01-01T00:00:00Z"),
          endDate: new Date("2026-12-31T00:00:00Z"),
          rentAmount: new Prisma.Decimal("15000.00"),
          depositAmount: new Prisma.Decimal("15000.00"),
          status: "ACTIVE",
        },
      });
      stkPushLeaseId = lease.id;

      // Create a rent charge so there's arrears to pay
      await prisma.ledgerEntry.create({
        data: {
          leaseId: stkPushLeaseId,
          propertyId: propertyAId,
          type: "RENT",
          amount: new Prisma.Decimal("15000.00"),
          description: "Rent for January",
          effectiveDate: new Date("2026-01-01"),
        },
      });
    });

    afterAll(async () => {
      if (stkPushLeaseId) {
        await prisma.ledgerEntry.deleteMany({ where: { leaseId: stkPushLeaseId } });
        await prisma.payment.deleteMany({ where: { leaseId: stkPushLeaseId } });
        await prisma.lease.deleteMany({ where: { id: stkPushLeaseId } });
      }
      if (stkPushUnitId) {
        await prisma.unit.deleteMany({ where: { id: stkPushUnitId } });
      }
      await prisma.tenant.deleteMany({ where: { idNumber: `ID-${run}-STK` } });
    });

    beforeEach(() => {
      vi.clearAllMocks();
      darajaService.clearTokenCache();
    });

    it("initiates STK push and creates PENDING payment record", async () => {
      const mockDarajaResponse = {
        checkoutRequestId: "ws_CO_TEST123",
        merchantRequestId: "mr_TEST123",
        responseCode: "0",
        responseDescription: "Success. Request accepted for processing",
        customerMessage: "Success. Request accepted for processing",
      };

      vi.spyOn(darajaService, "initiateStkPush").mockResolvedValue(mockDarajaResponse);

      const response = await request(app)
        .post("/api/v1/finance/payments/stk-push")
        .set("x-property-id", propertyAId)
        .send({
          leaseId: stkPushLeaseId,
          amount: "15000.00",
          phoneNumber: "254712345678",
        })
        .expect(200);

      expect(response.body.data).toEqual(mockDarajaResponse);

      // Verify PENDING payment record was created
      const payments = await prisma.payment.findMany({
        where: { leaseId: stkPushLeaseId, status: "PENDING" },
      });
      expect(payments).toHaveLength(1);
      expect(payments[0].amount).toEqual(new Prisma.Decimal("15000.00"));
      expect(payments[0].method).toBe("MPESA");
      expect(payments[0].reference).toMatch(/^PAY-\d+-/);
    });

    it("rejects STK push for lease outside property scope", async () => {
      vi.spyOn(darajaService, "initiateStkPush").mockResolvedValue({
        checkoutRequestId: "ws_CO_TEST",
        merchantRequestId: "mr_TEST",
        responseCode: "0",
        responseDescription: "Success",
        customerMessage: "Success",
      });

      await request(app)
        .post("/api/v1/finance/payments/stk-push")
        .set("x-property-id", propertyBId)
        .send({
          leaseId: stkPushLeaseId,
          amount: "15000.00",
          phoneNumber: "254712345678",
        })
        .expect(403);
    });

    it("rejects STK push when amount exceeds current balance", async () => {
      vi.spyOn(darajaService, "initiateStkPush").mockResolvedValue({
        checkoutRequestId: "ws_CO_TEST",
        merchantRequestId: "mr_TEST",
        responseCode: "0",
        responseDescription: "Success",
        customerMessage: "Success",
      });

      await request(app)
        .post("/api/v1/finance/payments/stk-push")
        .set("x-property-id", propertyAId)
        .send({
          leaseId: stkPushLeaseId,
          amount: "20000.00", // Exceeds the 15000 balance
          phoneNumber: "254712345678",
        })
        .expect(409); // ConflictException returns 409
    });

    it("rejects STK push with invalid phone number format", async () => {
      await request(app)
        .post("/api/v1/finance/payments/stk-push")
        .set("x-property-id", propertyAId)
        .send({
          leaseId: stkPushLeaseId,
          amount: "15000.00",
          phoneNumber: "0712345678", // Invalid format
        })
        .expect(400);
    });
  });
});