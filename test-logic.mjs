import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function test() {
  console.log('--- Testing MaterialCosto Update Logic ---')
  
  // 1. Get an empresa
  const empresa = await prisma.empresa.findFirst()
  if (!empresa) {
    console.error('No empresa found')
    return
  }
  console.log('Empresa:', empresa.nombre, '(ID:', empresa.id, ')')

  // 2. Get a material without esquema_id if possible, or any material
  let material = await prisma.material.findFirst({
    where: { empresa_id: empresa.id },
    include: { esquemas: { where: { activo: 1 } } }
  })

  if (!material) {
    console.error('No material found')
    return
  }
  console.log('Material:', material.codigo, '(ID:', material.id, ')')
  console.log('Esquema ID (direct):', material.esquema_id)
  console.log('Esquemas (relation):', material.esquemas.length)

  // 3. Get a TipoOperacion with actualiza_costo = true
  const tipoOp = await prisma.tipoOperacion.findFirst({
    where: { empresa_id: empresa.id, actualiza_costo: true }
  })

  if (!tipoOp) {
    console.error('No TipoOperacion with actualiza_costo=true found')
    // Let's list some to see what's available
    const allTipos = await prisma.tipoOperacion.findMany({ where: { empresa_id: empresa.id } })
    console.log('Available Tipos:', allTipos.map(t => `${t.codigo} (actualiza_costo: ${t.actualiza_costo})`))
    return
  }
  console.log('Tipo Operación:', tipoOp.codigo, '(ID:', tipoOp.id, ', actualiza_costo:', tipoOp.actualiza_costo, ')')

  // 4. Check if esquemaId would be null
  const esquemaId = material.esquemas[0]?.esquema_id || material.esquema_id
  console.log('Calculated esquemaId:', esquemaId)

  if (!esquemaId) {
    console.log('BUG CONFIRMED: Cost update would be skipped because esquemaId is null.')
  } else {
    // If we have an esquema, let's see why it might still fail
    const esquema = await prisma.esquemaValoracion.findUnique({ where: { id: esquemaId } })
    console.log('Esquema:', esquema?.nombre, 'Method:', esquema?.metodo_costo)
    
    if (esquema?.metodo_costo === 'PROMEDIO_MÓVIL') {
       // Check if there is an active MaterialCosto
       const currentCost = await prisma.materialCosto.findFirst({
         where: {
           empresa_id: empresa.id,
           material_id: material.id,
           esquema_id: esquemaId,
           fecha_hasta: null
         }
       })
       console.log('Current MaterialCosto:', currentCost ? 'Exists (ID: ' + currentCost.id + ')' : 'None (Active)')
    }
  }
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
