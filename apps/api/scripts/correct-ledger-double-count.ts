import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CORRECTION_DESCRIPTION =
  "Correction: reverse payment-generated RENT entry (Milestone 010 fix)";

async function main(): Promise<void> {
  const payments = await prisma.payment.findMany();
  let corrected = 0;
  let skipped = 0;

  for (const payment of payments) {
    const original = await prisma.ledgerEntry.findFirst({
      where: {
        leaseId: payment.leaseId,
        propertyId: payment.propertyId,
        type: "RENT",
        amount: payment.amount,
        effectiveDate: payment.receivedAt,
        description: { contains: "Payment" },
      },
    });

    if (!original) {
      continue;
    }

    const existing = await prisma.ledgerEntry.findFirst({
      where: {
        leaseId: payment.leaseId,
        propertyId: payment.propertyId,
        type: "ADJUSTMENT",
        amount: payment.amount.negated(),
        description: CORRECTION_DESCRIPTION,
      },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.ledgerEntry.create({
      data: {
        leaseId: payment.leaseId,
        propertyId: payment.propertyId,
        type: "ADJUSTMENT",
        amount: payment.amount.negated(),
        description: CORRECTION_DESCRIPTION,
        effectiveDate: new Date(),
      },
    });
    corrected += 1;
  }

  console.log(
    `Ledger correction complete: ${corrected} reversal(s) created, ${skipped} already present.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });