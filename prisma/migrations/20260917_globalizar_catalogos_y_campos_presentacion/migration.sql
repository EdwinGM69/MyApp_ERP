-- ============================================================
-- Migration: globalizar catálogos (quitar empresa_id) y
-- agregar campos a UnidadMedida / MaterialPresentacion
-- ============================================================

-- ------------------------------------------------------------
-- 1. UnidadMedida: enum TipoUnidadMedida + columna tipo_unidad
-- ------------------------------------------------------------
DO $$
BEGIN
  CREATE TYPE "TipoUnidadMedida" AS ENUM ('PESO', 'VOLUMEN', 'LONGITUD', 'AREA', 'CANTIDAD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "UnidadMedida"
  ADD COLUMN IF NOT EXISTS "tipo_unidad" "TipoUnidadMedida" NOT NULL DEFAULT 'CANTIDAD';

-- ------------------------------------------------------------
-- 2. MaterialPresentacion: columnas de venta fraccionada
-- ------------------------------------------------------------
ALTER TABLE "MaterialPresentacion"
  ADD COLUMN IF NOT EXISTS "venta_fraccionada" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "cantidad_minima" DECIMAL(12, 3),
  ADD COLUMN IF NOT EXISTS "cantidad_maxima" DECIMAL(12, 3),
  ADD COLUMN IF NOT EXISTS "cantidad_incremento" DECIMAL(12, 3),
  ADD COLUMN IF NOT EXISTS "precision" INTEGER NOT NULL DEFAULT 2;

-- ------------------------------------------------------------
-- 3. Moneda: deduplicar (PEN/4,6 -> 1 ; USD/3,5 -> 2) y quitar empresa_id
-- ------------------------------------------------------------
UPDATE "Material" SET "moneda_costo_promedio_id" = CASE WHEN "moneda_costo_promedio_id" IN (3, 5) THEN 2 WHEN "moneda_costo_promedio_id" IN (4, 6) THEN 1 ELSE "moneda_costo_promedio_id" END WHERE "moneda_costo_promedio_id" IN (3, 4, 5, 6);
UPDATE "Material" SET "moneda_precio_compra_id" = CASE WHEN "moneda_precio_compra_id" IN (3, 5) THEN 2 WHEN "moneda_precio_compra_id" IN (4, 6) THEN 1 ELSE "moneda_precio_compra_id" END WHERE "moneda_precio_compra_id" IN (3, 4, 5, 6);
UPDATE "MaterialCosto" SET "moneda_id" = CASE WHEN "moneda_id" IN (3, 5) THEN 2 WHEN "moneda_id" IN (4, 6) THEN 1 ELSE "moneda_id" END WHERE "moneda_id" IN (3, 4, 5, 6);
UPDATE "TipoCambio" SET "moneda_base" = CASE WHEN "moneda_base" IN (3, 5) THEN 2 WHEN "moneda_base" IN (4, 6) THEN 1 ELSE "moneda_base" END WHERE "moneda_base" IN (3, 4, 5, 6);
UPDATE "TipoCambio" SET "moneda_cotizada" = CASE WHEN "moneda_cotizada" IN (3, 5) THEN 2 WHEN "moneda_cotizada" IN (4, 6) THEN 1 ELSE "moneda_cotizada" END WHERE "moneda_cotizada" IN (3, 4, 5, 6);
UPDATE "Condicion" SET "moneda_id" = CASE WHEN "moneda_id" IN (3, 5) THEN 2 WHEN "moneda_id" IN (4, 6) THEN 1 ELSE "moneda_id" END WHERE "moneda_id" IN (3, 4, 5, 6);
UPDATE "CajaGestion" SET "moneda_id" = CASE WHEN "moneda_id" IN (3, 5) THEN 2 WHEN "moneda_id" IN (4, 6) THEN 1 ELSE "moneda_id" END WHERE "moneda_id" IN (3, 4, 5, 6);
UPDATE "TransaccionCaja" SET "moneda_id" = CASE WHEN "moneda_id" IN (3, 5) THEN 2 WHEN "moneda_id" IN (4, 6) THEN 1 ELSE "moneda_id" END WHERE "moneda_id" IN (3, 4, 5, 6);
UPDATE "Venta" SET "moneda_id" = CASE WHEN "moneda_id" IN (3, 5) THEN 2 WHEN "moneda_id" IN (4, 6) THEN 1 ELSE "moneda_id" END WHERE "moneda_id" IN (3, 4, 5, 6);
UPDATE "Cupon" SET "moneda_id" = CASE WHEN "moneda_id" IN (3, 5) THEN 2 WHEN "moneda_id" IN (4, 6) THEN 1 ELSE "moneda_id" END WHERE "moneda_id" IN (3, 4, 5, 6);
UPDATE "SuscripcionPeriodo" SET "moneda_id" = CASE WHEN "moneda_id" IN (3, 5) THEN 2 WHEN "moneda_id" IN (4, 6) THEN 1 ELSE "moneda_id" END WHERE "moneda_id" IN (3, 4, 5, 6);
UPDATE "MonedaDenominacion" SET "moneda_id" = CASE WHEN "moneda_id" IN (3, 5) THEN 2 WHEN "moneda_id" IN (4, 6) THEN 1 ELSE "moneda_id" END WHERE "moneda_id" IN (3, 4, 5, 6);

DELETE FROM "Moneda" WHERE "id" IN (3, 4, 5, 6);

ALTER TABLE "Moneda" DROP CONSTRAINT IF EXISTS "Moneda_empresa_id_fkey";
DROP INDEX IF EXISTS "Moneda_empresa_id_abreviatura_key";
ALTER TABLE "Moneda" DROP COLUMN IF EXISTS "empresa_id";
CREATE UNIQUE INDEX IF NOT EXISTS "Moneda_abreviatura_key" ON "Moneda"("abreviatura");

-- ------------------------------------------------------------
-- 4. Industria: deduplicar y quitar empresa_id
-- ------------------------------------------------------------
UPDATE "Empresa" SET "industria_id" = CASE WHEN "industria_id" BETWEEN 41 AND 50 THEN "industria_id" - 10 WHEN "industria_id" BETWEEN 51 AND 60 THEN "industria_id" - 20 ELSE "industria_id" END WHERE "industria_id" BETWEEN 41 AND 60;
UPDATE "Proveedor" SET "industria_id" = CASE WHEN "industria_id" BETWEEN 41 AND 50 THEN "industria_id" - 10 WHEN "industria_id" BETWEEN 51 AND 60 THEN "industria_id" - 20 ELSE "industria_id" END WHERE "industria_id" BETWEEN 41 AND 60;

DELETE FROM "Industria" WHERE "id" NOT IN (SELECT MIN("id") FROM "Industria" GROUP BY "descripcion");

ALTER TABLE "Industria" DROP CONSTRAINT IF EXISTS "Industria_empresa_id_fkey";
DROP INDEX IF EXISTS "Industria_empresa_id_descripcion_key";
ALTER TABLE "Industria" DROP COLUMN IF EXISTS "empresa_id";
CREATE UNIQUE INDEX IF NOT EXISTS "Industria_descripcion_key" ON "Industria"("descripcion");

-- ------------------------------------------------------------
-- 5. DocumentoIdentificacion: deduplicar y quitar empresa_id
--     DNI: 15/19/23 -> 1 ; RUC: 16/20/24 -> 2 ; CE: 21/25 -> 17 ; PAS: 22/26 -> 18
-- ------------------------------------------------------------
UPDATE "Proveedor" SET "tipo_nif_id" = CASE
  WHEN "tipo_nif_id" IN (15, 19, 23) THEN 1
  WHEN "tipo_nif_id" IN (16, 20, 24) THEN 2
  WHEN "tipo_nif_id" IN (21, 25)     THEN 17
  WHEN "tipo_nif_id" IN (22, 26)     THEN 18
  ELSE "tipo_nif_id" END
WHERE "tipo_nif_id" IN (15, 16, 19, 20, 21, 22, 23, 24, 25, 26);

UPDATE "Venta" SET "doc_identificacion_id" = CASE
  WHEN "doc_identificacion_id" IN (15, 19, 23) THEN 1
  WHEN "doc_identificacion_id" IN (16, 20, 24) THEN 2
  WHEN "doc_identificacion_id" IN (21, 25)     THEN 17
  WHEN "doc_identificacion_id" IN (22, 26)     THEN 18
  ELSE "doc_identificacion_id" END
WHERE "doc_identificacion_id" IN (15, 16, 19, 20, 21, 22, 23, 24, 25, 26);

DELETE FROM "DocumentoIdentificacion" WHERE "id" NOT IN (SELECT MIN("id") FROM "DocumentoIdentificacion" GROUP BY "abreviatura");

ALTER TABLE "DocumentoIdentificacion" DROP CONSTRAINT IF EXISTS "DocumentoIdentificacion_empresa_id_fkey";
DROP INDEX IF EXISTS "DocumentoIdentificacion_empresa_id_abreviatura_key";
DROP INDEX IF EXISTS "DocumentoIdentificacion_empresa_id_descripcion_key";
ALTER TABLE "DocumentoIdentificacion" DROP COLUMN IF EXISTS "empresa_id";
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentoIdentificacion_abreviatura_key" ON "DocumentoIdentificacion"("abreviatura");
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentoIdentificacion_descripcion_key" ON "DocumentoIdentificacion"("descripcion");

-- ------------------------------------------------------------
-- 6. Pais: quitar empresa_id
-- ------------------------------------------------------------
ALTER TABLE "Pais" DROP CONSTRAINT IF EXISTS "Pais_empresa_id_fkey";
DROP INDEX IF EXISTS "Pais_empresa_id_descripcion_key";
ALTER TABLE "Pais" DROP COLUMN IF EXISTS "empresa_id";
CREATE UNIQUE INDEX IF NOT EXISTS "Pais_descripcion_key" ON "Pais"("descripcion");

-- ------------------------------------------------------------
-- 7. Banco: quitar empresa_id
-- ------------------------------------------------------------
ALTER TABLE "Banco" DROP CONSTRAINT IF EXISTS "Banco_empresa_id_fkey";
DROP INDEX IF EXISTS "Banco_empresa_id_codigo_descripcion_key";
ALTER TABLE "Banco" DROP COLUMN IF EXISTS "empresa_id";
CREATE UNIQUE INDEX IF NOT EXISTS "Banco_codigo_descripcion_key" ON "Banco"("codigo", "descripcion");

-- ------------------------------------------------------------
-- 8. MonedaDenominacion: quitar empresa_id
-- ------------------------------------------------------------
ALTER TABLE "MonedaDenominacion" DROP CONSTRAINT IF EXISTS "MonedaDenominacion_empresa_id_fkey";
DROP INDEX IF EXISTS "MonedaDenominacion_empresa_id_moneda_id_valor_key";
DROP INDEX IF EXISTS "MonedaDenominacion_empresa_id_moneda_id_idx";
ALTER TABLE "MonedaDenominacion" DROP COLUMN IF EXISTS "empresa_id";
CREATE UNIQUE INDEX IF NOT EXISTS "MonedaDenominacion_moneda_id_valor_key" ON "MonedaDenominacion"("moneda_id", "valor");
CREATE INDEX IF NOT EXISTS "MonedaDenominacion_moneda_id_idx" ON "MonedaDenominacion"("moneda_id");