/*
  Warnings:

  - You are about to drop the column `factor_conversion` on the `MaterialPresentacion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MaterialPresentacion" DROP COLUMN "factor_conversion",
ADD COLUMN     "created_by" INTEGER,
ADD COLUMN     "updated_by" INTEGER;

-- AddForeignKey
ALTER TABLE "MaterialPresentacion" ADD CONSTRAINT "MaterialPresentacion_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialPresentacion" ADD CONSTRAINT "MaterialPresentacion_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
