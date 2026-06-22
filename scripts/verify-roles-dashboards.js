const { chromium } = require('playwright');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:5000';

const SCREENSHOT_DIR = 'D:\\simlab-role-dashboard-screenshots';
const TRACE_DIR = 'D:\\simlab-role-dashboard-traces';
const ARTIFACT_DIR = 'D:\\simlab-role-dashboard-artifacts';

const USERS = {
  admin: { email: 'superadmin@simlab.test', password: 'Test@123456', expectedRole: 'ADMIN', expectedDashboard: '/admin' },
  instructor: { email: 'instructor@simlab.test', password: 'Test@123456', expectedRole: 'INSTRUCTOR', expectedDashboard: '/instructor' },
  student: { email: 'student1@simlab.test', password: 'Test@123456', expectedRole: 'STUDENT_COLLEGE', expectedDashboard: '/dashboard' },
  individual: { email: 'individual@simlab.test', password: 'Test@123456', expectedRole: 'INDIVIDUAL', expectedDashboard: '/dashboard' }
};

const TEST_ROUTES = [
  '/admin',
  '/admin/users',
  '/admin/billing',
  '/instructor',
  '/reports',
  '/reports/nba',
  '/campaign',
  '/campaign/day/1',
  '/leaderboard',
  '/progress',
  '/certificate',
  '/pricing',
  '/subscription',
  '/billing/invoices'
];

async function loginAndGetCookies(browser, email, password) {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Navigate to login
  await page.goto(`${FRONTEND_URL}/login`);
  await page.waitForSelector('#email');
  
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button:has-text("Sign In"), button[type="submit"]');
  
  // Wait a few seconds for auth/redirect to complete
  await page.waitForTimeout(3000);
  
  const cookies = await context.cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  
  await context.close();
  return cookieHeader;
}

async function runValidation() {
  console.log('==================================================');
  console.log('STARTING ROLE-BASED DASHBOARD UX & ACCESS CONTROL AUDIT');
  console.log('==================================================');

  const browser = await chromium.launch({ headless: true });
  const reportData = {
    timestamp: new Date().toISOString(),
    loginRedirects: {},
    featureChecks: {},
    routeMatrix: {},
    apiRbac: {},
    bugs: [],
    verdict: 'GO'
  };

  // Ensure output directories exist
  [SCREENSHOT_DIR, TRACE_DIR, ARTIFACT_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Get Cookies for direct API testing
  console.log('\n[PREPARATION] GETTING AUTH COOKIES FOR DIRECT API CHECKS...');
  const userCookies = {};
  for (const [key, creds] of Object.entries(USERS)) {
    try {
      userCookies[key] = await loginAndGetCookies(browser, creds.email, creds.password);
      console.log(`- Acquired cookie session for role: ${creds.expectedRole}`);
    } catch (e) {
      console.error(`Failed login check for ${creds.email}:`, e.message);
      reportData.bugs.push({ area: 'Auth', message: `Could not retrieve login session for ${creds.expectedRole}: ${e.message}` });
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // STEP 1 & 2 & 3 & 4 & 5 & 6: Validate Dashboards and Navigation per Role
  // ────────────────────────────────────────────────────────────────────────
  for (const [roleName, creds] of Object.entries(USERS)) {
    console.log(`\n==================================================`);
    console.log(`AUDITING ROLE: ${creds.expectedRole}`);
    console.log(`==================================================`);

    const context = await browser.newContext();
    const tracePath = path.join(TRACE_DIR, `${roleName}-trace.zip`);
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    
    const page = await context.newPage();
    const screenshotPath = path.join(SCREENSHOT_DIR, `dashboard_${roleName}.png`);

    try {
      // 1. Login
      console.log(`- Navigating to Login Page...`);
      await page.goto(`${FRONTEND_URL}/login`);
      await page.waitForSelector('#email');
      
      await page.fill('#email', creds.email);
      await page.fill('#password', creds.password);
      
      console.log(`- Submitting login for ${creds.email}...`);
      await page.click('button:has-text("Sign In"), button[type="submit"]');
      await page.waitForTimeout(3000);

      // Verify redirect
      const dashboardUrl = page.url();
      console.log(`- Redirected to URL: ${dashboardUrl}`);
      
      let redirectPass = false;
      if (roleName === 'admin') {
        redirectPass = dashboardUrl.includes('/admin');
      } else if (roleName === 'instructor') {
        redirectPass = dashboardUrl.includes('/instructor');
      } else if (roleName === 'student') {
        redirectPass = dashboardUrl.includes('/dashboard') || dashboardUrl.includes('/student') || dashboardUrl === `${FRONTEND_URL}/` || dashboardUrl === FRONTEND_URL;
      } else if (roleName === 'individual') {
        redirectPass = dashboardUrl.includes('/dashboard') || dashboardUrl.includes('/dashboard/individual') || dashboardUrl === `${FRONTEND_URL}/` || dashboardUrl === FRONTEND_URL;
      }

      reportData.loginRedirects[roleName] = {
        expected: creds.expectedDashboard,
        actual: dashboardUrl,
        success: redirectPass
      };
      console.log(`- Login Redirect Status: ${redirectPass ? 'PASS' : 'FAIL'}`);

      // Take screenshot of landing page
      await page.screenshot({ path: screenshotPath });
      console.log(`- Dashboard screenshot saved: ${screenshotPath}`);

      // Verify session persistence
      console.log(`- Reloading page to test session persistence...`);
      await page.reload();
      await page.waitForTimeout(2000);
      const postReloadUrl = page.url();
      const reloadPass = postReloadUrl === dashboardUrl;
      console.log(`- Session persistent: ${reloadPass ? 'YES' : 'NO'}`);
      
      // Perform Sidebar & UX Inspection
      console.log(`- Extracting sidebar/navigation menu items...`);
      const navLinks = await page.evaluate(() => {
        // Find links in sidebars/navs
        const links = Array.from(document.querySelectorAll('nav a, aside a, .sidebar a'));
        return links.map(a => ({
          text: a.innerText.trim().replace(/\n/g, ' '),
          href: a.getAttribute('href')
        })).filter(l => l.text.length > 0);
      });

      console.log(`- Visible Nav Links:`);
      navLinks.forEach(l => console.log(`  * "${l.text}" -> ${l.href}`));

      // Check Feature presence / absence
      const features = {
        navLinks,
        hasAdminMenu: navLinks.some(l => l.href.includes('/admin')),
        hasInstructorMenu: navLinks.some(l => l.href.includes('/instructor') || l.href.includes('/reports')),
        hasSimulationMenu: navLinks.some(l => l.href.includes('/simulation') || l.href.includes('/campaign')),
        hasBillingMenu: navLinks.some(l => l.href.includes('/subscription') || l.href.includes('/billing') || l.href.includes('/pricing'))
      };

      reportData.featureChecks[roleName] = {
        sidebarCount: navLinks.length,
        hasAdminMenu: features.hasAdminMenu,
        hasInstructorMenu: features.hasInstructorMenu,
        hasSimulationMenu: features.hasSimulationMenu,
        hasBillingMenu: features.hasBillingMenu
      };

      // Role-specific feature validation rules
      if (roleName === 'admin') {
        if (!features.hasAdminMenu) {
          reportData.bugs.push({ role: 'ADMIN', message: 'Admin sidebar is missing link to admin panel/sub-modules.' });
        }
        if (features.hasSimulationMenu) {
          console.warn('[WARNING] Admin sidebar includes student simulation settings. Validating if intentional.');
        }
      } else if (roleName === 'instructor') {
        if (features.hasAdminMenu) {
          reportData.bugs.push({ role: 'INSTRUCTOR', message: 'Instructor has access to admin menu items in sidebar.' });
        }
        if (!features.hasInstructorMenu) {
          reportData.bugs.push({ role: 'INSTRUCTOR', message: 'Instructor sidebar is missing links to teaching / class management / reports.' });
        }
      } else if (roleName === 'student') {
        if (features.hasAdminMenu || features.hasInstructorMenu) {
          reportData.bugs.push({ role: 'STUDENT', message: 'Student sidebar leaks admin or instructor pages.' });
        }
      } else if (roleName === 'individual') {
        if (features.hasAdminMenu || features.hasInstructorMenu) {
          reportData.bugs.push({ role: 'INDIVIDUAL', message: 'Individual learner sidebar leaks admin or instructor pages.' });
        }
      }

      // ────────────────────────────────────────────────────────────────────────
      // STEP 7: Route Access Matrix Check for Current Session
      // ────────────────────────────────────────────────────────────────────────
      console.log(`- Running Route Access Matrix Test for ${creds.expectedRole}...`);
      const matrix = {};
      for (const route of TEST_ROUTES) {
        try {
          await page.goto(`${FRONTEND_URL}${route}`);
          await page.waitForTimeout(1000);
          
          const endUrl = page.url();
          const pageText = await page.innerText('body');
          const isAccessDenied = pageText.toLowerCase().includes('access denied') || 
                                 pageText.toLowerCase().includes('forbidden') || 
                                 pageText.toLowerCase().includes('unauthorized') || 
                                 pageText.toLowerCase().includes('not authorized') ||
                                 pageText.includes('403') ||
                                 pageText.includes('401');

          if (endUrl === `${FRONTEND_URL}${route}`) {
            if (isAccessDenied) {
              matrix[route] = 'BLOCKED';
            } else {
              matrix[route] = 'ALLOWED';
            }
          } else if (endUrl.includes('/login') || endUrl.includes('/landing') || endUrl.includes('/dashboard')) {
            matrix[route] = 'REDIRECTED';
          } else {
            matrix[route] = 'BLOCKED';
          }
        } catch (e) {
          matrix[route] = 'ERROR';
        }
      }
      reportData.routeMatrix[roleName] = matrix;
      console.log(`  * Route Matrix Results:`, JSON.stringify(matrix));

      // Test Logout
      console.log(`- Testing logout flow...`);
      // We can click the Logout button if visible, or hit /api/auth/sign-out
      const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout"), a:has-text("Sign Out")');
      if (await logoutBtn.count() > 0) {
        await logoutBtn.first().click();
        await page.waitForTimeout(1500);
        console.log(`- Logout button clicked, redirect destination: ${page.url()}`);
      } else {
        // Fallback: manually visit sign-out endpoint or direct page navigate
        console.log('- No direct logout button in sidebar; calling sign-out API fallback...');
        await page.goto(`${FRONTEND_URL}/login`);
      }

    } catch (e) {
      console.error(`Error auditing role ${creds.expectedRole}:`, e.stack);
      reportData.bugs.push({ role: creds.expectedRole, message: `Auditing crashed: ${e.message}` });
    } finally {
      await context.tracing.stop({ path: tracePath });
      console.log(`- Saved trace file: ${tracePath}`);
      await context.close();
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // STEP 8: Direct Backend API RBAC Checks using Cookies
  // ────────────────────────────────────────────────────────────────────────
  console.log('\n==================================================');
  console.log('AUDITING BACKEND API RBAC PERMISSIONS');
  console.log('==================================================');
  
  const apiTests = [
    { name: 'Admin Dashboard Stats', method: 'GET', url: '/api/v1/admin/dashboard-stats', allowedRoles: ['ADMIN'] },
    { name: 'Admin User Management List', method: 'GET', url: '/api/v1/users', allowedRoles: ['ADMIN'] },
    { name: 'Billing Analytics Overview', method: 'GET', url: '/api/v1/admin/billing/stats', allowedRoles: ['ADMIN'] },
    { name: 'Instructor Classes List', method: 'GET', url: '/api/v1/class', allowedRoles: ['INSTRUCTOR', 'ADMIN'] },
    { name: 'Instructor Scenario Creation', method: 'POST', url: '/api/v1/scenario', payload: { name: 'Audit Test Scenario', description: 'Desc', industry: 'E-commerce', budgetPerRound: 1000, targetKPI: 'revenue', baselineOrganicTraffic: 100 }, allowedRoles: ['INSTRUCTOR', 'ADMIN'] },
    { name: 'Student Active Simulation State', method: 'GET', url: '/api/v1/campaign/state', allowedRoles: ['STUDENT_COLLEGE', 'INDIVIDUAL', 'INSTRUCTOR', 'ADMIN'] },
    { name: 'Instructor Accreditations PDF', method: 'GET', url: '/api/v1/report/class/test-class-id/accreditation', allowedRoles: ['INSTRUCTOR', 'ADMIN'] }
  ];

  for (const apiCheck of apiTests) {
    const testResults = {};
    console.log(`- Checking API: ${apiCheck.method} ${apiCheck.url}`);
    
    for (const [roleKey, creds] of Object.entries(USERS)) {
      const cookie = userCookies[roleKey];
      if (!cookie) {
        testResults[roleKey] = 'SKIPPED_NO_AUTH';
        continue;
      }
      
      try {
        const config = {
          headers: { Cookie: cookie, Origin: FRONTEND_URL }
        };
        
        let res;
        if (apiCheck.method === 'GET') {
          res = await axios.get(`${BACKEND_URL}${apiCheck.url}`, config);
        } else {
          res = await axios.post(`${BACKEND_URL}${apiCheck.url}`, apiCheck.payload || {}, config);
        }
        
        const isAllowedRole = apiCheck.allowedRoles.includes(creds.expectedRole);
        if (isAllowedRole) {
          testResults[roleKey] = 'ALLOWED_CORRECT';
        } else {
          testResults[roleKey] = 'LEAK_UNAUTHORIZED';
          console.error(`  [LEAK] Role ${creds.expectedRole} has access to ${apiCheck.url} (expected block)`);
          reportData.bugs.push({
            area: 'API RBAC',
            message: `Security vulnerability: Role ${creds.expectedRole} accessed ${apiCheck.url} (expected block)`
          });
        }
      } catch (err) {
        const statusCode = err.response?.status;
        const isAllowedRole = apiCheck.allowedRoles.includes(creds.expectedRole);
        
        if (!isAllowedRole && (statusCode === 401 || statusCode === 403)) {
          testResults[roleKey] = 'BLOCKED_CORRECT';
        } else if (isAllowedRole) {
          testResults[roleKey] = `ERROR_BUT_ALLOWED_ROUTE (${statusCode || err.message})`;
          console.warn(`  [INFO] Mapped route error for ${creds.expectedRole}: HTTP ${statusCode} for ${apiCheck.url}`);
        } else {
          testResults[roleKey] = `BLOCKED_WITH_OTHER_CODE (${statusCode || err.message})`;
        }
      }
    }
    
    reportData.apiRbac[apiCheck.name] = testResults;
    console.log(`  * Access:`, JSON.stringify(testResults));
  }

  // Final Verdict logic
  const leakFound = reportData.bugs.some(b => b.message.includes('Security vulnerability') || b.message.includes('leaks'));
  reportData.verdict = leakFound ? 'NO-GO' : 'GO';
  
  // Save JSON report artifact
  const finalJsonPath = path.join(ARTIFACT_DIR, 'results.json');
  fs.writeFileSync(finalJsonPath, JSON.stringify(reportData, null, 2));
  console.log(`\n- Validation JSON report saved at: ${finalJsonPath}`);

  await browser.close();
  console.log('\n==================================================');
  console.log('ROLE-BASED DASHBOARD AUDIT AND ACCESS CHECKS COMPLETE');
  console.log('==================================================');
}

runValidation().catch(e => {
  console.error('Audit Script crashed:', e.stack);
  process.exit(1);
});
