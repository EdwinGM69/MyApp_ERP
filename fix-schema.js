const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
const content = fs.readFileSync(schemaPath, 'utf8');

const datasourceBlock = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
`;

// Find the first occurrence of "model" and keep everything from there
const modelIndex = content.indexOf('model');
if (modelIndex === -1) {
  console.error('Could not find model keyword');
  process.exit(1);
}

const newContent = datasourceBlock + '\n' + content.slice(modelIndex);
fs.writeFileSync(schemaPath, newContent, 'utf8');
console.log('Schema updated successfully');
