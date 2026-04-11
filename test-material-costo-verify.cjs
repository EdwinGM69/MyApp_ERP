const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function test() {
  console.log('--- Verification of MaterialCosto logic (CJS) ---')
  const userId = 1;

  const empresa = await prisma.empresa.findFirst()
  if (!empresa) {
    console.log('No empresa found');
    return;
  }

  const sucursal = await prisma.sucursal.findFirst({ where: { empresa_id: empresa.id } })
  const almacen = await prisma.almacen.findFirst({ where: { empresa_id: empresa.id } })
  const estado = await prisma.estadoStock.findFirst({ where: { empresa_id: empresa.id } })
  
  // Find a material with a valid unit of measure
  const material = await prisma.material.findFirst({
    where: { empresa_id: empresa.id, unidad_medida_id: { not: null } },
    include: { esquemas: { where: { activo: 1 } } }
  })

  if (!material || !sucursal || !almacen || !estado) {
    console.log('Missing data:', { material: !!material, sucursal: !!sucursal, almacen: !!almacen, estado: !!estado });
    return;
  }

  const lot = 'LOT-CJS-' + Date.now()
  const unidadMedidaId = material.unidad_medida_id
  let esquemaId = material.esquema_id || (material.esquemas[0] ? material.esquemas[0].esquema_id : null)
  
  if (!esquemaId) {
    const defaultEsquema = await prisma.esquemaValoracion.findFirst({
        where: { empresa_id: empresa.id, activo: true },
        orderBy: { created_at: 'desc' }
    });
    esquemaId = defaultEsquema ? defaultEsquema.id : null;
  }

  if (!esquemaId) {
    console.log('No valuation scheme found.');
    return;
  }

  console.log(`- Material: ${material.codigo} (ID: ${material.id})`)
  console.log(`- Almacen: ${almacen.descripcion} (ID: ${almacen.id})`)
  console.log(`- Lote: ${lot}`)

  // 1. Get Stock ANT (using the new logic)
  const currentStockRes = await prisma.stockMaterial.aggregate({
    where: { 
      empresa_id: empresa.id,
      sucursal_id: sucursal.id,
      almacen_id: almacen.id,
      estado_stock_id: estado.id,
      material_id: material.id,
      unidad_medida_id: unidadMedidaId,
      numero_lote: lot
    },
    _sum: { cantidad: true }
  })
  const stockAnt = Number(currentStockRes._sum.cantidad || 0)
  
  const currentCostRec = await prisma.materialCosto.findFirst({
    where: { empresa_id: empresa.id, material_id: material.id, esquema_id: esquemaId, fecha_hasta: null },
    orderBy: { fecha_desde: 'desc' }
  });
  const promAnt = currentCostRec ? Number(currentCostRec.costo) : Number(material.costo_promedio || 0);

  const movementQty = 10
  const costoIngresado = 75
  const stockDespues = stockAnt + movementQty
  const expectedCost = (stockAnt * promAnt + movementQty * costoIngresado) / stockDespues
  
  console.log(`- Stock Anterior (Filtered): ${stockAnt}`)
  console.log(`- Promedio Anterior: ${promAnt}`)
  console.log(`- Movimiento: ${movementQty} @ ${costoIngresado}`)
  console.log(`- Costo Esperado: ${expectedCost}`)

  // 2. Perform transaction (replicating route.ts)
  await prisma.$transaction(async (tx) => {
    // Re-verify stockAnt inside tx
    const currentStockTotal = await tx.stockMaterial.aggregate({
        where: { 
          empresa_id: empresa.id,
          sucursal_id: sucursal.id,
          almacen_id: almacen.id,
          estado_stock_id: estado.id,
          material_id: material.id,
          unidad_medida_id: unidadMedidaId,
          numero_lote: lot
        },
        _sum: { cantidad: true }
    });
    const sAnt = Number(currentStockTotal._sum.cantidad || 0);

    // Upsert stock
    await tx.stockMaterial.upsert({
        where: {
          stock_key: {
            empresa_id: empresa.id, sucursal_id: sucursal.id, almacen_id: almacen.id,
            ubicacion_id: 1, // Fallback location
            estado_stock_id: estado.id, material_id: material.id, numero_lote: lot,
          }
        },
        update: { cantidad: { increment: movementQty } },
        create: {
          empresa_id: empresa.id, sucursal_id: sucursal.id, almacen_id: almacen.id,
          ubicacion_id: 1, estado_stock_id: estado.id, material_id: material.id,
          numero_lote: lot, cantidad: movementQty, unidad_medida_id: unidadMedidaId,
        }
    });

    const monedaId = material.moneda_costo_promedio_id || 1;
    const pAnt = currentCostRec ? Number(currentCostRec.costo) : Number(material.costo_promedio || 0);
    const sDespues = sAnt + movementQty;

    const cNuevo = sDespues > 0 
        ? (sAnt * pAnt + movementQty * costoIngresado) / sDespues
        : costoIngresado;

    if (currentCostRec) {
        await tx.materialCosto.update({
            where: { id: currentCostRec.id },
            data: { fecha_hasta: new Date() }
        });
    }

    const newCostRec = await tx.materialCosto.create({
        data: {
            empresa_id: empresa.id, material_id: material.id, moneda_id: monedaId,
            esquema_id: esquemaId, costo: cNuevo, fecha_desde: new Date(),
            fecha_hasta: null, created_by: userId
        }
    });

    console.log(`- Nuevo Costo Grabado: ${newCostRec.costo}`)
    
    if (Math.abs(Number(newCostRec.costo) - expectedCost) < 0.0001) {
        console.log('✅ VERIFICATION SUCCESSFUL: New cost matches expected value.');
    } else {
        console.log('❌ VERIFICATION FAILED: Cost mismatch.');
    }
  });
}

test().catch(console.error).finally(() => prisma.$disconnect())
