const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
const buffer = fs.readFileSync(schemaPath);

console.log('File size:', buffer.length);
console.log('First 200 bytes (hex):', buffer.slice(0, 200).toString('hex'));
console.log('First 200 bytes (string):', buffer.slice(0, 200).toString('utf8'));
