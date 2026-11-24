import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Prisma, PrismaClient } from "@prisma/client";
import { app } from "../../../app.js";

const prisma = new PrismaClient();
const run = `m007-notice-${Date.now()}`;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe.skipIf(!process.env.DATABASE_URL)("notice API", () => {
  let landlordId!: string;
  let propertyAId!: string;
  let propertyBId!: string;
  let leaseId!: string;
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
    leaseId = lease.id;
  });

  afterAll(async () => {
    if (propertyAId) {
      await prisma.tenantNotice.deleteMany({ where: { propertyId: propertyAId } });
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

  it("rejects a notice with less than 30 days", async () => {
    const noticeDate = new Date();
    const intendedMoveOutDate = new Date(noticeDate.getTime() + 10 * MS_PER_DAY);

    await request(app)
      .post("/api/v1/tenants/notices")
      .set("x-property-id", propertyAId)
      .send({
        leaseId,
        propertyId: propertyAId,
        tenantId,
        noticeDate: noticeDate.toISOString(),
        intendedMoveOutDate: intendedMoveOutDate.toISOString(),
      })
      .expect(400);
  });

  it("creates a notice with sufficient notice", async () => {
    const noticeDate = new Date();
    const intendedMoveOutDate = new Date(noticeDate.getTime() + 31 * MS_PER_DAY);

    const response = await request(app)
      .post("/api/v1/tenants/notices")
      .set("x-property-id", propertyAId)
      .send({
        leaseId,
        propertyId: propertyAId,
        tenantId,
        noticeDate: noticeDate.toISOString(),
        intendedMoveOutDate: intendedMoveOutDate.toISOString(),
      })
      .expect(201);

    expect(response.body.data.status).toBe("PENDING");
  });

  it("rejects cross-property notice creation", async () => {
    const noticeDate = new Date();
    const intendedMoveOutDate = new Date(noticeDate.getTime() + 31 * MS_PER_DAY);

    await request(app)
      .post("/api/v1/tenants/notices")
      .set("x-property-id", propertyBId)
      .send({
        leaseId,
        propertyId: propertyAId,
        tenantId,
        noticeDate: noticeDate.toISOString(),
        intendedMoveOutDate: intendedMoveOutDate.toISOString(),
      })
      .expect(403);
  });
});