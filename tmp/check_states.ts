import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function check() {
  const estados = await prisma.estadoStock.findMany()
  console.log(JSON.stringify(estados, null, 2))
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
