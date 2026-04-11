import { Prisma } from '@prisma/client'

async function main() {
  console.log('--- Inspección de modelos ---')
  
  // Inspeccionar VentaDetalle
  const dKeys = Object.keys(Prisma.VentaScalarFieldEnum)
  console.log('Scalar fields in Venta:', dKeys.join(', '))
  
  const vdKeys = Object.keys(Prisma.VentaDetalleScalarFieldEnum)
  console.log('Scalar fields in VentaDetalle:', vdKeys.join(', '))
  
  // No hay un enum directo para relaciones, pero podemos revisar el tipo generado si estuviéramos en un entorno de compilación.
  // Pero a nivel de runtime, podemos intentar una consulta simple.
}

main().catch(console.error)
