const { execSync } = require('child_process');
const fs = require('fs');
try {
  execSync('npx prisma validate', { stdio: 'pipe' });
  console.log('Valid');
} catch (e) {
  fs.writeFileSync('prisma_validation.txt', e.stdout.toString() + '\\n' + e.stderr.toString(), 'utf8');
}
