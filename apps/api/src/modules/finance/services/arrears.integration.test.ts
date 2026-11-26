import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { Prisma, PrismaClient } from "@prisma/client";
import { calculateLeaseArrears } from "./arrears.service.js";

const db = new PrismaClient();
const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe.skipIf(!process.env.DATABASE_URL)("arrears service integration", () => {
  let createdPropertyId: string | undefined;
  let createdLandlordId: string | undefined;
  let createdTenantId: string | undefined;

  async function seed(run: string, rentDate: Date) {
    const landlord = await db.landlord.create({
      data: { kind: "INDIVIDUAL", name: `LL-${run}` },
    });
    createdLandlordId = landlord.id;

    const property = await db.property.create({
      data: {
        reference: `P-${run}`,
        name: `Prop-${run}`,
        propertyType: "APARTMENT",
        county: "Nairobi",
        landlordId: landlord.id,
      },
    });
    createdPropertyId = property.id;

    const unit = await db.unit.create({
      data: {
        propertyId: property.id,
        unitNumber: "A1",
        unitType: "ONE_BEDROOM",
        standardRent: new Prisma.Decimal("10000.00"),
      },
    });

    const tenant = await db.tenant.create({
      data: {
        firstName: "Jane",
        lastName: "Doe",
        phone: `+2547${Date.now().toString().slice(-6)}`,
        idNumber: `ID-${run}`,
      },
    });
    createdTenantId = tenant.id;

    const lease = await db.lease.create({
      data: {
        tenantId: tenant.id,
        unitId: unit.id,
        propertyId: property.id,
        startDate: new Date("2026-01-01T00:00:00Z"),
        endDate: new Date("2026-12-31T00:00:00Z"),
        rentAmount: new Prisma.Decimal("10000.00"),
        depositAmount: new Prisma.Decimal("10000.00"),
        status: "ACTIVE",
      },
    });

    await db.ledgerEntry.create({
      data: {
        leaseId: lease.id,
        propertyId: property.id,
        type: "RENT",
        amount: new Prisma.Decimal("10000.00"),
        description: "Rent",
        effectiveDate: rentDate,
      },
    });

    return { leaseId: lease.id, propertyId: property.id };
  }

  async function cleanup() {
    if (createdPropertyId) {
      await db.payment.deleteMany({ where: { propertyId: createdPropertyId } });
      await db.ledgerEntry.deleteMany({
        where: { propertyId: createdPropertyId },
      });
      await db.lease.deleteMany({ where: { propertyId: createdPropertyId } });
      await db.unit.deleteMany({ where: { propertyId: createdPropertyId } });
      await db.property.deleteMany({ where: { id: createdPropertyId } });
    }
    if (createdTenantId) {
      await db.tenant.deleteMany({ where: { id: createdTenantId } });
    }
    if (createdLandlordId) {
      await db.landlord.deleteMany({ where: { id: createdLandlordId } });
    }
    createdPropertyId = undefined;
    createdLandlordId = undefined;
    createdTenantId = undefined;
  }

  afterAll(async () => {
    await cleanup();
    await db.$disconnect();
  });

  it("nets a completed payment to a zero balance without a RENT row", async () => {
    const run = `m010a-${Date.now()}`;
    const asOf = new Date();
    const { leaseId, propertyId } = await seed(
      run,
      new Date(asOf.getTime() - 60 * MS_PER_DAY),
    );

    await db.payment.create({
      data: {
        leaseId,
        propertyId,
        amount: new Prisma.Decimal("10000.00"),
        method: "MPESA",
        reference: `REF-${run}`,
        status: "COMPLETED",
        receivedAt: asOf,
      },
    });

    const result = await calculateLeaseArrears(leaseId, propertyId, asOf);

    expect(result.totalDue.equals(new Prisma.Decimal("10000.00"))).toBe(true);
    expect(result.currentBalance.equals(new Prisma.Decimal("0"))).toBe(true);
    expect(result.daysOverdue).toBe(0);
    await cleanup();
  });

  it("derives daysOverdue from the rent date, not the payment date", async () => {
    const run = `m010b-${Date.now()}`;
    const asOf = new Date();
    const { leaseId, propertyId } = await seed(
      run,
      new Date(asOf.getTime() - 60 * MS_PER_DAY),
    );

    await db.payment.create({
      data: {
        leaseId,
        propertyId,
        amount: new Prisma.Decimal("5000.00"),
        method: "MPESA",
        reference: `REF-${run}`,
        status: "COMPLETED",
        receivedAt: asOf,
      },
    });

    const result = await calculateLeaseArrears(leaseId, propertyId, asOf);

    expect(result.currentBalance.equals(new Prisma.Decimal("5000.00"))).toBe(
      true,
    );
    expect(result.daysOverdue).toBe(30);
    await cleanup();
  });
});