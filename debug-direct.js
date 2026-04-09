const { Client } = require('pg');

const connectionString = "postgres://postgres.jileukbohzeapbwbxmae:jdC0lXzFQFvuZ4Vd@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify";

async function main() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    
    console.log('--- ALL TRIGGERS ---');
    const resTri = await client.query(`
      SELECT 
          event_object_table as "table",
          trigger_name,
          event_manipulation as "event",
          action_statement as "action",
          action_timing as "timing"
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
    `);

    console.log(JSON.stringify(resTri.rows, null, 2));

  } catch (err) {
    console.error(JSON.stringify({ error: err.stack }));
  } finally {
    await client.end();
  }
}

main();
