import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Prisma, PrismaClient } from "@prisma/client";
import { app } from "../../../app.js";

const prisma = new PrismaClient();
const run = `m005-api-${Date.now()}`;

describe.skipIf(!process.env.DATABASE_URL)("maintenance API", () => {
  let landlordId!: string;
  let propertyAId!: string;
  let propertyBId!: string;
  let unitId!: string;
  let ticketId!: string;

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
    unitId = unit.id;
  });

  afterAll(async () => {
    if (propertyAId) {
      await prisma.maintenanceTicket.deleteMany({ where: { propertyId: propertyAId } });
      await prisma.unit.deleteMany({ where: { propertyId: propertyAId } });
      await prisma.building.deleteMany({ where: { propertyId: propertyAId } });
      await prisma.property.deleteMany({ where: { id: propertyAId } });
    }
    if (propertyBId) {
      await prisma.property.deleteMany({ where: { id: propertyBId } });
    }
    if (landlordId) {
      await prisma.landlord.deleteMany({ where: { id: landlordId } });
    }
    await prisma.$disconnect();
  });

  it("creates a ticket and transitions its status", async () => {
    const created = await request(app)
      .post("/api/v1/maintenance/tickets")
      .set("x-property-id", propertyAId)
      .send({
        propertyId: propertyAId,
        unitId,
        initiatedBy: "MANAGER",
        initiatorId: "user-1",
        title: "Leaking tap",
        description: "Kitchen tap leaks",
        priority: "HIGH",
        estimatedCost: "1500.00",
      })
      .expect(201);

    ticketId = created.body.data.id;
    expect(created.body.data.status).toBe("OPEN");

    await request(app)
      .patch(`/api/v1/maintenance/tickets/${ticketId}/status`)
      .set("x-property-id", propertyAId)
      .send({ status: "IN_PROGRESS" })
      .expect(200);

    const resolved = await request(app)
      .patch(`/api/v1/maintenance/tickets/${ticketId}/status`)
      .set("x-property-id", propertyAId)
      .send({ status: "RESOLVED", resolutionNotes: "Replaced the tap" })
      .expect(200);

    expect(resolved.body.data.status).toBe("RESOLVED");
    expect(resolved.body.data.resolvedAt).not.toBeNull();
  });

  it("returns 403 for a ticket outside the caller's property", async () => {
    await request(app)
      .get(`/api/v1/maintenance/tickets/${ticketId}`)
      .set("x-property-id", propertyBId)
      .expect(403);

    await request(app)
      .patch(`/api/v1/maintenance/tickets/${ticketId}/status`)
      .set("x-property-id", propertyBId)
      .send({ status: "IN_PROGRESS" })
      .expect(403);
  });

  it("returns 400 when resolving without resolution notes", async () => {
    await request(app)
      .patch(`/api/v1/maintenance/tickets/${ticketId}/status`)
      .set("x-property-id", propertyAId)
      .send({ status: "RESOLVED" })
      .expect(400);
  });
});