-- CreateEnum
CREATE TYPE "NoticeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "tenant_notices" (
    "id" UUID NOT NULL,
    "lease_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "notice_date" TIMESTAMPTZ(6) NOT NULL,
    "intended_move_out_date" TIMESTAMPTZ(6) NOT NULL,
    "status" "NoticeStatus" NOT NULL DEFAULT 'PENDING',
    "reason" VARCHAR(500),
    "reviewed_by" VARCHAR(64),
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_notices_lease_id_idx" ON "tenant_notices"("lease_id");

-- CreateIndex
CREATE INDEX "tenant_notices_property_id_idx" ON "tenant_notices"("property_id");

-- CreateIndex
CREATE INDEX "tenant_notices_tenant_id_idx" ON "tenant_notices"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_notices_status_idx" ON "tenant_notices"("status");

-- AddForeignKey
ALTER TABLE "tenant_notices" ADD CONSTRAINT "tenant_notices_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_notices" ADD CONSTRAINT "tenant_notices_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_notices" ADD CONSTRAINT "tenant_notices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;