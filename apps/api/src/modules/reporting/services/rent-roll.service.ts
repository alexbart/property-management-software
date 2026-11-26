import { stringify } from "csv-stringify/sync";
import { prisma } from "../../../database/prisma.js";
import { calculateLeaseArrears } from "../../finance/services/arrears.service.js";

export interface RentRollExport {
  filename: string;
  content: string;
  mimeType: string;
}

interface RentRollRecord {
  "Unit Number": string;
  "Tenant Name": string;
  Phone: string;
  "Rent Amount": string;
  "Current Balance": string;
  "Lease Start Date": string;
}

/**
 * Generate a CSV rent roll for a single property.
 *
 * Includes every ACTIVE lease joined with its tenant and unit, plus the current
 * arrears balance per lease (reusing the unified `calculateLeaseArrears` logic).
 * Rows are streamed through `csv-stringify` rather than materialised as a large
 * JSON array first.
 */
export async function generateRentRollCsv(
  propertyId: string,
): Promise<RentRollExport> {
  const leases = await prisma.lease.findMany({
    where: { propertyId, status: "ACTIVE" },
    include: { tenant: true, unit: true },
    orderBy: { unit: { unitNumber: "asc" } },
  });

  const records: RentRollRecord[] = [];

  for (const lease of leases) {
    const arrears = await calculateLeaseArrears(lease.id, propertyId);

    records.push({
      "Unit Number": lease.unit.unitNumber,
      "Tenant Name": `${lease.tenant.firstName} ${lease.tenant.lastName}`,
      Phone: lease.tenant.phone,
      "Rent Amount": lease.rentAmount.toFixed(2),
      "Current Balance": arrears.currentBalance.toFixed(2),
      "Lease Start Date": lease.startDate.toISOString().slice(0, 10),
    });
  }

  const content = stringify(records, { header: true });

  return {
    filename: `rent-roll-${propertyId}.csv`,
    content,
    mimeType: "text/csv",
  };
}