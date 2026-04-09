import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const empresa = await prisma.empresa.findFirst();
  if (!empresa) return console.log('No empresa found');
  console.log('Empresa ID:', empresa.id);

  const sucursal = await prisma.sucursal.findFirst({ where: { empresa_id: empresa.id } });
  const cliente = await prisma.cliente.findFirst({ where: { empresa_id: empresa.id } });
  const clasePedido = await prisma.clasePedido.findFirst({ 
    where: { 
      empresa_id: empresa.id,
      registro_almacen: true,
      tipo_operacion_id: { not: null }
    } 
  });
  const material = await prisma.material.findFirst({ where: { empresa_id: empresa.id } });
  const almacen = await prisma.almacen.findFirst({ where: { empresa_id: empresa.id } });
  const um = await prisma.unidadMedida.findFirst({ where: { empresa_id: empresa.id } });
  const moneda = await prisma.moneda.findFirst({ where: { empresa_id: empresa.id } });

  console.log('MOCK_DATA:', JSON.stringify({
    sucursal_id: sucursal?.id,
    cliente_id: cliente?.id,
    clase_pedido_id: clasePedido?.id,
    material_id: material?.id,
    almacen_id: almacen?.id,
    unidad_medida_id: um?.id,
    moneda_id: moneda?.id,
  }));

  if (clasePedido) {
    console.log('ClasePedido Details:', {
      registro_almacen: clasePedido.registro_almacen,
      tipo_operacion_id: clasePedido.tipo_operacion_id,
      estado_stock_id: clasePedido.estado_stock_id
    });
  }

  // Check stock for this material/almacen
  if (material && almacen && sucursal && clasePedido) {
    const stocks = await prisma.stockMaterial.findMany({
      where: {
        material_id: material.id,
        almacen_id: almacen.id,
        sucursal_id: sucursal.id,
        estado_stock_id: clasePedido.estado_stock_id || 0
      }
    });
    console.log('Available stocks:', stocks.map(s => ({ id: s.id, qty: s.cantidad.toString(), loc: s.ubicacion_id })));
  }
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});
