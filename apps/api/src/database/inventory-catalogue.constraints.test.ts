import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma, PrismaClient } from "@prisma/client";

// These tests require a reachable PostgreSQL database (DATABASE_URL).
// They are skipped when no database is configured so the default unit
// suite stays green in environments without a database.
const prisma = new PrismaClient();
const run = `m002b-${Date.now()}`;
const reference = `C-${run}`;

describe.skipIf(!process.env.DATABASE_URL)("catalogue & assignment constraints", () => {
  let landlordId!: string;
  let propertyId!: string;
  let buildingId!: string;
  let otherPropertyId!: string;
  let amenityId!: string;
  let booleanPolicyId!: string;

  beforeAll(async () => {
    const landlord = await prisma.landlord.create({
      data: { kind: "INDIVIDUAL", name: `LL-${run}` },
    });
    landlordId = landlord.id;

    const property = await prisma.property.create({
      data: {
        reference,
        name: `Prop-${run}`,
        propertyType: "APARTMENT",
        county: "Nairobi",
        landlordId,
      },
    });
    propertyId = property.id;

    const building = await prisma.building.create({
      data: { propertyId, name: "Block A", buildingType: "BLOCK" },
    });
    buildingId = building.id;

    const other = await prisma.property.create({
      data: {
        reference: `O-${run}`,
        name: `Other-${run}`,
        propertyType: "STANDALONE_HOUSE",
        county: "Kiambu",
        landlordId,
      },
    });
    otherPropertyId = other.id;

    const amenity = await prisma.amenity.create({
      data: { key: `lift-${run}`, name: "Lift", category: "AMENITY" },
    });
    amenityId = amenity.id;

    const policy = await prisma.policyDefinition.create({
      data: {
        key: `pets-${run}`,
        name: "Pets allowed",
        valueType: "BOOLEAN",
      },
    });
    booleanPolicyId = policy.id;
  });

  afterAll(async () => {
    if (propertyId) {
      await prisma.inventoryImage.deleteMany({ where: { propertyId } });
      await prisma.policyAssignment.deleteMany({ where: { propertyId } });
      await prisma.amenityAssignment.deleteMany({ where: { propertyId } });
    }
    if (otherPropertyId) {
      await prisma.inventoryImage.deleteMany({ where: { propertyId: otherPropertyId } });
      await prisma.policyAssignment.deleteMany({ where: { propertyId: otherPropertyId } });
      await prisma.amenityAssignment.deleteMany({ where: { propertyId: otherPropertyId } });
    }
    if (booleanPolicyId) {
      await prisma.policyDefinition.deleteMany({ where: { id: booleanPolicyId } });
    }
    if (amenityId) {
      await prisma.amenity.deleteMany({ where: { id: amenityId } });
    }
    if (propertyId) {
      await prisma.unit.deleteMany({ where: { propertyId } });
      await prisma.building.deleteMany({ where: { propertyId } });
      await prisma.property.deleteMany({ where: { id: propertyId } });
    }
    if (otherPropertyId) {
      await prisma.property.deleteMany({ where: { id: otherPropertyId } });
    }
    if (landlordId) {
      await prisma.landlord.deleteMany({ where: { id: landlordId } });
    }
    await prisma.$disconnect();
  });

  it("adds the units composite unique key required by target FKs", async () => {
    const rows = await prisma.$queryRawUnsafe<{ conname: string }[]>(
      `SELECT conname FROM pg_constraint
       WHERE conname = 'units_id_property_key' AND contype = 'u'`,
    );
    expect(rows).toHaveLength(1);
  });

  it("populates the generated target_id for each level", async () => {
    const propertyAssignment = await prisma.amenityAssignment.create({
      data: {
        amenityId,
        level: "PROPERTY",
        propertyId,
        mode: "INCLUDE",
      },
    });
    const buildingAssignment = await prisma.amenityAssignment.create({
      data: {
        amenityId,
        level: "BUILDING",
        propertyId,
        buildingId,
        mode: "INCLUDE",
      },
    });

    const [propertyRow] = await prisma.$queryRaw<{ target_id: string }[]>(
      Prisma.sql`SELECT target_id FROM amenity_assignments WHERE id = ${propertyAssignment.id}::uuid`,
    );
    const [buildingRow] = await prisma.$queryRaw<{ target_id: string }[]>(
      Prisma.sql`SELECT target_id FROM amenity_assignments WHERE id = ${buildingAssignment.id}::uuid`,
    );

    expect(propertyRow?.target_id).toBe(propertyId);
    expect(buildingRow?.target_id).toBe(buildingId);
  });

  it("rejects an assignment whose building belongs to another property", async () => {
    // Dedicated amenity so the (amenity, level, target) unique index does not
    // fire before the composite FK is checked.
    const otherAmenity = await prisma.amenity.create({
      data: { key: `x-${run}`, name: "Extra", category: "FEATURE" },
    });

    await expect(
      prisma.amenityAssignment.create({
        data: {
          amenityId: otherAmenity.id,
          level: "BUILDING",
          propertyId: otherPropertyId,
          buildingId,
          mode: "INCLUDE",
        },
      }),
    ).rejects.toMatchObject({ code: "P2003" });

    await prisma.amenity.delete({ where: { id: otherAmenity.id } });
  });

  it("rejects a policy value column that does not match value_type", async () => {
    await expect(
      prisma.policyAssignment.create({
        data: {
          policyId: booleanPolicyId,
          valueType: "BOOLEAN",
          level: "PROPERTY",
          propertyId,
          mode: "SET",
          valueBool: true,
          valueInt: 5,
        },
      }),
    ).rejects.toThrow(/policy_assignments_value_type_check/);
  });

  it("rejects a policy assignment whose value_type drifts from the definition", async () => {
    await expect(
      prisma.policyAssignment.create({
        data: {
          policyId: booleanPolicyId,
          valueType: "TEXT",
          level: "PROPERTY",
          propertyId,
          mode: "SET",
          valueText: "nope",
        },
      }),
    ).rejects.toMatchObject({ code: "P2003" });
  });

  it("allows only one active primary image per target", async () => {
    const first = await prisma.inventoryImage.create({
      data: {
        level: "PROPERTY",
        propertyId,
        storageProvider: "local",
        storageKey: `key-${run}-1`,
        mimeType: "image/jpeg",
        fileSize: 1024,
        originalFilename: "a.jpg",
        isPrimary: true,
      },
    });

    await expect(
      prisma.inventoryImage.create({
        data: {
          level: "PROPERTY",
          propertyId,
          storageProvider: "local",
          storageKey: `key-${run}-2`,
          mimeType: "image/jpeg",
          fileSize: 2048,
          originalFilename: "b.jpg",
          isPrimary: true,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });

    // Soft-deleting the primary frees the slot for a new primary.
    await prisma.inventoryImage.update({
      where: { id: first.id },
      data: { deletedAt: new Date(), storageCleanupStatus: "PENDING" },
    });

    const replacement = await prisma.inventoryImage.create({
      data: {
        level: "PROPERTY",
        propertyId,
        storageProvider: "local",
        storageKey: `key-${run}-3`,
        mimeType: "image/jpeg",
        fileSize: 4096,
        originalFilename: "c.jpg",
        isPrimary: true,
      },
    });
    expect(replacement.isPrimary).toBe(true);
  });
});