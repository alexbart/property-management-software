-- ===========================================================================
-- Milestone 004 — Ledger, Payments & Idempotency
--
-- Append-only ledger entries and payments tied to a lease. A composite
-- (lease_id, property_id) FK keeps each row within the lease's property
-- (cross-property isolation). Payment.reference is unique so duplicate M-Pesa
-- callbacks are rejected safely.
-- ===========================================================================

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('RENT', 'DEPOSIT', 'PENALTY', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MPESA', 'CASH', 'BANK');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL,
    "lease_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "type" "LedgerType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "effective_date" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "lease_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" VARCHAR(100) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "received_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "key" VARCHAR(100) NOT NULL,
    "response_payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "ledger_entries_lease_id_idx" ON "ledger_entries"("lease_id");

-- CreateIndex
CREATE INDEX "ledger_entries_property_id_idx" ON "ledger_entries"("property_id");

-- CreateIndex
CREATE INDEX "ledger_entries_type_idx" ON "ledger_entries"("type");

-- CreateIndex
CREATE INDEX "ledger_entries_effective_date_idx" ON "ledger_entries"("effective_date");

-- CreateIndex
CREATE INDEX "payments_lease_id_idx" ON "payments"("lease_id");

-- CreateIndex
CREATE INDEX "payments_property_id_idx" ON "payments"("property_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys"("expires_at");

-- ===========================================================================
-- Custom constraints (not expressible in schema.prisma)
-- ===========================================================================

-- Unique payment reference (idempotency for M-Pesa callbacks).
ALTER TABLE "payments"
    ADD CONSTRAINT "payments_reference_key" UNIQUE ("reference");

-- Prerequisite for the composite lease FKs below.
ALTER TABLE "leases"
    ADD CONSTRAINT "leases_id_property_key" UNIQUE ("id", "property_id");

-- Single-column foreign keys.
ALTER TABLE "ledger_entries"
    ADD CONSTRAINT "ledger_entries_lease_id_fkey"
        FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "ledger_entries_property_id_fkey"
        FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payments"
    ADD CONSTRAINT "payments_lease_id_fkey"
        FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "payments_property_id_fkey"
        FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Composite foreign keys: the row's property must match the lease's property.
ALTER TABLE "ledger_entries"
    ADD CONSTRAINT "ledger_entries_lease_property_fkey"
        FOREIGN KEY ("lease_id", "property_id")
        REFERENCES "leases"("id", "property_id")
        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payments"
    ADD CONSTRAINT "payments_lease_property_fkey"
        FOREIGN KEY ("lease_id", "property_id")
        REFERENCES "leases"("id", "property_id")
        ON DELETE RESTRICT ON UPDATE CASCADE;