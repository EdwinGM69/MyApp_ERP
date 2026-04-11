/*
  Warnings:

  - You are about to drop the column `categoria` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `permite_precio_venta` on the `TipoOperacion` table. All the data in the column will be lost.
  - Made the column `linea` on table `MovimientoAlmacenDetalle` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `actualiza_costo` to the `TipoOperacion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Material" DROP COLUMN "categoria",
DROP COLUMN "tipo",
ADD COLUMN     "esquema_id" INTEGER,
ADD COLUMN     "stock_lote" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "MovimientoAlmacen" ADD COLUMN     "numero_pedido" TEXT;

-- AlterTable
ALTER TABLE "MovimientoAlmacenDetalle" ADD COLUMN     "esquema_id" INTEGER,
ADD COLUMN     "estado_stock_id" INTEGER,
ALTER COLUMN "linea" SET NOT NULL;

-- AlterTable
ALTER TABLE "TipoOperacion" DROP COLUMN "permite_precio_venta",
ADD COLUMN     "actualiza_costo" BOOLEAN NOT NULL,
ADD COLUMN     "estado_stock_id" INTEGER,
ADD COLUMN     "requiere_pedido" BOOLEAN DEFAULT false;

-- CreateTable
CREATE TABLE "MaterialCosto" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "moneda_id" INTEGER NOT NULL,
    "costo" DECIMAL(12,2) NOT NULL,
    "fecha_desde" TIMESTAMP(3) NOT NULL,
    "fecha_hasta" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "aproved_at" TIMESTAMP(3),
    "aproved_by" INTEGER,
    "esquema_id" INTEGER NOT NULL,

    CONSTRAINT "MaterialCosto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EsquemaValoracion" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "metodo_costo" TEXT,
    "decimal_precision" INTEGER NOT NULL DEFAULT 2,
    "requiere_aprobacion" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "updated_by" INTEGER,

    CONSTRAINT "EsquemaValoracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EsquemaRegla" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "esquema_id" INTEGER NOT NULL,
    "tipo_regla" TEXT NOT NULL,
    "umbral_valor" TEXT,
    "accion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "updated_by" INTEGER,

    CONSTRAINT "EsquemaRegla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EsquemaValoracionLog" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "esquema_id" INTEGER NOT NULL,
    "campo_modificado" TEXT,
    "valor_anterior" TEXT,
    "valor_nuevo" TEXT,
    "motivo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,

    CONSTRAINT "EsquemaValoracionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EsquemaReglaLog" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "regla_id" INTEGER NOT NULL,
    "accion" TEXT NOT NULL,
    "snapshot_log" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,

    CONSTRAINT "EsquemaReglaLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EsquemaMaterial" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "esquema_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "activo" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,

    CONSTRAINT "EsquemaMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lote" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "numero_lote" TEXT NOT NULL,
    "fecha_fabricacion" TIMESTAMP(3),
    "fecha_expiracion" TIMESTAMP(3),
    "proveedor_id" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER NOT NULL,

    CONSTRAINT "Lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstadoStock" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,

    CONSTRAINT "EstadoStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoDetalleDistribucion" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "linea_detalle_id" INTEGER NOT NULL,
    "numero_lote" TEXT,
    "fecha_expiracion" TIMESTAMP(3),
    "ubicacion_id" INTEGER NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "updated_by" INTEGER,

    CONSTRAINT "MovimientoDetalleDistribucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EsquemaMaterialLog" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "esquema_anterior_id" INTEGER,
    "esquema_nuevo_id" INTEGER NOT NULL,
    "motivo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,

    CONSTRAINT "EsquemaMaterialLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ubicacion" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "updated_by" INTEGER,

    CONSTRAINT "Ubicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlmacenUbicacion" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "almacen_id" INTEGER NOT NULL,
    "ubicacion_id" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "updated_by" INTEGER,

    CONSTRAINT "AlmacenUbicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMaterial" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "sucursal_id" INTEGER NOT NULL,
    "almacen_id" INTEGER NOT NULL,
    "ubicacion_id" INTEGER NOT NULL,
    "estado_stock_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "numero_lote" TEXT,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "unidad_medida_id" INTEGER NOT NULL,

    CONSTRAINT "StockMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMaterialHistorial" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "sucursal_id" INTEGER NOT NULL,
    "almacen_id" INTEGER NOT NULL,
    "ubicacion_id" INTEGER NOT NULL,
    "estado_stock_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "numero_lote" TEXT,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "unidad_medida_id" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMaterialHistorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoCondicion" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "signo" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "updated_by" INTEGER,

    CONSTRAINT "TipoCondicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EsquemaCalculo" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "updated_by" INTEGER,

    CONSTRAINT "EsquemaCalculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EsquemaCalculoVariables" (
    "id" SERIAL NOT NULL,
    "esquema_id" INTEGER NOT NULL,
    "variable_id" TEXT NOT NULL,
    "descripcion_corta" TEXT NOT NULL,
    "descripcion_larga" TEXT NOT NULL,
    "condicion_id" INTEGER,
    "tipo" TEXT NOT NULL,
    "valor" DECIMAL(18,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "updated_by" INTEGER,

    CONSTRAINT "EsquemaCalculoVariables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EsquemaCalculoPasos" (
    "id" SERIAL NOT NULL,
    "esquema_id" INTEGER NOT NULL,
    "secuencia_paso" INTEGER NOT NULL,
    "descripcion_corta" TEXT NOT NULL,
    "descripcion_larga" TEXT NOT NULL,
    "ingreso_manual" BOOLEAN NOT NULL DEFAULT false,
    "formula" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "updated_by" INTEGER,

    CONSTRAINT "EsquemaCalculoPasos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterialCosto_empresa_id_material_id_idx" ON "MaterialCosto"("empresa_id", "material_id");

-- CreateIndex
CREATE INDEX "MaterialCosto_fecha_desde_fecha_hasta_idx" ON "MaterialCosto"("fecha_desde", "fecha_hasta");

-- CreateIndex
CREATE UNIQUE INDEX "EsquemaValoracion_empresa_id_codigo_key" ON "EsquemaValoracion"("empresa_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "EsquemaMaterial_esquema_id_material_id_key" ON "EsquemaMaterial"("esquema_id", "material_id");

-- CreateIndex
CREATE UNIQUE INDEX "Lote_empresa_id_material_id_numero_lote_key" ON "Lote"("empresa_id", "material_id", "numero_lote");

-- CreateIndex
CREATE UNIQUE INDEX "EstadoStock_empresa_id_codigo_key" ON "EstadoStock"("empresa_id", "codigo");

-- CreateIndex
CREATE INDEX "MovimientoDetalleDistribucion_linea_detalle_id_idx" ON "MovimientoDetalleDistribucion"("linea_detalle_id");

-- CreateIndex
CREATE INDEX "MovimientoDetalleDistribucion_empresa_id_idx" ON "MovimientoDetalleDistribucion"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "Ubicacion_empresa_id_codigo_key" ON "Ubicacion"("empresa_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "StockMaterial_empresa_id_sucursal_id_almacen_id_ubicacion_i_key" ON "StockMaterial"("empresa_id", "sucursal_id", "almacen_id", "ubicacion_id", "estado_stock_id", "material_id", "numero_lote");

-- CreateIndex
CREATE UNIQUE INDEX "TipoCondicion_empresa_id_codigo_key" ON "TipoCondicion"("empresa_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "EsquemaCalculo_empresa_id_codigo_key" ON "EsquemaCalculo"("empresa_id", "codigo");

-- CreateIndex
CREATE INDEX "Material_esquema_id_idx" ON "Material"("esquema_id");

-- CreateIndex
CREATE INDEX "MovimientoAlmacenDetalle_esquema_id_idx" ON "MovimientoAlmacenDetalle"("esquema_id");

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_esquema_id_fkey" FOREIGN KEY ("esquema_id") REFERENCES "EsquemaValoracion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialCosto" ADD CONSTRAINT "MaterialCosto_aproved_by_fkey" FOREIGN KEY ("aproved_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialCosto" ADD CONSTRAINT "MaterialCosto_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialCosto" ADD CONSTRAINT "MaterialCosto_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialCosto" ADD CONSTRAINT "MaterialCosto_esquema_id_fkey" FOREIGN KEY ("esquema_id") REFERENCES "EsquemaValoracion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialCosto" ADD CONSTRAINT "MaterialCosto_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialCosto" ADD CONSTRAINT "MaterialCosto_moneda_id_fkey" FOREIGN KEY ("moneda_id") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaValoracion" ADD CONSTRAINT "EsquemaValoracion_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaValoracion" ADD CONSTRAINT "EsquemaValoracion_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaValoracion" ADD CONSTRAINT "EsquemaValoracion_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaRegla" ADD CONSTRAINT "EsquemaRegla_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaRegla" ADD CONSTRAINT "EsquemaRegla_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaRegla" ADD CONSTRAINT "EsquemaRegla_esquema_id_fkey" FOREIGN KEY ("esquema_id") REFERENCES "EsquemaValoracion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaRegla" ADD CONSTRAINT "EsquemaRegla_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaValoracionLog" ADD CONSTRAINT "EsquemaValoracionLog_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaValoracionLog" ADD CONSTRAINT "EsquemaValoracionLog_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaValoracionLog" ADD CONSTRAINT "EsquemaValoracionLog_esquema_id_fkey" FOREIGN KEY ("esquema_id") REFERENCES "EsquemaValoracion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaReglaLog" ADD CONSTRAINT "EsquemaReglaLog_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaReglaLog" ADD CONSTRAINT "EsquemaReglaLog_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaReglaLog" ADD CONSTRAINT "EsquemaReglaLog_regla_id_fkey" FOREIGN KEY ("regla_id") REFERENCES "EsquemaRegla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaMaterial" ADD CONSTRAINT "EsquemaMaterial_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaMaterial" ADD CONSTRAINT "EsquemaMaterial_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaMaterial" ADD CONSTRAINT "EsquemaMaterial_esquema_id_fkey" FOREIGN KEY ("esquema_id") REFERENCES "EsquemaValoracion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaMaterial" ADD CONSTRAINT "EsquemaMaterial_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstadoStock" ADD CONSTRAINT "EstadoStock_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoAlmacen" ADD CONSTRAINT "MovimientoAlmacen_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoAlmacenDetalle" ADD CONSTRAINT "MovimientoAlmacenDetalle_estado_stock_id_fkey" FOREIGN KEY ("estado_stock_id") REFERENCES "EstadoStock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoAlmacenDetalle" ADD CONSTRAINT "MovimientoAlmacenDetalle_esquema_id_fkey" FOREIGN KEY ("esquema_id") REFERENCES "EsquemaValoracion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoDetalleDistribucion" ADD CONSTRAINT "MovimientoDetalleDistribucion_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoDetalleDistribucion" ADD CONSTRAINT "MovimientoDetalleDistribucion_linea_detalle_id_fkey" FOREIGN KEY ("linea_detalle_id") REFERENCES "MovimientoAlmacenDetalle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoDetalleDistribucion" ADD CONSTRAINT "MovimientoDetalleDistribucion_ubicacion_id_fkey" FOREIGN KEY ("ubicacion_id") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoOperacion" ADD CONSTRAINT "TipoOperacion_estado_stock_id_fkey" FOREIGN KEY ("estado_stock_id") REFERENCES "EstadoStock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaMaterialLog" ADD CONSTRAINT "EsquemaMaterialLog_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaMaterialLog" ADD CONSTRAINT "EsquemaMaterialLog_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaMaterialLog" ADD CONSTRAINT "EsquemaMaterialLog_esquema_anterior_id_fkey" FOREIGN KEY ("esquema_anterior_id") REFERENCES "EsquemaValoracion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaMaterialLog" ADD CONSTRAINT "EsquemaMaterialLog_esquema_nuevo_id_fkey" FOREIGN KEY ("esquema_nuevo_id") REFERENCES "EsquemaValoracion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaMaterialLog" ADD CONSTRAINT "EsquemaMaterialLog_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ubicacion" ADD CONSTRAINT "Ubicacion_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ubicacion" ADD CONSTRAINT "Ubicacion_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ubicacion" ADD CONSTRAINT "Ubicacion_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlmacenUbicacion" ADD CONSTRAINT "AlmacenUbicacion_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlmacenUbicacion" ADD CONSTRAINT "AlmacenUbicacion_almacen_id_fkey" FOREIGN KEY ("almacen_id") REFERENCES "Almacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlmacenUbicacion" ADD CONSTRAINT "AlmacenUbicacion_ubicacion_id_fkey" FOREIGN KEY ("ubicacion_id") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlmacenUbicacion" ADD CONSTRAINT "AlmacenUbicacion_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlmacenUbicacion" ADD CONSTRAINT "AlmacenUbicacion_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMaterial" ADD CONSTRAINT "StockMaterial_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMaterial" ADD CONSTRAINT "StockMaterial_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMaterial" ADD CONSTRAINT "StockMaterial_almacen_id_fkey" FOREIGN KEY ("almacen_id") REFERENCES "Almacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMaterial" ADD CONSTRAINT "StockMaterial_ubicacion_id_fkey" FOREIGN KEY ("ubicacion_id") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMaterial" ADD CONSTRAINT "StockMaterial_estado_stock_id_fkey" FOREIGN KEY ("estado_stock_id") REFERENCES "EstadoStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMaterial" ADD CONSTRAINT "StockMaterial_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMaterial" ADD CONSTRAINT "StockMaterial_unidad_medida_id_fkey" FOREIGN KEY ("unidad_medida_id") REFERENCES "UnidadMedida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMaterialHistorial" ADD CONSTRAINT "StockMaterialHistorial_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMaterialHistorial" ADD CONSTRAINT "StockMaterialHistorial_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMaterialHistorial" ADD CONSTRAINT "StockMaterialHistorial_almacen_id_fkey" FOREIGN KEY ("almacen_id") REFERENCES "Almacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMaterialHistorial" ADD CONSTRAINT "StockMaterialHistorial_ubicacion_id_fkey" FOREIGN KEY ("ubicacion_id") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMaterialHistorial" ADD CONSTRAINT "StockMaterialHistorial_estado_stock_id_fkey" FOREIGN KEY ("estado_stock_id") REFERENCES "EstadoStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMaterialHistorial" ADD CONSTRAINT "StockMaterialHistorial_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMaterialHistorial" ADD CONSTRAINT "StockMaterialHistorial_unidad_medida_id_fkey" FOREIGN KEY ("unidad_medida_id") REFERENCES "UnidadMedida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoCondicion" ADD CONSTRAINT "TipoCondicion_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaCalculo" ADD CONSTRAINT "EsquemaCalculo_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaCalculoVariables" ADD CONSTRAINT "EsquemaCalculoVariables_esquema_id_fkey" FOREIGN KEY ("esquema_id") REFERENCES "EsquemaCalculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaCalculoVariables" ADD CONSTRAINT "EsquemaCalculoVariables_condicion_id_fkey" FOREIGN KEY ("condicion_id") REFERENCES "TipoCondicion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsquemaCalculoPasos" ADD CONSTRAINT "EsquemaCalculoPasos_esquema_id_fkey" FOREIGN KEY ("esquema_id") REFERENCES "EsquemaCalculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
