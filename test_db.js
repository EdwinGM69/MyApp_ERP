const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const materials = await prisma.material.findMany({
    where: { descripcion: { contains: 'Laptop' } },
    take: 5
  });
  console.log('Materials found:', JSON.stringify(materials, null, 2));

  if (materials.length > 0) {
    const mId = materials[0].id;
    console.log('\n--- Conditions for Material ID:', mId, '---');
    const conditions = await prisma.condiciones.findMany({
      where: { material_id: mId },
      include: { tipo_condicion: true }
    });
    console.log('Conditions:', JSON.stringify(conditions, null, 2));
  }

  console.log('\n--- General Conditions (material_id: null) ---');
  const generalConditions = await prisma.condiciones.findMany({
    where: { material_id: null },
    include: { tipo_condicion: true }
  });
  console.log('General Conditions:', JSON.stringify(generalConditions, null, 2));
  
  console.log('\n--- Esquema Check ---');
  const schemas = await prisma.esquemaCalculo.findMany({
    include: { pasos: true, variables: true }
  });
  console.log('Schemas:', JSON.stringify(schemas, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
