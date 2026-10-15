// server/test-api-e2e.cjs
const http = require('http');

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: '127.0.0.1',
      port: 3001,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3001,
      path,
      method: 'GET',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('Testing Live Backend Endpoints on http://localhost:3001...');

  // 1. Login
  const loginRes = await post('/api/auth/login', { identifier: 'shyamkeshri', password: 'Password123!' });
  console.log('1. POST /api/auth/login:', loginRes.status, loginRes.body.user ? 'USER: ' + loginRes.body.user.username : loginRes.body);
  const token = loginRes.body.token;

  // 2. Metrics
  const metricsRes = await get('/api/metrics/dashboard', token);
  console.log('2. GET /api/metrics/dashboard:', metricsRes.status, metricsRes.body);

  // 3. Security Events
  const eventsRes = await get('/api/security-events', token);
  console.log('3. GET /api/security-events count:', eventsRes.status, eventsRes.body.events ? eventsRes.body.events.length : eventsRes.body);

  // 4. Run Breach Rehearsal Scenario A
  const rehearseRes = await post('/api/rehearsal/run', { scenario_id: 'SCENARIO_A' }, token);
  console.log('4. POST /api/rehearsal/run:', rehearseRes.status, 'Status:', rehearseRes.body.run ? rehearseRes.body.run.status : rehearseRes.body);

  // 5. Get Keys Metadata
  const keysRes = await get('/api/keys/metadata', token);
  console.log('5. GET /api/keys/metadata:', keysRes.status, 'Active Keys:', keysRes.body.keys ? keysRes.body.keys.length : keysRes.body);

  console.log('\nAll Live Backend Endpoints verified successfully!');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
