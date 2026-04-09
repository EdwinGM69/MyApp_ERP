import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const totalVentas = await prisma.venta.count()
    console.log(`Log: Total ventas: ${totalVentas}`)

    const sinSucursal = await (prisma.venta as any).count({
      where: { sucursal_id: null }
    }).catch(() => 'Error: campo no permite null')
    console.log(`Log: Ventas sin sucursal: ${sinSucursal}`)

    const ventas = await prisma.venta.findMany({
      take: 5,
      include: {
        detalles: {
          include: {
            material: true,
            almacen: true
          }
        }
      }
    })
    console.log(`Log: Ventas obtenidas exitosamente: ${ventas.length}`)
  } catch (e: any) {
    console.error('Error en diagnóstico:', e.message)
    if (e.code === 'P2025' || e.message.includes('relation')) {
       console.log('Sugerencia: Revisar nombres de relaciones en include')
    }
  } finally {
    await prisma.$disconnect()
  }
}

main()
