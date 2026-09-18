const { Client } = require('pg');
const c = new Client({
  host: 'aws-1-us-east-1.pooler.supabase.com',
  port: 5432,
  user: 'postgres.jileukbohzeapbwbxmae',
  password: 'jdC0lXzFQFvuZ4Vd',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});
c.connect().then(async () => {
  console.log('--- empresa_id remaining? ---');
  const e = await c.query(`SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='empresa_id' AND table_name IN ('UnidadMedida','MaterialPresentacion','Industria','Pais','Moneda','MonedaDenominacion','Banco','TipoCuentaBanco','DocumentoIdentificacion') ORDER BY table_name`);
  console.log(JSON.stringify(e.rows));
  console.log('--- new columns ---');
  const n = await c.query(`SELECT table_name, column_name, udt_name, numeric_precision, numeric_scale, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND ((table_name='UnidadMedida' AND column_name='tipo_unidad') OR (table_name='MaterialPresentacion' AND column_name IN ('venta_fraccionada','cantidad_minima','cantidad_maxima','cantidad_incremento','precision'))) ORDER BY 1,2`);
  for (const r of n.rows) console.log(r.table_name + '|' + r.column_name + '|' + r.udt_name + '|' + r.numeric_precision + '/' + r.numeric_scale + '|' + r.is_nullable + '|' + r.column_default);
  console.log('--- counts ---');
  for (const t of ['Industria','Moneda','DocumentoIdentificacion','Pais','Banco','MonedaDenominacion']) {
    const r = await c.query(`SELECT count(*)::int n FROM "${t}"`);
    console.log(t + ': ' + r.rows[0].n);
  }
  console.log('--- FK orphan check ---');
  const orphan = await c.query(`SELECT count(*)::int n FROM "Material" WHERE moneda_costo_promedio_id IS NOT NULL AND moneda_costo_promedio_id NOT IN (SELECT id FROM "Moneda")`);
  console.log('Material orphan moneda_costo: ' + orphan.rows[0].n);
  await c.end();
}).catch(e => { console.error('ERR: ' + e.message); process.exit(1); });