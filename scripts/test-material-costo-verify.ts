import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function test() {
  console.log('--- Verification of MaterialCosto logic ---')
  const payload = { empresaId: 1, userId: 1 }; // Mock
  const empresaId = payload.empresaId;
  const userId = payload.userId;

  const empresa = await prisma.empresa.findFirst()
  if (!empresa) return;

  const sucursal = await prisma.sucursal.findFirst({ where: { empresa_id: empresa.id } })
  const almacen = await prisma.almacen.findFirst({ where: { empresa_id: empresa.id } })
  const estado = await prisma.estadoStock.findFirst({ where: { empresa_id: empresa.id } })
  const material = await prisma.material.findFirst({
    where: { empresa_id: empresa.id, unidad_medida_id: { not: null } },
    include: { esquemas: { where: { activo: 1 } } }
  })

  if (!material || !sucursal || !almacen || !estado) return;

  const lot = 'LOT-VERIFY-' + Date.now()
  const unidadMedidaId = material.unidad_medida_id!
  let esquemaId = material.esquema_id || material.esquemas[0]?.esquema_id
  
  if (!esquemaId) {
    const defaultEsquema = await prisma.esquemaValoracion.findFirst({
        where: { empresa_id: empresa.id, activo: true },
        orderBy: { created_at: 'desc' }
    });
    esquemaId = defaultEsquema?.id;
  }
  if (!esquemaId) return;

  console.log(`- Material: ${material.codigo}`)
  console.log(`- Almacen ID: ${almacen.id}`)
  console.log(`- Lote: ${lot}`)

  const currentStockRes = await prisma.stockMaterial.aggregate({
    where: { 
      empresa_id: empresa.id, sucursal_id: sucursal.id, almacen_id: almacen.id,
      estado_stock_id: estado.id, material_id: material.id, unidad_medida_id: unidadMedidaId, numero_lote: lot
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
  
  console.log(`- Stock Anterior: ${stockAnt}`)
  console.log(`- Promedio Anterior: ${promAnt}`)
  console.log(`- Movimiento: ${movementQty} @ ${costoIngresado}`)
  console.log(`- Costo Esperado: ${expectedCost}`)

  // Execute logic
  await prisma.$transaction(async (tx) => {
    // 1. Capture stockAnt (as in route.ts)
    const currentStockTotal = await tx.stockMaterial.aggregate({
        where: { 
          empresa_id: empresa.id, sucursal_id: sucursal.id, almacen_id: almacen.id,
          estado_stock_id: estado.id, material_id: material.id, unidad_medida_id: unidadMedidaId, numero_lote: lot
        },
        _sum: { cantidad: true }
    });
    const sAnt = Number(currentStockTotal._sum.cantidad || 0);

    // 2. Upsert stock (as in route.ts)
    await tx.stockMaterial.upsert({
        where: {
          stock_key: {
            empresa_id: empresa.id, sucursal_id: sucursal.id, almacen_id: almacen.id,
            ubicacion_id: 1, // Any location
            estado_stock_id: estado.id, material_id: material.id, numero_lote: lot ?? null,
          }
        },
        update: { cantidad: { increment: movementQty } },
        create: {
          empresa_id: empresa.id, sucursal_id: sucursal.id, almacen_id: almacen.id,
          ubicacion_id: 1, estado_stock_id: estado.id, material_id: material.id,
          numero_lote: lot ?? null, cantidad: movementQty, unidad_medida_id: unidadMedidaId,
        }
    });

    // 3. Update Cost
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
            esquema_id: esquemaId!, costo: cNuevo, fecha_desde: new Date(),
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
