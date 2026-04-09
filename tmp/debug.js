const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function d() {
  try {
    const count = await p.venta.count()
    console.log('Count:', count)
    if (count > 0) {
      console.log('Fetching first venta with all relations...')
      const v = await p.venta.findFirst({
        include: {
          cliente: true,
          sucursal: true,
          detalles: {
            include: {
              material: true,
              almacen: true,
              unidad_medida: true
            }
          }
        }
      })
      console.log('First Venta ID:', v?.id)
      console.log('Venta details count:', v?.detalles?.length)
    } else {
      console.log('No ventas found.')
    }
  } catch (e) {
    console.error('CRITICAL ERROR:', e.message)
    if (e.code) console.log('Prisma Code:', e.code)
  } finally {
    await p.$disconnect()
  }
}

d()
