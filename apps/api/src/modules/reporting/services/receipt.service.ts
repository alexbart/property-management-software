import { createRequire } from "node:module";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import {
  ConflictException,
  NotFoundException,
} from "../../finance/services/finance.service.js";

const require = createRequire(import.meta.url);

export interface ReceiptExport {
  filename: string;
  buffer: Buffer;
  mimeType: string;
}

interface PdfKitDocumentLike {
  on(event: "data", listener: (chunk: Buffer) => void): void;
  on(event: "end", listener: () => void): void;
  on(event: "error", listener: (error: unknown) => void): void;
  end(): void;
}

interface PdfPrinterLike {
  createPdfKitDocument(documentDefinitions: unknown): PdfKitDocumentLike;
}

type PdfPrinterCtor = new (fonts: Record<string, unknown>) => PdfPrinterLike;

const PLATFORM_NAME = "Property Management Platform";

function resolveRobotoFonts(): Record<string, unknown> {
  // pdfmake's Node entry is js/index.js; the bundled Roboto fonts live under
  // <pkg>/build/fonts/Roboto. Resolve the package root from its main module.
  const mainPath = require.resolve("pdfmake") as string;
  const packageRoot = path.resolve(path.dirname(mainPath), "..");
  const fontDir = path.join(packageRoot, "build", "fonts", "Roboto");

  return {
    Roboto: {
      normal: path.join(fontDir, "Roboto-Regular.ttf"),
      bold: path.join(fontDir, "Roboto-Medium.ttf"),
      italics: path.join(fontDir, "Roboto-Italic.ttf"),
      bolditalics: path.join(fontDir, "Roboto-MediumItalic.ttf"),
    },
  };
}

async function renderPdf(documentDefinitions: unknown): Promise<Buffer> {
  const mod = (await import("pdfmake")) as unknown as {
    default?: PdfPrinterCtor;
  } & Record<string, unknown>;

  const Ctor = (mod.default ??
    (mod as unknown as PdfPrinterCtor)) as PdfPrinterCtor;
  const printer = new Ctor(resolveRobotoFonts());
  const doc = printer.createPdfKitDocument(documentDefinitions);

  const chunks: Buffer[] = [];
  const buffer = await new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (error: unknown) => reject(error));
    doc.end();
  });

  return buffer;
}

function formatKes(amount: Prisma.Decimal): string {
  return `KES ${amount.toFixed(2)}`;
}

/**
 * Generate a PDF receipt for a single COMPLETED payment.
 *
 * The payment must belong to `propertyId`; otherwise a NotFoundException is
 * thrown (mapped to 403/404 by the controller). A payment that is not
 * COMPLETED yields a ConflictException.
 */
export async function generatePaymentReceiptPdf(
  paymentId: string,
  propertyId: string,
): Promise<ReceiptExport> {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, propertyId },
    include: {
      lease: { include: { tenant: true, unit: true } },
    },
  });

  if (!payment) {
    throw new NotFoundException(
      `Payment ${paymentId} not found for property ${propertyId}`,
    );
  }

  if (payment.status !== "COMPLETED") {
    throw new ConflictException(
      `Payment ${paymentId} is not completed; a receipt cannot be issued`,
    );
  }

  const { lease } = payment;
  const tenantName = `${lease.tenant.firstName} ${lease.tenant.lastName}`;

  const documentDefinitions = {
    content: [
      { text: PLATFORM_NAME, style: "header" },
      { text: "Payment Receipt", style: "subheader" },
      { text: `Receipt Number: ${payment.id}`, margin: [0, 10, 0, 0] },
      { text: `Date: ${payment.receivedAt.toISOString().slice(0, 10)}` },
      { text: `Tenant: ${tenantName}` },
      { text: `Unit: ${lease.unit.unitNumber}` },
      { text: `Amount Paid: ${formatKes(payment.amount)}`, style: "amount" },
      { text: `Payment Method: ${payment.method}` },
      { text: `Reference: ${payment.reference}` },
      {
        text: "Thank you for your payment.",
        style: "footer",
        margin: [0, 30, 0, 0],
      },
    ],
    styles: {
      header: { fontSize: 18, bold: true },
      subheader: { fontSize: 14, margin: [0, 4, 0, 8] },
      amount: { fontSize: 14, bold: true, margin: [0, 8, 0, 8] },
      footer: { fontSize: 10, color: "gray" },
    },
    defaultStyle: { font: "Roboto", fontSize: 11 },
  };

  const buffer = await renderPdf(documentDefinitions);

  return {
    filename: `receipt-${payment.id}.pdf`,
    buffer,
    mimeType: "application/pdf",
  };
}