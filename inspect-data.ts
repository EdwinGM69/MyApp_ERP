import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Tipos de Operación ---')
  const tiposOp = await prisma.tipoOperacion.findMany({
    select: { id: true, codigo: true, descripcion: true, afecta_stock: true, actualiza_costo: true }
  })
  console.table(tiposOp)

  console.log('\n--- Esquemas de Valoración ---')
  const esquemas = await prisma.esquemaValoracion.findMany({
    select: { id: true, codigo: true, nombre: true, metodo_costo: true, activo: true }
  })
  console.table(esquemas)

  console.log('\n--- Materiales (primeros 5) ---')
  const materiales = await prisma.material.findMany({
    take: 5,
    select: { 
      id: true, 
      codigo: true, 
      descripcion: true, 
      esquema_id: true, 
      costo_promedio: true,
      esquemas: {
        where: { activo: 1 }
      }
    }
  })
  console.log(JSON.stringify(materiales, null, 2))

  console.log('\n--- Últimos 5 Costos de Material ---')
  const costos = await prisma.materialCosto.findMany({
    take: 5,
    orderBy: { created_at: 'desc' },
    include: { material: { select: { codigo: true } }, esquema: { select: { nombre: true } } }
  })
  console.table(costos.map(c => ({
    material: c.material.codigo,
    esquema: c.esquema.nombre,
    costo: c.costo.toString(),
    desde: c.fecha_desde,
    hasta: c.fecha_hasta
  })))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
