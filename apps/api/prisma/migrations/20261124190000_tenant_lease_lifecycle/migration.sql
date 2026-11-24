-- ===========================================================================
-- Milestone 003 — Tenant & Lease Lifecycle
--
-- Adds tenants and leases. The "one ACTIVE lease per unit" rule is a PARTIAL
-- unique index (Prisma cannot express it). A composite (unit_id, property_id)
-- FK keeps a lease within the unit's property (cross-property isolation).
-- ===========================================================================

-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('DRAFT', 'ACTIVE', 'TERMINATED', 'EXPIRED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "first_name" VARCHAR(120) NOT NULL,
    "last_name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "email" VARCHAR(255),
    "id_number" VARCHAR(32) NOT NULL,
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "risk_flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leases" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "end_date" TIMESTAMPTZ(6) NOT NULL,
    "notice_period_days" INTEGER NOT NULL DEFAULT 30,
    "rent_amount" DECIMAL(12,2) NOT NULL,
    "deposit_amount" DECIMAL(12,2) NOT NULL,
    "status" "LeaseStatus" NOT NULL DEFAULT 'DRAFT',
    "terminated_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "leases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_id_number_key" ON "tenants"("id_number");

-- CreateIndex
CREATE INDEX "tenants_phone_idx" ON "tenants"("phone");

-- CreateIndex
CREATE INDEX "leases_tenant_id_idx" ON "leases"("tenant_id");

-- CreateIndex
CREATE INDEX "leases_unit_id_idx" ON "leases"("unit_id");

-- CreateIndex
CREATE INDEX "leases_property_id_idx" ON "leases"("property_id");

-- CreateIndex
CREATE INDEX "leases_status_idx" ON "leases"("status");

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===========================================================================
-- Custom constraints (not expressible in schema.prisma)
-- ===========================================================================

-- Cross-property isolation: a lease's unit must belong to the same property.
-- units already has UNIQUE (id, property_id) from Milestone 002B.
ALTER TABLE "leases"
    ADD CONSTRAINT "leases_unit_property_fkey"
    FOREIGN KEY ("unit_id", "property_id")
    REFERENCES "units" ("id", "property_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- One ACTIVE lease per unit at any time.
CREATE UNIQUE INDEX "lease_active_unit_key"
    ON "leases" ("unit_id")
    WHERE "status" = 'ACTIVE';