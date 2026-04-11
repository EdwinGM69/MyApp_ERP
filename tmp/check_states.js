const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function check() {
  try {
    const estados = await prisma.estadoStock.findMany()
    console.log(JSON.stringify(estados, null, 2))
  } catch (e) {
    console.error(e)
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
