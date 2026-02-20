const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request('http://localhost:3500' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(b) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('=== AUTH TESTS ===');
  
  // Test 1: Legacy login
  const r1 = await post('/api/auth/login', { password: 'tez' });
  console.log('Legacy login:', r1.status === 200 ? 'PASS' : 'FAIL', r1.body.user);

  // Test 2: Register new user
  const email = 'auth-test-' + Date.now() + '@test.com';
  const r2 = await post('/api/auth/register', { email, password: 'password123', name: 'Test User' });
  console.log('Register:', r2.status === 200 ? 'PASS' : 'FAIL', r2.body.user);

  // Test 3: Login with that user
  const r3 = await post('/api/auth/login', { email, password: 'password123' });
  console.log('Email login:', r3.status === 200 ? 'PASS' : 'FAIL', r3.body.user);

  // Test 4: Wrong password
  const r4 = await post('/api/auth/login', { email, password: 'wrong' });
  console.log('Wrong pass:', r4.status === 401 ? 'PASS' : 'FAIL', r4.body);

  // Test 5: Empty password (should fail)
  const r5 = await post('/api/auth/login', { password: 'wrongpw' });
  console.log('Bad legacy:', r5.status === 401 ? 'PASS' : 'FAIL', r5.body);

  console.log('=== DONE ===');
}

main().catch(console.error);
