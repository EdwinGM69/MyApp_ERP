import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function test() {
  console.log('--- START DIAGNOSTIC ---')
  try {
    const v = await p.venta.findFirst({
      select: {
          id: true,
          detalles: {
              select: {
                  id: true,
                  material: { select: { descripcion: true } },
                  almacen: { select: { descripcion: true } }
              }
          }
      }
    })
    console.log('Successfully fetched first venta:', v?.id)
    if (v?.detalles) {
        console.log('Detalles count:', v.detalles.length)
        if (v.detalles.length > 0) {
            console.log('Material first detail:', v.detalles[0].material?.descripcion)
            console.log('Almacen first detail:', v.detalles[0].almacen?.descripcion)
        }
    }
  } catch (e: any) {
    console.error('DIAGNOSTIC FAILED!')
    console.error('Message:', e.message)
    if (e.code) console.error('Prisma Code:', e.code)
  } finally {
    await p.$disconnect()
  }
}

test()
