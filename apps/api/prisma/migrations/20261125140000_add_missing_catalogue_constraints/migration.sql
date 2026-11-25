-- ===========================================================================
-- Milestone 002B — Missing Custom Constraints (retroactive apply)
-- Only adds constraints that are actually missing from the database.
-- ===========================================================================

-- Composite foreign keys for amenity_assignments (IDOR protection)
ALTER TABLE "amenity_assignments"
    ADD CONSTRAINT "amenity_assignments_property_id_fkey"
        FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "amenity_assignments_building_property_fkey"
        FOREIGN KEY ("building_id", "property_id") REFERENCES "buildings"("id", "property_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "amenity_assignments_unit_property_fkey"
        FOREIGN KEY ("unit_id", "property_id") REFERENCES "units"("id", "property_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "amenity_assignments_amenity_id_fkey"
        FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Composite foreign keys for policy_assignments (IDOR protection)
ALTER TABLE "policy_assignments"
    ADD CONSTRAINT "policy_assignments_property_id_fkey"
        FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "policy_assignments_building_property_fkey"
        FOREIGN KEY ("building_id", "property_id") REFERENCES "buildings"("id", "property_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "policy_assignments_unit_property_fkey"
        FOREIGN KEY ("unit_id", "property_id") REFERENCES "units"("id", "property_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Composite foreign keys for inventory_images (IDOR protection)
ALTER TABLE "inventory_images"
    ADD CONSTRAINT "inventory_images_property_id_fkey"
        FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "inventory_images_building_property_fkey"
        FOREIGN KEY ("building_id", "property_id") REFERENCES "buildings"("id", "property_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "inventory_images_unit_property_fkey"
        FOREIGN KEY ("unit_id", "property_id") REFERENCES "units"("id", "property_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One assignment per catalogue entry per target (amenity_assignments)
CREATE UNIQUE INDEX "amenity_assignments_amenity_level_target_key"
    ON "amenity_assignments" ("amenity_id", "level", "target_id");

-- Policy value typing: assignment value_type must match definition
ALTER TABLE "policy_assignments"
    ADD CONSTRAINT "policy_assignments_policy_value_type_fkey"
        FOREIGN KEY ("policy_id", "value_type")
        REFERENCES "policy_definitions" ("id", "value_type")
        ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Ensure units_building_property_fkey exists (from 002A)
ALTER TABLE "units"
    ADD CONSTRAINT "units_building_property_fkey"
    FOREIGN KEY ("building_id", "property_id")
    REFERENCES "buildings" ("id", "property_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;