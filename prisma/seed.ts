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
    where: { nombre: 'superadmin' },
    update: {},
    create: { nombre: 'superadmin', descripcion: 'Administrador con acceso total', sistema: true, activo: true },
  })

  // Create empresa
  const empresa = await prisma.empresa.upsert({
    where: { nif: '20123456789' },
    update: {},
    create: {
      nombre: 'Empresa Demo SA',
      nif: '20123456789',
      email: 'admin@empresademo.com',
      telefono: '+51 1 234-5678',
      direccion_fiscal: 'Av. Principal 123, Lima, Perú',
      moneda_default: 'PEN',
      zona_horaria: 'America/Lima',
    },
  })

  // Create monedas
  const pen = await prisma.moneda.upsert({
    where: { empresa_id_abreviatura: { empresa_id: empresa.id, abreviatura: 'PEN' } },
    update: {},
    create: {
      empresa_id: empresa.id,
      descripcion: 'Sol Peruano',
      abreviatura: 'PEN',
      simbolo: 'S/',
      activo: true,
    },
  })

  const usd = await prisma.moneda.upsert({
    where: { empresa_id_abreviatura: { empresa_id: empresa.id, abreviatura: 'USD' } },
    update: {},
    create: {
      empresa_id: empresa.id,
      descripcion: 'Dólar Americano',
      abreviatura: 'USD',
      simbolo: '$',
      activo: true,
    },
  })

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 12)
  const adminUser = await prisma.usuario.upsert({
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

  // Create usuario rol
  await prisma.usuarioRol.upsert({
    where: { usuario_id_rol_id: { usuario_id: adminUser.id, rol_id: adminRol.id } },
    update: {},
    create: { usuario_id: adminUser.id, rol_id: adminRol.id, assigned_by: adminUser.id }
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
      create: { codigo: 'COMERCIAL', descripcion: 'Módulo Comercial', orden: 1, activo: true },
    }),
    prisma.modulo.upsert({
      where: { codigo: 'TESORERIA' },
      update: {},
      create: { codigo: 'TESORERIA', descripcion: 'Módulo Tesorería', orden: 2, activo: true },
    }),
    prisma.modulo.upsert({
      where: { codigo: 'LOGISTICA' },
      update: {},
      create: { codigo: 'LOGISTICA', descripcion: 'Módulo Logística', orden: 3, activo: true },
    }),
    prisma.modulo.upsert({
      where: { codigo: 'ADMINISTRACION' },
      update: {},
      create: { codigo: 'ADMINISTRACION', descripcion: 'Administración', orden: 4, activo: true },
    })
  ])

  const [comercialModulo, tesoreriaModulo, logisticaModulo, adminModulo] = modulos

  const parentPrincipal = await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: adminModulo.id, codigo: 'DASHBOARD' } },
    update: {},
    create: { modulo_id: adminModulo.id, codigo: 'DASHBOARD', descripcion: 'Dashboard', ruta: '/dashboard', orden: 1, activo: true, created_by: 1 },
  })

  // Módulo Comercial
  const parentComercial = await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: comercialModulo.id, codigo: 'COMERCIAL' } },
    update: {},
    create: { modulo_id: comercialModulo.id, codigo: 'COMERCIAL', descripcion: 'Módulo Comercial', orden: 2, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: comercialModulo.id, codigo: 'VENTAS' } },
    update: {},
    create: { modulo_id: comercialModulo.id, parent_id: parentComercial.id, codigo: 'VENTAS', descripcion: 'Ventas', ruta: '/ventas', orden: 3, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: comercialModulo.id, codigo: 'PUNTO_VENTA' } },
    update: {},
    create: { modulo_id: comercialModulo.id, parent_id: parentComercial.id, codigo: 'PUNTO_VENTA', descripcion: 'Punto de Venta', ruta: '/ventas/pos', orden: 4, activo: true, created_by: 1 },
  })

  const parentMaestros = await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: comercialModulo.id, codigo: 'MAESTROS_COM' } },
    update: {},
    create: { modulo_id: comercialModulo.id, parent_id: parentComercial.id, codigo: 'MAESTROS_COM', descripcion: 'Maestros', orden: 5, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: comercialModulo.id, codigo: 'CLIENTES' } },
    update: {},
    create: { modulo_id: comercialModulo.id, parent_id: parentMaestros.id, codigo: 'CLIENTES', descripcion: 'Clientes', ruta: '/maestros/clientes', orden: 6, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: comercialModulo.id, codigo: 'CONDICION_COMERCIAL' } },
    update: {},
    create: { modulo_id: comercialModulo.id, parent_id: parentMaestros.id, codigo: 'CONDICION_COMERCIAL', descripcion: 'Condicionaes Comerciales', ruta: '/maestros/comercial/condiciones', orden: 7, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: comercialModulo.id, codigo: 'CUPONES' } },
    update: {},
    create: { modulo_id: comercialModulo.id, parent_id: parentMaestros.id, codigo: 'CUPONES', descripcion: 'Cupones', ruta: '/precios/cupones', orden: 8, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: comercialModulo.id, codigo: 'PROMOCIONES' } },
    update: {},
    create: { modulo_id: comercialModulo.id, parent_id: parentMaestros.id, codigo: 'PROMOCIONES', descripcion: 'Promociones', ruta: '/precios/promociones', orden: 9, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: comercialModulo.id, codigo: 'ESQUEMA_CALCULO' } },
    update: {},
    create: { modulo_id: comercialModulo.id, parent_id: parentMaestros.id, codigo: 'ESQUEMA_CALCULO', descripcion: 'Esquema de Cálculo', ruta: '/maestros/comercial/esquemas-calculo', orden: 10, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: comercialModulo.id, codigo: 'CLASE_PEDIDO' } },
    update: {},
    create: { modulo_id: comercialModulo.id, parent_id: parentMaestros.id, codigo: 'CLASE_PEDIDO', descripcion: 'Clase de Pedido', ruta: '/maestros/comercial/clases-pedido', orden: 11, activo: true, created_by: 1 },
  })

  const parentReportes = await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: comercialModulo.id, codigo: 'REPORTES' } },
    update: {},
    create: { modulo_id: comercialModulo.id, parent_id: parentComercial.id, codigo: 'REPORTES', descripcion: 'Reportes', orden: 12, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: comercialModulo.id, codigo: 'REPORTE_VENTA' } },
    update: {},
    create: { modulo_id: comercialModulo.id, parent_id: parentReportes.id, codigo: 'REPORTE_VENTA', descripcion: 'Reporte de Venta', orden: 13, activo: true, created_by: 1 },
  })

  // Módulo de Tesoreria
  const parentTesoreria = await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: tesoreriaModulo.id, codigo: 'TESORERIA' } },
    update: {},
    create: { modulo_id: tesoreriaModulo.id, codigo: 'TESORERIA', descripcion: 'Módulo Tesoreria', orden: 14, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: tesoreriaModulo.id, codigo: 'GESTION_CAJA' } },
    update: {},
    create: { modulo_id: tesoreriaModulo.id, parent_id: parentTesoreria.id, codigo: 'GESTION_CAJA', descripcion: 'Gestión de Caja', ruta: '/gestion-caja', orden: 15, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: tesoreriaModulo.id, codigo: 'HISTORIAL_TRN' } },
    update: {},
    create: { modulo_id: tesoreriaModulo.id, parent_id: parentTesoreria.id, codigo: 'HISTORIAL_TRN', descripcion: 'Historial de Transacciones', ruta: '/consultas/transacciones-caja', orden: 16, activo: true, created_by: 1 },
  })

  const parentMaestrosTesoreria = await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: tesoreriaModulo.id, codigo: 'MAESTROS_TES' } },
    update: {},
    create: { modulo_id: tesoreriaModulo.id, parent_id: parentTesoreria.id, codigo: 'MAESTROS_TES', descripcion: 'Maestros', orden: 17, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: tesoreriaModulo.id, codigo: 'MONEDAS' } },
    update: {},
    create: { modulo_id: tesoreriaModulo.id, parent_id: parentMaestrosTesoreria.id, codigo: 'MONEDAS', descripcion: 'Monedas', ruta: '/tesoreria/monedas', orden: 18, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: tesoreriaModulo.id, codigo: 'BANCOS' } },
    update: {},
    create: { modulo_id: tesoreriaModulo.id, parent_id: parentMaestrosTesoreria.id, codigo: 'BANCOS', descripcion: 'Bancos', ruta: '/tesoreria/bancos', orden: 19, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: tesoreriaModulo.id, codigo: 'TIPO_CAMBIO' } },
    update: {},
    create: { modulo_id: tesoreriaModulo.id, parent_id: parentMaestrosTesoreria.id, codigo: 'TIPO_CAMBIO', descripcion: 'Tipos de Cambio', ruta: '/tesoreria/tipo-cambio', orden: 20, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: tesoreriaModulo.id, codigo: 'MEDIO_PAGO' } },
    update: {},
    create: { modulo_id: tesoreriaModulo.id, parent_id: parentMaestrosTesoreria.id, codigo: 'MEDIO_PAGO', descripcion: 'Medios de Pago', ruta: '/tesoreria/medios-pago', orden: 21, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: tesoreriaModulo.id, codigo: 'CAJAS' } },
    update: {},
    create: { modulo_id: tesoreriaModulo.id, parent_id: parentMaestrosTesoreria.id, codigo: 'CAJAS', descripcion: 'Cajas', ruta: '/tesoreria/cajas', orden: 22, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: tesoreriaModulo.id, codigo: 'CONCEPTO_CAJA' } },
    update: {},
    create: { modulo_id: tesoreriaModulo.id, parent_id: parentMaestrosTesoreria.id, codigo: 'CONCEPTO_CAJA', descripcion: 'Concepto Caja', ruta: '/tesoreria/conceptos-caja', orden: 23, activo: true, created_by: 1 },
  })

  // Módulo Logística
  const parentLogistica = await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'LOGISTICA' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, codigo: 'LOGISTICA', descripcion: 'Módulo Logística', orden: 24, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'MOVIMIENTO' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentLogistica.id, codigo: 'MOVIMIENTO', descripcion: 'Movimientos', ruta: '/almacen/movimientos', orden: 25, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'KARDEX' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentLogistica.id, codigo: 'KARDEX', descripcion: 'Kardex', ruta: '/almacen/kardex', orden: 26, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'STOCK_MATERIAL' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentLogistica.id, codigo: 'STOCK_MATERIAL', descripcion: 'Stock x Material', ruta: '/consultas/stock', orden: 27, activo: true, created_by: 1 },
  })

  const parentMaestrosLogistica = await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'MAESTROS_LOG' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentLogistica.id, codigo: 'MAESTROS_LOG', descripcion: 'Maestros', orden: 28, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'MARCAS' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentMaestrosLogistica.id, codigo: 'MARCAS', descripcion: 'Marcas', ruta: '/maestros/logistica/marcas', orden: 29, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'CATEGORIAS' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentMaestrosLogistica.id, codigo: 'CATEGORIAS', descripcion: 'Categorías', ruta: '/maestros/logistica/categorias', orden: 30, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'TIPO_MATERIAL' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentMaestrosLogistica.id, codigo: 'TIPO_MATERIAL', descripcion: 'Tipos de Material', ruta: '/maestros/logistica/tipos-material', orden: 31, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'UNIDAD_MEDIDA' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentMaestrosLogistica.id, codigo: 'UNIDAD_MEDIDA', descripcion: 'Unidades de Medida', ruta: '/maestros/logistica/unidades', orden: 32, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'ESTADO_STOCK' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentMaestrosLogistica.id, codigo: 'ESTADO_STOCK', descripcion: 'Estado de Stock', ruta: '/maestros/estados-stock', orden: 33, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'TIPO_OPERACION' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentMaestrosLogistica.id, codigo: 'TIPO_OPERACION', descripcion: 'Tipo de Operación', ruta: '/maestros/logistica/tipos-operacion', orden: 34, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'UBICACIONES' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentMaestrosLogistica.id, codigo: 'UBICACIONES', descripcion: 'Ubicaciones', ruta: '/maestros/ubicaciones', orden: 35, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'ALMACENES' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentMaestrosLogistica.id, codigo: 'ALMACENES', descripcion: 'Almacenes', ruta: '/maestros/logistica/almacenes', orden: 36, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'ESQUEMA_VALORACION' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentMaestrosLogistica.id, codigo: 'ESQUEMA_VALORACION', descripcion: 'Esquema de Valoración', ruta: '/maestros/logistica/esquemas-valoracion', orden: 37, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'PROVEEDORES' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentMaestrosLogistica.id, codigo: 'PROVEEDORES', descripcion: 'Proveedores', ruta: '/maestros/proveedores', orden: 38, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'MATERIALES' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentMaestrosLogistica.id, codigo: 'MATERIALES', descripcion: 'Materiales', ruta: '/maestros/materiales', orden: 39, activo: true, created_by: 1 },
  })

  // Módulo Administración
  const parentAdministracion = await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: adminModulo.id, codigo: 'ADMINISTRACION' } },
    update: {},
    create: { modulo_id: adminModulo.id, codigo: 'ADMINISTRACION', descripcion: 'Administración', orden: 40, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: adminModulo.id, codigo: 'EMPRESA' } },
    update: {},
    create: { modulo_id: adminModulo.id, parent_id: parentAdministracion.id, codigo: 'EMPRESA', descripcion: 'Empresa', ruta: '/empresa', orden: 41, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: adminModulo.id, codigo: 'ROL_USUARIO' } },
    update: {},
    create: { modulo_id: adminModulo.id, parent_id: parentAdministracion.id, codigo: 'ROL_USUARIO', descripcion: 'Rol de Usuario', ruta: '/roles', orden: 42, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: adminModulo.id, codigo: 'USUARIOS' } },
    update: {},
    create: { modulo_id: adminModulo.id, parent_id: parentAdministracion.id, codigo: 'USUARIOS', descripcion: 'Usuarios', ruta: '/usuarios', orden: 43, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: adminModulo.id, codigo: 'PARAMETROS_SISTEMA' } },
    update: {},
    create: { modulo_id: adminModulo.id, parent_id: parentAdministracion.id, codigo: 'PARAMETROS_SISTEMA', descripcion: 'Parámetros del Sistema', ruta: '/maestros/configuracion/parametros-sistema', orden: 44, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: adminModulo.id, codigo: 'INDUSTRIAS' } },
    update: {},
    create: { modulo_id: adminModulo.id, parent_id: parentAdministracion.id, codigo: 'INDUSTRIAS', descripcion: 'Industrias', ruta: '/logistica/industrias', orden: 45, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: adminModulo.id, codigo: 'PAISES' } },
    update: {},
    create: { modulo_id: adminModulo.id, parent_id: parentAdministracion.id, codigo: 'PAISES', descripcion: 'Países', ruta: '/logistica/paises', orden: 46, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: adminModulo.id, codigo: 'DOCUMENTO_ID' } },
    update: {},
    create: { modulo_id: adminModulo.id, parent_id: parentAdministracion.id, codigo: 'DOCUMENTO_ID', descripcion: 'Documentos de Identificación', ruta: '/logistica/documentos-identificacion', orden: 47, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: adminModulo.id, codigo: 'CORRELATIVOS' } },
    update: {},
    create: { modulo_id: adminModulo.id, parent_id: parentAdministracion.id, codigo: 'CORRELATIVOS', descripcion: 'Correlativos', ruta: '/maestros/comercial/correlativos', orden: 48, activo: true, created_by: 1 },
  })

  // Create Permisos for superadmin (full access to all menu options)
  const allOpcionesMenu = await prisma.opcionMenu.findMany()
  await Promise.all(
    allOpcionesMenu.map(opcion =>
      prisma.permisos.upsert({
        where: { rol_id_opcion_menu_id: { rol_id: adminRol.id, opcion_menu_id: opcion.id } },
        update: {},
        create: {
          rol_id: adminRol.id,
          opcion_menu_id: opcion.id,
          visualizar: true,
          crear: true,
          editar: true,
          borrar: true,
          exportar: true,
          importar: true,
          abrir_cerrar_caja: true,
        },
      })
    )
  )

  // Create EmpresaModulo (associate all modulos to the empresa)
  for (const modulo of modulos) {
    await prisma.empresaModulo.upsert({
      where: { empresa_id_modulo_id: { empresa_id: empresa.id, modulo_id: modulo.id } },
      update: {},
      create: { empresa_id: empresa.id, modulo_id: modulo.id, activo: true, created_by: null },
    })
  }

  // Clase de pedido
  const clasesPedido = await Promise.all([
    prisma.clasePedido.upsert({
      where: { empresa_id_codigo: { empresa_id: empresa.id, codigo: 'VTAPOS' } },
      update: {},
      create: {
        codigo: 'VTAPOS',
        descripcion: 'Venta punto de venta',
        registro_almacen: false,
        registro_caja: false,
        activo: true,
        empresa: { connect: { id: empresa.id } }
      },
    }),
  ])

  // Create Parametros de Sistema
  const parametros = await Promise.all([
    prisma.parametroSistema.upsert({
      where: { empresa_id_nivel_modulo_id_codigo: { empresa_id: empresa.id, modulo_id: comercialModulo.id, codigo: 'POS.PEDVTA', nivel: 'EMPRESA' } },
      update: {},
      create: {
        nivel: 'EMPRESA',
        codigo: 'POS.PEDVTA',
        descripcion: 'Clase pedido para punto de venta',
        tipo_dato: 'STRING',
        valor_string: 'VTAPOS',
        etiqueta: 'PEDVTA',
        activo: true,
        empresa: { connect: { id: empresa.id } },
        modulo: { connect: { id: comercialModulo.id } }
      },
    }),
    prisma.parametroSistema.upsert({
      where: { empresa_id_nivel_modulo_id_codigo: { empresa_id: empresa.id, modulo_id: comercialModulo.id, codigo: 'POS.PREVTA', nivel: 'EMPRESA' } },
      update: {},
      create: {
        nivel: 'EMPRESA',
        codigo: 'POS.PREVTA',
        descripcion: 'Precio de venta para POS',
        tipo_dato: 'STRING',
        valor_string: 'PRCVTA',
        etiqueta: 'PREVTA',
        activo: true,
        empresa: { connect: { id: empresa.id } },
        modulo: { connect: { id: comercialModulo.id } }
      },
    }),
    prisma.parametroSistema.upsert({
      where: { empresa_id_nivel_modulo_id_codigo: { empresa_id: empresa.id, modulo_id: comercialModulo.id, codigo: 'POS.DCTVENTA', nivel: 'EMPRESA' } },
      update: {},
      create: {
        nivel: 'EMPRESA',
        codigo: 'POS.DCTVENTA',
        descripcion: 'Descuento comercial para POS',
        tipo_dato: 'STRING',
        valor_string: 'DCTOVTA',
        etiqueta: 'DCTVENTA',
        activo: true,
        empresa: { connect: { id: empresa.id } },
        modulo: { connect: { id: comercialModulo.id } }
      },
    }),
  ])

  console.log('✅ Seed completed successfully!')
  console.log('')
  console.log('📋 Credenciales de acceso:')
  console.log('   Email: admin@empresademo.com')
  console.log('   Password: admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
