const { Client } = require('pg');
const client = new Client({
  connectionString: "postgres://postgres.jileukbohzeapbwbxmae:jdC0lXzFQFvuZ4Vd@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify"
});

async function run() {
  await client.connect();
  try {
    console.log('Adding column estado_stock_id to TipoOperacion...');
    await client.query('ALTER TABLE "TipoOperacion" ADD COLUMN IF NOT EXISTS "estado_stock_id" INTEGER;');
    console.log('Adding foreign key constraint...');
    try {
      await client.query('ALTER TABLE "TipoOperacion" ADD CONSTRAINT "tipo_operacion_estado_stock_fkey" FOREIGN KEY ("estado_stock_id") REFERENCES "EstadoStock"("id") ON DELETE SET NULL ON UPDATE CASCADE;');
    } catch (e) {
      if (e.code === '42710') { // duplicate_object
        console.log('Constraint already exists.');
      } else {
        throw e;
      }
    }
    console.log('Successfully migrated database.');
  } finally {
    await client.end();
  }
}
run().catch(console.error);
