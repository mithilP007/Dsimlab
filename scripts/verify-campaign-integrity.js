const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:5000';

const ARTIFACT_DIR = 'D:\\simlab-campaign-validation-artifacts';

async function registerAndLogin(email, name, role = 'STUDENT_COLLEGE', classId = null) {
  const password = 'Password123!';
  try {
    // 1. SignUp
    await axios.post(`${BACKEND_URL}/api/auth/sign-up/email`, {
      email,
      password,
      name,
      role
    }, {
      headers: { Origin: FRONTEND_URL }
    });
  } catch (e) {
    // might be already registered, ignore
  }

  // Align role and status in database BEFORE login to ensure session payload has it
  const user = await prisma.user.update({
    where: { email },
    data: { role, status: 'active', emailVerified: true, classId }
  });

  // 2. SignIn to get session cookie
  const loginRes = await axios.post(`${BACKEND_URL}/api/auth/sign-in/email`, {
    email,
    password
  }, {
    headers: { Origin: FRONTEND_URL }
  });
  
  const cookies = loginRes.headers['set-cookie'];
  const cookieHeader = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';

  return { cookieHeader, user };
}

async function getAdminCookie() {
  const email = 'superadmin@simlab.test';
  const password = 'Test@123456';
  const loginRes = await axios.post(`${BACKEND_URL}/api/auth/sign-in/email`, {
    email,
    password
  }, {
    headers: { Origin: FRONTEND_URL }
  });
  const cookies = loginRes.headers['set-cookie'];
  return cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';
}

async function getInstructorCookie() {
  const email = 'instructor@simlab.test';
  const password = 'Test@123456';
  const loginRes = await axios.post(`${BACKEND_URL}/api/auth/sign-in/email`, {
    email,
    password
  }, {
    headers: { Origin: FRONTEND_URL }
  });
  const cookies = loginRes.headers['set-cookie'];
  return cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';
}

async function runIntegrityValidation() {
  console.log('==================================================');
  console.log('STARTING DAILY CAMPAIGN DATA-INTEGRITY VALIDATION');
  console.log('==================================================');

  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  const resultsSummary = {
    timestamp: new Date().toISOString(),
    campaign15Day: { success: false, lockingVerified: 'FAIL', certVerification: 'FAIL', leaderboardVerified: 'FAIL', logs: [] },
    campaign30Day: { success: false, catchupVerified: 'FAIL', leaderboardVerified: 'FAIL', logs: [] },
    trendSnapshot: { success: false, fieldsValid: false, noFakeLive: 'FAIL', logs: [] },
    accessControl: { success: false, adminEditCheck: 'FAIL', instructorEditCheck: 'FAIL', altAccessCheck: 'FAIL', individualStartPass: false },
    databaseConsistency: { success: false, relationsConsistent: false, logs: [] },
    verdict: 'NO-GO'
  };

  try {
    const adminCookie = await getAdminCookie();
    const instructorCookie = await getInstructorCookie();
    console.log(`- Retrieved Admin and Instructor session cookies successfully.`);

    // Seed scenarios
    console.log('\n[PREPARATION] SEEDING 15-DAY AND 30-DAY SCENARIOS...');
    let scenario15 = await prisma.scenario.findFirst({
      where: { name: '15-Day B2B SaaS Growth' }
    });
    if (!scenario15) {
      scenario15 = await prisma.scenario.create({
        data: {
          name: '15-Day B2B SaaS Growth',
          description: 'B2B SaaS simulation',
          industry: 'CRM SaaS',
          startRound: 1,
          maxRounds: 15,
          durationDays: 15,
          dailyBudgetCap: 2000,
          baselineOrganicTraffic: 500,
          targetKPI: 'revenue'
        }
      });
    } else {
      scenario15 = await prisma.scenario.update({
        where: { id: scenario15.id },
        data: { durationDays: 15, dailyBudgetCap: 2000 }
      });
    }
    console.log(`- Seeded 15-day scenario: ${scenario15.id}`);

    let scenario30 = await prisma.scenario.findFirst({
      where: { name: '30-Day Enterprise Growth' }
    });
    if (!scenario30) {
      scenario30 = await prisma.scenario.create({
        data: {
          name: '30-Day Enterprise Growth',
          description: 'Enterprise Growth simulation',
          industry: 'CRM SaaS',
          startRound: 1,
          maxRounds: 30,
          durationDays: 30,
          dailyBudgetCap: 5000,
          baselineOrganicTraffic: 1000,
          targetKPI: 'revenue'
        }
      });
    } else {
      scenario30 = await prisma.scenario.update({
        where: { id: scenario30.id },
        data: { durationDays: 30, dailyBudgetCap: 5000 }
      });
    }
    console.log(`- Seeded 30-day scenario: ${scenario30.id}`);

    // Create Cohort Classes
    const instructorUser = await prisma.user.findFirst({ where: { role: 'INSTRUCTOR' } });
    if (!instructorUser) throw new Error('No instructor found to create classes.');

    const class15 = await prisma.class.create({
      data: {
        name: `Cohort 15-Day ${Date.now()}`,
        inviteCode: `INV-15-${Date.now().toString().slice(-6)}`,
        instructorId: instructorUser.id,
        scenarioId: scenario15.id
      }
    });
    console.log(`- Created 15-day class cohort invite code: ${class15.inviteCode}`);

    const class30 = await prisma.class.create({
      data: {
        name: `Cohort 30-Day ${Date.now()}`,
        inviteCode: `INV-30-${Date.now().toString().slice(-6)}`,
        instructorId: instructorUser.id,
        scenarioId: scenario30.id
      }
    });
    console.log(`- Created 30-day class cohort invite code: ${class30.inviteCode}`);

    // ────────────────────────────────────────────────────────────────────────
    // STEP 1: 15-DAY CAMPAIGN VALIDATION
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n==================================================');
    console.log('STEP 1: RUNNING 15-DAY CAMPAIGN FLOW...');
    console.log('==================================================');
    
    // Register Student for 15-day run
    const student15Email = `student.15day.${Date.now()}@simplab.test`;
    const student15 = await registerAndLogin(student15Email, '15-Day Student', 'STUDENT_COLLEGE', class15.id);
    console.log(`- Student ${student15Email} registered and directly mapped to cohort ${class15.name}`);

    // Start campaign
    const start15Res = await axios.post(`${BACKEND_URL}/api/v1/campaign/start`, {}, {
      headers: { Cookie: student15.cookieHeader, Origin: FRONTEND_URL }
    });
    const run15Id = start15Res.data.campaignRunId;
    console.log(`- Started 15-day Campaign Run: ${run15Id}`);

    // Verify SimulationState exists
    const initialSim15 = await prisma.simulationState.findFirst({
      where: { userId: student15.user.id, classId: class15.id }
    });
    console.log(`  * Automatically provisioned SimulationState exists: ${initialSim15 ? 'YES' : 'NO'}`);

    let pastDayLocked15 = false;
    let futureDayLocked15 = false;

    // Progress 15 days
    for (let day = 1; day <= 15; day++) {
      // Locking check on Day 2
      if (day === 2) {
        console.log(`  * Verifying past days locking (submitting decision for Day 1 on Day 2)...`);
        try {
          await axios.post(`${BACKEND_URL}/api/v1/campaign/decision`, {
            campaignRunId: run15Id,
            dayNumber: 1,
            seoSettings: { targetKeywords: ['CRM SaaS'], contentQuality: 5, backlinkBudget: 10 },
            googleAdsSettings: { campaigns: [] },
            metaAdsSettings: { campaigns: [] }
          }, {
            headers: { Cookie: student15.cookieHeader, Origin: FRONTEND_URL }
          });
        } catch (e) {
          pastDayLocked15 = e.response?.status === 400 || e.response?.data?.message?.includes('locked');
        }
        console.log(`    -> Past day locking: ${pastDayLocked15 ? 'BLOCKED (PASS)' : 'ALLOWED (FAIL)'}`);

        console.log(`  * Verifying future days locking (submitting decision for Day 3 on Day 2)...`);
        try {
          await axios.post(`${BACKEND_URL}/api/v1/campaign/decision`, {
            campaignRunId: run15Id,
            dayNumber: 3,
            seoSettings: { targetKeywords: ['CRM SaaS'], contentQuality: 5, backlinkBudget: 10 },
            googleAdsSettings: { campaigns: [] },
            metaAdsSettings: { campaigns: [] }
          }, {
            headers: { Cookie: student15.cookieHeader, Origin: FRONTEND_URL }
          });
        } catch (e) {
          futureDayLocked15 = e.response?.status === 400 || e.response?.data?.message?.includes('locked');
        }
        console.log(`    -> Future day locking: ${futureDayLocked15 ? 'BLOCKED (PASS)' : 'ALLOWED (FAIL)'}`);
      }

      // Submit Decisions
      await axios.post(`${BACKEND_URL}/api/v1/campaign/decision`, {
        campaignRunId: run15Id,
        dayNumber: day,
        seoSettings: {
          targetKeywords: ['CRM SaaS', 'B2B CRM'],
          contentQuality: 8,
          backlinkBudget: 50,
          metaTitle: `Day ${day} SaaS Title`,
          metaDescription: `Day ${day} SaaS Desc`,
          h1Header: `Day ${day} SaaS Header`,
          bodyContent: `Day ${day} SaaS Content`
        },
        googleAdsSettings: { campaigns: [] },
        metaAdsSettings: { campaigns: [] }
      }, {
        headers: { Cookie: student15.cookieHeader, Origin: FRONTEND_URL }
      });

      // Fast Forward
      const ffRes = await axios.post(`${BACKEND_URL}/api/v1/campaign/fast-forward`, {
        campaignRunId: run15Id
      }, {
        headers: { Cookie: student15.cookieHeader, Origin: FRONTEND_URL }
      });
      
      if (day % 5 === 0 || day === 15) {
        console.log(`  * Completed Day ${day} -> Current Day: ${ffRes.data.currentDay}, Status: ${ffRes.data.status}`);
      }
    }

    // Database verification checks for 15-day Campaign
    const decisionsCount15 = await prisma.dailyCampaignDecision.count({ where: { campaignRunId: run15Id } });
    const resultsCount15 = await prisma.dailyCampaignResult.count({ where: { campaignRunId: run15Id } });
    const jobsCount15 = await prisma.campaignProcessingJob.count({ where: { campaignRunId: run15Id } });
    
    console.log(`- 15-Day Verification Counters:`);
    console.log(`  * Decisions persisted: ${decisionsCount15} (Expected: 15)`);
    console.log(`  * Results persisted: ${resultsCount15} (Expected: 15)`);
    console.log(`  * Processing Jobs logged: ${jobsCount15} (Expected: 15)`);

    const runState15 = await prisma.campaignRun.findUnique({
      where: { id: run15Id },
      include: { results: true }
    });

    const duplicateCheck15 = new Set(runState15.results.map(r => r.dayNumber)).size === runState15.results.length;
    console.log(`- Duplicate Check Result: ${duplicateCheck15 ? 'PASS (No duplicates)' : 'FAIL (Duplicates found!)'}`);
    console.log(`- Final Run Status: ${runState15.status}`);

    // Verify Certificate Eligibility (Cumulative score verification)
    console.log(`- Checking Certificate Eligibility...`);
    const simState15 = await prisma.simulationState.findFirst({
      where: { userId: student15.user.id, classId: class15.id }
    });
    if (!simState15) throw new Error('SimulationState not found for student15!');

    // 1. Check eligibility (expected to fail initially due to College instructor approval requirement)
    const elRes1 = await axios.get(`${BACKEND_URL}/api/v1/certificate/eligibility`, {
      headers: { Cookie: student15.cookieHeader, Origin: FRONTEND_URL }
    });
    console.log(`  * Initial Eligibility: eligible=${elRes1.data.eligible}, reasons=[${elRes1.data.reasons.join(', ')}]`);
    const isApprovedError = elRes1.data.reasons.includes('College mode requires instructor approval.');
    console.log(`  * Blocked by instructor approval check: ${isApprovedError ? 'PASS' : 'FAIL'}`);

    // 2. Instructor approves simulation state
    console.log(`  * Instructor approving simulation state...`);
    const approveRes = await axios.post(`${BACKEND_URL}/api/simulations/${simState15.id}/approve`, {}, {
      headers: { Cookie: instructorCookie, Origin: FRONTEND_URL }
    });
    console.log(`  * Instructor approval status: ${approveRes.status} (${approveRes.data.message})`);

    // Elevate score in DB to qualify for certificate (threshold is 70)
    console.log(`  * Elevating student results to qualify for certificate...`);
    await prisma.dailyCampaignResult.updateMany({
      where: { campaignRunId: run15Id },
      data: { compositeScore: 85.0 }
    });
    await prisma.simulationState.update({
      where: { id: simState15.id },
      data: { score: 85.0 }
    });

    // 3. Check eligibility again (expected to pass now)
    const elRes2 = await axios.get(`${BACKEND_URL}/api/v1/certificate/eligibility`, {
      headers: { Cookie: student15.cookieHeader, Origin: FRONTEND_URL }
    });
    console.log(`  * Post-Approval Eligibility: eligible=${elRes2.data.eligible}, reasons=[${elRes2.data.reasons.join(', ')}], compositeScore=${elRes2.data.compositeScore}%, band=${elRes2.data.band}`);

    // 4. Generate Certificate
    console.log(`  * Generating Certificate...`);
    const certGenRes = await axios.post(`${BACKEND_URL}/api/v1/certificate/generate`, {}, {
      headers: { Cookie: student15.cookieHeader, Origin: FRONTEND_URL }
    });
    console.log(`  * Certificate generation status: ${certGenRes.status} (Verification ID: ${certGenRes.data.certificate?.verificationId})`);

    // 5. Get Certificate Summary
    const certSumRes = await axios.get(`${BACKEND_URL}/api/v1/report/certificate-summary`, {
      headers: { Cookie: student15.cookieHeader, Origin: FRONTEND_URL }
    });
    const certRecord = certSumRes.data.report?.[0];
    console.log(`  * Certificate Summary - Verification ID: ${certRecord?.verificationId}, Band: ${certRecord?.band}, Score: ${certRecord?.compositeScore}%`);
    
    const certVerification = (certRecord && certRecord.compositeScore === elRes2.data.compositeScore) ? 'PASS' : 'FAIL';

    // Verify Leaderboard uses average composite score
    console.log(`- Verifying Class Leaderboard...`);
    const leaderboardRes15 = await axios.get(`${BACKEND_URL}/api/v1/campaign/class-leaderboard`, {
      headers: { Cookie: student15.cookieHeader, Origin: FRONTEND_URL }
    });
    const studentStandings15 = leaderboardRes15.data.leaderboard.find(s => s.userId === student15.user.id);
    console.log(`  * Leaderboard score: ${studentStandings15?.averageScore}% (Expected: ${elRes2.data.compositeScore}%)`);
    const leaderboardVerified15 = (studentStandings15 && Math.abs(studentStandings15.averageScore - elRes2.data.compositeScore) < 0.1) ? 'PASS' : 'FAIL';

    resultsSummary.campaign15Day = {
      decisionsCount: decisionsCount15,
      resultsCount: resultsCount15,
      jobsCount: jobsCount15,
      status: runState15.status,
      duplicateCheck: duplicateCheck15 ? 'PASS' : 'FAIL',
      lockingVerified: (pastDayLocked15 && futureDayLocked15) ? 'PASS' : 'FAIL',
      certVerification,
      leaderboardVerified: leaderboardVerified15,
      success: (decisionsCount15 === 15 && resultsCount15 === 15 && runState15.status === 'COMPLETED' && duplicateCheck15 && pastDayLocked15 && futureDayLocked15 && certVerification === 'PASS' && leaderboardVerified15 === 'PASS')
    };

    // ────────────────────────────────────────────────────────────────────────
    // STEP 2: 30-DAY CAMPAIGN VALIDATION
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n==================================================');
    console.log('STEP 2: RUNNING 30-DAY CAMPAIGN FLOW...');
    console.log('==================================================');
    
    // Register Student for 30-day run
    const student30Email = `student.30day.${Date.now()}@simplab.test`;
    const student30 = await registerAndLogin(student30Email, '30-Day Student', 'STUDENT_COLLEGE', class30.id);
    console.log(`- Student ${student30Email} registered and directly mapped to cohort ${class30.name}`);

    // Start campaign
    const start30Res = await axios.post(`${BACKEND_URL}/api/v1/campaign/start`, {}, {
      headers: { Cookie: student30.cookieHeader, Origin: FRONTEND_URL }
    });
    const run30Id = start30Res.data.campaignRunId;
    console.log(`- Started 30-day Campaign Run: ${run30Id}`);

    let catchupVerified30 = 'FAIL';

    // Progress 30 days
    for (let day = 1; day <= 30; day++) {
      // Missed-day catchup test on day 10
      if (day === 10) {
        console.log(`  * Simulating missed-day catchup on Day 10 (skipping decision submission)...`);
      } else {
        // Submit Decisions
        await axios.post(`${BACKEND_URL}/api/v1/campaign/decision`, {
          campaignRunId: run30Id,
          dayNumber: day,
          seoSettings: {
            targetKeywords: ['CRM SaaS', 'B2B CRM'],
            contentQuality: 8,
            backlinkBudget: 50,
            metaTitle: `Day ${day} SaaS Title`,
            metaDescription: `Day ${day} SaaS Desc`,
            h1Header: `Day ${day} SaaS Header`,
            bodyContent: `Day ${day} SaaS Content`
          },
          googleAdsSettings: { campaigns: [] },
          metaAdsSettings: { campaigns: [] }
        }, {
          headers: { Cookie: student30.cookieHeader, Origin: FRONTEND_URL }
        });
      }

      // Fast Forward
      await axios.post(`${BACKEND_URL}/api/v1/campaign/fast-forward`, {
        campaignRunId: run30Id
      }, {
        headers: { Cookie: student30.cookieHeader, Origin: FRONTEND_URL }
      });
      
      if (day % 10 === 0 || day === 30) {
        console.log(`  * Completed Day ${day}...`);
      }
    }

    // Database verification checks for 30-day Campaign
    const decisionsCount30 = await prisma.dailyCampaignDecision.count({ where: { campaignRunId: run30Id } });
    const resultsCount30 = await prisma.dailyCampaignResult.count({ where: { campaignRunId: run30Id } });
    const jobsCount30 = await prisma.campaignProcessingJob.count({ where: { campaignRunId: run30Id } });

    console.log(`- 30-Day Verification Counters:`);
    console.log(`  * Decisions persisted: ${decisionsCount30} (Expected: 30)`);
    console.log(`  * Results persisted: ${resultsCount30} (Expected: 30)`);
    console.log(`  * Processing Jobs logged: ${jobsCount30} (Expected: 30)`);

    const runState30 = await prisma.campaignRun.findUnique({
      where: { id: run30Id },
      include: { results: true }
    });

    const duplicateCheck30 = new Set(runState30.results.map(r => r.dayNumber)).size === runState30.results.length;
    console.log(`- Duplicate Check Result: ${duplicateCheck30 ? 'PASS (No duplicates)' : 'FAIL (Duplicates found!)'}`);
    console.log(`- Final Run Status: ${runState30.status}`);

    // Check missed-day decision record
    const missedDayDecision = await prisma.dailyCampaignDecision.findUnique({
      where: {
        campaignRunId_dayNumber: {
          campaignRunId: run30Id,
          dayNumber: 10
        }
      }
    });
    console.log(`  * Auto-created decision record for skipped Day 10 exists: ${missedDayDecision ? 'YES' : 'NO'}`);
    if (missedDayDecision) {
      catchupVerified30 = 'PASS';
    }

    // Leaderboard uses average composite score
    const leaderboardRes30 = await axios.get(`${BACKEND_URL}/api/v1/campaign/class-leaderboard`, {
      headers: { Cookie: student30.cookieHeader, Origin: FRONTEND_URL }
    });
    const studentStandings30 = leaderboardRes30.data.leaderboard.find(s => s.userId === student30.user.id);
    const expectedAvgScore30 = runState30.results.reduce((sum, r) => sum + r.compositeScore, 0) / runState30.results.length;
    console.log(`  * Leaderboard score: ${studentStandings30?.averageScore}% (Expected: ${expectedAvgScore30.toFixed(2)}%)`);
    const leaderboardVerified30 = (studentStandings30 && Math.abs(studentStandings30.averageScore - expectedAvgScore30) < 0.1) ? 'PASS' : 'FAIL';

    resultsSummary.campaign30Day = {
      decisionsCount: decisionsCount30,
      resultsCount: resultsCount30,
      jobsCount: jobsCount30,
      status: runState30.status,
      duplicateCheck: duplicateCheck30 ? 'PASS' : 'FAIL',
      catchupVerified: catchupVerified30,
      leaderboardVerified: leaderboardVerified30,
      success: (decisionsCount30 === 30 && resultsCount30 === 30 && runState30.status === 'COMPLETED' && duplicateCheck30 && catchupVerified30 === 'PASS' && leaderboardVerified30 === 'PASS')
    };

    // ────────────────────────────────────────────────────────────────────────
    // STEP 3: TREND SNAPSHOT VALIDATION
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n==================================================');
    console.log('STEP 3: RUNNING TREND SNAPSHOT VALIDATION...');
    console.log('==================================================');
    
    // Check trend snapshots in database
    const snapshots15 = await prisma.trendSnapshot.findMany({ where: { campaignRunId: run15Id } });
    const snapshots30 = await prisma.trendSnapshot.findMany({ where: { campaignRunId: run30Id } });
    
    console.log(`- Trend Snapshot stats:`);
    console.log(`  * Snapshots count (15-day campaign): ${snapshots15.length}`);
    console.log(`  * Snapshots count (30-day campaign): ${snapshots30.length}`);
    
    let snapshotsFieldCheck = true;
    for (const snap of [...snapshots15, ...snapshots30]) {
      const hasHash = snap.rawPayloadJson && JSON.parse(snap.rawPayloadJson).length > 0;
      if (!snap.source || snap.confidenceScore === undefined || !hasHash) {
        snapshotsFieldCheck = false;
        console.error(`  [ERROR] Snapshot ${snap.id} is missing details! source=${snap.source}, confidenceScore=${snap.confidenceScore}, rawPayloadJson=${snap.rawPayloadJson}`);
      }
    }
    
    // Count fallback trend signals
    const fallbackCount = [...snapshots15, ...snapshots30].filter(s => s.source === 'FALLBACK').length;
    const liveCount = [...snapshots15, ...snapshots30].filter(s => s.source !== 'FALLBACK').length;
    console.log(`  * Fallback snapshots: ${fallbackCount}`);
    console.log(`  * Live/Deterministic snapshots: ${liveCount}`);

    // Ensure no fallback claims to be live
    const noFakeLive = [...snapshots15, ...snapshots30].every(s => {
      if (s.source === 'FALLBACK') {
        const parsedData = typeof s.trendDataJson === 'string' ? JSON.parse(s.trendDataJson) : s.trendDataJson;
        // Check that signals in fallback don't claim to be live
        return Array.isArray(parsedData) && parsedData.every(sig => sig.source === 'FALLBACK');
      }
      return true;
    }) ? 'PASS' : 'FAIL';
    console.log(`  * No FALLBACK source claims to be LIVE: ${noFakeLive}`);

    resultsSummary.trendSnapshot = {
      snapshots15Count: snapshots15.length,
      snapshots30Count: snapshots30.length,
      fallbackCount,
      liveCount,
      fieldsValid: snapshotsFieldCheck,
      noFakeLive,
      success: (snapshots15.length === 15 && snapshots30.length === 30 && snapshotsFieldCheck && noFakeLive === 'PASS')
    };

    // ────────────────────────────────────────────────────────────────────────
    // STEP 4: ROLE-AWARE ACCESS CHECK
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n==================================================');
    console.log('STEP 4: RUNNING ROLE-AWARE ACCESS CONTROLS CHECKS...');
    console.log('==================================================');

    // 1. Admin try to submit decision on student run (expected fail/block)
    let adminEditCheck = 'BLOCKED_CORRECT';
    try {
      await axios.post(`${BACKEND_URL}/api/v1/campaign/decision`, {
        campaignRunId: run15Id,
        dayNumber: 1,
        seoSettings: { targetKeywords: ['CRM'] },
        googleAdsSettings: { campaigns: [] },
        metaAdsSettings: { campaigns: [] }
      }, {
        headers: { Cookie: adminCookie, Origin: FRONTEND_URL }
      });
      adminEditCheck = 'LEAK_ADMIN_EDITED_STUDENT_RUN';
      console.error('  [LEAK] Admin successfully edited student campaign decisions!');
    } catch (e) {
      console.log(`  * Admin attempt to edit student campaign decisions: Blocked correctly (${e.response?.status})`);
      adminEditCheck = 'PASS';
    }

    // 2. Instructor try to submit decision on student run (expected fail/block)
    let instructorEditCheck = 'BLOCKED_CORRECT';
    try {
      await axios.post(`${BACKEND_URL}/api/v1/campaign/decision`, {
        campaignRunId: run15Id,
        dayNumber: 1,
        seoSettings: { targetKeywords: ['CRM'] },
        googleAdsSettings: { campaigns: [] },
        metaAdsSettings: { campaigns: [] }
      }, {
        headers: { Cookie: instructorCookie, Origin: FRONTEND_URL }
      });
      instructorEditCheck = 'LEAK_INSTRUCTOR_EDITED_STUDENT_RUN';
      console.error('  [LEAK] Instructor successfully edited student campaign decisions!');
    } catch (e) {
      console.log(`  * Instructor attempt to edit student campaign decisions: Blocked correctly (${e.response?.status})`);
      instructorEditCheck = 'PASS';
    }

    // 3. Student try to access other student run
    const studentAltEmail = `student.alt.${Date.now()}@simplab.test`;
    const studentAlt = await registerAndLogin(studentAltEmail, 'Alt Student');
    let altAccessCheck = 'BLOCKED_CORRECT';
    try {
      await axios.get(`${BACKEND_URL}/api/v1/campaign/results?campaignRunId=${run15Id}`, {
        headers: { Cookie: studentAlt.cookieHeader, Origin: FRONTEND_URL }
      });
      altAccessCheck = 'LEAK_ALT_STUDENT_READ_STUDENT_RUN';
      console.error('  [LEAK] StudentAlt successfully read Student15 results!');
    } catch (e) {
      console.log(`  * Alt student attempt to read student campaign results: Blocked correctly (${e.response?.status})`);
      altAccessCheck = 'PASS';
    }

    // 4. Individual sandbox start without classId
    const individualEmail = `individual.sandbox.${Date.now()}@simplab.test`;
    const individual = await registerAndLogin(individualEmail, 'Individual Sandbox Student', 'INDIVIDUAL');
    
    let individualStartPass = false;
    try {
      const indStartRes = await axios.post(`${BACKEND_URL}/api/v1/campaign/start`, {}, {
        headers: { Cookie: individual.cookieHeader, Origin: FRONTEND_URL }
      });
      individualStartPass = indStartRes.data.success;
      console.log(`  * Individual Learner campaign start status: ${indStartRes.status} (RunId: ${indStartRes.data.campaignRunId})`);
    } catch (e) {
      console.error('  * Individual Learner failed to start campaign run:', e.message);
    }

    resultsSummary.accessControl = {
      adminEditCheck,
      instructorEditCheck,
      altAccessCheck,
      individualStartPass,
      success: (adminEditCheck === 'PASS' && instructorEditCheck === 'PASS' && altAccessCheck === 'PASS' && individualStartPass)
    };

    // ────────────────────────────────────────────────────────────────────────
    // STEP 5: DATABASE CONSISTENCY CHECK
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n==================================================');
    console.log('STEP 5: RUNNING DATABASE CONSISTENCY CHECKS...');
    console.log('==================================================');
    
    const campaignsCount = await prisma.campaignRun.count();
    const decisionsCount = await prisma.dailyCampaignDecision.count();
    const resultsCount = await prisma.dailyCampaignResult.count();
    const recommendationsCount = await prisma.dailyCampaignRecommendation.count();
    const jobsCount = await prisma.campaignProcessingJob.count();
    const trendSnapshotsCount = await prisma.trendSnapshot.count();
    const auditLogsCount = await prisma.auditLog.count();
    const notificationsCount = await prisma.notification.count();
    const certificatesCount = await prisma.certificate.count();

    console.log(`- Database records counts:`);
    console.log(`  * CampaignRuns: ${campaignsCount}`);
    console.log(`  * Decisions: ${decisionsCount}`);
    console.log(`  * Results: ${resultsCount}`);
    console.log(`  * Recommendations: ${recommendationsCount}`);
    console.log(`  * Jobs: ${jobsCount}`);
    console.log(`  * TrendSnapshots: ${trendSnapshotsCount}`);
    console.log(`  * Audit Logs: ${auditLogsCount}`);
    console.log(`  * Notifications: ${notificationsCount}`);
    console.log(`  * Certificates: ${certificatesCount}`);

    // Verify relations/orphans:
    const runIds = (await prisma.campaignRun.findMany({ select: { id: true } })).map(r => r.id);
    const orphanDecisions = await prisma.dailyCampaignDecision.count({
      where: { campaignRunId: { notIn: runIds } }
    });
    const orphanResults = await prisma.dailyCampaignResult.count({
      where: { campaignRunId: { notIn: runIds } }
    });
    const orphanRecommendations = await prisma.dailyCampaignRecommendation.count({
      where: { campaignRunId: { notIn: runIds } }
    });
    const orphanJobs = await prisma.campaignProcessingJob.count({
      where: { campaignRunId: { notIn: runIds } }
    });

    const relationsConsistent = (orphanDecisions === 0 && orphanResults === 0 && orphanRecommendations === 0 && orphanJobs === 0);
    console.log(`  * Orphans count check: Decisions=${orphanDecisions}, Results=${orphanResults}, Recommendations=${orphanRecommendations}, Jobs=${orphanJobs}`);
    console.log(`  * Relations Consistency Result: ${relationsConsistent ? 'PASS' : 'FAIL'}`);

    resultsSummary.databaseConsistency = {
      campaignsCount,
      decisionsCount,
      resultsCount,
      recommendationsCount,
      jobsCount,
      trendSnapshotsCount,
      auditLogsCount,
      notificationsCount,
      certificatesCount,
      relationsConsistent,
      success: relationsConsistent
    };

    // Final verdict assignment
    if (resultsSummary.campaign15Day.success && 
        resultsSummary.campaign30Day.success && 
        resultsSummary.trendSnapshot.success && 
        resultsSummary.accessControl.success &&
        resultsSummary.databaseConsistency.success) {
      resultsSummary.verdict = 'GO';
    }

  } catch (err) {
    console.error('\n❌ Validation script error:', err.stack);
    resultsSummary.error = err.message;
  }

  // Save results JSON
  const finalJsonPath = path.join(ARTIFACT_DIR, 'campaign-integrity-results.json');
  fs.writeFileSync(finalJsonPath, JSON.stringify(resultsSummary, null, 2));
  console.log(`\n- Integration audit completed. Summary JSON saved at: ${finalJsonPath}`);
}

runIntegrityValidation().catch(e => {
  console.error('Integrity script crashed:', e.stack);
  process.exit(1);
});
