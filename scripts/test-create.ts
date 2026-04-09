import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const mov = await prisma.movimientoAlmacen.create({
      data: {
        sucursal_id: 1,
        tipo_operacion_id: 2,
        documento: "",
        numero_pedido: "TEST-MOV-DEBUG",
        cliente_id: null,
        proveedor_id: null,
        referencia: "Carga inicial por implementación ERP",
        observaciones: "",
        empresa_id: 1,
        created_by: 1,
        detalles: {
          create: [
            {
              linea: "1",
              sucursal_id: 1,
              almacen_id: 1,
              estado_stock_id: 1,
              numero_lote: null,
              material_id: 3,
              cantidad: 20,
              costo_unit: 0,
              sucursal_dst_id: null,
              almacen_dst_id: null,
              esquema_id: 1, // some number
              created_by: 1,
              distribuciones: {
                create: [
                  {
                    empresa_id: 1,
                    numero_lote: null,
                    fecha_expiracion: null,
                    ubicacion_id: 1,
                    cantidad: 20,
                    created_by: 1
                  }
                ]
              }
            }
          ]
        }
      }
    })
    console.log("Success!", mov.id)
  } catch (err: any) {
    console.error("PRISMA EXACT ERROR ->", err.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
