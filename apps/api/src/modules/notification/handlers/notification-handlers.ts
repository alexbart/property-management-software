import { eventEmitter } from "../services/event-emitter.service.js";
import { createNotification } from "../services/notification.service.js";
import { prisma } from "../../../database/prisma.js";
import type { PaymentReceivedEvent, PaymentOverdueEvent, MaintenanceCreatedEvent, MaintenanceUpdatedEvent, LeaseExpiringSoonEvent, NoticeReceivedEvent } from "../services/event-emitter.service.js";

async function getLandlordUserIds(propertyId: string): Promise<string[]> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { landlordId: true },
  });

  if (!property) return [];

  return [property.landlordId];
}

async function getManagerUserIds(): Promise<string[]> {
  // PropertyMembership model doesn't exist yet; returning empty array
  // TODO: Implement when User/Role models are added (Milestone 011+)
  return [];
}

async function getTenantUserId(tenantId: string): Promise<string | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true },
  });

  return tenant?.id ?? null;
}

async function notifyLandlordsAndManagers(
  propertyId: string,
  notification: Omit<Parameters<typeof createNotification>[0], "userId">,
) {
  const [landlordIds, managerIds] = await Promise.all([
    getLandlordUserIds(propertyId),
    getManagerUserIds(),
  ]);

  const allUserIds = [...new Set([...landlordIds, ...managerIds])];

  for (const userId of allUserIds) {
    await createNotification({ ...notification, userId });
  }
}

eventEmitter.on("PaymentReceivedEvent", async (event: PaymentReceivedEvent) => {
  const { leaseId, propertyId, amount, method, reference } = event;

  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    select: { tenantId: true, unit: { select: { unitNumber: true } } },
  });

  if (!lease) return;

  const tenantUserId = await getTenantUserId(lease.tenantId);
  const unitNumber = lease.unit?.unitNumber ?? leaseId;

  // Notify tenant
  if (tenantUserId) {
    await createNotification({
      userId: tenantUserId,
      type: "PAYMENT_RECEIVED",
      title: "Payment Received",
      message: `Your payment of KES ${amount} for unit ${unitNumber} has been received (${method}). Reference: ${reference}`,
      data: { leaseId, propertyId, amount, method, reference },
    });
  }

  // Notify landlords and managers
  await notifyLandlordsAndManagers(propertyId, {
    type: "PAYMENT_RECEIVED",
    title: "Payment Received",
    message: `Payment of KES ${amount} received for unit ${unitNumber} (${method}). Reference: ${reference}`,
    data: { leaseId, propertyId, amount, method, reference },
  });
});

eventEmitter.on("PaymentOverdueEvent", async (event: PaymentOverdueEvent) => {
  const { leaseId, propertyId, tenantId, amount, daysOverdue } = event;

  const tenantUserId = await getTenantUserId(tenantId);

  if (tenantUserId) {
    await createNotification({
      userId: tenantUserId,
      type: "PAYMENT_OVERDUE",
      title: "Payment Overdue",
      message: `Your rent payment of KES ${amount} is ${daysOverdue} day(s) overdue. Please make payment to avoid penalties.`,
      data: { leaseId, propertyId, amount, daysOverdue },
    });
  }
});

eventEmitter.on("MaintenanceCreatedEvent", async (event: MaintenanceCreatedEvent) => {
  const { ticketId, propertyId, title, priority, initiatedBy, initiatorId } = event;

  // Notify landlords and managers
  await notifyLandlordsAndManagers(propertyId, {
    type: "MAINTENANCE_CREATED",
    title: "Maintenance Request Created",
    message: `New ${priority.toLowerCase()} priority maintenance request: ${title}`,
    data: { ticketId, propertyId, title, priority, initiatedBy, initiatorId },
  });
});

eventEmitter.on("MaintenanceUpdatedEvent", async (event: MaintenanceUpdatedEvent) => {
  const { ticketId, propertyId, oldStatus, newStatus, resolutionNotes } = event;

  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id: ticketId },
    select: { initiatorId: true, initiatedBy: true, unit: { select: { unitNumber: true } } },
  });

  if (!ticket) return;

  const unitNumber = ticket.unit?.unitNumber ?? ticketId;
  const statusText = newStatus.toLowerCase().replace("_", " ");

  // Notify the tenant who created the ticket (if initiated by tenant)
  if (ticket.initiatedBy === "TENANT") {
    const tenantUserId = await getTenantUserId(ticket.initiatorId);
    if (tenantUserId) {
      await createNotification({
        userId: tenantUserId,
        type: "MAINTENANCE_UPDATED",
        title: "Maintenance Request Updated",
        message: `Your maintenance request for unit ${unitNumber} has been updated: ${statusText}${resolutionNotes ? `. Notes: ${resolutionNotes}` : ""}`,
        data: { ticketId, propertyId, oldStatus, newStatus, resolutionNotes },
      });
    }
  }
});

eventEmitter.on("LeaseExpiringSoonEvent", async (event: LeaseExpiringSoonEvent) => {
  const { leaseId, propertyId, tenantId, daysUntilExpiry } = event;

  const tenantUserId = await getTenantUserId(tenantId);

  if (tenantUserId) {
    await createNotification({
      userId: tenantUserId,
      type: "LEASE_EXPIRING_SOON",
      title: "Lease Expiring Soon",
      message: `Your lease expires in ${daysUntilExpiry} days. Please contact your landlord or manager to discuss renewal.`,
      data: { leaseId, propertyId, daysUntilExpiry },
    });
  }

  // Also notify landlords and managers
  await notifyLandlordsAndManagers(propertyId, {
    type: "LEASE_EXPIRING_SOON",
    title: "Lease Expiring Soon",
    message: `Lease for tenant ${tenantId} expires in ${daysUntilExpiry} days.`,
    data: { leaseId, propertyId, tenantId, daysUntilExpiry },
  });
});

eventEmitter.on("NoticeReceivedEvent", async (event: NoticeReceivedEvent) => {
  const { noticeId, leaseId, propertyId, tenantId, intendedMoveOutDate } = event;

  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    select: { unit: { select: { unitNumber: true } } },
  });

  const unitNumber = lease?.unit?.unitNumber ?? leaseId;
  const moveOutDate = intendedMoveOutDate.toLocaleDateString();

  // Notify landlords and managers
  await notifyLandlordsAndManagers(propertyId, {
    type: "NOTICE_RECEIVED",
    title: "Vacation Notice Received",
    message: `Tenant has submitted a notice to vacate unit ${unitNumber} by ${moveOutDate}.`,
    data: { noticeId, leaseId, propertyId, tenantId, intendedMoveOutDate: intendedMoveOutDate.toISOString() },
  });
});