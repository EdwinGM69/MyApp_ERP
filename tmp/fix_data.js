const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function fix() {
  try {
    const sucursal = await p.sucursal.findFirst()
    const moneda = await p.moneda.findFirst()
    
    if (!sucursal) {
      console.error('No se encontró ninguna sucursal. Cree una primero.')
      return
    }
    
    console.log(`Usando sucursal ID: ${sucursal.id} y moneda ID: ${moneda?.id || 'N/A'} para corregir registros.`)
    
    const count = await p.venta.count({
      where: {
        OR: [
          { sucursal_id: 0 },
          { sucursal_id: null }
        ]
      }
    })
    
    console.log(`Ventas para corregir: ${count}`)
    
    if (count > 0) {
      await p.venta.updateMany({
        where: {
          OR: [
            { sucursal_id: 0 },
            { sucursal_id: null }
          ]
        },
        data: {
          sucursal_id: sucursal.id,
          moneda_id: moneda ? moneda.id : undefined
        }
      })
      console.log('Ventas actualizadas correctamente.')
    }
    
  } catch (e) {
    console.error('Error durante la corrección:', e.message)
  } finally {
    await p.$disconnect()
  }
}

fix()
