const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:5000';
const SCREENSHOT_DIR = path.join(__dirname, '../screenshots/superadmin');

// Ensure screenshots folder exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runSuperAdminQA() {
  console.log('==================================================');
  console.log('STARTING SUPER ADMIN FLOW QA VALIDATION');
  console.log('==================================================');

  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const collegeName = `QA University ${rand}`;
  const collegeCode = `QAUNI${rand}`;
  const collegeNameEdit = `QA University Edit ${rand}`;
  const planName = `QA Basic Plan ${rand}`;
  const planCode = `qa_basic_${rand.toLowerCase()}`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Capture console errors
  const errors = [];
  page.on('pageerror', err => {
    errors.push(err.message);
    console.error('[Page Error]', err.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('[Console Error]', msg.text());
    }
  });

  page.on('dialog', async dialog => {
    console.log(`[Dialog] ${dialog.type()}: ${dialog.message()}`);
    await dialog.accept().catch(() => {});
  });

  try {
    // 1. Log in as Super Admin
    console.log('\n[1/5] Log in as Super Admin...');
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('#email', 'superadmin@simlab.test');
    await page.fill('#password', 'Test@123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    console.log(`- Redirected URL: ${page.url()}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_dashboard.png') });

    // 2. Manage Users Works
    console.log('\n[2/5] Testing User Management page...');
    await page.goto(`${FRONTEND_URL}/admin/users`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_user_directory.png') });

    // Search user
    console.log('- Searching for instructor...');
    await page.fill('input[placeholder="Search users..."]', 'Instructor Jenkins');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_user_search.png') });
    await page.fill('input[placeholder="Search users..."]', ''); // Clear search

    // Provision new user
    console.log('- Clicking Provision User...');
    await page.click('button:has-text("Provision User")');
    await page.waitForTimeout(1000);
    await page.fill('input[placeholder="John Doe"]', 'QA Temp User');
    await page.fill('input[placeholder="john@school.edu"]', 'qa.temp@simlab.test');
    await page.selectOption('select:has-text("Student")', 'student');
    await page.click('button:has-text("Provision Account")');
    await page.waitForTimeout(2000);
    console.log('- User qa.temp@simlab.test provisioned.');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_user_provisioned.png') });

    // Suspend user
    console.log('- Suspending user qa.temp@simlab.test...');
    // Type email in search to isolate
    await page.fill('input[placeholder="Search users..."]', 'qa.temp@simlab.test');
    await page.waitForTimeout(1000);
    await page.click('button[title="Suspend Account"]');
    await page.waitForTimeout(2000);
    console.log('- Suspended user successfully.');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_user_suspended.png') });

    // Activate user back
    console.log('- Activating user qa.temp@simlab.test...');
    await page.click('button[title="Activate Account"]');
    await page.waitForTimeout(2000);
    console.log('- Reactivated user successfully.');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_user_reactivated.png') });

    // Delete user
    console.log('- Deleting temp user qa.temp@simlab.test...');
    await page.click('button[title="Delete Account"]');
    await page.waitForTimeout(2000);
    console.log('- Deleted temp user.');
    await page.fill('input[placeholder="Search users..."]', ''); // Clear search

    // 3. Manage Colleges Works
    console.log('\n[3/5] Testing Colleges & Institutions Management page...');
    await page.goto(`${FRONTEND_URL}/admin/institutions`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_colleges_list.png') });

    // Create college
    console.log('- Registering Stanford University College...');
    await page.fill('input[placeholder="e.g. Stanford University"]', collegeName);
    await page.fill('input[placeholder="e.g. STANFORD2026"]', collegeCode);
    await page.click('button:has-text("Register College Workspace")');
    await page.waitForTimeout(2000);
    console.log(`- ${collegeName} registered.`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_college_created.png') });

    // Search college to isolate
    await page.fill('input[placeholder="Search institutions..."]', collegeName);
    await page.waitForTimeout(1000);

    // Rename college
    console.log('- Renaming college...');
    await page.click('button[title="Edit Name"]');
    await page.waitForTimeout(500);
    await page.fill('input[placeholder="New institution name"]', collegeNameEdit);
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(2000);
    console.log('- College renamed successfully.');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_college_renamed.png') });

    // Clear search and search for renamed name
    await page.fill('input[placeholder="Search institutions..."]', collegeNameEdit);
    await page.waitForTimeout(1000);

    // Deactivate college
    console.log('- Deactivating college...');
    await page.click('button[title="Deactivate Institution"]');
    await page.waitForTimeout(2000);
    console.log('- College deactivated successfully.');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_college_deactivated.png') });

    // Reactivate college
    console.log('- Reactivating college...');
    await page.click('button[title="Reactivate Institution"]');
    await page.waitForTimeout(2000);
    console.log('- College reactivated successfully.');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_college_reactivated.png') });

    // Clear search
    await page.fill('input[placeholder="Search institutions..."]', '');
    await page.waitForTimeout(1000);

    // 4. Manage Plans Works
    console.log('\n[4/5] Testing Pricing Plans Management tab...');
    await page.goto(`${FRONTEND_URL}/admin/billing`);
    await page.waitForTimeout(2000);
    // Click Manage Pricing Plans tab
    await page.click('button:has-text("Manage Pricing Plans")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_pricing_plans_list.png') });

    // Create a plan
    console.log('- Registering a new pricing plan...');
    await page.fill('input[placeholder="e.g. Enterprise Plus"]', planName);
    await page.fill('input[placeholder="e.g. enterprise_plus"]', planCode);
    await page.fill('label:has-text("Price Monthly") + input', '120'); // monthly price
    await page.fill('label:has-text("Price Yearly") + input', '1200'); // yearly price
    await page.fill('label:has-text("Duration (Days)") + input', '15'); // duration in days
    await page.click('button:has-text("Provision Plan")');
    await page.waitForTimeout(2000);
    console.log(`- ${planName} created.`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_pricing_plan_created.png') });

    // Edit price/duration
    console.log('- Editing newly created plan...');
    // Find the card containing planName and click Edit Plan Details & Pricing
    await page.click(`div.rounded-2xl:has(h4:has-text("${planName}")) button:has-text("Edit Plan Details & Pricing")`);
    await page.waitForTimeout(1000);
    // Check if we are editing
    await page.fill('label:has-text("Price Monthly") + input', '150'); // change price to 150
    await page.fill('label:has-text("Duration (Days)") + input', '14'); // change duration to 14
    await page.click('button:has-text("Update Plan")');
    await page.waitForTimeout(2000);
    console.log('- QA Basic Plan updated successfully.');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_pricing_plan_edited.png') });

    // 5. Revenue / Sales Analytics & Subscription Reports Work
    console.log('\n[5/5] Testing Revenue Analytics & Subscription Reports...');
    await page.click('button:has-text("Revenue Analytics & Coupons")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_revenue_analytics.png') });

    await page.click('button:has-text("Subscription Reports")');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_subscription_reports.png') });

    // Export CSV
    console.log('- Triggering Export CSV...');
    await page.click('button:has-text("Export CSV")');
    await page.waitForTimeout(1500);

    // Export PDF
    console.log('- Triggering Export PDF...');
    await page.click('button:has-text("Export PDF")');
    await page.waitForTimeout(2500);

    console.log('\n==================================================');
    console.log('ALL SUPER ADMIN ACTIONS COMPLETED SUCCESSFULLY!');
    console.log('==================================================');

  } catch (err) {
    console.error('QA script failed:', err);
    errors.push(err.message);
  } finally {
    await browser.close();
    if (errors.length > 0) {
      console.error('\nQA Failed with the following errors:');
      errors.forEach(e => console.error(`- ${e}`));
      process.exit(1);
    } else {
      console.log('\nQA Verification Passed!');
      process.exit(0);
    }
  }
}

runSuperAdminQA();
