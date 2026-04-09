-- AlterTable
ALTER TABLE "MaterialComponente" ADD COLUMN     "created_by" INTEGER,
ADD COLUMN     "updated_by" INTEGER;

-- AddForeignKey
ALTER TABLE "MaterialSustituto" ADD CONSTRAINT "MaterialSustituto_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialSustituto" ADD CONSTRAINT "MaterialSustituto_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialComponente" ADD CONSTRAINT "MaterialComponente_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialComponente" ADD CONSTRAINT "MaterialComponente_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
