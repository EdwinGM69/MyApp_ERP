SELECT id, abreviatura FROM "Moneda" LIMIT 5;
SELECT id, material_id, costo, fecha_desde FROM "MaterialCosto" ORDER BY fecha_desde DESC LIMIT 10;
SELECT id, descripcion, costo_promedio FROM "Material" WHERE descripcion ILIKE '%teclado%' LIMIT 1;
