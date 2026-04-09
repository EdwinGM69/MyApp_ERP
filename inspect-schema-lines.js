const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
const content = fs.readFileSync(schemaPath, 'utf8');
const lines = content.split('\n');

for (let i = 0; i < 20 && i < lines.length; i++) {
  console.log(`Line ${i + 1}: [${lines[i]}]`);
  console.log(`Hex: ${Buffer.from(lines[i]).toString('hex')}`);
}
