-- AlterTable
ALTER TABLE "Proveedor" ADD COLUMN     "tipo_nif_id" INTEGER;

-- AddForeignKey
ALTER TABLE "Proveedor" ADD CONSTRAINT "Proveedor_tipo_nif_id_fkey" FOREIGN KEY ("tipo_nif_id") REFERENCES "DocumentoIdentificacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
