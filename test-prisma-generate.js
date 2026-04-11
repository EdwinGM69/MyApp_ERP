const { execSync } = require('child_process');
try {
  const output = execSync('npx prisma generate', { encoding: 'utf8' });
  console.log('Generate successful:\n', output);
} catch (error) {
  console.error('Generate failed:\n');
  console.error(error.stdout?.toString());
  console.error(error.stderr?.toString());
}
