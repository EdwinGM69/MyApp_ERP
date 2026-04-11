const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const buffer = fs.readFileSync(envPath);

console.log('File size:', buffer.length);
console.log('First 200 bytes (hex):', buffer.slice(0, 200).toString('hex'));
console.log('First 200 bytes (string):', buffer.slice(0, 200).toString('utf8'));
