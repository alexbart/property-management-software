import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { app } from "../../../app.js";

const prisma = new PrismaClient();

describe.skipIf(!process.env.DATABASE_URL)("notification API", () => {
  const userAId = randomUUID();
  const userBId = randomUUID();
  let notifA1Id!: string;
  let notifA2Id!: string;
  let notifB1Id!: string;

  beforeAll(async () => {
    const [a1, a2, aRead, b1] = await Promise.all([
      prisma.notification.create({
        data: {
          userId: userAId,
          type: "PAYMENT_RECEIVED",
          title: "Payment received",
          message: "Rent received",
        },
      }),
      prisma.notification.create({
        data: {
          userId: userAId,
          type: "MAINTENANCE_UPDATED",
          title: "Ticket updated",
          message: "Status changed",
        },
      }),
      prisma.notification.create({
        data: {
          userId: userAId,
          type: "LEASE_EXPIRING_SOON",
          title: "Lease expiring",
          message: "30 days left",
          isRead: true,
          readAt: new Date(),
        },
      }),
      prisma.notification.create({
        data: {
          userId: userBId,
          type: "PAYMENT_OVERDUE",
          title: "Overdue",
          message: "Rent overdue",
        },
      }),
    ]);

    notifA1Id = a1.id;
    notifA2Id = a2.id;
    notifB1Id = b1.id;
    void aRead;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    });
    await prisma.notificationPreference.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    });
    await prisma.$disconnect();
  });

  it("returns 401 without a user identity", async () => {
    await request(app).get("/api/v1/notifications").expect(401);
  });

  it("lists notifications for the authenticated user with unread count", async () => {
    const res = await request(app)
      .get("/api/v1/notifications")
      .set("x-user-id", userAId)
      .expect(200);

    expect(res.body.data.notifications).toHaveLength(3);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.unreadCount).toBe(2);
    expect(res.body.data.notifications[0]).toHaveProperty("status");
    expect(res.body.data.notifications[0]).toHaveProperty("metadata");
  });

  it("filters notifications by status", async () => {
    const res = await request(app)
      .get("/api/v1/notifications")
      .query({ status: "UNREAD" })
      .set("x-user-id", userAId)
      .expect(200);

    expect(res.body.data.notifications).toHaveLength(2);
    expect(
      res.body.data.notifications.every(
        (n: { status: string }) => n.status === "UNREAD",
      ),
    ).toBe(true);
  });

  it("marks a single notification as read", async () => {
    await request(app)
      .patch(`/api/v1/notifications/${notifA1Id}/read`)
      .set("x-user-id", userAId)
      .expect(200);

    const res = await request(app)
      .get("/api/v1/notifications")
      .set("x-user-id", userAId)
      .expect(200);
    expect(res.body.data.unreadCount).toBe(1);
  });

  it("returns 403 when marking another user's notification as read", async () => {
    await request(app)
      .patch(`/api/v1/notifications/${notifB1Id}/read`)
      .set("x-user-id", userAId)
      .expect(403);
  });

  it("marks all notifications as read", async () => {
    await request(app)
      .post("/api/v1/notifications/mark-all-read")
      .set("x-user-id", userAId)
      .expect(200);

    const res = await request(app)
      .get("/api/v1/notifications")
      .set("x-user-id", userAId)
      .expect(200);
    expect(res.body.data.unreadCount).toBe(0);
  });

  it("returns preferences for the authenticated user", async () => {
    await prisma.notificationPreference.create({
      data: {
        userId: userAId,
        type: "PAYMENT_RECEIVED",
        channel: "IN_APP",
        enabled: true,
      },
    });

    const res = await request(app)
      .get("/api/v1/notifications/preferences")
      .set("x-user-id", userAId)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      type: "PAYMENT_RECEIVED",
      channel: "IN_APP",
      enabled: true,
    });
  });

  it("updates a preference via upsert", async () => {
    const res = await request(app)
      .put("/api/v1/notifications/preferences")
      .set("x-user-id", userAId)
      .send({ type: "PAYMENT_OVERDUE", channel: "EMAIL", enabled: false })
      .expect(200);

    expect(res.body.data).toMatchObject({
      type: "PAYMENT_OVERDUE",
      channel: "EMAIL",
      enabled: false,
    });

    const second = await request(app)
      .put("/api/v1/notifications/preferences")
      .set("x-user-id", userAId)
      .send({ type: "PAYMENT_OVERDUE", channel: "EMAIL", enabled: true })
      .expect(200);
    expect(second.body.data.enabled).toBe(true);
    expect(second.body.data.id).toBe(res.body.data.id);
  });

  it("rejects invalid preference payloads", async () => {
    await request(app)
      .put("/api/v1/notifications/preferences")
      .set("x-user-id", userAId)
      .send({ type: "NOT_A_TYPE", channel: "IN_APP", enabled: true })
      .expect(400);
  });

  it("rejects invalid notification id params", async () => {
    await request(app)
      .patch("/api/v1/notifications/not-a-uuid/read")
      .set("x-user-id", userAId)
      .expect(400);
  });

  void notifA2Id;
});