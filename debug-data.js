const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log('--- Most Recent MaterialCosto ---');
    const costs = await prisma.materialCosto.findMany({
      take: 10,
      orderBy: { created_at: 'desc' },
      select: { id: true, material_id: true, costo: true, created_at: true, esquema_id: true }
    });
    console.log(JSON.stringify(costs, null, 2));

    console.log('\n--- Most Recent Updated Materials ---');
    const materials = await prisma.material.findMany({
      take: 10,
      orderBy: { updated_at: 'desc' },
      select: { id: true, codigo: true, costo_promedio: true, updated_at: true }
    });
    console.log(JSON.stringify(materials, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
