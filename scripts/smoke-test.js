/**
 * Production Smoke Test - Fixed
 * Tests all failing endpoints with real authenticated accounts.
 * Usage: node scripts/smoke-test.js [base_url]
 * Default: https://dsimlab1.onrender.com
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.argv[2] || 'https://dsimlab1.onrender.com';

const TEST_ACCOUNTS = [
  { email: 'superadmin@simlab.run', password: 'Test@123456', role: 'superadmin' },
  { email: 'instructor.alpha@simlab.run', password: 'Test@123456', role: 'instructor' },
  { email: 'instructor.beta@simlab.run', password: 'Test@123456', role: 'instructor' },
  { email: 'student1@simlab.run', password: 'Test@123456', role: 'student' },
  { email: 'learner@simlab.run', password: 'Test@123456', role: 'individual' },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseUrl(rawUrl) {
  const u = new URL(rawUrl);
  return { hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80), protocol: u.protocol };
}

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = parseUrl(BASE_URL);
    const lib = parsed.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.cookie ? { Cookie: options.cookie } : {}),
      },
      timeout: 30000,
    };
    const req = lib.request(reqOptions, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        let body;
        try { body = JSON.parse(data); } catch { body = data; }
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timed out')));
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function login(email, password) {
  const res = await request('/api/auth/sign-in/email', {
    method: 'POST',
    body: { email, password },
  });
  const cookies = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  return { status: res.status, body: res.body, cookie: cookies };
}

function fmt(method, path, status, note) {
  const padPath = path.length > 55 ? path.substring(0, 52) + '...' : path.padEnd(55);
  const emoji = status >= 200 && status < 300 ? '✅' : (status === 401 || status === 403 || status === 404) ? '⚠️ ' : '❌';
  const noteStr = note !== undefined && note !== null ? String(note) : '';
  return `  ${emoji} ${method.padEnd(6)} ${padPath} ${String(status).padEnd(6)} ${noteStr}`;
}

async function runAccount(account) {
  await sleep(2000); // Be respectful to rate limiter
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Account: ${account.email} (${account.role})`);
  console.log('='.repeat(80));

  let loginRes;
  try {
    loginRes = await login(account.email, account.password);
  } catch (e) {
    console.log(`  ❌ LOGIN ERROR: ${e.message}`);
    return;
  }

  if (loginRes.status >= 400 || !loginRes.cookie) {
    console.log(`  ❌ LOGIN FAILED: ${loginRes.status} → ${JSON.stringify(loginRes.body)}`);
    return;
  }
  console.log(`  ✅ LOGIN OK: ${loginRes.status}`);
  const cookie = loginRes.cookie;

  let has500 = false;

  async function test(method, path, body) {
    try {
      const res = await request(path, { method, cookie, body });
      const note = res.status === 200 ? summarize(res.body) : safeJson(res.body);
      const line = fmt(method, path, res.status, note);
      console.log(line);
      if (res.status === 500) has500 = true;
      return res;
    } catch (e) {
      const line = fmt(method, path, 'ERR', e.message);
      console.log(line);
      has500 = true;
      return null;
    }
  }

  function summarize(body) {
    if (Array.isArray(body)) return `count=${body.length}`;
    if (body && typeof body === 'object') {
      if ('hasState' in body) return `hasState=${body.hasState}`;
      if ('classes' in body) return `count=${body.classes?.length}`;
      if ('requests' in body) return `pendingCount=${body.pendingCount ?? body.requests?.length}`;
      if ('class' in body) return `students=${body.class?.students?.length ?? '?'}`;
      if ('role' in body) return `role=${body.role}`;
      if ('success' in body) return `success=${body.success}`;
    }
    return '';
  }

  function safeJson(body) {
    try { return JSON.stringify(body).substring(0, 80); } catch { return String(body).substring(0, 80); }
  }

  // Standard checks for all roles
  await test('GET', '/api/auth/me');
  await test('GET', '/api/simulations');
  await test('GET', '/api/v1/simulation/state');

  if (account.role === 'superadmin' || account.role === 'instructor') {
    const classesRes = await test('GET', '/api/classes');
    const classes = classesRes?.body?.classes || [];

    for (const cls of classes.slice(0, 5)) {
      const id = cls.id;
      await test('GET', `/api/v1/class/${id}`);
      await test('GET', `/api/classes/${id}/enrollment-requests`);
    }

    if (account.role === 'superadmin') {
      await test('GET', '/api/v1/admin/dashboard-stats');
    }
  }

  if (account.role === 'student') {
    await test('GET', '/api/classes/my-enrollment');
    await test('GET', '/api/v1/assignments/student/active');
    await test('GET', '/api/v1/scoring/leaderboard');
  }

  if (account.role === 'individual') {
    await test('GET', '/api/v1/billing/subscription');
  }

  if (has500) {
    console.log(`\n  ⛔ 500 ERRORS FOUND for ${account.email}`);
  } else {
    console.log(`\n  🟢 All endpoints OK for ${account.email}`);
  }
}

async function main() {
  console.log(`\n🔍 SIMLAB PRODUCTION SMOKE TEST`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  try {
    const healthRes = await request('/health');
    console.log(`Health: ${healthRes.status} → ${JSON.stringify(healthRes.body)}`);
  } catch (e) {
    console.log(`Health: FAILED — ${e.message}`);
  }

  for (const acct of TEST_ACCOUNTS) {
    try {
      await runAccount(acct);
    } catch (e) {
      console.log(`  ❌ FATAL ERROR for ${acct.email}: ${e.message}`);
    }
    await sleep(3000); // 3 seconds between accounts
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`Smoke test done. ${new Date().toISOString()}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
