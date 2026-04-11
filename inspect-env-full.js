const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const content = fs.readFileSync(envPath, 'utf8');

console.log('--- .env content ---');
console.log(content);
console.log('--- end .env ---');
