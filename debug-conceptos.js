
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    const conceptos = await prisma.conceptoCaja.findMany({
      orderBy: { id: 'asc' }
    })
    console.log(JSON.stringify(conceptos, null, 2))
  } catch (err) {
    console.error('Error fetching ConceptoCaja:', err)
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
