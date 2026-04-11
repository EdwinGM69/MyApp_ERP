const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

console.log('Available Prisma models:', Object.keys(prisma).filter(k => !k.startsWith('$')))

if (prisma.ubicacion) {
  console.log('✅ prisma.ubicacion is defined')
} else {
  console.log('❌ prisma.ubicacion is UNDEFINED')
}

prisma.$disconnect()
