const fs = require('fs');

async function test() {
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@test.com', password: 'test' })
  });
  const text = await res.text();
  
  // Extract Next.js error title
  const titleMatch = text.match(/<title>(.*?)<\/title>/);
  console.log('Title:', titleMatch ? titleMatch[1] : 'No title');
  
  // Extract error message from Next.js dev overlay JSON embedded in page
  const nextErrMatch = text.match(/"message":"(.*?)"/);
  console.log('Error Message:', nextErrMatch ? nextErrMatch[1] : 'No message string found');
  
  const h1Match = text.match(/<h1>(.*?)<\/h1>/);
  console.log('H1:', h1Match ? h1Match[1] : 'No h1');
  
  if (text.includes('PrismaClient')) console.log('Prisma Error Detected');
  if (text.includes('bcrypt')) console.log('Bcrypt Error Detected');
}
test().catch(console.error);
