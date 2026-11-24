import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { NotFoundException } from "./finance.service.js";

export interface PropertyReconciliation {
  totalRentDue: string;
  totalCollected: string;
  totalMaintenanceExpenses: string;
  estimatedNOI: string;
}

/**
 * Aggregate a property's financial activity over `[startDate, endDate)`.
 *
 * - totalRentDue: SUM(RENT ledger entries) by effectiveDate. Payments never
 *   write RENT rows (Milestone 010), so this is not inflated by cash receipts.
 * - totalCollected: SUM(COMPLETED payments) by receivedAt.
 * - totalMaintenanceExpenses: SUM(maintenance actualCost) by resolvedAt.
 * - estimatedNOI: totalCollected - totalMaintenanceExpenses.
 *
 * Pure/read-only. Money is returned as exact decimal strings.
 */
export async function getPropertyReconciliation(
  propertyId: string,
  startDate: Date,
  endDate: Date,
): Promise<PropertyReconciliation> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true },
  });

  if (!property) {
    throw new NotFoundException(`Property ${propertyId} not found`);
  }

  const [rent, payments, maintenance] = await Promise.all([
    prisma.ledgerEntry.aggregate({
      where: {
        propertyId,
        type: "RENT",
        effectiveDate: { gte: startDate, lt: endDate },
      },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        propertyId,
        status: "COMPLETED",
        receivedAt: { gte: startDate, lt: endDate },
      },
      _sum: { amount: true },
    }),
    prisma.maintenanceTicket.aggregate({
      where: {
        propertyId,
        resolvedAt: { gte: startDate, lt: endDate },
      },
      _sum: { actualCost: true },
    }),
  ]);

  const totalRentDue = rent._sum.amount ?? new Prisma.Decimal(0);
  const totalCollected = payments._sum.amount ?? new Prisma.Decimal(0);
  const totalMaintenanceExpenses =
    maintenance._sum.actualCost ?? new Prisma.Decimal(0);
  const estimatedNOI = totalCollected.minus(totalMaintenanceExpenses);

  return {
    totalRentDue: totalRentDue.toString(),
    totalCollected: totalCollected.toString(),
    totalMaintenanceExpenses: totalMaintenanceExpenses.toString(),
    estimatedNOI: estimatedNOI.toString(),
  };
}