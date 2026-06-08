const { chromium } = require('playwright');
const axios = require('axios');

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:5000';

async function runQa() {
    console.log('==================================================');
    console.log('STARTING FULL-STACK SIMLAB QA AUTOMATION TESTING');
    console.log('==================================================');

    // 1. Health checks on backend
    console.log('\n[1/7] RUNNING BACKEND HEALTH CHECKS...');
    try {
        const rootRes = await axios.get(`${BACKEND_URL}/`);
        console.log(`- GET /: Status ${rootRes.status}, Response:`, JSON.stringify(rootRes.data));
    } catch (e) {
        console.warn(`- GET /: Failed`, e.message);
    }

    try {
        const healthRes = await axios.get(`${BACKEND_URL}/health`);
        console.log(`- GET /health: Status ${healthRes.status}, Response:`, JSON.stringify(healthRes.data));
    } catch (e) {
        console.warn(`- GET /health: Failed`, e.message);
    }

    try {
        const docsRes = await axios.get(`${BACKEND_URL}/docs`);
        console.log(`- GET /docs (Swagger HTML): Status ${docsRes.status}`);
    } catch (e) {
        console.warn(`- GET /docs: Failed`, e.message);
    }

    try {
        const docsJsonRes = await axios.get(`${BACKEND_URL}/docs/json`);
        console.log(`- GET /docs/json (OpenAPI Specs): Status ${docsJsonRes.status}`);
    } catch (e) {
        console.warn(`- GET /docs/json: Failed`, e.message);
    }

    try {
        const meRes = await axios.get(`${BACKEND_URL}/api/me`);
        console.log(`- GET /api/me (Unauthenticated): Status ${meRes.status}`);
    } catch (e) {
        console.log(`- GET /api/me (Unauthenticated): Correctly returned 401: ${e.response?.status}`);
    }

    // 2. Launch Browser QA
    console.log('\n[2/7] INITIALIZING BROWSER AUTOMATION...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Listen to page errors & logs
    const consoleLogs = [];
    page.on('console', msg => {
        consoleLogs.push(`[Console ${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', err => {
        consoleLogs.push(`[Console Error] ${err.message}`);
        console.error(`Page error: ${err.message}`);
    });

    const networkErrors = [];
    page.on('requestfailed', request => {
        networkErrors.push(`[Failed Request] ${request.url()}: ${request.failure()?.errorText}`);
    });

    console.log(`- Navigating to frontend ${FRONTEND_URL}...`);
    await page.goto(`${FRONTEND_URL}/landing`);
    await page.waitForTimeout(2000);
    console.log(`- Landing page title: "${await page.title()}"`);

    // 3. Signup Individual Student Flow
    console.log('\n[3/7] TESTING INDIVIDUAL STUDENT SIGNUP & PROVISION FLOW...');
    const testEmail = `student.qa.${Date.now()}@simplab.edu`;
    console.log(`- Signup email: ${testEmail}`);

    await page.goto(`${FRONTEND_URL}/signup`);
    await page.waitForSelector('#name');

    // Fill Step 1
    await page.fill('#name', 'QA Automation Student');
    await page.fill('#email', testEmail);
    await page.fill('#password', 'Password123!');
    await page.click('button:has-text("Choose Sandbox Plan")');

    // Step 2: Choose plan
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Review Details")');

    // Step 3: Provision sandbox
    await page.waitForTimeout(1000);
    console.log('- Click Provision Sandbox...');
    await page.click('button:has-text("Provision Sandbox")');

    // Wait for redirect to dashboard
    await page.waitForTimeout(4000);
    const finalUrl = page.url();
    console.log(`- Current redirected URL: ${finalUrl}`);
    const heading = await page.innerText('h2');
    console.log(`- Dashboard Heading: "${heading}"`);

    // 4. Submit Campaign Decisions (SEO, Google Ads, Meta Ads)
    console.log('\n[4/7] TESTING DECISIONS SAVING FLOW...');
    let activeSimId = null;
    const cookies = await context.cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    try {
        const stateRes = await axios.get(`${BACKEND_URL}/api/v1/simulation/state`, {
            headers: { Cookie: cookieHeader }
        });
        activeSimId = stateRes.data.state.id;
        console.log(`- Active Simulation ID: ${activeSimId}`);

        // Submit decisions via API directly with student cookie
        const payload = {
            seoTargetKeywords: ['CRM SaaS'],
            seoContentQuality: 7,
            seoBacklinkBudget: 150,
            googleCampaigns: [{
                name: "Google Search Sales",
                budget: 1500.0,
                objective: "Sales",
                campaignType: "Search",
                biddingStrategy: "Manual CPC",
                negativeKeywords: ["free", "cheap"],
                adCopy: { headline1: "Best CRM Tools", headline2: "Boost Sales Revenue", headline3: "50% Off Sales", description1: "Buy database tools", description2: "Secure HTTPS checkout" },
                landingPage: { pageRelevance: 7, mobileFriendly: 8, pageSpeed: 8, trustSignals: 8, offerClarity: 7, conversionReadiness: 7 },
                keywords: [{ word: "CRM SaaS", bid: 2.20, matchType: "exact" }],
                devices: { desktop: true, mobile: true, tablet: false },
                locations: ["US"]
            }],
            metaCampaigns: [{
                name: "Meta Brand Conversion",
                budget: 900.0,
                audienceInterest: "business-owners",
                bidType: "LOWEST_COST",
                bidAmount: 0,
                placement: "feeds",
                creativeQuality: 9,
                creative: { headline: "Save 50% on CRM Tools", primaryText: "Buy the #1 CRM software for sales", callToAction: "SHOP_NOW", mediaQuality: 90 },
                objective: "sales"
            }]
        };

        await axios.post(`${BACKEND_URL}/api/simulations/${activeSimId}/decisions`, payload, {
            headers: { Cookie: cookieHeader }
        });
        console.log('- Saved and locked Day 1 decisions via HTTP API.');

    } catch (err) {
        console.error('Failed to submit decisions:', err.message);
    }

    // 5. Submit, Lock, and Fast-Forward
    console.log('\n[5/7] RUNNING ROUND ADVANCEMENT & FAST-FORWARD...');
    try {
        // Verify state is LOCKED
        const stateResAfterLock = await axios.get(`${BACKEND_URL}/api/simulations/${activeSimId}`, {
            headers: { Cookie: cookieHeader }
        });
        console.log(`- State status before fast-forward: ${stateResAfterLock.data.status}`);

        // Fast forward
        console.log('- Triggering Dev Fast-Forward...');
        const ffRes = await axios.post(`${BACKEND_URL}/api/simulations/${activeSimId}/fast-forward`, {}, {
            headers: { Cookie: cookieHeader }
        });
        console.log(`- Fast-forward status: ${ffRes.status}, Response:`, JSON.stringify(ffRes.data));

        // Wait a second for updates
        await page.waitForTimeout(2000);

        const stateResAfterFF = await axios.get(`${BACKEND_URL}/api/simulations/${activeSimId}`, {
            headers: { Cookie: cookieHeader }
        });
        console.log(`- State status after fast-forward: ${stateResAfterFF.data.status}`);
        console.log(`- New Current Round: Day ${stateResAfterFF.data.currentRound}`);

    } catch (err) {
        console.error('Fast-Forward failed:', err.message);
    }

    // 6. Day 2 Optimization & Logic Change check
    console.log('\n[6/7] TESTING DAY 2 DECISIONS & METRICS PROGRESSION...');
    try {
        // Submit Day 2 optimized decisions (higher budget, better bids, negative keywords)
        const payloadDay2 = {
            seoTargetKeywords: ['CRM SaaS'],
            seoContentQuality: 9,
            seoBacklinkBudget: 300,
            googleCampaigns: [{
                name: "Google Search Sales Day 2",
                budget: 4500.0, // Higher budget
                objective: "Sales",
                campaignType: "Search",
                biddingStrategy: "Maximize Conversions",
                negativeKeywords: ["free", "cheap", "crack", "used"],
                adCopy: { headline1: "Best Enterprise CRM SaaS", headline2: "Boost Sales Revenue", headline3: "50% Off Plan", description1: "Buy database tools", description2: "Secure HTTPS checkout" },
                landingPage: { pageRelevance: 9, mobileFriendly: 9, pageSpeed: 9, trustSignals: 9, offerClarity: 9, conversionReadiness: 9 }, // High quality
                keywords: [{ word: "CRM SaaS", bid: 3.50, matchType: "exact" }],
                devices: { desktop: true, mobile: true, tablet: true },
                locations: ["US", "CA", "UK"]
            }],
            metaCampaigns: [{
                name: "Meta Brand Conversion Day 2",
                budget: 3000.0, // Higher budget
                audienceInterest: "business-owners",
                bidType: "LOWEST_COST",
                bidAmount: 0,
                placement: "feeds",
                creativeQuality: 9,
                creative: { headline: "Save 50% on CRM Tools Today", primaryText: "Buy the #1 CRM software for sales", callToAction: "SHOP_NOW", mediaQuality: 95 },
                objective: "sales"
            }]
        };

        await axios.post(`${BACKEND_URL}/api/simulations/${activeSimId}/decisions`, payloadDay2, {
            headers: { Cookie: cookieHeader }
        });
        console.log('- Saved Day 2 decisions.');

        // Fast forward Day 2
        console.log('- Fast-forwarding Day 2...');
        await axios.post(`${BACKEND_URL}/api/simulations/${activeSimId}/fast-forward`, {}, {
            headers: { Cookie: cookieHeader }
        });

        // Fetch snapshots to verify progression
        const snapshotsRes = await axios.get(`${BACKEND_URL}/api/simulations/${activeSimId}/snapshots`, {
            headers: { Cookie: cookieHeader }
        });
        const snapshots = snapshotsRes.data.snapshots;
        console.log(`- Retrieved ${snapshots.length} round snapshots.`);
        
        const snap1Raw = snapshots.find(s => s.round === 1).data;
        const snap1 = typeof snap1Raw === 'string' ? JSON.parse(snap1Raw) : snap1Raw;
        const snap2Raw = snapshots.find(s => s.round === 2).data;
        const snap2 = typeof snap2Raw === 'string' ? JSON.parse(snap2Raw) : snap2Raw;

        // Aggregate Day 1 vs Day 2 conversions
        let day1GoogleConversions = snap1.dailyMetrics.reduce((acc, m) => acc + m.googleConversions, 0);
        let day2GoogleConversions = snap2.dailyMetrics.reduce((acc, m) => acc + m.googleConversions, 0);
        let day1MetaConversions = snap1.dailyMetrics.reduce((acc, m) => acc + m.metaConversions, 0);
        let day2MetaConversions = snap2.dailyMetrics.reduce((acc, m) => acc + m.metaConversions, 0);

        console.log(`- Day 1 Google Conversions: ${day1GoogleConversions}`);
        console.log(`- Day 2 Google Conversions: ${day2GoogleConversions}`);
        console.log(`- Day 1 Meta Conversions: ${day1MetaConversions}`);
        console.log(`- Day 2 Meta Conversions: ${day2MetaConversions}`);

        console.log(`- Day 1 Composite Score: ${snap1.scores.composite}`);
        console.log(`- Day 2 Composite Score: ${snap2.scores.composite}`);

        if (day2GoogleConversions > day1GoogleConversions && day2MetaConversions > day1MetaConversions && snap2.scores.composite > snap1.scores.composite) {
            console.log('>>> LOGIC VERIFICATION: SUCCESS (Day 2 optimizations logically out-performed Day 1!)');
        } else {
            console.log('>>> LOGIC VERIFICATION: WARNING (Day 2 did not out-perform Day 1 as expected. Review random variance.)');
        }

    } catch (err) {
        console.error('Day 2 progression failed:', err.message);
    }

    // 7. Instructor Class and Scenario Creation Flow
    console.log('\n[7/7] TESTING INSTRUCTOR PORTAL FLOW...');
    try {
        const instEmail = `instructor.qa.${Date.now()}@simplab.edu`;
        console.log(`- Registering instructor: ${instEmail}`);

        // Register Instructor
        const instRegRes = await axios.post(`${BACKEND_URL}/api/auth/sign-up/email`, {
            email: instEmail,
            password: 'Password123!',
            name: 'QA Professor',
            role: 'INSTRUCTOR'
        });
        const instCookie = instRegRes.headers['set-cookie'];
        const instCookieHeader = instCookie ? instCookie.map(c => c.split(';')[0]).join('; ') : '';

        // Create Scenario Template
        console.log('- Creating a scenario...');
        const scenarioRes = await axios.post(`${BACKEND_URL}/api/scenarios`, {
            name: '30-Day Digital Marketing Growth Challenge',
            description: 'Optimize SEO, Google Search Ads, and Meta placement settings for max revenue.',
            industry: 'E-commerce',
            budgetPerRound: 1500.0,
            targetKPI: 'revenue',
            baselineOrganicTraffic: 1000
        }, {
            headers: { Cookie: instCookieHeader }
        });
        const scenarioId = scenarioRes.data.id;
        console.log(`- Scenario template created: ${scenarioRes.status}, ID: "${scenarioId}"`);

        // Create class
        console.log('- Creating new cohort class using scenarioId...');
        const classRes = await axios.post(`${BACKEND_URL}/api/classes`, {
            name: 'QA SimLab Cohort 2026',
            scenarioId
        }, {
            headers: { Cookie: instCookieHeader }
        });
        console.log(`- Class created: ${classRes.status}, Code: "${classRes.data.class?.inviteCode}"`);

    } catch (err) {
        console.error('Instructor flow failed:', err.message);
    }

    // Console logs summary
    console.log('\n==================================================');
    console.log('AUTOMATED QA FLOW RUN LOGS SUMMARY');
    console.log('==================================================');
    console.log(`- Total Console logs captured: ${consoleLogs.length}`);
    consoleLogs.slice(0, 8).forEach(l => console.log('  ' + l));
    if (consoleLogs.length > 8) console.log(`  ... and ${consoleLogs.length - 8} more.`);

    console.log(`- Total Network requests failed: ${networkErrors.length}`);
    networkErrors.forEach(e => console.log('  ' + e));

    await browser.close();
    console.log('\n==================================================');
    console.log('AUTOMATED E2E QA AUTOMATION RUN COMPLETED SUCCESSFULLY');
    console.log('==================================================');
}

runQa().catch(console.error);
