-- ===========================================================================
-- Milestone 005 — Maintenance & Work Orders
--
-- Tickets belong to a property and a unit. A composite (unit_id, property_id)
-- FK keeps the unit within the ticket's property (cross-property isolation).
-- Cost columns are non-negative; resolved_at is enforced in the service layer.
-- ===========================================================================

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketInitiator" AS ENUM ('TENANT', 'MANAGER');

-- CreateTable
CREATE TABLE "maintenance_tickets" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "initiated_by" "TicketInitiator" NOT NULL,
    "initiator_id" VARCHAR(64) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "estimated_cost" DECIMAL(12,2),
    "actual_cost" DECIMAL(12,2) DEFAULT 0,
    "resolution_notes" TEXT,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "maintenance_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "maintenance_tickets_property_id_idx" ON "maintenance_tickets"("property_id");

-- CreateIndex
CREATE INDEX "maintenance_tickets_unit_id_idx" ON "maintenance_tickets"("unit_id");

-- CreateIndex
CREATE INDEX "maintenance_tickets_status_idx" ON "maintenance_tickets"("status");

-- CreateIndex
CREATE INDEX "maintenance_tickets_priority_idx" ON "maintenance_tickets"("priority");

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===========================================================================
-- Custom constraints (not expressible in schema.prisma)
-- ===========================================================================

-- Cross-property isolation: the unit must belong to the ticket's property.
-- units already has UNIQUE (id, property_id) from Milestone 002B.
ALTER TABLE "maintenance_tickets"
    ADD CONSTRAINT "maintenance_tickets_unit_property_fkey"
    FOREIGN KEY ("unit_id", "property_id")
    REFERENCES "units"("id", "property_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Money must never be negative.
ALTER TABLE "maintenance_tickets"
    ADD CONSTRAINT "chk_actual_cost_non_negative"
        CHECK ("actual_cost" IS NULL OR "actual_cost" >= 0),
    ADD CONSTRAINT "chk_estimated_cost_non_negative"
        CHECK ("estimated_cost" IS NULL OR "estimated_cost" >= 0);