import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const tables = ['amenity_assignments', 'policy_assignments', 'inventory_images'];
  for (const table of tables) {
    const constraints = await prisma.$queryRaw`
      SELECT conname, contype
      FROM pg_constraint 
      WHERE conrelid = ${table}::regclass
      ORDER BY conname
    `;
    console.log(`\n${table} constraints:`);
    constraints.forEach((c: any) => console.log('  -', c.conname, '(', c.contype === 'f' ? 'FK' : c.contype === 'c' ? 'CHECK' : c.contype === 'u' ? 'UNIQUE' : c.contype, ')'));
  }
  
  const unitsCons = await prisma.$queryRaw`
    SELECT conname, contype
    FROM pg_constraint 
    WHERE conrelid = 'units'::regclass
    ORDER BY conname
  `;
  console.log('\nunits constraints:');
  unitsCons.forEach((c: any) => console.log('  -', c.conname, '(', c.contype === 'f' ? 'FK' : c.contype === 'c' ? 'CHECK' : c.contype === 'u' ? 'UNIQUE' : c.contype, ')'));

  const indexes = await prisma.$queryRaw`
    SELECT indexname, tablename
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('amenity_assignments', 'policy_assignments', 'inventory_images', 'amenities', 'policy_definitions')
      AND indexname LIKE '%_key'
    ORDER BY tablename, indexname
  `;
  console.log('\nUnique indexes:');
  indexes.forEach((i: any) => console.log('  -', i.tablename, ':', i.indexname));

  await prisma.$disconnect();
}
check().catch(console.error);