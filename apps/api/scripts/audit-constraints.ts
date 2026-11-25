import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function auditConstraints() {
  console.log('=== PostgreSQL Constraint Audit ===\n');

  // Query 1: Check for specific constraint by name
  const unitsBuildingFkey = await prisma.$queryRaw`
    SELECT conname, contype, 
           pg_get_constraintdef(oid) as definition
    FROM pg_constraint 
    WHERE conname = 'units_building_property_fkey'
      AND conrelid = 'units'::regclass;
  `;
  console.log('1. units_building_property_fkey:', unitsBuildingFkey.length > 0 ? 'EXISTS' : 'MISSING');
  if (unitsBuildingFkey.length > 0) {
    console.log('   Definition:', (unitsBuildingFkey[0] as any).definition);
  }

  // Query 2: Check for composite FK on units (any name)
  const unitsCompositeFk = await prisma.$queryRaw`
    SELECT conname, contype, 
           pg_get_constraintdef(oid) as definition
    FROM pg_constraint 
    WHERE conrelid = 'units'::regclass
      AND contype = 'f'
      AND pg_get_constraintdef(oid) LIKE '%buildings%';
  `;
  console.log('\n2. Any composite FK from units to buildings:', unitsCompositeFk.length > 0 ? 'EXISTS' : 'MISSING');
  unitsCompositeFk.forEach((fk: any) => {
    console.log('   -', fk.conname, ':', fk.definition);
  });

  // Query 3: Check for CHECK constraints on policy_assignments
  const policyChecks = await prisma.$queryRaw`
    SELECT conname, contype,
           pg_get_constraintdef(oid) as definition
    FROM pg_constraint 
    WHERE conrelid = 'policy_assignments'::regclass
      AND contype = 'c';
  `;
  console.log('\n3. CHECK constraints on policy_assignments:', policyChecks.length);
  policyChecks.forEach((chk: any) => {
    console.log('   -', chk.conname, ':', chk.definition.substring(0, 100) + '...');
  });

  // Query 4: Check for composite FKs on assignment tables
  const assignmentFks = await prisma.$queryRaw`
    SELECT conname, conrelid::text as table_name, contype,
           pg_get_constraintdef(oid) as definition
    FROM pg_constraint 
    WHERE conrelid IN ('amenity_assignments'::regclass, 
                       'policy_assignments'::regclass, 
                       'inventory_images'::regclass)
      AND contype = 'f'
    ORDER BY table_name, conname;
  `;
  console.log('\n4. Foreign keys on assignment/image tables:');
  assignmentFks.forEach((fk: any) => {
    console.log('   -', fk.table_name, ':', fk.conname);
    console.log('     ', fk.definition);
  });

  // Query 5: Check for generated columns
  const generatedCols = await prisma.$queryRaw`
    SELECT table_name, column_name, generation_expression
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND is_generated = 'ALWAYS'
      AND table_name IN ('amenity_assignments', 'policy_assignments', 'inventory_images');
  `;
  console.log('\n5. Generated columns (target_id):');
  generatedCols.forEach((col: any) => {
    console.log('   -', col.table_name, '.', col.column_name);
    console.log('     Expression:', col.generation_expression);
  });

  // Query 6: Check for partial unique indexes
  const partialIndexes = await prisma.$queryRaw`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexdef LIKE '%WHERE%';
  `;
  console.log('\n6. Partial indexes (with WHERE clause):');
  partialIndexes.forEach((idx: any) => {
    console.log('   -', idx.indexname);
    console.log('     ', idx.indexdef);
  });

  // Query 7: Check units_id_property_key (composite unique)
  const unitsIdPropertyKey = await prisma.$queryRaw`
    SELECT conname, contype, pg_get_constraintdef(oid) as definition
    FROM pg_constraint 
    WHERE conname = 'units_id_property_key' AND conrelid = 'units'::regclass;
  `;
  console.log('\n7. units_id_property_key (composite unique):', unitsIdPropertyKey.length > 0 ? 'EXISTS' : 'MISSING');
  if (unitsIdPropertyKey.length > 0) {
    console.log('   Definition:', (unitsIdPropertyKey[0] as any).definition);
  }

  // Query 8: Check level/target CHECK constraints on assignment tables
  const levelTargetChecks = await prisma.$queryRaw`
    SELECT conname, conrelid::text as table_name, contype, pg_get_constraintdef(oid) as definition
    FROM pg_constraint 
    WHERE conrelid IN ('amenity_assignments'::regclass, 'policy_assignments'::regclass, 'inventory_images'::regclass)
      AND contype = 'c'
      AND conname LIKE '%level_target_check%'
    ORDER BY table_name;
  `;
  console.log('\n8. Level/target CHECK constraints:');
  levelTargetChecks.forEach((chk: any) => {
    console.log('   -', chk.table_name, ':', chk.conname, ':', chk.definition.substring(0, 120) + '...');
  });

  // Query 9: Check policy value constraints
  const policyValueConstraints = await prisma.$queryRaw`
    SELECT conname, conrelid::text as table_name, contype, pg_get_constraintdef(oid) as definition
    FROM pg_constraint 
    WHERE conrelid IN ('policy_definitions'::regclass, 'policy_assignments'::regclass)
      AND (conname LIKE '%value_type%' OR conname LIKE '%policy_value%')
    ORDER BY table_name;
  `;
  console.log('\n9. Policy value type constraints:');
  policyValueConstraints.forEach((chk: any) => {
    console.log('   -', chk.table_name, ':', chk.conname);
    console.log('     ', chk.definition.substring(0, 150) + '...');
  });

  // Query 10: Check unique indexes on assignment tables
  const assignmentUniques = await prisma.$queryRaw`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('amenity_assignments', 'policy_assignments', 'inventory_images')
      AND indexname LIKE '%_key'
    ORDER BY tablename, indexname;
  `;
  console.log('\n10. Unique indexes on assignment tables:');
  assignmentUniques.forEach((idx: any) => {
    console.log('   -', idx.indexname);
    console.log('     ', idx.indexdef);
  });

  await prisma.$disconnect();
}

auditConstraints().catch(console.error);