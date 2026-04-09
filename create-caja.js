const { Client } = require('pg');
const client = new Client({
  connectionString: "postgres://postgres.jileukbohzeapbwbxmae:jdC0lXzFQFvuZ4Vd@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify"
});

async function run() {
  await client.connect();
  try {
    console.log('Creating table Caja...');
    await client.query(\`
      CREATE TABLE IF NOT EXISTS "Caja" (
          "id" SERIAL NOT NULL,
          "empresa_id" INTEGER NOT NULL,
          "codigo" TEXT NOT NULL,
          "descripcion" TEXT NOT NULL,
          "detalle_denominacion" BOOLEAN NOT NULL DEFAULT false,
          "activo" BOOLEAN NOT NULL DEFAULT true,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "created_by" INTEGER,
          "updated_by" INTEGER,

          CONSTRAINT "Caja_pkey" PRIMARY KEY ("id")
      );
    \`);

    console.log('Creating unique index...');
    try {
      await client.query('CREATE UNIQUE INDEX "Caja_empresa_id_codigo_key" ON "Caja"("empresa_id", "codigo");');
    } catch (e) {
      if (e.code === '42P07') {
        console.log('Index already exists.');
      } else {
        console.error('Error creating index:', e.message);
      }
    }

    console.log('Adding foreign key to Empresa...');
    try {
      await client.query('ALTER TABLE "Caja" ADD CONSTRAINT "Caja_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;');
    } catch (e) {
      if (e.code === '42710') {
        console.log('FK to Empresa already exists.');
      } else {
        console.error('Error adding FK Empresa:', e.message);
      }
    }

    console.log('Adding auditing foreign keys...');
    try {
      await client.query('ALTER TABLE "Caja" ADD CONSTRAINT "Caja_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;');
      await client.query('ALTER TABLE "Caja" ADD CONSTRAINT "Caja_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;');
    } catch (e) {
      if (e.code === '42710') {
        console.log('Auditing FKs already exist.');
      } else {
        console.error('Error adding auditing FKs:', e.message);
      }
    }

    console.log('Successfully completed manual migration for Caja.');
  } finally {
    await client.end();
  }
}

run().catch(console.error);
