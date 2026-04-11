const fs = require('fs');
const content = fs.readFileSync('prisma/schema.prisma', 'utf8');
const lines = content.split(/\r?\n/);
// Reconstruct from line 10 (Empresa model) onwards
const header = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
`;
const newContent = header + "\n" + lines.slice(9).join("\n");
fs.writeFileSync('prisma/schema.prisma', newContent, 'utf8');
console.log('Schema fixed');
