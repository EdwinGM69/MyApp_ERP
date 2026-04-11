const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const total = await prisma.industria.count();
    console.log('Total industries:', total);
    const all = await prisma.industria.findMany();
    console.log('Industries:', JSON.stringify(all, null, 2));
  } catch (err) {
    console.error('Error querying industries:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
