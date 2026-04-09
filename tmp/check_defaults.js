const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const [sucursal, clasePedido, moneda] = await Promise.all([
      prisma.sucursal.findFirst(),
      prisma.clasePedido.findFirst(),
      prisma.moneda.findFirst(),
    ]);

    console.log('--- FOUND DEFAULTS ---');
    console.log('Sucursal ID:', sucursal?.id);
    console.log('Clase Pedido ID:', clasePedido?.id);
    console.log('Moneda ID:', moneda?.id);

    if (!sucursal || !clasePedido || !moneda) {
      console.warn('WARNING: Missing one or more required default entities!');
    }
  } catch (error) {
    console.error('Error fetching defaults:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
