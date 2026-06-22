/**
 * SimLab Flexible Assignments — End-to-End QA Test
 * 
 * Flow:
 *  1. Register instructor (via /api/auth/register/instructor)
 *  2. Sign-in instructor → get fresh session cookie
 *  3. Fetch a scenario, create class
 *  4. Register student, approve student
 *  5. [Playwright] Instructor creates & publishes assignment
 *  6. [Playwright] Student accesses campaign, tests budget cap enforcement
 *  7. [API] Fast-forward Day 1 simulation
 *  8. [Playwright] Admin monitors assignments
 */

const { chromium } = require('playwright');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:5000';
const SCREENSHOT_DIR = 'D:\\simlab-e2e-screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Helper: extract Set-Cookie values from axios response and build cookie header string
function extractCookies(response) {
    const raw = response.headers['set-cookie'];
    if (!raw || !Array.isArray(raw)) return '';
    return raw.map(c => c.split(';')[0]).join('; ');
}

// Helper: sign-in and return a cookie header string
async function signIn(email, password) {
    const res = await axios.post(`${BACKEND_URL}/api/auth/sign-in/email`, { email, password }, {
        withCredentials: true
    });
    return extractCookies(res);
}

async function runE2eAssignmentsTest() {
    console.log('==================================================');
    console.log('STARTING SIMLAB FLEXIBLE ASSIGNMENTS E2E QA TEST');
    console.log('==================================================');

    const ts = Date.now();
    const instructorEmail = `prof.assignment.${ts}@simplab.edu`;
    const studentEmail = `student.assignment.${ts}@simplab.edu`;
    const adminEmail = `admin.qa.${ts}@simplab.edu`;
    const password = 'Password123!';

    let instCookieHeader = '';
    let inviteCode = '';
    let classId = '';
    let scenarioId = '';
    let studentId = '';

    // ─────────────────────────────────────────────────
    // STEP 1 – Seed instructor, scenario, class, student
    // ─────────────────────────────────────────────────
    console.log('\n[1/6] SEEDING INSTRUCTOR, SCENARIO AND CLASS...');
    try {
        // Register instructor via dedicated endpoint (sets role = INSTRUCTOR in DB)
        await axios.post(`${BACKEND_URL}/api/auth/register/instructor`, {
            email: instructorEmail,
            password,
            name: 'Prof. Assignment Controller',
        });
        console.log(`- Registered instructor: ${instructorEmail}`);

        // Sign in to get a valid session cookie
        instCookieHeader = await signIn(instructorEmail, password);
        console.log(`- Instructor session established (cookie length: ${instCookieHeader.length})`);

        // Get first scenario template
        const scenarioRes = await axios.get(`${BACKEND_URL}/api/v1/scenario`, {
            headers: { Cookie: instCookieHeader }
        });
        const scenarios = scenarioRes.data.scenarios || scenarioRes.data;
        if (!scenarios || scenarios.length === 0) throw new Error('No scenarios available on server');
        scenarioId = scenarios[0].id;
        console.log(`- Scenario selected: "${scenarios[0].name}" (${scenarioId})`);

        // Create class
        const classRes = await axios.post(`${BACKEND_URL}/api/v1/class`, {
            name: 'Assignments E2E Testing Room',
            scenarioId
        }, { headers: { Cookie: instCookieHeader } });
        inviteCode = classRes.data.class.inviteCode;
        classId = classRes.data.class.id;
        console.log(`- Created class: "${classRes.data.class.name}", invite code: "${inviteCode}"`);

        // Register student and join class
        const studReg = await axios.post(`${BACKEND_URL}/api/auth/register/student`, {
            email: studentEmail,
            password,
            name: 'E2E Target Student',
            classJoinCode: inviteCode
        });
        studentId = studReg.data.user?.id;
        if (!studentId) {
            // Parse from response body if nested differently
            const body = typeof studReg.data === 'string' ? JSON.parse(studReg.data) : studReg.data;
            studentId = body.user?.id || body.id;
        }
        console.log(`- Registered student: ${studentEmail} (id: ${studentId})`);

        // Approve student
        await axios.post(`${BACKEND_URL}/api/v1/class/${classId}/approve/${studentId}`, {}, {
            headers: { Cookie: instCookieHeader }
        });
        console.log('- Student approved in class.');

    } catch (e) {
        const detail = e.response?.data || e.message;
        console.error('SEEDING FAILED:', JSON.stringify(detail, null, 2));
        process.exit(1);
    }

    // ─────────────────────────────────────────────────
    // STEP 2 – Launch Playwright Browser
    // ─────────────────────────────────────────────────
    console.log('\n[2/6] INITIALIZING PLAYWRIGHT BROWSER CLIENT...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // ─────────────────────────────────────────────────
    // STEP 3 – Instructor: Create & Publish Assignment
    // ─────────────────────────────────────────────────
    console.log('\n[3/6] TESTING INSTRUCTOR CREATING & PUBLISHING ASSIGNMENT...');
    try {
        await page.goto(`${FRONTEND_URL}/login`);
        await page.fill('#email', instructorEmail);
        await page.fill('#password', password);
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_instructor_logged_in.png') });
        console.log('- Instructor logged in.');

        await page.goto(`${FRONTEND_URL}/instructor/assignments`);
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_instructor_assignments_dashboard.png') });
        console.log('- Assignments dashboard loaded.');

        // Click create assignment
        await page.click('button:has-text("Create Assignment")');
        await page.waitForTimeout(1000);

        // Fill form
        await page.fill('input[placeholder="e.g. Midterm Simulation Challenge"]', 'E2E Term Campaign');
        await page.selectOption('select', { label: /Select a scenario/i });
        // Select the scenario by value
        const scenarioSelectHandle = await page.$('select:has(option[value="' + scenarioId + '"])');
        if (scenarioSelectHandle) {
            await scenarioSelectHandle.selectOption(scenarioId);
        }
        // Select class
        const classSelectHandles = await page.$$('select');
        for (const sel of classSelectHandles) {
            const opts = await sel.$$('option');
            for (const opt of opts) {
                const val = await opt.getAttribute('value');
                if (val === classId) { await sel.selectOption(classId); break; }
            }
        }

        // Duration: 15 days
        await page.selectOption('select:has-text("Days")', '15').catch(() => {
            // Try selecting by index or value
            return page.locator('select').nth(2).selectOption('15');
        });

        // Start date (slightly in the past so it immediately becomes ACTIVE)
        const startOffset = new Date(Date.now() - 30000).toISOString().slice(0, 16);
        await page.fill('input[type="datetime-local"]', startOffset);
        await page.fill('input[placeholder="HH:MM (e.g. 09:00)"]', '08:00');

        // Custom daily budget cap
        const numberInputs = await page.$$('input[type="number"]');
        if (numberInputs.length > 0) {
            await numberInputs[numberInputs.length - 1].fill('125');
        }

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_create_assignment_form.png') });
        console.log('- Assignment form filled.');

        await page.click('button:has-text("Launch Assignment")');
        await page.waitForTimeout(2500);

        const draftBadge = page.locator('span:has-text("DRAFT")').first();
        const isDraft = await draftBadge.isVisible().catch(() => false);
        console.log(`- Draft assignment created: ${isDraft}`);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_assignment_draft.png') });

        // Open assignment to publish
        const assignmentBtn = page.locator('button:has-text("E2E Term Campaign"), [data-name="E2E Term Campaign"]').first();
        if (await assignmentBtn.isVisible().catch(() => false)) {
            await assignmentBtn.click();
            await page.waitForTimeout(1000);
        }

        // Publish
        await page.click('button:has-text("Publish")');
        await page.waitForTimeout(2500);

        const activeBadge = page.locator('span:has-text("ACTIVE"), span:has-text("SCHEDULED")').first();
        const isActive = await activeBadge.isVisible().catch(() => false);
        console.log(`- Assignment published (ACTIVE/SCHEDULED badge): ${isActive}`);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_assignment_published.png') });

    } catch (err) {
        console.error('Instructor flow error:', err.message);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'ERR_instructor_flow.png') }).catch(() => {});
    }

    // ─────────────────────────────────────────────────
    // STEP 4 – Student: Access Campaign & Budget Cap Test
    // ─────────────────────────────────────────────────
    console.log('\n[4/6] STUDENT ACCESSING CAMPAIGN AND TESTING BUDGET ENFORCEMENT...');
    try {
        await context.clearCookies();

        await page.goto(`${FRONTEND_URL}/login`);
        await page.fill('#email', studentEmail);
        await page.fill('#password', password);
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(3000);
        console.log('- Student logged in.');

        await page.goto(`${FRONTEND_URL}/campaign`);
        await page.waitForTimeout(2500);

        const scenarioLabel = await page.locator('h1, h2, h3').first().innerText().catch(() => 'N/A');
        console.log(`- Student campaign header: "${scenarioLabel}"`);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_student_campaign.png') });

        // Start campaign if button visible
        const startBtn = page.locator('button:has-text("Start Campaign")');
        if (await startBtn.isVisible().catch(() => false)) {
            await startBtn.click();
            await page.waitForTimeout(2500);
            console.log('- Student started campaign from assignment.');
        }

        // Navigate to Day 1 decision
        await page.goto(`${FRONTEND_URL}/campaign/day/1`);
        await page.waitForTimeout(2000);

        // Enter budget exceeding 125 cap
        const numInputs = await page.$$('input[type="number"]');
        if (numInputs.length > 0) {
            await numInputs[0].fill('150');
        }
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_student_over_budget.png') });

        await page.click('button:has-text("Lock Decisions"), button:has-text("Submit")').catch(() =>
            page.click('button[type="submit"]')
        );
        await page.waitForTimeout(2500);

        const errorToast = page.locator('text=/exceeds|limit|budget/i');
        const budgetErrorShown = await errorToast.isVisible().catch(() => false);
        console.log(`- Budget cap error shown for 150 spend: ${budgetErrorShown}`);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_budget_error.png') });

        // Submit valid decision under cap
        if (numInputs.length > 0) {
            await numInputs[0].fill('50');
        }
        await page.click('button:has-text("Lock Decisions"), button:has-text("Submit")').catch(() =>
            page.click('button[type="submit"]')
        );
        await page.waitForTimeout(2000);
        console.log('- Day 1 decision submitted under budget cap.');

    } catch (err) {
        console.error('Student flow error:', err.message);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'ERR_student_flow.png') }).catch(() => {});
    }

    // ─────────────────────────────────────────────────
    // STEP 5 – Fast-Forward Day 1 via API
    // ─────────────────────────────────────────────────
    console.log('\n[5/6] FAST-FORWARDING DAY 1 SIMULATION...');
    try {
        const studentCookies = await context.cookies();
        const studentCookieHeader = studentCookies.map(c => `${c.name}=${c.value}`).join('; ');

        const stateRes = await axios.get(`${BACKEND_URL}/api/v1/campaign/state`, {
            headers: { Cookie: studentCookieHeader }
        });
        const runId = stateRes.data?.run?.id;
        if (!runId) throw new Error('No active campaign run found for student.');

        console.log(`- Fast-forwarding run: ${runId}`);
        const ffRes = await axios.post(`${BACKEND_URL}/api/v1/campaign/fast-forward`, {
            campaignRunId: runId
        }, { headers: { Cookie: studentCookieHeader } });

        console.log(`- Day processed → now Day ${ffRes.data?.currentDay}, status: ${ffRes.data?.status}`);

        await page.goto(`${FRONTEND_URL}/campaign`);
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_student_day2.png') });
        console.log('- Student Day 2 view captured.');

    } catch (err) {
        console.error('Fast-forward error:', err.message);
    }

    // ─────────────────────────────────────────────────
    // STEP 6 – Admin: Monitor Assignment Reports
    // ─────────────────────────────────────────────────
    console.log('\n[6/6] ADMIN MONITORING ASSIGNMENT REPORTS...');
    try {
        await context.clearCookies();

        // Register admin (uses generic instructor route, then we'll promote via API)
        await axios.post(`${BACKEND_URL}/api/auth/register/instructor`, {
            email: adminEmail,
            password,
            name: 'QA Admin',
        }).catch(e => { /* may already exist */ });

        // Sign in as admin — the role must be elevated in DB manually via a backend call
        // Use the instructor cookie to promote via admin route
        const adminCookieHeader = await signIn(adminEmail, password);

        // Use instructor cookie to elevate the admin user if an admin-only endpoint exists
        // For now we sign in with instructor-level access and navigate to admin routes
        const authCookies = adminCookieHeader.split(';').map(pair => {
            const [name, ...rest] = pair.trim().split('=');
            return { name: name.trim(), value: rest.join('=').trim(), domain: 'localhost', path: '/' };
        }).filter(c => c.name && c.value);
        await context.addCookies(authCookies);

        await page.goto(`${FRONTEND_URL}/login`);
        await page.fill('#email', adminEmail);
        await page.fill('#password', password);
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(3000);

        await page.goto(`${FRONTEND_URL}/admin`);
        await page.waitForTimeout(2500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_admin_dashboard.png') });
        console.log('- Admin dashboard loaded. Screenshot saved.');

    } catch (err) {
        console.error('Admin flow error:', err.message);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'ERR_admin_flow.png') }).catch(() => {});
    }

    await browser.close();

    console.log('\n==================================================');
    console.log('SIMLAB FLEXIBLE ASSIGNMENTS E2E QA TEST COMPLETE');
    console.log(`SCREENSHOTS SAVED TO: ${SCREENSHOT_DIR}`);
    console.log('==================================================');
}

runE2eAssignmentsTest().catch(err => {
    console.error('Fatal E2E error:', err);
    process.exit(1);
});
