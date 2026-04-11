/*
  Warnings:

  - You are about to drop the column `almacen` on the `MovimientoAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `MovimientoAlmacen` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MovimientoAlmacen" DROP COLUMN "almacen",
DROP COLUMN "tipo",
ADD COLUMN     "cliente_id" INTEGER,
ADD COLUMN     "sucursal_id" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "tipo_operacion_id" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "MovimientoAlmacenDetalle" ADD COLUMN     "almacen_dst_id" INTEGER,
ADD COLUMN     "almacen_id" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "linea" TEXT,
ADD COLUMN     "numero_lote" TEXT,
ADD COLUMN     "sucursal_dst_id" INTEGER,
ADD COLUMN     "sucursal_id" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Proveedor" ADD COLUMN     "banco_id" INTEGER,
ADD COLUMN     "tipo_cuenta_id" INTEGER;

-- CreateTable
CREATE TABLE "Banco" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "pais_id" INTEGER,
    "codigo_swift" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "updated_by" INTEGER,

    CONSTRAINT "Banco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoCuentaBanco" (
    "id" SERIAL NOT NULL,
    "banco_id" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "updated_by" INTEGER,

    CONSTRAINT "TipoCuentaBanco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Almacen" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "updated_by" INTEGER,

    CONSTRAINT "Almacen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sucursal" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "direccion" TEXT,
    "departamento" TEXT,
    "provincia" TEXT,
    "distrito" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "updated_by" INTEGER,

    CONSTRAINT "Sucursal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SucursalAlmacen" (
    "id" SERIAL NOT NULL,
    "sucursal_id" INTEGER NOT NULL,
    "almacen_id" INTEGER NOT NULL,
    "verificar_disponibilidad" BOOLEAN NOT NULL DEFAULT false,
    "rol" TEXT NOT NULL DEFAULT 'secundario',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "updated_by" INTEGER,

    CONSTRAINT "SucursalAlmacen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoOperacion" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "afecta_stock" BOOLEAN NOT NULL,
    "signo_origen" TEXT NOT NULL,
    "signo_destino" TEXT NOT NULL,
    "requiere_proveedor" BOOLEAN NOT NULL,
    "requiere_cliente" BOOLEAN NOT NULL,
    "requiere_suc_destino" BOOLEAN NOT NULL,
    "permite_precio_costo" BOOLEAN NOT NULL,
    "permite_precio_venta" BOOLEAN NOT NULL,
    "requiere_aprobacion" BOOLEAN NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "updated_by" INTEGER,

    CONSTRAINT "TipoOperacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Banco_empresa_id_codigo_key" ON "Banco"("empresa_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Banco_empresa_id_descripcion_key" ON "Banco"("empresa_id", "descripcion");

-- CreateIndex
CREATE UNIQUE INDEX "Almacen_empresa_id_descripcion_key" ON "Almacen"("empresa_id", "descripcion");

-- CreateIndex
CREATE UNIQUE INDEX "Sucursal_empresa_id_descripcion_key" ON "Sucursal"("empresa_id", "descripcion");

-- CreateIndex
CREATE UNIQUE INDEX "SucursalAlmacen_sucursal_id_almacen_id_key" ON "SucursalAlmacen"("sucursal_id", "almacen_id");

-- CreateIndex
CREATE UNIQUE INDEX "TipoOperacion_empresa_id_codigo_key" ON "TipoOperacion"("empresa_id", "codigo");

-- AddForeignKey
ALTER TABLE "Proveedor" ADD CONSTRAINT "Proveedor_tipo_cuenta_id_fkey" FOREIGN KEY ("tipo_cuenta_id") REFERENCES "TipoCuentaBanco"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proveedor" ADD CONSTRAINT "Proveedor_banco_id_fkey" FOREIGN KEY ("banco_id") REFERENCES "Banco"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoAlmacen" ADD CONSTRAINT "MovimientoAlmacen_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoAlmacen" ADD CONSTRAINT "MovimientoAlmacen_tipo_operacion_id_fkey" FOREIGN KEY ("tipo_operacion_id") REFERENCES "TipoOperacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Banco" ADD CONSTRAINT "Banco_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Banco" ADD CONSTRAINT "Banco_pais_id_fkey" FOREIGN KEY ("pais_id") REFERENCES "Pais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Banco" ADD CONSTRAINT "Banco_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Banco" ADD CONSTRAINT "Banco_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoCuentaBanco" ADD CONSTRAINT "TipoCuentaBanco_banco_id_fkey" FOREIGN KEY ("banco_id") REFERENCES "Banco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoCuentaBanco" ADD CONSTRAINT "TipoCuentaBanco_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoCuentaBanco" ADD CONSTRAINT "TipoCuentaBanco_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Almacen" ADD CONSTRAINT "Almacen_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Almacen" ADD CONSTRAINT "Almacen_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Almacen" ADD CONSTRAINT "Almacen_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sucursal" ADD CONSTRAINT "Sucursal_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sucursal" ADD CONSTRAINT "Sucursal_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sucursal" ADD CONSTRAINT "Sucursal_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SucursalAlmacen" ADD CONSTRAINT "SucursalAlmacen_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "Sucursal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SucursalAlmacen" ADD CONSTRAINT "SucursalAlmacen_almacen_id_fkey" FOREIGN KEY ("almacen_id") REFERENCES "Almacen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SucursalAlmacen" ADD CONSTRAINT "SucursalAlmacen_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SucursalAlmacen" ADD CONSTRAINT "SucursalAlmacen_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoOperacion" ADD CONSTRAINT "TipoOperacion_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoOperacion" ADD CONSTRAINT "TipoOperacion_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoOperacion" ADD CONSTRAINT "TipoOperacion_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
