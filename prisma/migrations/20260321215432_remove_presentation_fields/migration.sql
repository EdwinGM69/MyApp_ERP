/*
  Warnings:

  - You are about to drop the column `codigo_impuesto` on the `Empresa` table. All the data in the column will be lost.
  - You are about to drop the column `codigo_barras` on the `MaterialPresentacion` table. All the data in the column will be lost.
  - You are about to drop the column `precio_venta` on the `MaterialPresentacion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Empresa" DROP COLUMN "codigo_impuesto";

-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "moneda_costo_promedio_id" INTEGER,
ADD COLUMN     "moneda_precio_compra_id" INTEGER;

-- AlterTable
ALTER TABLE "MaterialPresentacion" DROP COLUMN "codigo_barras",
DROP COLUMN "precio_venta";

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_moneda_precio_compra_id_fkey" FOREIGN KEY ("moneda_precio_compra_id") REFERENCES "Moneda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_moneda_costo_promedio_id_fkey" FOREIGN KEY ("moneda_costo_promedio_id") REFERENCES "Moneda"("id") ON DELETE SET NULL ON UPDATE CASCADE;
