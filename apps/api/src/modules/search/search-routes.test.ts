import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaClient, Prisma } from "@prisma/client";
import { app } from "../../app.js";
import { resetLoginRateLimit } from "../auth/controllers/auth.controller.js";
import { withAuthenticatedAgent } from "../../tests/auth-helper.js";

const prisma = new PrismaClient();
const run = `search-${Date.now()}`;
const q = run;

let landlordId: string;
let propertyAId: string;
let propertyBId: string;
let tenantAId: string;
let tenantBId: string;

beforeAll(async () => {
  const landlord = await prisma.landlord.create({
    data: { kind: "INDIVIDUAL", name: `LL ${run}` },
  });
  landlordId = landlord.id;

  const a = await prisma.property.create({
    data: {
      reference: `A-${run}`,
      name: `Alpha ${run}`,
      propertyType: "APARTMENT",
      county: "Nairobi",
      landlordId,
    },
  });
  propertyAId = a.id;
  const b = await prisma.property.create({
    data: {
      reference: `B-${run}`,
      name: `Beta ${run}`,
      propertyType: "APARTMENT",
      county: "Kiambu",
      landlordId,
    },
  });
  propertyBId = b.id;

  const ta = await prisma.tenant.create({
    data: { firstName: "Ann", lastName: run, phone: `+254700${run}`, idNumber: `IDA-${run}` },
  });
  tenantAId = ta.id;
  const tb = await prisma.tenant.create({
    data: { firstName: "Ben", lastName: run, phone: `+254701${run}`, idNumber: `IDB-${run}` },
  });
  tenantBId = tb.id;

  const building = await prisma.building.create({
    data: { propertyId: propertyAId, name: "Block", buildingType: "BLOCK" },
  });
  const unit = await prisma.unit.create({
    data: {
      propertyId: propertyAId,
      buildingId: building.id,
      unitNumber: "A1",
      unitType: "ONE_BEDROOM",
      standardRent: new Prisma.Decimal("10000.00"),
    },
  });
  await prisma.lease.create({
    data: {
      tenantId: tenantAId,
      unitId: unit.id,
      propertyId: propertyAId,
      startDate: new Date("2026-01-01T00:00:00Z"),
      endDate: new Date("2026-12-31T00:00:00Z"),
      rentAmount: new Prisma.Decimal("10000.00"),
      depositAmount: new Prisma.Decimal("10000.00"),
      status: "ACTIVE",
    },
  });

  resetLoginRateLimit();
});

afterAll(async () => {
  await prisma.lease.deleteMany({ where: { propertyId: propertyAId } });
  await prisma.unit.deleteMany({ where: { propertyId: { in: [propertyAId, propertyBId] } } });
  await prisma.building.deleteMany({ where: { propertyId: propertyAId } });
  await prisma.propertyMembership.deleteMany({ where: { propertyId: { in: [propertyAId, propertyBId] } } });
  await prisma.tenantLink.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
  await prisma.user.deleteMany({ where: { email: { contains: run } } });
  await prisma.property.deleteMany({ where: { id: { in: [propertyAId, propertyBId] } } });
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
  await prisma.landlord.deleteMany({ where: { id: landlordId } });
  await prisma.$disconnect();
});

describe("global search", () => {
  it("returns empty groups for a too-short query", async () => {
    await request(app)
      .get("/api/v1/search")
      .query({ q: "a" })
      .set("x-user-id", "admin-dev")
      .expect(200)
      .then((res) => {
        expect(res.body.data).toEqual({ properties: [], landlords: [], tenants: [] });
      });
  });

  it("admin sees all properties and tenants", async () => {
    const res = await request(app)
      .get("/api/v1/search")
      .query({ q })
      .set("x-user-id", "admin-dev")
      .expect(200);
    const ids = res.body.data.properties.map((p: { id: string }) => p.id);
    const tids = res.body.data.tenants.map((t: { id: string }) => t.id);
    expect(ids).toContain(propertyAId);
    expect(ids).toContain(propertyBId);
    expect(tids).toContain(tenantAId);
    expect(tids).toContain(tenantBId);
  });

  it("tenant only sees their own property and record", async () => {
    resetLoginRateLimit();
    const { agent } = await withAuthenticatedAgent(
      `tenant-${run}@example.com`,
      "password12345",
      "TENANT",
      undefined,
      undefined,
      tenantAId,
    );
    const res = await agent.get("/api/v1/search").query({ q }).expect(200);
    const ids = res.body.data.properties.map((p: { id: string }) => p.id);
    const tids = res.body.data.tenants.map((t: { id: string }) => t.id);
    expect(ids).toEqual([propertyAId]);
    expect(tids).toEqual([tenantAId]);
  });

  it("landlord manager only sees their property's data", async () => {
    resetLoginRateLimit();
    const { agent } = await withAuthenticatedAgent(
      `manager-${run}@example.com`,
      "password12345",
      "MANAGER",
      propertyAId,
      "MANAGER",
    );
    const res = await agent.get("/api/v1/search").query({ q }).expect(200);
    const ids = res.body.data.properties.map((p: { id: string }) => p.id);
    const tids = res.body.data.tenants.map((t: { id: string }) => t.id);
    expect(ids).toEqual([propertyAId]);
    expect(tids).toEqual([tenantAId]);
    expect(res.body.data.landlords.map((l: { id: string }) => l.id)).toContain(landlordId);
  });
});