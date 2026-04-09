/*
  Warnings:

  - You are about to drop the column `descripcion_corta` on the `EsquemaCalculoVariables` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion_larga` on the `EsquemaCalculoVariables` table. All the data in the column will be lost.
  - Added the required column `descripcion` to the `EsquemaCalculoVariables` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EsquemaCalculoVariables" DROP COLUMN "descripcion_corta",
DROP COLUMN "descripcion_larga",
ADD COLUMN     "descripcion" TEXT NOT NULL;
