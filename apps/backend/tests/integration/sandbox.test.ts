import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app';
import { prisma } from '../../src/db/client';

describe('Sandbox Single-Mode Simulation Flow Integration Tests', () => {
  const adminEmail = 'sandbox-admin-new@simlab.test';
  const individualEmail = 'sandbox-learner-new@simlab.test';
  const studentEmail = 'sandbox-student-new@simlab.test';
  const password = 'SecretPassword123!';

  let adminCookies: string[] = [];
  let learnerCookies: string[] = [];
  let studentCookies: string[] = [];
  let sampleScenarioId = '';
  let googleScenarioId = '';
  let seoScenarioId = '';
  let metaScenarioId = '';

  beforeAll(async () => {
    await prisma.$connect();

    // Clean up existing test users
    await prisma.account.deleteMany({
      where: {
        userId: {
          in: await prisma.user.findMany({
            where: { email: { in: [adminEmail, individualEmail, studentEmail, 'sandbox-inst-new@simlab.test'] } },
            select: { id: true }
          }).then(users => users.map(u => u.id))
        }
      }
    });
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, individualEmail, studentEmail, 'sandbox-inst-new@simlab.test'] } }
    });

    // 1. Sign up admin
    const adminReg = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: { email: adminEmail, password, name: 'Admin tester' }
    });
    expect(adminReg.statusCode).toBe(200);
    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: 'ADMIN' }
    });

    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: adminEmail, password }
    });
    adminCookies = adminLogin.headers['set-cookie']!;

    // 2. Sign up individual learner
    const learnerReg = await app.inject({
      method: 'POST',
      url: '/api/auth/register/individual',
      payload: { email: individualEmail, password, name: 'Learner tester', planType: '30' }
    });
    expect(learnerReg.statusCode).toBe(200);
    const learnerLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: individualEmail, password }
    });
    learnerCookies = learnerLogin.headers['set-cookie']!;

    // 3. Sign up standard student
    let firstScenario = await prisma.scenario.findFirst();
    if (!firstScenario) {
      firstScenario = await prisma.scenario.create({
        data: {
          name: 'First Scenario',
          description: 'Desc',
          industry: 'B2B Software',
          budgetPerRound: 5000
        }
      });
    }
    const instructor = await prisma.user.create({
      data: { email: 'sandbox-inst-new@simlab.test', name: 'Instructor Jenkins', role: 'INSTRUCTOR', emailVerified: true }
    });
    const cls = await prisma.class.create({
      data: { name: 'Main Class', inviteCode: 'SANDBOXCLS456', instructorId: instructor.id, scenarioId: firstScenario.id }
    });

    const studentReg = await app.inject({
      method: 'POST',
      url: '/api/auth/register/student',
      payload: { email: studentEmail, password, name: 'Student Tester', classJoinCode: 'SANDBOXCLS456' }
    });
    expect(studentReg.statusCode).toBe(200);
    const studentLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: studentEmail, password }
    });
    studentCookies = studentLogin.headers['set-cookie']!;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('GET /api/v1/sandbox/simulation-types returns exact modes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/sandbox/simulation-types',
      headers: { cookie: learnerCookies.join('; ') }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.simulationTypes).toContain('GOOGLE_ADS');
    expect(body.simulationTypes).toContain('META_ADS');
    expect(body.simulationTypes).toContain('SEO');
    expect(body.simulationTypes.length).toBe(3);
  });

  it('GET /api/v1/sandbox/sample-scenarios returns list for selected mode', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/sandbox/sample-scenarios?mode=GOOGLE_ADS',
      headers: { cookie: learnerCookies.join('; ') }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.presetScenarios).toBeDefined();
    if (body.presetScenarios.length > 0) {
      sampleScenarioId = body.presetScenarios[0].id;
    }
  });

  it('POST /api/v1/sandbox/scenario/custom creates custom scenarios for each mode', async () => {
    // Google Ads Custom scenario
    const resGoogle = await app.inject({
      method: 'POST',
      url: '/api/v1/sandbox/scenario/custom',
      headers: { cookie: adminCookies.join('; ') },
      payload: {
        scenarioName: 'Google Ads Challenge',
        industry: 'B2B Software',
        businessType: 'SaaS',
        targetAudience: 'Sales managers',
        location: 'US',
        objectiveKPI: 'revenue',
        competitionLevel: 'medium',
        productDescription: 'Sales team CRM software',
        simulationMode: 'GOOGLE_ADS',
        campaignDuration: 10,
        simulationRounds: 5,
        timingRule: 'instant'
      }
    });
    expect(resGoogle.statusCode).toBe(201);
    googleScenarioId = JSON.parse(resGoogle.body).scenarioId;

    // SEO Custom scenario
    const resSEO = await app.inject({
      method: 'POST',
      url: '/api/v1/sandbox/scenario/custom',
      headers: { cookie: adminCookies.join('; ') },
      payload: {
        scenarioName: 'SEO growth organic',
        industry: 'Fashion',
        businessType: 'E-Commerce',
        targetAudience: 'Teens',
        location: 'Global',
        objectiveKPI: 'clicks',
        competitionLevel: 'easy',
        productDescription: 'Trendy apparel online catalog',
        simulationMode: 'SEO',
        campaignDuration: 15,
        simulationRounds: 10,
        timingRule: 'instant'
      }
    });
    expect(resSEO.statusCode).toBe(201);
    seoScenarioId = JSON.parse(resSEO.body).scenarioId;

    // Meta Ads Custom scenario
    const resMeta = await app.inject({
      method: 'POST',
      url: '/api/v1/sandbox/scenario/custom',
      headers: { cookie: adminCookies.join('; ') },
      payload: {
        scenarioName: 'Meta Ads brand push',
        industry: 'Hospitality',
        businessType: 'B2C',
        targetAudience: 'Travelers',
        location: 'EU',
        objectiveKPI: 'conversions',
        competitionLevel: 'hard',
        productDescription: 'Boutique hotel bookings',
        simulationMode: 'META_ADS',
        campaignDuration: 12,
        simulationRounds: 8,
        timingRule: 'instant'
      }
    });
    expect(resMeta.statusCode).toBe(201);
    metaScenarioId = JSON.parse(resMeta.body).scenarioId;
  });

  it('GOOGLE_ADS simulation flow and decision validations', async () => {
    // 1. Start Google Ads Simulation
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/v1/sandbox/start',
      headers: { cookie: learnerCookies.join('; ') },
      payload: {
        simulationMode: 'GOOGLE_ADS',
        scenarioId: googleScenarioId,
        scenarioType: 'SAMPLE',
        durationDays: 10
      }
    });
    expect(startRes.statusCode).toBe(201);
    const startBody = JSON.parse(startRes.body);
    expect(startBody.simulationMode).toBe('GOOGLE_ADS');

    // 2. Reject Meta Ads campaigns in GOOGLE_ADS mode
    const rejectRes1 = await app.inject({
      method: 'POST',
      url: '/api/v1/sandbox/decision',
      headers: { cookie: learnerCookies.join('; ') },
      payload: {
        googleCampaigns: [],
        metaCampaigns: [{ name: 'Meta Ad', budget: 100 }]
      }
    });
    expect(rejectRes1.statusCode).toBe(400);
    expect(JSON.parse(rejectRes1.body).message).toContain('Google Ads Simulation rejects SEO and Meta Ads settings.');

    // 3. Reject SEO keywords in GOOGLE_ADS mode
    const rejectRes2 = await app.inject({
      method: 'POST',
      url: '/api/v1/sandbox/decision',
      headers: { cookie: learnerCookies.join('; ') },
      payload: {
        googleCampaigns: [],
        seoTargetKeywords: ['keyword']
      }
    });
    expect(rejectRes2.statusCode).toBe(400);

    // 4. Accept correct Google Ads settings
    const acceptRes = await app.inject({
      method: 'POST',
      url: '/api/v1/sandbox/decision',
      headers: { cookie: learnerCookies.join('; ') },
      payload: {
        googleCampaigns: [
          {
            name: 'Search CRM Campaign',
            budget: 1500,
            keywords: [{ word: 'best crm software', bid: 2.50 }]
          }
        ]
      }
    });
    expect(acceptRes.statusCode).toBe(200);
    expect(JSON.parse(acceptRes.body).success).toBe(true);
  });

  it('SEO simulation flow and decision validations', async () => {
    // 1. Start SEO Simulation
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/v1/sandbox/start',
      headers: { cookie: learnerCookies.join('; ') },
      payload: {
        simulationMode: 'SEO',
        scenarioId: seoScenarioId,
        scenarioType: 'SAMPLE',
        durationDays: 15
      }
    });
    expect(startRes.statusCode).toBe(201);

    // 2. Reject Google Ads settings in SEO mode
    const rejectRes = await app.inject({
      method: 'POST',
      url: '/api/v1/sandbox/decision',
      headers: { cookie: learnerCookies.join('; ') },
      payload: {
        seoTargetKeywords: ['fashion app'],
        googleCampaigns: [{ name: 'Google Search', budget: 1000 }]
      }
    });
    expect(rejectRes.statusCode).toBe(400);
    expect(JSON.parse(rejectRes.body).message).toContain('SEO Simulation rejects Google Ads and Meta Ads settings.');

    // 3. Accept correct SEO settings
    const acceptRes = await app.inject({
      method: 'POST',
      url: '/api/v1/sandbox/decision',
      headers: { cookie: learnerCookies.join('; ') },
      payload: {
        seoTargetKeywords: ['fashion app'],
        seoContentQuality: 7.0,
        seoBacklinkBudget: 150
      }
    });
    expect(acceptRes.statusCode).toBe(200);
  });

  it('META_ADS simulation flow, run timing, next-cycle, and report endpoints', async () => {
    // 1. Start Meta Ads Simulation
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/v1/sandbox/start',
      headers: { cookie: learnerCookies.join('; ') },
      payload: {
        simulationMode: 'META_ADS',
        scenarioId: metaScenarioId,
        scenarioType: 'SAMPLE',
        durationDays: 12
      }
    });
    expect(startRes.statusCode).toBe(201);

    // 2. Reject Google Ads settings in META_ADS mode
    const rejectRes = await app.inject({
      method: 'POST',
      url: '/api/v1/sandbox/decision',
      headers: { cookie: learnerCookies.join('; ') },
      payload: {
        metaCampaigns: [],
        googleCampaigns: [{ name: 'Google Campaign', budget: 200 }]
      }
    });
    expect(rejectRes.statusCode).toBe(400);
    expect(JSON.parse(rejectRes.body).message).toContain('Meta Ads Simulation rejects SEO and Google Ads settings.');

    // 3. Accept Meta Ads settings
    const acceptRes = await app.inject({
      method: 'POST',
      url: '/api/v1/sandbox/decision',
      headers: { cookie: learnerCookies.join('; ') },
      payload: {
        metaCampaigns: [
          {
            name: 'Social Founders Target',
            budget: 1000,
            audienceInterest: 'business-owners',
            placement: 'feed-reels'
          }
        ]
      }
    });
    expect(acceptRes.statusCode).toBe(200);

    // 4. Run cycle (timing delay is set since user is individual learner)
    const runRes = await app.inject({
      method: 'POST',
      url: '/api/v1/sandbox/run',
      headers: { cookie: learnerCookies.join('; ') }
    });
    expect(runRes.statusCode).toBe(200);
    const runBody = JSON.parse(runRes.body);
    expect(runBody.instant).toBe(false);
    expect(runBody.progress.status).toBe('PROCESSING');

    // 5. Fast forward bypasses delays
    const ffRes = await app.inject({
      method: 'POST',
      url: '/api/v1/sandbox/fast-forward',
      headers: { cookie: learnerCookies.join('; ') }
    });
    expect(ffRes.statusCode).toBe(200);
    const ffBody = JSON.parse(ffRes.body);
    expect(ffBody.success).toBe(true);

    // After processing, simulation pauses at RESULTS_READY
    const stateRes = await app.inject({
      method: 'GET',
      url: '/api/v1/sandbox/state',
      headers: { cookie: learnerCookies.join('; ') }
    });
    expect(stateRes.statusCode).toBe(200);
    expect(JSON.parse(stateRes.body).state.status).toBe('RESULTS_READY');

    // 6. Next cycle opens the decision loop for the next day
    const ncRes = await app.inject({
      method: 'POST',
      url: '/api/v1/sandbox/next-cycle',
      headers: { cookie: learnerCookies.join('; ') }
    });
    expect(ncRes.statusCode).toBe(200);
    expect(JSON.parse(ncRes.body).status).toBe('DECISION_OPEN');

    // 7. GET /report returns mode-specific metrics
    const repRes = await app.inject({
      method: 'GET',
      url: '/api/v1/sandbox/report',
      headers: { cookie: learnerCookies.join('; ') }
    });
    expect(repRes.statusCode).toBe(200);
    const repBody = JSON.parse(repRes.body);
    expect(repBody.success).toBe(true);
    expect(repBody.summary.roas).toBeDefined();
  });
});
