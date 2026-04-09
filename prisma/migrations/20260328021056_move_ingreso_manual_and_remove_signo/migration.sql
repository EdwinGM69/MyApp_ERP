/*
  Warnings:

  - You are about to drop the column `ingreso_manual` on the `EsquemaCalculoPasos` table. All the data in the column will be lost.
  - You are about to drop the column `signo` on the `TipoCondicion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EsquemaCalculoPasos" DROP COLUMN "ingreso_manual";

-- AlterTable
ALTER TABLE "EsquemaCalculoVariables" ADD COLUMN     "ingreso_manual" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TipoCondicion" DROP COLUMN "signo";
