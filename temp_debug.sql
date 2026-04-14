-- Ver empresa 1
SELECT id, nombre, moneda_default FROM "Empresa" WHERE id = 1;

-- Ver moneda que usa la empresa
SELECT id, codigo, abreviatura FROM "Moneda" WHERE empresa_id = 1 AND abreviatura = (SELECT moneda_default FROM "Empresa" WHERE id = 1);

-- Ver todas las monedas
SELECT id, codigo, abreviatura, empresa_id FROM "Moneda" WHERE empresa_id = 1;