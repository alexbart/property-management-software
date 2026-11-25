import type { Payment, PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { darajaService } from "./daraja.service.js";
import { calculateLeaseArrears } from "./arrears.service.js";

/** Thrown when a lease is not found within the caller's property scope. */
export class NotFoundException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundException";
  }
}

/** Thrown when a financial invariant is violated (e.g. duplicate reference). */
export class ConflictException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictException";
  }
}

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/**
 * Record a completed payment.
 *
 * The Payment row is the cash record. No ledger entry is written: writing a
 * RENT row here would double-count the payment in arrears (Milestone 010).
 *
 * Idempotency: the M-Pesa `reference` (CheckoutRequestID/MerchantRequestID) is
 * unique. A repeated callback returns the existing payment instead of
 * crediting the tenant twice.
 */
export async function recordPayment(
  leaseId: string,
  propertyId: string,
  amount: Prisma.Decimal,
  method: PaymentMethod,
  reference: string,
): Promise<Payment> {
  try {
    return await prisma.$transaction(async (tx) => {
      const lease = await tx.lease.findFirst({
        where: { id: leaseId, propertyId },
      });
      if (!lease) {
        throw new NotFoundException(
          `Lease ${leaseId} not found for property ${propertyId}`,
        );
      }

      const existingKey = await tx.idempotencyKey.findUnique({
        where: { key: reference },
      });

      if (existingKey && existingKey.expiresAt.getTime() > Date.now()) {
        const stored = existingKey.responsePayload as { id?: string } | null;
        if (stored?.id) {
          const existingPayment = await tx.payment.findUnique({
            where: { id: stored.id },
          });
          if (existingPayment) {
            return existingPayment;
          }
        }
      }

      const payment = await tx.payment.create({
        data: {
          leaseId,
          propertyId,
          amount,
          method,
          reference,
          status: "COMPLETED",
          receivedAt: new Date(),
        },
      });

      const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS);
      const responsePayload = {
        id: payment.id,
        leaseId: payment.leaseId,
        propertyId: payment.propertyId,
        amount: payment.amount.toString(),
        method: payment.method,
        reference: payment.reference,
        status: payment.status,
        receivedAt: payment.receivedAt.toISOString(),
        createdAt: payment.createdAt.toISOString(),
      };

      await tx.idempotencyKey.upsert({
        where: { key: reference },
        update: { responsePayload, expiresAt },
        create: { key: reference, responsePayload, expiresAt },
      });

      return payment;
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const existing = await prisma.payment.findUnique({
        where: { reference },
      });
      if (
        existing &&
        existing.leaseId === leaseId &&
        existing.propertyId === propertyId
      ) {
        return existing;
      }
      throw new ConflictException("Payment reference already exists");
    }
    throw error;
  }
}

/**
 * Initiate an M-Pesa STK Push for a lease payment.
 *
 * Verifies the lease belongs to the property, validates the amount against
 * current arrears, creates a PENDING payment record, and triggers the STK push.
 */
export async function requestStkPush(
  leaseId: string,
  propertyId: string,
  amount: Prisma.Decimal,
  phoneNumber: string,
): Promise<{
  checkoutRequestId: string;
  merchantRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
  paymentId: string;
}> {
  return prisma.$transaction(async (tx) => {
    const lease = await tx.lease.findFirst({
      where: { id: leaseId, propertyId },
      include: { unit: true, tenant: true },
    });
    if (!lease) {
      throw new NotFoundException(
        `Lease ${leaseId} not found for property ${propertyId}`,
      );
    }

    // Get current arrears to validate amount
    const arrears = await calculateLeaseArrears(leaseId, propertyId);
    
    // Allow payment up to the current balance
    if (amount.greaterThan(arrears.currentBalance)) {
      throw new ConflictException(
        `Amount ${amount} exceeds current balance ${arrears.currentBalance}`,
      );
    }

    // Generate unique internal reference
    const reference = `PAY-${Date.now()}-${leaseId.slice(-8)}`;

    // Create PENDING payment record (receivedAt is required, use createdAt as placeholder)
    const payment = await tx.payment.create({
      data: {
        leaseId,
        propertyId,
        amount,
        method: "MPESA",
        reference,
        status: "PENDING",
        receivedAt: new Date(),
      },
    });

    // Initiate STK push via Daraja
    const accountReference = `LEASE-${leaseId.slice(-8)}`;
    const transactionDesc = `Rent payment for unit ${lease.unit?.unitNumber ?? leaseId}`;

    const darajaResponse = await darajaService.initiateStkPush(
      phoneNumber,
      amount.toString(),
      accountReference,
      transactionDesc,
    );

    return {
      ...darajaResponse,
      paymentId: payment.id,
    };
  });
}