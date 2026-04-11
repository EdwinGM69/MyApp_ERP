async function test() {
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@test.com', password: 'test' })
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', text.substring(0, 100));
}
test().catch(console.error);
