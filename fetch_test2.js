const fs = require('fs');
async function test() {
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@test.com', password: 'test' })
  });
  const text = await res.text();
  fs.writeFileSync('error_body.txt', text);
}
test().catch(console.error);
