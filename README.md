# ERP/POS Pro — Sistema de Gestión Empresarial SaaS

Sistema ERP modular multi-empresa construido con Next.js 14, PostgreSQL, Prisma ORM y JWT.

## 🚀 Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router) + React 18 + TypeScript |
| Estilos | Tailwind CSS 3 |
| Backend | Next.js API Routes (serverless) |
| Base de datos | PostgreSQL + Prisma ORM 5 |
| Autenticación | JWT (access 15min + refresh 7d HttpOnly cookie) |
| Hosting | Vercel (frontend + API) + Neon/Supabase (PostgreSQL) |

## 📦 Módulos Implementados

- ✅ **Autenticación** — Login, refresh token, roles Admin/Empleado
- ✅ **Dashboard** — Métricas, gráfico ventas, top productos, ventas recientes
- ✅ **Clientes** — CRUD completo con búsqueda y paginación
- ✅ **Proveedores** — CRUD con datos bancarios
- ✅ **Materiales** — CRUD con stock, precios, imágenes
- ✅ **Punto de Venta (POS)** — Grid de productos, carrito, cupones, cotización/venta
- ✅ **Caja** — Apertura/cierre, movimientos, balance del día
- ✅ **Descuentos** — CRUD por material con vigencia
- ✅ **Almacén** — Movimientos de ingreso/salida con actualización de stock
- ✅ **Offline Sync** — IndexedDB para persistencia sin conexión

## ⚙️ Instalación

### 1. Clonar y instalar dependencias

\`\`\`bash
cd erp-saas
npm install
\`\`\`

### 2. Configurar variables de entorno

\`\`\`bash
cp .env.example .env.local
\`\`\`

Editar `.env.local`:
\`\`\`env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/erp_saas"
JWT_SECRET="tu-secreto-jwt-minimo-32-caracteres"
JWT_REFRESH_SECRET="tu-secreto-refresh-minimo-32-caracteres"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
\`\`\`

### 3. Configurar base de datos

\`\`\`bash
# Generar cliente Prisma
npm run db:generate

# Ejecutar migraciones
npm run db:migrate

# Poblar con datos de prueba
npx ts-node prisma/seed.ts
\`\`\`

### 4. Iniciar servidor de desarrollo

\`\`\`bash
npm run dev
\`\`\`

Abrir [http://localhost:3000](http://localhost:3000)

## 🔑 Credenciales de prueba

| Campo | Valor |
|-------|-------|
| Email | admin@empresademo.com |
| Password | admin123 |

## 📁 Estructura del Proyecto

\`\`\`
erp-saas/
├── prisma/
│   ├── schema.prisma        ← 20 modelos con auditoría
│   └── seed.ts              ← Datos de prueba
├── src/
│   ├── app/
│   │   ├── (auth)/          ← Login, Recuperar contraseña
│   │   ├── (dashboard)/     ← Todas las páginas del ERP
│   │   └── api/             ← API Routes por módulo
│   ├── components/
│   │   ├── ui/              ← DataTable, CrudModal, Badge, etc.
│   │   └── layout/          ← Sidebar, Topbar
│   ├── hooks/
│   │   ├── useAuth.ts       ← Autenticación + apiFetch
│   │   └── useOfflineSync.ts ← IndexedDB offline
│   └── lib/
│       ├── prisma.ts        ← Singleton cliente
│       ├── jwt.ts           ← Sign/verify tokens
│       └── utils.ts         ← Helpers
└── .env.local               ← Variables de entorno
\`\`\`

## 🗄️ Modelo de Datos

20 modelos Prisma: Empresa, Usuario, Rol, Impuesto, Material, MaterialSustituto,
Cliente, Proveedor, Precio, Descuento, Cupon, CuponDetalle, Promocion,
PromocionDetalle, Venta, VentaDetalle, Caja, TransaccionCaja, NominacionCaja,
MovimientoAlmacen, MovimientoAlmacenDetalle.

Todos los modelos incluyen campos de auditoría: `created_at`, `updated_at`, `created_by`, `updated_by`.

## 🚀 Despliegue en Vercel

\`\`\`bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel --prod
\`\`\`

Agregar las variables de entorno en el dashboard de Vercel.

## 🔒 Seguridad

- Contraseñas hasheadas con bcrypt (12 rounds)
- JWT access token (15 min) + refresh token HttpOnly cookie (7 días)
- Middleware global valida JWT en todas las rutas `/api/*`
- Aislamiento multi-empresa por `empresa_id` en todas las queries
- Validación de entrada con Zod en todos los endpoints

## 📱 Diseño

Basado en el design system de referencia:
- Colores: Primary `#0d6cf2`, Sidebar dark `slate-900`
- Fuente: Inter
- Iconos: Material Symbols Outlined
- Responsive mobile-first con Tailwind CSS
