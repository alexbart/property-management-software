-- ===========================================================================
-- Milestone 002B — Catalogue & Assignment Model
--
-- Adds reusable amenity/policy catalogues, target-based assignments with a
-- stored generated `target_id`, provider-neutral image metadata, and the
-- supporting constraints/indexes. Custom SQL (generated columns, CHECKs,
-- composite FKs, partial unique indexes) is not expressible in schema.prisma.
-- ===========================================================================

-- CreateEnum
CREATE TYPE "InventoryLevel" AS ENUM ('PROPERTY', 'BUILDING', 'UNIT');

-- CreateEnum
CREATE TYPE "AmenityCategory" AS ENUM ('FEATURE', 'AMENITY', 'UTILITY');

-- CreateEnum
CREATE TYPE "AmenityAssignmentMode" AS ENUM ('INCLUDE', 'EXCLUDE');

-- CreateEnum
CREATE TYPE "PolicyValueType" AS ENUM ('BOOLEAN', 'ENUM', 'INTEGER', 'TEXT');

-- CreateEnum
CREATE TYPE "PolicyAssignmentMode" AS ENUM ('SET', 'EXCLUDE');

-- CreateEnum
CREATE TYPE "StorageCleanupStatus" AS ENUM ('PENDING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "amenities" (
    "id" UUID NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "category" "AmenityCategory" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_definitions" (
    "id" UUID NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "value_type" "PolicyValueType" NOT NULL,
    "enum_values" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "policy_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenity_assignments" (
    "id" UUID NOT NULL,
    "amenity_id" UUID NOT NULL,
    "level" "InventoryLevel" NOT NULL,
    "property_id" UUID NOT NULL,
    "building_id" UUID,
    "unit_id" UUID,
    "mode" "AmenityAssignmentMode" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "amenity_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_assignments" (
    "id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "value_type" "PolicyValueType" NOT NULL,
    "level" "InventoryLevel" NOT NULL,
    "property_id" UUID NOT NULL,
    "building_id" UUID,
    "unit_id" UUID,
    "mode" "PolicyAssignmentMode" NOT NULL,
    "value_bool" BOOLEAN,
    "value_enum" VARCHAR(64),
    "value_int" INTEGER,
    "value_text" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "policy_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_images" (
    "id" UUID NOT NULL,
    "level" "InventoryLevel" NOT NULL,
    "property_id" UUID NOT NULL,
    "building_id" UUID,
    "unit_id" UUID,
    "storage_provider" VARCHAR(40) NOT NULL,
    "storage_key" VARCHAR(512) NOT NULL,
    "mime_type" VARCHAR(128) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "original_filename" VARCHAR(255) NOT NULL,
    "caption" VARCHAR(500),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "storage_cleanup_status" "StorageCleanupStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "inventory_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "amenities_key_key" ON "amenities"("key");

-- CreateIndex
CREATE UNIQUE INDEX "policy_definitions_key_key" ON "policy_definitions"("key");

-- CreateIndex
CREATE INDEX "amenity_assignments_amenity_id_idx" ON "amenity_assignments"("amenity_id");

-- CreateIndex
CREATE INDEX "amenity_assignments_property_id_idx" ON "amenity_assignments"("property_id");

-- CreateIndex
CREATE INDEX "policy_assignments_policy_id_idx" ON "policy_assignments"("policy_id");

-- CreateIndex
CREATE INDEX "policy_assignments_property_id_idx" ON "policy_assignments"("property_id");

-- CreateIndex
CREATE INDEX "inventory_images_property_id_idx" ON "inventory_images"("property_id");

-- ===========================================================================
-- Custom constraints (not expressible in schema.prisma)
-- ===========================================================================

-- Prerequisite for the units composite FK used by all target tables (B).
-- 002A only added the equivalent key on buildings.
ALTER TABLE "units"
    ADD CONSTRAINT "units_id_property_key" UNIQUE ("id", "property_id");

-- Stored generated target_id on all three target tables (A).
ALTER TABLE "amenity_assignments"
    ADD COLUMN "target_id" TEXT GENERATED ALWAYS AS (
        CASE "level"
            WHEN 'PROPERTY' THEN "property_id"::text
            WHEN 'BUILDING' THEN "building_id"::text
            WHEN 'UNIT'     THEN "unit_id"::text
        END
    ) STORED;

ALTER TABLE "policy_assignments"
    ADD COLUMN "target_id" TEXT GENERATED ALWAYS AS (
        CASE "level"
            WHEN 'PROPERTY' THEN "property_id"::text
            WHEN 'BUILDING' THEN "building_id"::text
            WHEN 'UNIT'     THEN "unit_id"::text
        END
    ) STORED;

ALTER TABLE "inventory_images"
    ADD COLUMN "target_id" TEXT GENERATED ALWAYS AS (
        CASE "level"
            WHEN 'PROPERTY' THEN "property_id"::text
            WHEN 'BUILDING' THEN "building_id"::text
            WHEN 'UNIT'     THEN "unit_id"::text
        END
    ) STORED;

-- Level/target consistency: the id column matching `level` is populated and
-- the others are null.
ALTER TABLE "amenity_assignments"
    ADD CONSTRAINT "amenity_assignments_level_target_check" CHECK (
        ("level" = 'PROPERTY' AND "property_id" IS NOT NULL AND "building_id" IS NULL AND "unit_id" IS NULL) OR
        ("level" = 'BUILDING' AND "property_id" IS NOT NULL AND "building_id" IS NOT NULL AND "unit_id" IS NULL) OR
        ("level" = 'UNIT'     AND "property_id" IS NOT NULL AND "unit_id" IS NOT NULL)
    );

ALTER TABLE "policy_assignments"
    ADD CONSTRAINT "policy_assignments_level_target_check" CHECK (
        ("level" = 'PROPERTY' AND "property_id" IS NOT NULL AND "building_id" IS NULL AND "unit_id" IS NULL) OR
        ("level" = 'BUILDING' AND "property_id" IS NOT NULL AND "building_id" IS NOT NULL AND "unit_id" IS NULL) OR
        ("level" = 'UNIT'     AND "property_id" IS NOT NULL AND "unit_id" IS NOT NULL)
    );

ALTER TABLE "inventory_images"
    ADD CONSTRAINT "inventory_images_level_target_check" CHECK (
        ("level" = 'PROPERTY' AND "property_id" IS NOT NULL AND "building_id" IS NULL AND "unit_id" IS NULL) OR
        ("level" = 'BUILDING' AND "property_id" IS NOT NULL AND "building_id" IS NOT NULL AND "unit_id" IS NULL) OR
        ("level" = 'UNIT'     AND "property_id" IS NOT NULL AND "unit_id" IS NOT NULL)
    );

-- Composite foreign keys keep every assignment within one property (IDOR
-- protection) and reference real catalogue rows.
ALTER TABLE "amenity_assignments"
    ADD CONSTRAINT "amenity_assignments_property_id_fkey"
        FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "amenity_assignments_building_property_fkey"
        FOREIGN KEY ("building_id", "property_id") REFERENCES "buildings"("id", "property_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "amenity_assignments_unit_property_fkey"
        FOREIGN KEY ("unit_id", "property_id") REFERENCES "units"("id", "property_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "amenity_assignments_amenity_id_fkey"
        FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "policy_assignments"
    ADD CONSTRAINT "policy_assignments_property_id_fkey"
        FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "policy_assignments_building_property_fkey"
        FOREIGN KEY ("building_id", "property_id") REFERENCES "buildings"("id", "property_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "policy_assignments_unit_property_fkey"
        FOREIGN KEY ("unit_id", "property_id") REFERENCES "units"("id", "property_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_images"
    ADD CONSTRAINT "inventory_images_property_id_fkey"
        FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "inventory_images_building_property_fkey"
        FOREIGN KEY ("building_id", "property_id") REFERENCES "buildings"("id", "property_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "inventory_images_unit_property_fkey"
        FOREIGN KEY ("unit_id", "property_id") REFERENCES "units"("id", "property_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One assignment per catalogue entry per target.
CREATE UNIQUE INDEX "amenity_assignments_amenity_level_target_key"
    ON "amenity_assignments" ("amenity_id", "level", "target_id");

CREATE UNIQUE INDEX "policy_assignments_policy_level_target_key"
    ON "policy_assignments" ("policy_id", "level", "target_id");

-- At most one active primary image per target (soft-deleted rows ignored).
CREATE UNIQUE INDEX "inventory_images_primary_key"
    ON "inventory_images" ("level", "target_id")
    WHERE "is_primary" AND "deleted_at" IS NULL;

-- Policy value typing (C): the assignment's value_type must match the
-- definition, and exactly one correctly-typed value column is populated
-- (or none for EXCLUDE).
ALTER TABLE "policy_definitions"
    ADD CONSTRAINT "policy_definitions_id_value_type_key" UNIQUE ("id", "value_type");

ALTER TABLE "policy_assignments"
    ADD CONSTRAINT "policy_assignments_policy_value_type_fkey"
        FOREIGN KEY ("policy_id", "value_type")
        REFERENCES "policy_definitions" ("id", "value_type")
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    ADD CONSTRAINT "policy_assignments_value_type_check" CHECK (
        ("mode" = 'EXCLUDE' AND "value_bool" IS NULL AND "value_enum" IS NULL AND "value_int" IS NULL AND "value_text" IS NULL)
        OR ("mode" = 'SET' AND (
            ("value_type" = 'BOOLEAN' AND "value_bool" IS NOT NULL AND "value_enum" IS NULL AND "value_int" IS NULL AND "value_text" IS NULL) OR
            ("value_type" = 'ENUM'    AND "value_enum" IS NOT NULL AND "value_bool" IS NULL AND "value_int" IS NULL AND "value_text" IS NULL) OR
            ("value_type" = 'INTEGER' AND "value_int"  IS NOT NULL AND "value_bool" IS NULL AND "value_enum" IS NULL AND "value_text" IS NULL) OR
            ("value_type" = 'TEXT'    AND "value_text" IS NOT NULL AND "value_bool" IS NULL AND "value_enum" IS NULL AND "value_int" IS NULL)
        ))
    );

-- Image metadata validation.
ALTER TABLE "inventory_images"
    ADD CONSTRAINT "inventory_images_file_size_non_negative" CHECK ("file_size" >= 0),
    ADD CONSTRAINT "inventory_images_width_positive" CHECK ("width" IS NULL OR "width" > 0),
    ADD CONSTRAINT "inventory_images_height_positive" CHECK ("height" IS NULL OR "height" > 0),
    ADD CONSTRAINT "inventory_images_sort_order_non_negative" CHECK ("sort_order" >= 0);

-- Catalogue keys must not be blank.
ALTER TABLE "amenities"
    ADD CONSTRAINT "amenities_key_not_blank" CHECK (length(btrim("key")) > 0);

ALTER TABLE "policy_definitions"
    ADD CONSTRAINT "policy_definitions_key_not_blank" CHECK (length(btrim("key")) > 0);