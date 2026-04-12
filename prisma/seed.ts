import 'dotenv/config'
import process from 'process'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import pg from 'pg'
const { Pool } = pg
import { PrismaPg } from '@prisma/adapter-pg'

process.env.PGSSLMODE = 'disable'
process.env.PGSSLMODE_DISABLE = '1'

const connectionString = (process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || '').replace('sslmode=require', 'sslmode=disable')

const pool = new Pool({
  connectionString,
  ssl: false,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // Create roles
  const adminRol = await prisma.rol.upsert({
    where: { nombre: 'admin' },
    update: {},
    create: { nombre: 'admin', descripcion: 'Administrador con acceso total' },
  })

  await prisma.rol.upsert({
    where: { nombre: 'empleado' },
    update: {},
    create: { nombre: 'empleado', descripcion: 'Empleado con acceso limitado' },
  })

  // Create empresa
  const empresa = await prisma.empresa.upsert({
    where: { nif: 'RUC-20123456789' },
    update: {},
    create: {
      nombre: 'Empresa Demo SA',
      nif: 'RUC-20123456789',
      industria: 'Comercio',
      email: 'admin@empresademo.com',
      telefono: '+51 1 234-5678',
      direccion_fiscal: 'Av. Principal 123, Lima, Perú',
      moneda_default: 'PEN',
      zona_horaria: 'America/Lima',
    },
  })

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 12)
  await prisma.usuario.upsert({
    where: { empresa_id_email: { empresa_id: empresa.id, email: 'admin@empresademo.com' } },
    update: {},
    create: {
      empresa_id: empresa.id,
      rol_id: adminRol.id,
      nombre: 'Administrador',
      email: 'admin@empresademo.com',
      password_hash: passwordHash,
      activo: true,
    },
  })

  // Create impuesto
  const igv = await prisma.impuesto.upsert({
    where: { empresa_id_codigo: { empresa_id: empresa.id, codigo: 'IGV' } },
    update: {},
    create: {
      empresa_id: empresa.id,
      codigo: 'IGV',
      descripcion: 'Impuesto General a las Ventas',
      porcentaje: 18,
      tipo: 'IGV',
      activo: true,
    },
  })

  // Create sample materials
  const materialesCount = await prisma.material.count({ where: { empresa_id: empresa.id } })
  if (materialesCount === 0) {
    const materiales = [
      { codigo: 'MAT-001', descripcion: 'Laptop Dell Inspiron 15', precio_costo: 1200, precio_venta: 1599, stock_actual: 25, stock_minimo: 5 },
      { codigo: 'MAT-002', descripcion: 'Mouse Inalámbrico Logitech', precio_costo: 25, precio_venta: 45, stock_actual: 120, stock_minimo: 20 },
      { codigo: 'MAT-003', descripcion: 'Teclado Mecánico RGB', precio_costo: 80, precio_venta: 129, stock_actual: 45, stock_minimo: 10 },
      { codigo: 'MAT-004', descripcion: 'Monitor 24" Full HD', precio_costo: 200, precio_venta: 299, stock_actual: 30, stock_minimo: 5 },
      { codigo: 'MAT-005', descripcion: 'Auriculares Bluetooth Sony', precio_costo: 60, precio_venta: 99, stock_actual: 80, stock_minimo: 15 },
    ]

    for (const m of materiales) {
      await prisma.material.create({ data: { ...m, empresa_id: empresa.id, impuesto_id: igv.id } })
    }
  }

  // Create sample client
  await prisma.cliente.upsert({
    where: { empresa_id_codigo: { empresa_id: empresa.id, codigo: 'CLI-001' } },
    update: {},
    create: {
      empresa_id: empresa.id,
      codigo: 'CLI-001',
      tipo: 'empresa',
      nombre: 'Corporación Tecnológica SAC',
      nif: 'RUC-20987654321',
      email: 'compras@corptec.com',
      telefono: '+51 1 987-6543',
      contacto: 'Ana García',
    },
  })

  // Create Modulos
  const modulos = await Promise.all([
    prisma.modulo.upsert({
      where: { codigo: 'COMERCIAL' },
      update: {},
      create: { codigo: 'COMERCIAL', descripcion: 'Módulo Comercial', activo: true },
    }),
    prisma.modulo.upsert({
      where: { codigo: 'TESORERIA' },
      update: {},
      create: { codigo: 'TESORERIA', descripcion: 'Módulo Tesorería', activo: true },
    }),
    prisma.modulo.upsert({
      where: { codigo: 'LOGISTICA' },
      update: {},
      create: { codigo: 'LOGISTICA', descripcion: 'Módulo Logística', activo: true },
    }),
  ])

  // Create EmpresaModulo (associate all modulos to the empresa)
  for (const modulo of modulos) {
    await prisma.empresaModulo.upsert({
      where: { empresa_id_modulo_id: { empresa_id: empresa.id, modulo_id: modulo.id } },
      update: {},
      create: { empresa_id: empresa.id, modulo_id: modulo.id, activo: true, created_by: null },
    })
  }

  console.log('✅ Seed completed successfully!')
  console.log('')
  console.log('📋 Credenciales de acceso:')
  console.log('   Email: admin@empresademo.com')
  console.log('   Password: admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
