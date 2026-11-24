import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "./app.js";

describe("API foundation", () => {
  it("returns a healthy API status", async () => {
    const response = await request(app).get("/api/v1/health").expect(200);

    expect(response.body).toEqual({
      status: "ok",
      service: "property-management-api",
    });
  });
});
