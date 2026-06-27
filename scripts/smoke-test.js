/**
 * Production Smoke Test - Hardened
 * Tests all production endpoints and CORS permissions with real authenticated accounts.
 * Usage: node scripts/smoke-test.js [base_url]
 * Default: https://dsimlab1.onrender.com
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.BASE_URL || process.argv[2] || 'https://dsimlab1.onrender.com';
const BYPASS_SECRET = process.env.BETTER_AUTH_SECRET || process.env.SMOKE_TEST_BYPASS_SECRET;

const TEST_ACCOUNTS = [
  { email: 'superadmin@simlab.run', password: 'Test@123456', role: 'superadmin' },
  { email: 'instructor.alpha@simlab.run', password: 'Test@123456', role: 'instructor' },
  { email: 'instructor.beta@simlab.run', password: 'Test@123456', role: 'instructor' },
  { email: 'student1@simlab.run', password: 'Test@123456', role: 'student' },
  { email: 'learner@simlab.run', password: 'Test@123456', role: 'individual' },
];

const resultsTable = [];

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
        ...(BYPASS_SECRET ? { 'x-smoke-test-bypass': BYPASS_SECRET } : {}),
        ...(options.cookie ? { Cookie: options.cookie } : {}),
        ...(options.headers || {}),
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
  const rawCookies = res.headers['set-cookie'] || [];
  const cookieExists = rawCookies.length > 0;
  const cookies = rawCookies.map(c => c.split(';')[0]).join('; ');
  return { status: res.status, body: res.body, cookie: cookies, cookieExists };
}

async function testCors(origin) {
  try {
    const res = await request('/health', {
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type',
      }
    });
    const allowOrigin = res.headers['access-control-allow-origin'];
    const allowCredentials = res.headers['access-control-allow-credentials'];
    const ok = allowOrigin === origin && allowCredentials === 'true';
    return { ok, status: res.status, allowOrigin, allowCredentials };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function fmt(method, path, status, note) {
  const padPath = path.length > 55 ? path.substring(0, 52) + '...' : path.padEnd(55);
  const emoji = status >= 200 && status < 300 ? '✅' : (status === 401 || status === 403 || status === 404) ? '⚠️ ' : '❌';
  const noteStr = note !== undefined && note !== null ? String(note) : '';
  return `  ${emoji} ${method.padEnd(6)} ${padPath} ${String(status).padEnd(6)} ${noteStr}`;
}

async function runAccount(account) {
  await sleep(5000); // Respect rate limiting by sleeping longer
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Auditing User: ${account.email} (${account.role})`);
  console.log('='.repeat(80));

  let loginRes;
  try {
    loginRes = await login(account.email, account.password);
  } catch (e) {
    console.log(`  ❌ LOGIN ERROR: ${e.message}`);
    resultsTable.push({ name: `Login ${account.email}`, status: 'FAIL', httpCode: 'ERR', notes: e.message });
    return;
  }

  const cookieOk = loginRes.cookieExists && loginRes.cookie.includes('simlab.session_token');
  if (loginRes.status >= 400 || !loginRes.cookie) {
    console.log(`  ❌ LOGIN FAILED: ${loginRes.status} → ${JSON.stringify(loginRes.body)}`);
    resultsTable.push({ name: `Login ${account.email}`, status: 'FAIL', httpCode: loginRes.status, notes: 'Invalid credentials or no cookies' });
    return;
  }
  
  console.log(`  ✅ LOGIN OK: ${loginRes.status} (Set-Cookie Present: ${loginRes.cookieExists ? 'YES' : 'NO'})`);
  resultsTable.push({ name: `Login ${account.email}`, status: 'PASS', httpCode: loginRes.status, notes: `Set-Cookie header OK` });
  const cookie = loginRes.cookie;

  let accountHas500 = false;

  async function testEndpoint(method, path, body) {
    try {
      const res = await request(path, { method, cookie, body });
      const note = res.status === 200 ? summarize(res.body) : safeJson(res.body);
      const line = fmt(method, path, res.status, note);
      console.log(line);

      const pass = res.status !== 500;
      if (res.status === 500) accountHas500 = true;

      resultsTable.push({
        name: `[${account.role}] ${method} ${path}`,
        status: pass ? 'PASS' : 'FAIL',
        httpCode: res.status,
        notes: note.substring(0, 50)
      });

      return res;
    } catch (e) {
      const line = fmt(method, path, 'ERR', e.message);
      console.log(line);
      accountHas500 = true;
      resultsTable.push({
        name: `[${account.role}] ${method} ${path}`,
        status: 'FAIL',
        httpCode: 'ERR',
        notes: e.message.substring(0, 50)
      });
      return null;
    }
  }

  function summarize(body) {
    if (Array.isArray(body)) return `count=${body.length}`;
    if (body && typeof body === 'object') {
      if ('hasState' in body) return `hasState=${body.hasState}`;
      if ('hasRun' in body) return `hasRun=${body.hasRun}`;
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

  // 1. Auth and state checks
  await testEndpoint('GET', '/api/auth/me');
  await testEndpoint('GET', '/api/simulations');
  await testEndpoint('GET', '/api/v1/simulation/state');
  await testEndpoint('GET', '/api/v1/campaign/state');

  // 2. Role-based workflow checks
  if (account.role === 'superadmin' || account.role === 'instructor') {
    const classesRes = await testEndpoint('GET', '/api/classes');
    const classes = classesRes?.body?.classes || [];

    for (const cls of classes.slice(0, 2)) {
      const id = cls.id;
      await testEndpoint('GET', `/api/v1/class/${id}`);
      await testEndpoint('GET', `/api/classes/${id}/enrollment-requests`);
    }

    if (account.role === 'superadmin') {
      await testEndpoint('GET', '/api/v1/admin/dashboard-stats');
    }
  }

  if (account.role === 'student') {
    await testEndpoint('GET', '/api/classes/my-enrollment');
    await testEndpoint('GET', '/api/v1/assignments/student/active');
    await testEndpoint('GET', '/api/v1/scoring/leaderboard');
  }

  if (account.role === 'individual') {
    await testEndpoint('GET', '/api/v1/billing/subscription');
  }

  if (accountHas500) {
    console.log(`\n  ⛔ 500 ERRORS DETECTED for ${account.email}`);
  } else {
    console.log(`\n  🟢 All endpoints verified stable for ${account.email}`);
  }
}

async function main() {
  console.log(`\n================================================================================`);
  console.log(`🔍 SIMLAB PRODUCTION TELEMETRY AND ACCESSIBILITY SMOKE TEST`);
  console.log(`================================================================================`);
  console.log(`Target Backend Base URL : ${BASE_URL}`);
  console.log(`Local Audit Timestamp   : ${new Date().toISOString()}\n`);

  // Health Endpoint Check
  try {
    const healthRes = await request('/health');
    console.log(`Health Status: ${healthRes.status} → ${JSON.stringify(healthRes.body)}`);
    resultsTable.push({ name: 'Backend Health Check (/health)', status: healthRes.status === 200 ? 'PASS' : 'FAIL', httpCode: healthRes.status, notes: JSON.stringify(healthRes.body) });
  } catch (e) {
    console.log(`Health Status: CRITICAL FAIL — ${e.message}`);
    resultsTable.push({ name: 'Backend Health Check (/health)', status: 'FAIL', httpCode: 'ERR', notes: e.message });
  }

  // CORS Policy Preflight Checks
  const frontendOrigins = [
    'https://dsimlab-frontend.vercel.app',
    'https://dsimlab-frontend-6o8f6ggd4-mithilp007s-projects.vercel.app'
  ];

  for (const origin of frontendOrigins) {
    const corsResult = await testCors(origin);
    if (corsResult.ok) {
      console.log(`CORS Preflight [${origin}]: ALLOWED (Status: ${corsResult.status})`);
      resultsTable.push({ name: `CORS Preflight Origin: ${origin}`, status: 'PASS', httpCode: corsResult.status, notes: 'Headers match trusted configuration' });
    } else {
      console.log(`CORS Preflight [${origin}]: REFUSED (Allow-Origin: ${corsResult.allowOrigin}, Status: ${corsResult.status})`);
      resultsTable.push({ name: `CORS Preflight Origin: ${origin}`, status: 'FAIL', httpCode: corsResult.status || 'ERR', notes: corsResult.error || `Origin ${corsResult.allowOrigin} mismatch` });
    }
  }

  // Account Auditing
  for (const acct of TEST_ACCOUNTS) {
    try {
      await runAccount(acct);
    } catch (e) {
      console.log(`  ❌ FATAL EXCEPTION during ${acct.email} evaluation: ${e.message}`);
    }
    await sleep(2000);
  }

  // Print final PASS/FAIL table
  console.log(`\n================================================================================`);
  console.log(`FINAL SMOKE TEST MATRIX RESULTS REPORT`);
  console.log(`================================================================================`);
  console.log(`| ${'Check Name'.padEnd(50)} | ${'Status'.padEnd(6)} | ${'HTTP'.padEnd(4)} | ${'Notes'.padEnd(40)} |`);
  console.log(`|-${'-'.repeat(50)}-|-${'-'.repeat(6)}-|-${'-'.repeat(4)}-|-${'-'.repeat(40)}-|`);
  
  resultsTable.forEach(row => {
    const nameStr = row.name.padEnd(50).substring(0, 50);
    const statusStr = row.status.padEnd(6);
    const codeStr = String(row.httpCode).padEnd(4).substring(0, 4);
    const notesStr = row.notes.padEnd(40).substring(0, 40);
    console.log(`| ${nameStr} | ${statusStr} | ${codeStr} | ${notesStr} |`);
  });
  console.log(`================================================================================`);

  const totalChecks = resultsTable.length;
  const passedChecks = resultsTable.filter(r => r.status === 'PASS').length;
  const failedChecks = totalChecks - passedChecks;

  console.log(`\nAudit Finished. Total Checks: ${totalChecks} | Passed: ${passedChecks} | Failed: ${failedChecks}`);

  if (failedChecks > 0) {
    console.log(`❌ Some smoke tests failed. Please review the matrix above.`);
    process.exit(1);
  } else {
    console.log(`🎉 All production smoke tests passed successfully!`);
    process.exit(0);
  }
}

main().catch(e => { console.error('Unhandled Smoke Test Error:', e); process.exit(1); });
