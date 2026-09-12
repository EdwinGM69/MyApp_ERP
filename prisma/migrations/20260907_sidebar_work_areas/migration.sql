-- AlterTable
ALTER TABLE "OpcionMenu" ADD COLUMN     "area_trabajo" TEXT,
ADD COLUMN     "grupo" TEXT DEFAULT 'operaciones',
ADD COLUMN     "roles_permitidos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "visible_menu" BOOLEAN NOT NULL DEFAULT true;