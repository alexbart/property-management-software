import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { app } from "../../app.js";
import { resetLoginRateLimit } from "../auth/controllers/auth.controller.js";
import { withAuthenticatedAgent } from "../../tests/auth-helper.js";

const prisma = new PrismaClient();
const run = `inv-mut-${Date.now()}`;
const amenityKey = `key_${run}`;
const policyKey = `pol_${run}`;

beforeAll(() => {
  resetLoginRateLimit();
});

afterAll(async () => {
  await prisma.amenity.deleteMany({ where: { key: { startsWith: `key_${run}` } } });
  await prisma.policyDefinition.deleteMany({
    where: { key: { startsWith: `pol_${run}` } },
  });
  await prisma.user.deleteMany({ where: { email: `tenant-${run}@example.com` } });
  await prisma.$disconnect();
});

describe("inventory catalogue mutations", () => {
  it("rejects unauthenticated mutations with 401", async () => {
    await request(app)
      .post("/api/v1/inventory/amenities")
      .send({ key: amenityKey, name: "Wi-Fi", category: "AMENITY" })
      .expect(401);
  });

  it("allows a platform admin (dev bypass) to create an amenity", async () => {
    const res = await request(app)
      .post("/api/v1/inventory/amenities")
      .set("x-user-id", "admin-dev")
      .send({ key: amenityKey, name: "Wi-Fi", category: "AMENITY" })
      .expect(201);
    expect(res.body.data.key).toBe(amenityKey);

    const list = await request(app).get("/api/v1/inventory/amenities").expect(200);
    expect(list.body.data.some((a: { key: string }) => a.key === amenityKey)).toBe(
      true,
    );
  });

  it("returns 409 on duplicate amenity key", async () => {
    await request(app)
      .post("/api/v1/inventory/amenities")
      .set("x-user-id", "admin-dev")
      .send({ key: amenityKey, name: "Wi-Fi 2", category: "AMENITY" })
      .expect(409);
  });

  it("updates and deactivates an amenity", async () => {
    const created = await request(app)
      .post("/api/v1/inventory/amenities")
      .set("x-user-id", "admin-dev")
      .send({ key: `${amenityKey}_u`, name: "Pool", category: "AMENITY" })
      .expect(201);
    const id = created.body.data.id as string;

    const updated = await request(app)
      .patch(`/api/v1/inventory/amenities/${id}`)
      .set("x-user-id", "admin-dev")
      .send({ name: "Swimming Pool" })
      .expect(200);
    expect(updated.body.data.name).toBe("Swimming Pool");

    await request(app)
      .delete(`/api/v1/inventory/amenities/${id}`)
      .set("x-user-id", "admin-dev")
      .expect(204);

    const list = await request(app).get("/api/v1/inventory/amenities").expect(200);
    expect(list.body.data.some((a: { id: string }) => a.id === id)).toBe(false);
  });

  it("rejects an ENUM policy without enumValues", async () => {
    await request(app)
      .post("/api/v1/inventory/policies")
      .set("x-user-id", "admin-dev")
      .send({ key: policyKey, name: "Pets", valueType: "ENUM" })
      .expect(400);
  });

  it("creates a policy definition", async () => {
    const res = await request(app)
      .post("/api/v1/inventory/policies")
      .set("x-user-id", "admin-dev")
      .send({
        key: policyKey,
        name: "Pet policy",
        valueType: "ENUM",
        enumValues: ["ALLOWED", "NOT_ALLOWED"],
      })
      .expect(201);
    expect(res.body.data.enumValues).toEqual(["ALLOWED", "NOT_ALLOWED"]);
  });

  it("forbids a tenant from mutating the catalogue", async () => {
    resetLoginRateLimit();
    const { agent } = await withAuthenticatedAgent(
      `tenant-${run}@example.com`,
      "password12345",
      "TENANT",
    );
    await agent
      .post("/api/v1/inventory/amenities")
      .send({ key: `${amenityKey}_t`, name: "Nope", category: "AMENITY" })
      .expect(403);
  });
});