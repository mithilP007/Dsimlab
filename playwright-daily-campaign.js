const { test } = require('@playwright/test');
const axios = require('axios');
const fs = require('fs');

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:5000';

test('Daily Campaign E2E Simulation Flow', async ({ page, context }) => {
  console.log('==================================================');
  console.log('STARTING SIMLAB DAILY LIVE CAMPAIGN E2E BROWSER TEST');
  console.log('==================================================');

  // Start tracing to D:\simlab-traces
  const tracePath = `D:\\simlab-traces\\daily-campaign-e2e-trace-${Date.now()}.zip`;
  try {
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  } catch (err) {
    console.log('Tracing already managed by config:', err.message);
  }

  try {
    // ── STEP 1: Sign up a new student user ───────────────────────────────
    console.log('\n[1/5] REGISTERING STUDENT...');
    const testEmail = `student.daily.e2e.${Date.now()}@simplab.edu`;
    console.log(`- Student Email: ${testEmail}`);

    await page.goto(`${FRONTEND_URL}/signup`);
    await page.waitForSelector('#name', { timeout: 10000 });
    await page.fill('#name', 'E2E Daily Campaign Student');
    await page.fill('#email', testEmail);
    await page.fill('#password', 'Password123!');

    // Step 1 → 2: choose pricing plan
    await page.click('button:has-text("Choose Pricing Plan")');
    await page.waitForTimeout(800);

    // Step 2 → 3: review details
    await page.click('button:has-text("Review Details")');
    await page.waitForTimeout(800);

    // Step 3: complete signup
    console.log('- Clicking Complete Signup...');
    await page.click('button:has-text("Complete Signup")');

    // Wait for redirect to dashboard
    await page.waitForURL(`${FRONTEND_URL}/dashboard/**`, { timeout: 15000 });
    console.log(`- Redirected to: ${page.url()}`);

    // ── STEP 2: Extract session cookies ──────────────────────────────────
    console.log('\n[2/5] EXTRACTING SESSION COOKIES...');
    let cookies = await context.cookies();
    let cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const cookieNames = cookies.map(c => c.name).join(', ');
    console.log(`- Cookies: ${cookieNames}`);
    if (!cookies.length) {
      throw new Error('No session cookies found after signup redirect!');
    }

    // ── STEP 3: Start campaign run via API ───────────────────────────────
    console.log('\n[3/5] STARTING DAILY CAMPAIGN RUN VIA API...');
    let run;
    try {
      const startRes = await axios.post(`${BACKEND_URL}/api/v1/campaign/start`, {}, {
        headers: {
          Cookie: cookieHeader,
          Origin: FRONTEND_URL,
          'Content-Type': 'application/json',
        }
      });
      console.log(`- Campaign start: runId=${startRes.data.campaignRunId}, day=${startRes.data.currentDay}, status=${startRes.data.status}`);
    } catch (startErr) {
      const errCode = startErr.response?.status;
      const errMsg = startErr.response?.data?.message || startErr.message;
      console.log(`- Campaign start API (${errCode}): ${errMsg}`);
      if (errCode !== 200 && errCode !== 201) {
        throw new Error(`Campaign start failed (${errCode}): ${errMsg}`);
      }
    }

    // Fetch campaign state to get the run object
    const stateRes = await axios.get(`${BACKEND_URL}/api/v1/campaign/state`, {
      headers: { Cookie: cookieHeader, Origin: FRONTEND_URL }
    });
    run = stateRes.data.run;
    console.log(`- Active run: id=${run.id}, day=${run.currentDay}, status=${run.status}`);

    // Navigate to campaign dashboard for visual verification
    await page.goto(`${FRONTEND_URL}/campaign`);
    await page.waitForTimeout(2000);
    console.log(`- Campaign dashboard loaded: ${page.url()}`);

    // Refresh cookies after navigation
    cookies = await context.cookies();
    cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // ── STEP 4: Submit Day 1 decisions ────────────────────────────────────
    console.log('\n[4/5] SUBMITTING DAY 1 DECISIONS...');
    await page.goto(`${FRONTEND_URL}/campaign/day/1`);
    await page.waitForTimeout(1500);

    const decisionRes = await axios.post(`${BACKEND_URL}/api/v1/campaign/decision`, {
      campaignRunId: run.id,
      dayNumber: 1,
      seoSettings: {
        targetKeywords: ['CRM SaaS', 'B2B CRM'],
        contentQuality: 8,
        backlinkBudget: 40,
        metaTitle: 'QA Daily Store',
        metaDescription: 'Shop daily simulated items',
        h1Header: 'Daily Shopping',
        bodyContent: 'SimLab premium goods'
      },
      googleAdsSettings: { campaigns: [] },
      metaAdsSettings: { campaigns: [] }
    }, {
      headers: { Cookie: cookieHeader, Origin: FRONTEND_URL, 'Content-Type': 'application/json' }
    });
    console.log(`- Day 1 decision saved: ${decisionRes.data.success ? 'OK' : 'FAILED'}`);

    // Trigger fast-forward to process Day 1 simulation
    console.log('- Fast-forwarding Day 1 simulation...');
    const ffRes = await axios.post(`${BACKEND_URL}/api/v1/campaign/fast-forward`, {
      campaignRunId: run.id
    }, {
      headers: { Cookie: cookieHeader, Origin: FRONTEND_URL, 'Content-Type': 'application/json' }
    });
    console.log(`- Fast-forward: now on Day ${ffRes.data.currentDay}, status=${ffRes.data.status}`);

    // ── STEP 5: Verify Day 1 results ──────────────────────────────────────
    console.log('\n[5/5] VERIFYING DAY 1 RESULTS...');
    await page.goto(`${FRONTEND_URL}/campaign`);
    await page.waitForTimeout(2000);

    const resultsRes = await axios.get(`${BACKEND_URL}/api/v1/campaign/results?campaignRunId=${run.id}`, {
      headers: { Cookie: cookieHeader, Origin: FRONTEND_URL }
    });
    const resultsList = resultsRes.data.results;
    console.log(`- Daily results count: ${resultsList.length}`);

    if (resultsList.length === 0) {
      throw new Error('No simulation results generated after Day 1 fast-forward.');
    }

    const day1Result = resultsList[0];
    console.log(`- Day 1 Composite Score: ${day1Result.compositeScore}%`);
    console.log(`- Day 1 Clicks: ${day1Result.clicks}, Revenue: $${day1Result.revenue}`);
    console.log(`- Day 1 Trend Source: ${day1Result.trendSnapshot?.source || 'N/A'}`);
    console.log('>>> DAILY LIVE SIMULATION E2E FLOW: SUCCESS!');

    // Save report JSON to D drive
    const reportData = {
      success: true,
      campaignRunId: run.id,
      day1Result: {
        compositeScore: day1Result.compositeScore,
        clicks: day1Result.clicks,
        revenue: day1Result.revenue,
        source: day1Result.trendSnapshot?.source
      },
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync('D:\\simlab-test-artifacts\\daily-campaign-report.json', JSON.stringify(reportData, null, 2));
    console.log('- Report saved to D:\\simlab-test-artifacts\\daily-campaign-report.json');

    // Take success screenshot
    const successScreenshotPath = `D:\\simlab-screenshots\\daily-campaign-e2e-success-${Date.now()}.png`;
    await page.screenshot({ path: successScreenshotPath });
    console.log(`- Screenshot saved at: ${successScreenshotPath}`);

    // Stop tracing
    await context.tracing.stop({ path: tracePath });
    console.log(`- Trace saved at: ${tracePath}`);

    // Copy video to D:\simlab-videos
    const video = page.video();
    if (video) {
      const videoPath = await video.path();
      if (videoPath && fs.existsSync(videoPath)) {
        const destVideoPath = `D:\\simlab-videos\\daily-campaign-e2e-success-${Date.now()}.webm`;
        fs.copyFileSync(videoPath, destVideoPath);
        console.log(`- Video saved at: ${destVideoPath}`);
      }
    }

  } catch (err) {
    console.error('\n❌ E2E Test error:', err.message);

    // Failure screenshot
    try {
      const failPath = `D:\\simlab-screenshots\\daily-campaign-e2e-failure-${Date.now()}.png`;
      await page.screenshot({ path: failPath });
      console.log(`- Failure screenshot: ${failPath}`);
    } catch (ssErr) {
      console.error('Could not capture failure screenshot:', ssErr.message);
    }

    // Failure trace
    try {
      await context.tracing.stop({ path: tracePath });
      console.log(`- Failure trace: ${tracePath}`);
    } catch (trErr) {
      console.error('Could not save failure trace:', trErr.message);
    }

    // Error JSON report
    try {
      const errorReport = {
        success: false,
        error: err.message,
        timestamp: new Date().toISOString()
      };
      fs.writeFileSync('D:\\simlab-test-artifacts\\daily-campaign-report.json', JSON.stringify(errorReport, null, 2));
    } catch (_) { /* ignore */ }

    throw err;
  }
});
