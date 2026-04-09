const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING DATA FIX ---');
  try {
    // 1. Get first available defaults
    const [sucursal, clasePedido, moneda] = await Promise.all([
      prisma.sucursal.findFirst(),
      prisma.clasePedido.findFirst(),
      prisma.moneda.findFirst(),
    ]);

    if (!sucursal || !clasePedido || !moneda) {
      throw new Error('Fatal: Cannot find default sucursal, clasePedido or moneda. Please create them first.');
    }

    console.log('Using defaults:', { sucursalId: sucursal.id, clasePedidoId: clasePedido.id, monedaId: moneda.id });

    // 2. Fix Venta table
    const updateVentas = await prisma.venta.updateMany({
      where: {
        OR: [
          { sucursal_id: null },
          { clase_pedido_id: null },
          { moneda_id: null }
        ]
      },
      data: {
        sucursal_id: sucursal.id,
        clase_pedido_id: clasePedido.id,
        moneda_id: moneda.id
      }
    });

    console.log(`Updated ${updateVentas.count} sales records with missing fields.`);

    // 3. Fix VentaDetalle (ensure almacen_id exists if it's mandatory)
    // First find a default warehouse
    const defaultAlmacen = await prisma.almacen.findFirst();
    if (defaultAlmacen) {
        const updateDetalles = await prisma.ventaDetalle.updateMany({
          where: {
            OR: [
              { almacen_id: null },
              { almacen_id: 0 }
            ]
          },
          data: {
            almacen_id: defaultAlmacen.id
          }
        });
        console.log(`Updated ${updateDetalles.count} sale details with missing warehouse.`);
    }

    console.log('--- DATA FIX COMPLETED SUCCESSFULY ---');
  } catch (err) {
    console.error('Error during data fix:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
