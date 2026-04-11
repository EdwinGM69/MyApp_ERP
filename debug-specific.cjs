const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function debug() {
  try {
    const user = await prisma.usuario.findFirst({
      where: { email: 'admin@empresademo.com' },
      include: { empresa: true }
    })

    if (!user) {
      console.log('User not found')
      return
    }

    console.log('User:', user.nombre, 'Empresa:', user.empresa.nombre, 'ID:', user.empresa.id)

    const material = await prisma.material.findFirst({
      where: { 
        empresa_id: user.empresa.id,
        descripcion: { contains: 'teclado mecanico RGB', mode: 'insensitive' }
      }
    })

    if (!material) {
      console.log('Material not found')
      // Let's list all materials for this empresa
      const allMaterials = await prisma.material.findMany({
        where: { empresa_id: user.empresa.id },
        select: { id: true, codigo: true, descripcion: true }
      })
      console.log('All Materials:', JSON.stringify(allMaterials, null, 2))
      return
    }

    console.log('Material found:', JSON.stringify(material, null, 2))

    // Check if it has a cost record
    const costRecords = await prisma.materialCosto.findMany({
      where: { material_id: material.id, empresa_id: user.empresa.id },
      orderBy: { fecha_desde: 'desc' }
    })
    console.log('Cost Records:', JSON.stringify(costRecords, null, 2))

    // Check EsquemaValoracion
    const esquemas = await prisma.esquemaValoracion.findMany({
      where: { empresa_id: user.empresa.id }
    })
    console.log('Esquemas:', JSON.stringify(esquemas, null, 2))

    // Check Tipos de Operacion
    const tipos = await prisma.tipoOperacion.findMany({
      where: { empresa_id: user.empresa.id }
    })
    console.log('Tipos:', JSON.stringify(tipos.map(t => ({ codigo: t.codigo, actualiza_costo: t.actualiza_costo })), null, 2))

  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

debug()
