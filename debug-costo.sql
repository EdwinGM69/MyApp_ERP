-- 1. Check most recent MaterialCosto entries
SELECT id, material_id, costo, fecha_desde, created_at, esquema_id 
FROM "MaterialCosto" 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Check Materials with most recent updates
SELECT id, codigo, descripcion, costo_promedio, updated_at 
FROM "Material" 
ORDER BY updated_at DESC 
LIMIT 10;

-- 3. Check for specific materials updated today
SELECT id, codigo, descripcion, costo_promedio, updated_at 
FROM "Material" 
WHERE updated_at >= CURRENT_DATE;

-- 4. Check for TipoOperacion with actualiza_costo=true
SELECT id, codigo, descripcion, actualiza_costo 
FROM "TipoOperacion" 
WHERE actualiza_costo = true;
