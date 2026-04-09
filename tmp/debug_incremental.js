const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function test() {
  try {
    console.log('1. Fetching total count...')
    const count = await p.venta.count()
    console.log('Total sales:', count)

    console.log('2. Fetching first 5 sales WITHOUT include...')
    const salesBasics = await p.venta.findMany({ take: 5 })
    console.log('Fetched basics:', salesBasics.length)

    console.log('3. Fetching with basic include (cliente)...')
    const withCliente = await p.venta.findMany({ 
      take: 1, 
      include: { cliente: true } 
    })
    console.log('With cliente success:', withCliente.length > 0)

    console.log('4. Fetching with sucursal include...')
    const withSucursal = await p.venta.findMany({ 
      take: 1, 
      include: { sucursal: true } 
    })
    console.log('With sucursal success:', withSucursal.length > 0)

    console.log('5. Fetching with detalles include...')
    const withDetalles = await p.venta.findMany({ 
      take: 1, 
      include: { detalles: true } 
    })
    console.log('With detalles success:', withDetalles.length > 0)

  } catch (e) {
    console.error('ERROR during step:', e.message)
    if (e.code) console.error('Code:', e.code)
  } finally {
    await p.$disconnect()
  }
}

test()
