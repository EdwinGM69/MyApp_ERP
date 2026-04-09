const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const tmpDir = 'C:\\Users\\Sistema\\tmp_prisma_run';
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');
fs.writeFileSync(path.join(tmpDir, 'schema.prisma'), schemaContent, 'utf8');

const dbUrl = "postgres://postgres.jileukbohzeapbwbxmae:jdC0lXzFQFvuZ4Vd@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify";
const prismaBin = path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');

try {
  console.log('Running Prisma from:', tmpDir);
  const output = execSync(`node "${prismaBin}" db push --schema="${path.join(tmpDir, 'schema.prisma')}" --accept-data-loss`, {
    env: { ...process.env, DATABASE_URL: dbUrl },
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('SUCCESS:', output);
} catch (error) {
  console.error('ERROR:', error.message);
  if (error.stdout) console.error('STDOUT:', error.stdout);
  if (error.stderr) console.error('STDERR:', error.stderr);
}
