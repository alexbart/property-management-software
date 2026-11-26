import { vi, describe, it, expect, beforeEach, beforeAll } from "vitest";
import { eventEmitter } from "../services/event-emitter.service.js";
import { createNotification, shouldSendNotification, getOrCreatePreferences, updatePreference } from "../services/notification.service.js";
import { prisma } from "../../../database/prisma.js";

vi.mock("../../../database/prisma.js", () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    notificationPreference: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn(),
    },
    property: { findUnique: vi.fn() },
    tenant: { findUnique: vi.fn() },
    lease: { findUnique: vi.fn() },
    maintenanceTicket: { findUnique: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedPrisma = vi.mocked(prisma) as any;

describe("Notification Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default stub so getOrCreatePreferences create() calls resolve a row.
    mockedPrisma.notificationPreference.create.mockImplementation(
      ({ data }: { data: { userId: string; type: string; channel: string; enabled: boolean } }) =>
        Promise.resolve({ ...data, id: "pref_1" }),
    );
  });

  describe("createNotification", () => {
    it("creates notification when preference allows", async () => {
      mockedPrisma.notificationPreference.findUnique.mockResolvedValue({
        userId: "user_1",
        type: "PAYMENT_RECEIVED",
        channel: "IN_APP",
        enabled: true,
      });
      mockedPrisma.notification.create.mockResolvedValue({
        id: "notif_1",
        userId: "user_1",
        type: "PAYMENT_RECEIVED",
        channel: "IN_APP",
        title: "Test",
        message: "Test message",
        isRead: false,
      });

      const result = await createNotification({
        userId: "user_1",
        type: "PAYMENT_RECEIVED",
        title: "Test",
        message: "Test message",
      });

      expect(result).toEqual({ id: "notif_1" });
      expect(mockedPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user_1",
            type: "PAYMENT_RECEIVED",
            channel: "IN_APP",
            title: "Test",
            message: "Test message",
          }),
        }),
      );
    });

    it("does not create notification when preference disallows channel", async () => {
      mockedPrisma.notificationPreference.findUnique.mockResolvedValue({
        userId: "user_1",
        type: "PAYMENT_RECEIVED",
        channel: "IN_APP",
        enabled: false,
      });

      const result = await createNotification({
        userId: "user_1",
        type: "PAYMENT_RECEIVED",
        channel: "IN_APP",
        title: "Test",
        message: "Test message",
      });

      expect(result).toBeNull();
      expect(mockedPrisma.notification.create).not.toHaveBeenCalled();
    });

    it("creates notification when no preference exists (defaults to enabled)", async () => {
      mockedPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockedPrisma.notification.create.mockResolvedValue({
        id: "notif_1",
        userId: "user_1",
        type: "PAYMENT_RECEIVED",
        channel: "IN_APP",
        title: "Test",
        message: "Test message",
        isRead: false,
      });

      const result = await createNotification({
        userId: "user_1",
        type: "PAYMENT_RECEIVED",
        title: "Test",
        message: "Test message",
      });

      expect(result).toEqual({ id: "notif_1" });
      expect(mockedPrisma.notification.create).toHaveBeenCalled();
    });
  });

  describe("shouldSendNotification", () => {
    it("returns true when preference exists and enabled", async () => {
      mockedPrisma.notificationPreference.findUnique.mockResolvedValue({
        userId: "user_1",
        type: "PAYMENT_RECEIVED",
        channel: "IN_APP",
        enabled: true,
      });

      const result = await shouldSendNotification("user_1", "PAYMENT_RECEIVED", "IN_APP");

      expect(result).toBe(true);
    });

    it("returns false when preference exists but disabled", async () => {
      mockedPrisma.notificationPreference.findUnique.mockResolvedValue({
        userId: "user_1",
        type: "PAYMENT_RECEIVED",
        channel: "IN_APP",
        enabled: false,
      });

      const result = await shouldSendNotification("user_1", "PAYMENT_RECEIVED", "IN_APP");

      expect(result).toBe(false);
    });

    it("returns true when no preference exists (default enabled)", async () => {
      mockedPrisma.notificationPreference.findUnique.mockResolvedValue(null);

      const result = await shouldSendNotification("user_1", "PAYMENT_RECEIVED", "IN_APP");

      expect(result).toBe(true);
    });
  });

  describe("getOrCreatePreferences", () => {
    it("returns existing preferences when found", async () => {
      mockedPrisma.notificationPreference.findMany.mockResolvedValue([
        { userId: "user_1", type: "PAYMENT_RECEIVED", channel: "IN_APP", enabled: true },
        { userId: "user_1", type: "PAYMENT_OVERDUE", channel: "EMAIL", enabled: false },
      ]);

      const result = await getOrCreatePreferences("user_1");

      // Returns all type×channel combinations (existing + newly created defaults).
      expect(result).toHaveLength(18);
      expect(mockedPrisma.notificationPreference.findMany).toHaveBeenCalledWith({
        where: { userId: "user_1" },
      });
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "PAYMENT_RECEIVED", channel: "IN_APP", enabled: true }),
          expect.objectContaining({ type: "PAYMENT_OVERDUE", channel: "EMAIL", enabled: false }),
        ]),
      );
    });

    it("creates default preferences when none exist", async () => {
      mockedPrisma.notificationPreference.findMany.mockResolvedValue([]);
      mockedPrisma.notificationPreference.create.mockImplementation(({ data }: { data: { userId: string; type: string; channel: string; enabled: boolean } }) =>
        Promise.resolve({ ...data, id: "pref_1" }),
      );

      const result = await getOrCreatePreferences("user_1");

      expect(result.length).toBeGreaterThan(0);
      expect(mockedPrisma.notificationPreference.create).toHaveBeenCalled();
    });
  });

  describe("updatePreference", () => {
    it("upserts preference", async () => {
      mockedPrisma.notificationPreference.upsert.mockResolvedValue({
        id: "pref_1",
        userId: "user_1",
        type: "PAYMENT_RECEIVED",
        channel: "IN_APP",
        enabled: false,
      });

      await updatePreference({
        userId: "user_1",
        type: "PAYMENT_RECEIVED",
        channel: "IN_APP",
        enabled: false,
      });

      expect(mockedPrisma.notificationPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_type_channel: { userId: "user_1", type: "PAYMENT_RECEIVED", channel: "IN_APP" } },
          update: { enabled: false },
        }),
      );
    });
  });
});

describe("Notification Handlers", () => {
  beforeAll(async () => {
    // Register handlers once; the module is cached so listeners persist.
    await import("../handlers/notification-handlers.js");
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: notification preference lookup returns null (defaults enabled),
    // and notification.create resolves a stub row.
    mockedPrisma.notificationPreference.findUnique.mockResolvedValue(null);
    mockedPrisma.notification.create.mockResolvedValue({ id: "notif_1" });
  });

  it("emits PaymentReceivedEvent and creates notifications", async () => {
    mockedPrisma.property.findUnique.mockResolvedValue({ landlordId: "landlord_1" });
    mockedPrisma.tenant.findUnique.mockResolvedValue({ id: "tenant_1" });
    mockedPrisma.lease.findUnique.mockResolvedValue({
      tenantId: "tenant_1",
      unit: { unitNumber: "A-101" },
    });

    eventEmitter.emitEvent({
      type: "PaymentReceivedEvent",
      leaseId: "lease_1",
      propertyId: "prop_1",
      amount: "15000",
      method: "MPESA",
      reference: "ref_1",
      receivedAt: new Date(),
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockedPrisma.notification.create).toHaveBeenCalledTimes(2); // tenant + landlord (no manager)
  });

  it("emits PaymentOverdueEvent and creates tenant notification", async () => {
    mockedPrisma.tenant.findUnique.mockResolvedValue({ id: "tenant_1" });

    eventEmitter.emitEvent({
      type: "PaymentOverdueEvent",
      leaseId: "lease_1",
      propertyId: "prop_1",
      tenantId: "tenant_1",
      amount: "15000",
      daysOverdue: 5,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockedPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "tenant_1",
          type: "PAYMENT_OVERDUE",
          title: "Payment Overdue",
        }),
      }),
    );
  });

  it("emits MaintenanceCreatedEvent and notifies landlords", async () => {
    mockedPrisma.property.findUnique.mockResolvedValue({ landlordId: "landlord_1" });

    eventEmitter.emitEvent({
      type: "MaintenanceCreatedEvent",
      ticketId: "ticket_1",
      propertyId: "prop_1",
      unitId: "unit_1",
      title: "Leaking pipe",
      priority: "HIGH",
      initiatedBy: "TENANT",
      initiatorId: "tenant_1",
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockedPrisma.notification.create).toHaveBeenCalledTimes(1); // landlord only (no manager)
  });

  it("emits MaintenanceUpdatedEvent and notifies tenant", async () => {
    mockedPrisma.maintenanceTicket.findUnique.mockResolvedValue({
      initiatorId: "tenant_1",
      initiatedBy: "TENANT",
      unit: { unitNumber: "A-101" },
    });

    eventEmitter.emitEvent({
      type: "MaintenanceUpdatedEvent",
      ticketId: "ticket_1",
      propertyId: "prop_1",
      oldStatus: "OPEN",
      newStatus: "IN_PROGRESS",
      resolutionNotes: "Started work",
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockedPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "tenant_1",
          type: "MAINTENANCE_UPDATED",
        }),
      }),
    );
  });

  it("emits LeaseExpiringSoonEvent and notifies tenant and landlord", async () => {
    mockedPrisma.tenant.findUnique.mockResolvedValue({ id: "tenant_1" });
    mockedPrisma.property.findUnique.mockResolvedValue({ landlordId: "landlord_1" });

    eventEmitter.emitEvent({
      type: "LeaseExpiringSoonEvent",
      leaseId: "lease_1",
      propertyId: "prop_1",
      tenantId: "tenant_1",
      daysUntilExpiry: 30,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockedPrisma.notification.create).toHaveBeenCalledTimes(2); // tenant + landlord
  });

  it("emits NoticeReceivedEvent and notifies landlords", async () => {
    mockedPrisma.property.findUnique.mockResolvedValue({ landlordId: "landlord_1" });
    mockedPrisma.lease.findUnique.mockResolvedValue({
      unit: { unitNumber: "A-101" },
    });

    eventEmitter.emitEvent({
      type: "NoticeReceivedEvent",
      noticeId: "notice_1",
      leaseId: "lease_1",
      propertyId: "prop_1",
      tenantId: "tenant_1",
      intendedMoveOutDate: new Date("2026-12-31"),
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockedPrisma.notification.create).toHaveBeenCalledTimes(1); // landlord only
  });

  it("does NOT create notification when preference disallows", async () => {
    mockedPrisma.notificationPreference.findUnique.mockResolvedValue({
      userId: "user_1",
      type: "PAYMENT_RECEIVED",
      channel: "IN_APP",
      enabled: false,
    });
    mockedPrisma.property.findUnique.mockResolvedValue({ landlordId: "landlord_1" });
    mockedPrisma.tenant.findUnique.mockResolvedValue({ id: "tenant_1" });
    mockedPrisma.lease.findUnique.mockResolvedValue({
      tenantId: "tenant_1",
      unit: { unitNumber: "A-101" },
    });

    eventEmitter.emitEvent({
      type: "PaymentReceivedEvent",
      leaseId: "lease_1",
      propertyId: "prop_1",
      amount: "15000",
      method: "MPESA",
      reference: "ref_1",
      receivedAt: new Date(),
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Preference disabled → no notifications created
    expect(mockedPrisma.notification.create).not.toHaveBeenCalled();
  });
});