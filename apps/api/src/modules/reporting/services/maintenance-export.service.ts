import { stringify } from "csv-stringify/sync";
import { prisma } from "../../../database/prisma.js";

export interface MaintenanceExport {
  filename: string;
  content: string;
  mimeType: string;
}

interface MaintenanceRecord {
  "Ticket ID": string;
  Title: string;
  Status: string;
  Priority: string;
  "Unit Number": string;
  "Estimated Cost": string;
  "Actual Cost": string;
  "Created At": string;
}

function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setUTCHours(23, 59, 59, 999);
  return copy;
}

/**
 * Generate a CSV maintenance summary for a property within a date range.
 *
 * The range is inclusive of both `startDate` and `endDate` (UTC). Actual and
 * estimated costs are included for landlord expense tracking.
 */
export async function generateMaintenanceCsv(
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<MaintenanceExport> {
  const from = new Date(`${startDate}T00:00:00.000Z`);
  const to = endOfDay(new Date(`${endDate}T00:00:00.000Z`));

  const tickets = await prisma.maintenanceTicket.findMany({
    where: {
      propertyId,
      createdAt: { gte: from, lte: to },
    },
    include: { unit: true },
    orderBy: { createdAt: "asc" },
  });

  const records: MaintenanceRecord[] = tickets.map((ticket) => ({
    "Ticket ID": ticket.id,
    Title: ticket.title,
    Status: ticket.status,
    Priority: ticket.priority,
    "Unit Number": ticket.unit.unitNumber,
    "Estimated Cost": ticket.estimatedCost ? ticket.estimatedCost.toFixed(2) : "",
    "Actual Cost": ticket.actualCost ? ticket.actualCost.toFixed(2) : "",
    "Created At": ticket.createdAt.toISOString(),
  }));

  const content = stringify(records, { header: true });

  return {
    filename: `maintenance-${propertyId}-${startDate}-to-${endDate}.csv`,
    content,
    mimeType: "text/csv",
  };
}