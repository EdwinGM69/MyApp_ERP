import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const steps = await prisma.esquemaCalculoPasos.findMany({
    include: {
      tipo_condicion: true
    }
  })
  console.log('--- Esquema Steps ---')
  steps.forEach(s => {
    console.log(`Step ID: ${s.id}, Seq: ${s.secuencia_paso}, Desc: ${s.descripcion_corta}, Formula: ${s.formula}, Tipo: ${s.tipo}, CondID: ${s.condicion_id}`)
  })

  const condiciones = await prisma.condicion.findMany({
    include: {
      tipo_condicion: true,
      material: true
    }
  })
  console.log('\n--- Condiciones ---')
  condiciones.forEach(c => {
    console.log(`Cond ID: ${c.id}, Tipo: ${c.tipo_condicion.descripcion} (${c.tipo_condicion_id}), Material: ${c.material?.descripcion || 'GENERAL'}, Valor: ${c.valor}, Porc: ${c.porcentaje}`)
  })
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
