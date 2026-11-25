import "dotenv/config";
import { afterAll, beforeAll, describe, it } from "vitest";
import request from "supertest";
import { PrismaClient, Prisma } from "@prisma/client";
import { app } from "../app.js";
import { hashPassword } from "../modules/auth/services/auth.service.js";
import { resetLoginRateLimit } from "../modules/auth/controllers/auth.controller.js";

const prisma = new PrismaClient();
const run = `auth-middleware-${Date.now()}`;

describe("Auth middleware", () => {
  let landlordId: string;
  let propertyAId: string;
  let propertyBId: string;
  let tenantId: string;
  let leaseId: string;
  let userAId: string;
  let userBId: string;
  let tenantUserId: string;

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
        phone: "+254700000000",
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

    // Create user A (manager for property A)
    const { passwordHash: hashA, passwordSalt: saltA } = await hashPassword("password123");
    const userA = await prisma.user.create({
      data: { email: `usera-${run}@example.com`, passwordHash: hashA, passwordSalt: saltA, role: "MANAGER", active: true },
    });
    userAId = userA.id;
    await prisma.propertyMembership.create({
      data: { userId: userAId, propertyId: propertyAId, role: "MANAGER" },
    });

    // Create user B (manager for property B)
    const { passwordHash: hashB, passwordSalt: saltB } = await hashPassword("password123");
    const userB = await prisma.user.create({
      data: { email: `userb-${run}@example.com`, passwordHash: hashB, passwordSalt: saltB, role: "MANAGER", active: true },
    });
    userBId = userB.id;
    await prisma.propertyMembership.create({
      data: { userId: userBId, propertyId: propertyBId, role: "MANAGER" },
    });

    // Create tenant user
    const { passwordHash: hashT, passwordSalt: saltT } = await hashPassword("password123");
    const tenantUser = await prisma.user.create({
      data: { email: `tenant-${run}@example.com`, passwordHash: hashT, passwordSalt: saltT, role: "TENANT", active: true },
    });
    tenantUserId = tenantUser.id;
    await prisma.tenantLink.create({
      data: { userId: tenantUserId, tenantId },
    });
  });

  afterAll(async () => {
    // Delete in correct order due to foreign key constraints
    await prisma.propertyMembership.deleteMany({ where: { userId: { in: [userAId, userBId, tenantUserId] } } });
    await prisma.tenantLink.deleteMany({ where: { userId: { in: [tenantUserId] } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: `usera-${run}` } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: `userb-${run}` } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: `tenant-${run}` } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: `admin-${run}` } } });
    await prisma.ledgerEntry.deleteMany({ where: { propertyId: propertyAId } });
    await prisma.payment.deleteMany({ where: { propertyId: propertyAId } });
    await prisma.lease.deleteMany({ where: { propertyId: propertyAId } });
    await prisma.unit.deleteMany({ where: { propertyId: propertyAId } });
    await prisma.building.deleteMany({ where: { propertyId: propertyAId } });
    await prisma.property.deleteMany({ where: { id: propertyAId } });
    await prisma.property.deleteMany({ where: { id: propertyBId } });
    await prisma.tenant.deleteMany({ where: { idNumber: `ID-${run}` } });
    await prisma.landlord.deleteMany({ where: { id: landlordId } });
    await prisma.$disconnect();
  });

  async function login(email: string, password: string) {
    const agent = request.agent(app);
    const response = await agent.post("/api/v1/auth/login").send({ email, password });
    console.log("Login response status:", response.status);
    console.log("Login response cookies:", response.headers["set-cookie"]);
    if (response.status !== 200) {
      console.error(`Login failed for ${email}:`, response.status, response.body);
    }
    return agent;
  }

  it("returns 401 for unauthenticated requests", async () => {
    await request(app)
      .get(`/api/v1/finance/leases/${leaseId}/balance`)
      .expect(401);
  });

  it("allows authenticated user with property membership", async () => {
    const agent = await login(`usera-${run}@example.com`, "password123");
    await agent
      .get(`/api/v1/finance/leases/${leaseId}/balance`)
      .expect(200);
  });

  it("returns 403 for authenticated user without property membership", async () => {
    const agent = await login(`userb-${run}@example.com`, "password123");
    await agent
      .get(`/api/v1/finance/leases/${leaseId}/balance`)
      .expect(403);
  });

  it("allows tenant to read their own lease balance", async () => {
    const agent = await login(`tenant-${run}@example.com`, "password123");
    await agent
      .get(`/api/v1/finance/leases/${leaseId}/balance`)
      .expect(200);
  });

  it("returns 403 for tenant accessing another property's data", async () => {
    const agent = await login(`tenant-${run}@example.com`, "password123");
    await agent
      .get(`/api/v1/finance/properties/${propertyBId}/reconciliation?startDate=2026-01-01&endDate=2026-12-31`)
      .expect(403);
  });

  it("returns 403 for tenant trying manager-only mutation", async () => {
    const agent = await login(`tenant-${run}@example.com`, "password123");
    await agent
      .post("/api/v1/finance/payments")
      .send({
        leaseId,
        propertyId: propertyAId,
        amount: 1000,
        method: "CASH",
        reference: `TEST-${run}`,
      })
      .expect(403);
  });

  it("allows PLATFORM_ADMIN to access any property", async () => {
    const { passwordHash, passwordSalt } = await hashPassword("password123");
    const admin = await prisma.user.create({
      data: { email: `admin-${run}@example.com`, passwordHash, passwordSalt, role: "PLATFORM_ADMIN", active: true },
    });
    resetLoginRateLimit();
    const agent = await login(`admin-${run}@example.com`, "password123");
    await agent
      .get(`/api/v1/finance/properties/${propertyBId}/reconciliation?startDate=2026-01-01&endDate=2026-12-31`)
      .expect(200);
    await prisma.user.delete({ where: { id: admin.id } });
  });

  it("dev bypass works when AUTH_DEV_BYPASS=true and NODE_ENV!==production", async () => {
    await request(app)
      .get(`/api/v1/finance/leases/${leaseId}/balance`)
      .set("x-property-id", propertyAId)
      .expect(200);
  });
});