-- Globalizar UnidadMedida: eliminar empresa_id y relación con Empresa
-- La unicidad pasa de (empresa_id, abreviatura) a (abreviatura)

-- 1. Eliminar la FK hacia Empresa
ALTER TABLE "UnidadMedida" DROP CONSTRAINT IF EXISTS "UnidadMedida_empresa_id_fkey";

-- 2. Eliminar el índice único compuesto (empresa_id, abreviatura)
DROP INDEX IF EXISTS "UnidadMedida_empresa_id_abreviatura_key";

-- 3. Eliminar la columna empresa_id
ALTER TABLE "UnidadMedida" DROP COLUMN IF EXISTS "empresa_id";

-- 4. Nuevo índice único global por abreviatura
CREATE UNIQUE INDEX IF NOT EXISTS "UnidadMedida_abreviatura_key" ON "UnidadMedida"("abreviatura");
