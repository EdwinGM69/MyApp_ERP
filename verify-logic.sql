-- Check current stock for a material with filters
SELECT 
    s.material_id, 
    m.codigo, 
    s.sucursal_id, 
    s.almacen_id, 
    s.estado_stock_id, 
    s.numero_lote, 
    s.cantidad,
    s.unidad_medida_id
FROM "StockMaterial" s
JOIN "Material" m ON m.id = s.material_id
LIMIT 10;

-- Check current cost for the same material
SELECT 
    c.material_id, 
    c.esquema_id, 
    c.costo, 
    c.fecha_desde, 
    c.fecha_hasta
FROM "MaterialCosto" c
WHERE c.fecha_hasta IS NULL
LIMIT 10;
