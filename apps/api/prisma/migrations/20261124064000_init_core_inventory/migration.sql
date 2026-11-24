-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'BEDSITTER', 'STUDIO', 'SINGLE_ROOM', 'SHARED', 'MAISONETTE', 'BUNGALOW', 'TOWNHOUSE', 'STANDALONE_HOUSE');

-- CreateEnum
CREATE TYPE "BuildingType" AS ENUM ('BLOCK', 'WING', 'ROW', 'DETACHED', 'OTHER');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('BEDSITTER', 'STUDIO', 'SINGLE_ROOM', 'SHARED_ROOM', 'ONE_BEDROOM', 'TWO_BEDROOM', 'THREE_BEDROOM', 'MAISONETTE', 'BUNGALOW_UNIT', 'TOWNHOUSE_UNIT', 'HOUSE', 'OTHER');

-- CreateEnum
CREATE TYPE "UnitSizeUnit" AS ENUM ('SQM', 'SQFT');

-- CreateEnum
CREATE TYPE "LandlordKind" AS ENUM ('INDIVIDUAL', 'CORPORATE');

-- CreateTable
CREATE TABLE "landlords" (
    "id" UUID NOT NULL,
    "kind" "LandlordKind" NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "landlords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL,
    "reference" VARCHAR(32) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "property_type" "PropertyType" NOT NULL,
    "description" TEXT,
    "county" VARCHAR(80) NOT NULL,
    "town" VARCHAR(120),
    "neighbourhood" VARCHAR(120),
    "street_address" VARCHAR(200),
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "landlord_id" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buildings" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "building_type" "BuildingType",
    "floor_count" INTEGER,
    "description" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "building_id" UUID,
    "unit_number" VARCHAR(32) NOT NULL,
    "room_number" VARCHAR(32),
    "house_number" VARCHAR(32),
    "floor" INTEGER,
    "unit_type" "UnitType" NOT NULL,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "size_value" DECIMAL(8,2),
    "size_unit" "UnitSizeUnit",
    "standard_rent" DECIMAL(12,2) NOT NULL,
    "deposit_required" DECIMAL(12,2),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "properties_reference_key" ON "properties"("reference");

-- CreateIndex
CREATE INDEX "properties_landlord_id_idx" ON "properties"("landlord_id");

-- CreateIndex
CREATE INDEX "properties_county_town_neighbourhood_idx" ON "properties"("county", "town", "neighbourhood");

-- CreateIndex
CREATE INDEX "properties_property_type_idx" ON "properties"("property_type");

-- CreateIndex
CREATE INDEX "buildings_property_id_idx" ON "buildings"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "buildings_property_id_name_key" ON "buildings"("property_id", "name");

-- CreateIndex
CREATE INDEX "units_property_id_idx" ON "units"("property_id");

-- CreateIndex
CREATE INDEX "units_building_id_idx" ON "units"("building_id");

-- CreateIndex
CREATE INDEX "units_unit_type_idx" ON "units"("unit_type");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_landlord_id_fkey" FOREIGN KEY ("landlord_id") REFERENCES "landlords"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===========================================================================
-- Custom constraints (not expressible in schema.prisma)
-- ===========================================================================

-- Unit-number uniqueness within the immediate container (SR-4).
CREATE UNIQUE INDEX "units_building_number_key"
    ON "units" ("building_id", "unit_number")
    WHERE "building_id" IS NOT NULL;

CREATE UNIQUE INDEX "units_property_number_direct_key"
    ON "units" ("property_id", "unit_number")
    WHERE "building_id" IS NULL;

-- Property validation.
ALTER TABLE "properties"
    ADD CONSTRAINT "properties_reference_not_blank" CHECK (length(btrim("reference")) > 0),
    ADD CONSTRAINT "properties_latitude_range" CHECK ("latitude" BETWEEN -90 AND 90),
    ADD CONSTRAINT "properties_longitude_range" CHECK ("longitude" BETWEEN -180 AND 180),
    ADD CONSTRAINT "properties_geo_pair" CHECK (("latitude" IS NULL) = ("longitude" IS NULL));

-- Building validation.
ALTER TABLE "buildings"
    ADD CONSTRAINT "buildings_floor_count_non_negative" CHECK ("floor_count" IS NULL OR "floor_count" >= 0);

-- Unit validation.
ALTER TABLE "units"
    ADD CONSTRAINT "units_unit_number_not_blank" CHECK (length(btrim("unit_number")) > 0),
    ADD CONSTRAINT "units_floor_non_negative" CHECK ("floor" IS NULL OR "floor" >= 0),
    ADD CONSTRAINT "units_bedrooms_non_negative" CHECK ("bedrooms" IS NULL OR "bedrooms" >= 0),
    ADD CONSTRAINT "units_bathrooms_non_negative" CHECK ("bathrooms" IS NULL OR "bathrooms" >= 0),
    ADD CONSTRAINT "units_size_value_positive" CHECK ("size_value" IS NULL OR "size_value" > 0),
    ADD CONSTRAINT "units_size_unit_required" CHECK ("size_value" IS NULL OR "size_unit" IS NOT NULL),
    ADD CONSTRAINT "units_standard_rent_non_negative" CHECK ("standard_rent" >= 0),
    ADD CONSTRAINT "units_deposit_non_negative" CHECK ("deposit_required" IS NULL OR "deposit_required" >= 0);

-- Building/property/unit consistency (SR-2 / SR-4).
-- A unit's building must belong to the same property; NULL building_id
-- (direct unit) is not enforced by this composite FK.
ALTER TABLE "buildings"
    ADD CONSTRAINT "buildings_id_property_key" UNIQUE ("id", "property_id");

ALTER TABLE "units"
    ADD CONSTRAINT "units_building_property_fkey"
    FOREIGN KEY ("building_id", "property_id")
    REFERENCES "buildings" ("id", "property_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;