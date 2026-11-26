import { prisma } from "../../../database/prisma.js";
import { eventEmitter } from "./event-emitter.service.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function checkOverduePayments() {
  const now = new Date();

  const leasesWithArrears = await prisma.$queryRaw<
    Array<{
      leaseId: string;
      propertyId: string;
      tenantId: string;
      totalDue: number;
      totalPaid: number;
      currentBalance: number;
    }>
  >`
    SELECT 
      l.id as "leaseId",
      l."propertyId",
      l."tenantId",
      COALESCE(SUM(CASE WHEN le.type = 'RENT' THEN le.amount ELSE 0 END), 0) as "totalDue",
      COALESCE(SUM(CASE WHEN p.status = 'COMPLETED' THEN p.amount ELSE 0 END), 0) as "totalPaid",
      COALESCE(SUM(CASE WHEN le.type = 'RENT' THEN le.amount ELSE 0 END), 0) - 
      COALESCE(SUM(CASE WHEN p.status = 'COMPLETED' THEN p.amount ELSE 0 END), 0) as "currentBalance"
    FROM leases l
    LEFT JOIN ledger_entries le ON le."leaseId" = l.id AND le.type = 'RENT'
    LEFT JOIN payments p ON p."leaseId" = l.id AND p.status = 'COMPLETED'
    WHERE l.status = 'ACTIVE'
    GROUP BY l.id, l."propertyId", l."tenantId"
    HAVING COALESCE(SUM(CASE WHEN le.type = 'RENT' THEN le.amount ELSE 0 END), 0) - 
           COALESCE(SUM(CASE WHEN p.status = 'COMPLETED' THEN p.amount ELSE 0 END), 0) > 0
  `;

  for (const lease of leasesWithArrears) {
    if (lease.currentBalance <= 0) continue;

    // Check if there's a due date that has passed
    const leaseDetails = await prisma.lease.findUnique({
      where: { id: lease.leaseId },
      select: { startDate: true, rentAmount: true },
    });

    if (!leaseDetails) continue;

    // Calculate days overdue based on rent cycle
    const startDate = new Date(leaseDetails.startDate);
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / MS_PER_DAY);
    const expectedPayments = Math.floor(daysSinceStart / 30) + 1;
    const daysOverdue = Math.max(0, daysSinceStart - (expectedPayments - 1) * 30);

    if (daysOverdue > 0) {
      eventEmitter.emitEvent({
        type: "PaymentOverdueEvent",
        leaseId: lease.leaseId,
        propertyId: lease.propertyId,
        tenantId: lease.tenantId,
        amount: lease.currentBalance.toString(),
        daysOverdue,
      });
    }
  }
}

export async function checkExpiringLeases() {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * MS_PER_DAY);

  const expiringLeases = await prisma.lease.findMany({
    where: {
      status: "ACTIVE",
      endDate: {
        gte: now,
        lte: thirtyDaysFromNow,
      },
    },
    select: {
      id: true,
      propertyId: true,
      tenantId: true,
      endDate: true,
    },
  });

  for (const lease of expiringLeases) {
    const daysUntilExpiry = Math.ceil(
      (new Date(lease.endDate).getTime() - now.getTime()) / MS_PER_DAY,
    );

    if (daysUntilExpiry > 0 && daysUntilExpiry <= 30) {
      eventEmitter.emitEvent({
        type: "LeaseExpiringSoonEvent",
        leaseId: lease.id,
        propertyId: lease.propertyId,
        tenantId: lease.tenantId,
        daysUntilExpiry,
      });
    }
  }
}

export async function runNotificationChecks() {
  await Promise.all([checkOverduePayments(), checkExpiringLeases()]);
}