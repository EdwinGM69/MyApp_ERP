-- AlterTable
ALTER TABLE "Plan" ADD COLUMN "dias_duracion" INTEGER NOT NULL DEFAULT 30;

-- Backfill existing plans based on tipo_plan
UPDATE "Plan" SET "dias_duracion" = 14 WHERE "tipo_plan" = 'TRIAL';
UPDATE "Plan" SET "dias_duracion" = 365 WHERE "tipo_plan" = 'ANUAL';

-- Remove temporary default to match schema (no default)
ALTER TABLE "Plan" ALTER COLUMN "dias_duracion" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PlanPrecio" DROP COLUMN "dias_duracion";
