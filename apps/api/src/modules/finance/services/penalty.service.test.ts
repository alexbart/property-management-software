import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { Prisma, PrismaClient } from "@prisma/client";
import { persistAccruedPenalty } from "./penalty.service.js";

const db = new PrismaClient();
const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe.skipIf(!process.env.DATABASE_URL)("penalty persistence", () => {
  let propertyId: string | undefined;
  let landlordId: string | undefined;
  let tenantId: string | undefined;
  let leaseId: string | undefined;

  async function seed(run: string) {
    const landlord = await db.landlord.create({
      data: { kind: "INDIVIDUAL", name: `LL-${run}` },
    });
    landlordId = landlord.id;

    const property = await db.property.create({
      data: {
        reference: `P-${run}`,
        name: `Prop-${run}`,
        propertyType: "APARTMENT",
        county: "Nairobi",
        landlordId: landlord.id,
      },
    });
    propertyId = property.id;

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
    tenantId = tenant.id;

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
    leaseId = lease.id;

    await db.ledgerEntry.create({
      data: {
        leaseId: lease.id,
        propertyId: property.id,
        type: "RENT",
        amount: new Prisma.Decimal("10000.00"),
        description: "Rent",
        effectiveDate: new Date(Date.now() - 60 * MS_PER_DAY),
      },
    });
  }

  async function cleanup() {
    if (propertyId) {
      await db.ledgerEntry.deleteMany({ where: { propertyId } });
      await db.lease.deleteMany({ where: { propertyId } });
      await db.unit.deleteMany({ where: { propertyId } });
      await db.property.deleteMany({ where: { id: propertyId } });
    }
    if (tenantId) {
      await db.tenant.deleteMany({ where: { id: tenantId } });
    }
    if (landlordId) {
      await db.landlord.deleteMany({ where: { id: landlordId } });
    }
    propertyId = undefined;
    landlordId = undefined;
    tenantId = undefined;
    leaseId = undefined;
  }

  afterAll(async () => {
    await cleanup();
    await db.$disconnect();
  });

  it("persists the accrued penalty as a PENALTY entry", async () => {
    const run = `m010p-${Date.now()}`;
    await seed(run);

    const entry = await persistAccruedPenalty(leaseId!, propertyId!);

    expect(entry).not.toBeNull();
    expect(entry?.type).toBe("PENALTY");
    // 10000 * 0.03 * 30 = 9000.
    expect(Number(entry?.amount)).toBe(9000);
    await cleanup();
  });

  it("rejects a negative RENT ledger amount via the DB constraint", async () => {
    const run = `m010c-${Date.now()}`;
    await seed(run);

    await expect(
      db.ledgerEntry.create({
        data: {
          leaseId: leaseId!,
          propertyId: propertyId!,
          type: "RENT",
          amount: new Prisma.Decimal("-100.00"),
          description: "Invalid",
          effectiveDate: new Date(),
        },
      }),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientUnknownRequestError);
    await cleanup();
  });
});