import "dotenv/config";
import express from "express";
import { afterAll, beforeAll, describe, it } from "vitest";
import request from "supertest";
import { PrismaClient, Prisma } from "@prisma/client";
import { sessionMiddleware } from "../config/session.js";
import { devBypass } from "./dev-bypass.js";
import { requireAuth } from "./require-auth.js";
import { requirePropertyScope } from "./require-property-scope.js";
import { requireRole } from "./require-role.js";
import { requireTenantScope } from "./require-tenant-scope.js";
import { hashPassword } from "../modules/auth/services/auth.service.js";
import { resetLoginRateLimit } from "../modules/auth/controllers/auth.controller.js";
import { authRouter } from "../modules/auth/auth-routes.js";

const prisma = new PrismaClient();
const run = `auth-middleware-${Date.now()}`;

// Minimal app that wires the real session + scope middleware so they can be
// exercised with real cookie sessions, independent of the business routers.
const testApp = express();
testApp.use(sessionMiddleware);
testApp.use(devBypass);
testApp.use(express.json());
testApp.use("/api/v1/auth", authRouter);
testApp.get(
  "/scoped",
  requireAuth,
  requirePropertyScope,
  (_req, res) => {
    res.status(200).json({ propertyId: res.locals.propertyId });
  },
);
testApp.post(
  "/manager",
  requireAuth,
  requirePropertyScope,
  requireRole(["LANDLORD", "MANAGER"]),
  (_req, res) => {
    res.status(200).json({ ok: true });
  },
);
testApp.get(
  "/tenant",
  requireAuth,
  requireTenantScope,
  (_req, res) => {
    res.status(200).json({ tenantId: res.locals.tenantId });
  },
);

describe("Auth middleware", () => {
  let propertyAId: string;
  let propertyBId: string;
  let tenantId: string;
  let userAId: string;
  let userBId: string;
  let tenantUserId: string;

  beforeAll(async () => {
    const landlord = await prisma.landlord.create({
      data: { kind: "INDIVIDUAL", name: `LL-${run}` },
    });

    const propertyA = await prisma.property.create({
      data: {
        reference: `A-${run}`,
        name: `PropA-${run}`,
        propertyType: "APARTMENT",
        county: "Nairobi",
        landlordId: landlord.id,
      },
    });
    propertyAId = propertyA.id;

    const propertyB = await prisma.property.create({
      data: {
        reference: `B-${run}`,
        name: `PropB-${run}`,
        propertyType: "STANDALONE_HOUSE",
        county: "Kiambu",
        landlordId: landlord.id,
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

    await prisma.lease.create({
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

    const { passwordHash: hashA, passwordSalt: saltA } =
      await hashPassword("password123");
    const userA = await prisma.user.create({
      data: {
        email: `usera-${run}@example.com`,
        passwordHash: hashA,
        passwordSalt: saltA,
        role: "MANAGER",
        active: true,
      },
    });
    userAId = userA.id;
    await prisma.propertyMembership.create({
      data: { userId: userAId, propertyId: propertyAId, role: "MANAGER" },
    });

    const { passwordHash: hashB, passwordSalt: saltB } =
      await hashPassword("password123");
    const userB = await prisma.user.create({
      data: {
        email: `userb-${run}@example.com`,
        passwordHash: hashB,
        passwordSalt: saltB,
        role: "MANAGER",
        active: true,
      },
    });
    userBId = userB.id;
    await prisma.propertyMembership.create({
      data: { userId: userBId, propertyId: propertyBId, role: "MANAGER" },
    });

    const { passwordHash: hashT, passwordSalt: saltT } =
      await hashPassword("password123");
    const tenantUser = await prisma.user.create({
      data: {
        email: `tenant-${run}@example.com`,
        passwordHash: hashT,
        passwordSalt: saltT,
        role: "TENANT",
        active: true,
      },
    });
    tenantUserId = tenantUser.id;
    await prisma.tenantLink.create({
      data: { userId: tenantUserId, tenantId },
    });

    resetLoginRateLimit();
  });

  afterAll(async () => {
    await prisma.propertyMembership.deleteMany({
      where: { userId: { in: [userAId, userBId, tenantUserId] } },
    });
    await prisma.tenantLink.deleteMany({ where: { userId: tenantUserId } });
    await prisma.user.deleteMany({
      where: { email: { in: [`usera-${run}@example.com`, `userb-${run}@example.com`, `tenant-${run}@example.com`, `admin-${run}@example.com`] } },
    });
    await prisma.lease.deleteMany({ where: { propertyId: propertyAId } });
    await prisma.unit.deleteMany({ where: { propertyId: propertyAId } });
    await prisma.building.deleteMany({ where: { propertyId: propertyAId } });
    await prisma.property.deleteMany({
      where: { id: { in: [propertyAId, propertyBId] } },
    });
    await prisma.tenant.deleteMany({ where: { idNumber: `ID-${run}` } });
    await prisma.landlord.deleteMany({ where: { name: `LL-${run}` } });
    await prisma.$disconnect();
  });

  async function login(email: string, password: string) {
    const agent = request.agent(testApp);
    const response = await agent
      .post("/api/v1/auth/login")
      .send({ email, password });
    if (response.status !== 200) {
      throw new Error(`Login failed for ${email}: ${response.status}`);
    }
    return agent;
  }

  it("returns 401 for unauthenticated requests", async () => {
    await request(testApp).get("/scoped").query({ propertyId: propertyAId }).expect(401);
  });

  it("allows authenticated user with property membership", async () => {
    const agent = await login(`usera-${run}@example.com`, "password123");
    await agent.get("/scoped").query({ propertyId: propertyAId }).expect(200);
  });

  it("returns 403 for authenticated user without property membership", async () => {
    const agent = await login(`userb-${run}@example.com`, "password123");
    await agent.get("/scoped").query({ propertyId: propertyAId }).expect(403);
  });

  it("allows tenant to access their own property", async () => {
    const agent = await login(`tenant-${run}@example.com`, "password123");
    await agent.get("/scoped").query({ propertyId: propertyAId }).expect(200);
  });

  it("returns 403 for tenant accessing another property's data", async () => {
    const agent = await login(`tenant-${run}@example.com`, "password123");
    await agent.get("/scoped").query({ propertyId: propertyBId }).expect(403);
  });

  it("returns 403 for tenant trying manager-only mutation", async () => {
    const agent = await login(`tenant-${run}@example.com`, "password123");
    await agent
      .post("/manager")
      .query({ propertyId: propertyAId })
      .send({})
      .expect(403);
  });

  it("allows PLATFORM_ADMIN to access any property", async () => {
    const { passwordHash, passwordSalt } = await hashPassword("password123");
    await prisma.user.create({
      data: {
        email: `admin-${run}@example.com`,
        passwordHash,
        passwordSalt,
        role: "PLATFORM_ADMIN",
        active: true,
      },
    });
    resetLoginRateLimit();
    const agent = await login(`admin-${run}@example.com`, "password123");
    await agent.get("/scoped").query({ propertyId: propertyBId }).expect(200);
  });

  it("dev bypass works when AUTH_DEV_BYPASS=true and NODE_ENV!==production", async () => {
    await request(testApp)
      .get("/scoped")
      .set("x-user-id", "dev-user")
      .set("x-property-id", propertyAId)
      .expect(200);
  });
});