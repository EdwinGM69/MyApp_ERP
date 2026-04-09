const fs = require('fs');
const content = fs.readFileSync('prisma/schema.prisma', 'utf8');
for (let i = 0; i < content.length; i++) {
  const code = content.charCodeAt(i);
  if (code > 127) {
    console.log(`Non-ASCII character found at index ${i}: Char code ${code} ('${content[i]}') - Context: ${content.substring(Math.max(0, i - 10), i + 10)}`);
  }
}
console.log('Scan complete');
