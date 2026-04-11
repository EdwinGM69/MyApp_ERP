const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Attempting to connect to database...');
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log('Connection successful:', result);
    
    const count = await prisma.usuario.count();
    console.log('Total users:', count);
  } catch (err) {
    console.error('Connection failed:');
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
