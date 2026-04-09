import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const empresa = await prisma.empresa.findFirst()
  if (!empresa) return console.log('No empresa')

  const tipo = await prisma.tipoOperacion.findFirst({
    where: { empresa_id: empresa.id, actualiza_costo: true }
  })
  console.log('TipoOp:', JSON.stringify(tipo))

  const material = await prisma.material.findFirst({
    where: { empresa_id: empresa.id }
  })
  console.log('Material:', JSON.stringify(material))

  const esquema = await prisma.esquemaValoracion.findFirst({
    where: { empresa_id: empresa.id, activo: true }
  })
  console.log('Esquema:', JSON.stringify(esquema))
}

main().catch(console.error).finally(() => prisma.$disconnect())
