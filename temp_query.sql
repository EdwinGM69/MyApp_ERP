-- Ver TipoCondicion
SELECT tc.id, tc.codigo, tc.descripcion, tc.empresa_id, tc.activo
FROM "TipoCondicion" tc 
WHERE tc.empresa_id = 1 AND tc.codigo = 'PRCVTA';

-- Ver ParametroSistema
SELECT p.id, p.codigo, p.nivel, p.tipo_dato, p.valor_string, p.empresa_id, p.created_by, p.activo
FROM "ParametroSistema" p
WHERE p.codigo = 'POS.PREVTA' AND p.activo = true;

-- Ver empresa moneda_default
SELECT id, nombre, moneda_default FROM "Empresa" WHERE id = 1;

-- Ver moneda id 1
SELECT id, codigo, abreviatura, simbolo FROM "Moneda" WHERE id = 1;