import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  // Check constraints on units
  const unitsChecks = await prisma.$queryRaw`
    SELECT conname, pg_get_constraintdef(oid) as definition
    FROM pg_constraint 
    WHERE conrelid = 'units'::regclass AND contype = 'c'
  `;
  console.log('Units CHECK constraints:');
  unitsChecks.forEach((c: any) => console.log('  -', c.conname, ':', c.definition.substring(0, 100)));

  // Check constraints on properties
  const propChecks = await prisma.$queryRaw`
    SELECT conname, pg_get_constraintdef(oid) as definition
    FROM pg_constraint 
    WHERE conrelid = 'properties'::regclass AND contype = 'c'
  `;
  console.log('\nProperties CHECK constraints:');
  propChecks.forEach((c: any) => console.log('  -', c.conname, ':', c.definition.substring(0, 100)));

  // Check buildings_id_property_key
  const buildingKey = await prisma.$queryRaw`
    SELECT conname, pg_get_constraintdef(oid) as definition
    FROM pg_constraint 
    WHERE conname = 'buildings_id_property_key' AND conrelid = 'buildings'::regclass
  `;
  console.log('\nbuildings_id_property_key:', buildingKey.length > 0 ? 'EXISTS' : 'MISSING');
  if (buildingKey.length > 0) console.log('  ', buildingKey[0].definition);

  // Check images constraints
  const imgChecks = await prisma.$queryRaw`
    SELECT conname, pg_get_constraintdef(oid) as definition
    FROM pg_constraint 
    WHERE conrelid = 'inventory_images'::regclass AND contype = 'c'
  `;
  console.log('\nInventory Images CHECK constraints:');
  imgChecks.forEach((c: any) => console.log('  -', c.conname, ':', c.definition.substring(0, 100)));

  // Check amenity_assignments unique indexes
  const amenityUniques = await prisma.$queryRaw`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'amenity_assignments' AND indexname LIKE '%_key'
  `;
  console.log('\nAmenity Assignments UNIQUE indexes:');
  amenityUniques.forEach((i: any) => console.log('  -', i.indexname, ':', i.indexdef.substring(0, 120)));

  await prisma.$disconnect();
}
check().catch(console.error);