const http = require('http');

const BASE_URL = 'http://localhost:5000';

function request(path, method = 'GET', cookie = '', body = null) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const req = http.request({
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie,
        'x-smoke-test-bypass': 'better_auth_secret_key_32_characters_long_min_size'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });
    req.on('error', (err) => resolve({ status: 'ERR', body: err.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('Logging in as superadmin@simlab.run...');
  const loginRes = await request('/api/auth/sign-in/email', 'POST', '', {
    email: 'superadmin@simlab.run',
    password: 'Test@123456'
  });
  console.log('Login Status:', loginRes.status);
  const rawCookies = loginRes.headers['set-cookie'] || [];
  const cookie = rawCookies.map(c => c.split(';')[0]).join('; ');
  console.log('Cookie:', cookie);

  const adminEndpoints = [
    '/api/v1/admin/institutions',
    '/api/v1/billing/plans',
    '/api/v1/admin/billing/stats',
    '/api/v1/report/certificate-summary',
    '/api/certificates/check-eligibility',
    '/api/v1/scoring/leaderboard',
    '/v1/campaign/state',
    '/api/v1/admin/dashboard-stats'
  ];

  console.log('\n--- Testing Admin Endpoints ---');
  for (const ep of adminEndpoints) {
    const res = await request(ep, 'GET', cookie);
    console.log(`GET ${ep} -> Status ${res.status}`);
    console.log('Body:', JSON.stringify(res.body).substring(0, 300));
  }

  console.log('\nLogging in as student1@simlab.run...');
  const sLoginRes = await request('/api/auth/sign-in/email', 'POST', '', {
    email: 'student1@simlab.run',
    password: 'Test@123456'
  });
  const sCookie = (sLoginRes.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');

  const studentEndpoints = [
    '/api/v1/simulation/state',
    '/api/simulations',
    '/api/v1/scoring/leaderboard'
  ];

  console.log('\n--- Testing Student Endpoints ---');
  for (const ep of studentEndpoints) {
    const res = await request(ep, 'GET', sCookie);
    console.log(`GET ${ep} -> Status ${res.status}`);
    console.log('Body:', JSON.stringify(res.body).substring(0, 300));
  }

  console.log('\nLogging in as instructor.alpha@simlab.run...');
  const iLoginRes = await request('/api/auth/sign-in/email', 'POST', '', {
    email: 'instructor.alpha@simlab.run',
    password: 'Test@123456'
  });
  const iCookie = (iLoginRes.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');

  // Get a class ID first
  const classesRes = await request('/api/classes', 'GET', iCookie);
  console.log('GET /api/classes -> Status', classesRes.status);
  const classes = classesRes.body.classes || [];
  if (classes.length > 0) {
    const classId = classes[0].id;
    const instructorEndpoints = [
      `/api/v1/class/${classId}`,
      `/api/classes/${classId}/enrollment-requests`
    ];

    console.log('\n--- Testing Instructor Endpoints ---');
    for (const ep of instructorEndpoints) {
      const res = await request(ep, 'GET', iCookie);
      console.log(`GET ${ep} -> Status ${res.status}`);
      console.log('Body:', JSON.stringify(res.body).substring(0, 300));
    }
  } else {
    console.log('No classes found for instructor.alpha@simlab.run');
  }
}

run();
