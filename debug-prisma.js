const { execSync } = require('child_process');
try {
  const output = execSync('npx prisma db push --accept-data-loss', {
    env: {
      ...process.env,
      DATABASE_URL: "postgres://postgres.jileukbohzeapbwbxmae:jdC0lXzFQFvuZ4Vd@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify"
    },
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('SUCCESS:', output);
} catch (error) {
  console.error('ERROR:', error.message);
  if (error.stdout) console.error('STDOUT:', error.stdout);
  if (error.stderr) console.error('STDERR:', error.stderr);
}
