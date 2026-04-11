
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    const count = await prisma.conceptoCaja.count()
    console.log('Total ConceptoCaja records:', count)
    
    const countByEmpresa = await prisma.conceptoCaja.groupBy({
      by: ['empresa_id'],
      _count: { id: true }
    })
    console.log('Count by Empresa:', JSON.stringify(countByEmpresa, null, 2))

    const sample = await prisma.conceptoCaja.findMany({
      take: 5,
      select: { id: true, codigo: true, descripcion: true, empresa_id: true }
    })
    console.log('Sample:', JSON.stringify(sample, null, 2))

  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
