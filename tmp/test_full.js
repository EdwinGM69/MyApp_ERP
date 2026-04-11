const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function test() {
  try {
    console.log('Testing full include...')
    const sales = await p.venta.findMany({
      take: 1,
      include: {
        cliente: { select: { nombre: true } },
        detalles: { 
          include: { 
            material: { select: { descripcion: true } },
            almacen: { select: { descripcion: true } },
            unidad_medida: { select: { abreviatura: true } },
            condiciones: { include: { condicion: { select: { descripcion: true } } } }
          } 
        },
        sucursal: { select: { descripcion: true } },
        clase_pedido: { select: { descripcion: true } },
      }
    })
    console.log('Success! Found:', sales.length)
    if (sales.length > 0) {
       console.log('Venta ID:', sales[0].id)
       console.log('Detalles count:', sales[0].detalles.length)
    }
  } catch (e) {
    console.error('FAILED:', e.message)
    if (e.code) console.error('Code:', e.code)
  } finally {
    await p.$disconnect()
  }
}

test()
