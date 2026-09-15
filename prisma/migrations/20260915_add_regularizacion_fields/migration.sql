-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "motivo" TEXT,
ADD COLUMN     "hora_venta" TEXT,
ADD COLUMN     "fecha_regularizacion" TIMESTAMP(3),
ADD COLUMN     "referencia" TEXT;