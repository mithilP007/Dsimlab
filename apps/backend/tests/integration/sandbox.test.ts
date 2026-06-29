import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app';
import { prisma } from '../../src/db/client';

describe('Sandbox Simulation Flow Integration Tests', () => {
  const adminEmail = 'sandbox-admin@simlab.test';
  const individualEmail = 'sandbox-learner@simlab.test';
  const studentEmail = 'sandbox-student@simlab.test';
  const password = 'SecretPassword123!';

  let adminCookies: string[] = [];
  let learnerCookies: string[] = [];
  let studentCookies: string[] = [];
  let presetScenarioId = '';
  let customScenarioId = '';

  beforeAll(async () => {
    await prisma.$connect();

    // Clean up existing test users
    await prisma.account.deleteMany({
      where: {
        userId: {
          in: await prisma.user.findMany({
            where: { email: { in: [adminEmail, individualEmail, studentEmail, 'sandbox-inst@simlab.test'] } },
            select: { id: true }
          }).then(users => users.map(u => u.id))
        }
      }
    });
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, individualEmail, studentEmail, 'sandbox-inst@simlab.test'] } }
    });

    // 1. Sign up admin (role will be updated in db)
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
    // Create class cohort to allow student sign up
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
      data: { email: 'sandbox-inst@simlab.test', name: 'Instructor Jenkins', role: 'INSTRUCTOR', emailVerified: true }
    });
    const cls = await prisma.class.create({
      data: { name: 'Main Class', inviteCode: 'SANDBOXCLS123', instructorId: instructor.id, scenarioId: firstScenario.id }
    });

    const studentReg = await app.inject({
      method: 'POST',
      url: '/api/auth/register/student',
      payload: { email: studentEmail, password, name: 'Student Tester', classJoinCode: 'SANDBOXCLS123' }
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

  it('GET /api/v1/sandbox/options returns options and requires ADMIN or INDIVIDUAL role', async () => {
    // Student should be forbidden
    const resStud = await app.inject({
      method: 'GET',
      url: '/api/v1/sandbox/options',
      headers: { cookie: studentCookies.join('; ') }
    });
    expect(resStud.statusCode).toBe(403);

    // Learner should succeed
    const resLearner = await app.inject({
      method: 'GET',
      url: '/api/v1/sandbox/options',
      headers: { cookie: learnerCookies.join('; ') }
    });
    expect(resLearner.statusCode).toBe(200);
    const body = JSON.parse(resLearner.body);
    expect(body.success).toBe(true);
    expect(body.simulationTypes).toContain('FULL');
    expect(body.presetScenarios).toBeDefined();

    if (body.presetScenarios.length > 0) {
      presetScenarioId = body.presetScenarios[0].id;
    }
  });

  it('POST /api/v1/sandbox/scenario/custom creates a scenario successfully', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sandbox/scenario/custom',
      headers: { cookie: adminCookies.join('; ') },
      payload: {
        scenarioName: 'My Awesome Custom Challenge',
        industry: 'Fashion',
        targetAudience: 'Teens',
        location: 'US',
        totalBudget: 4000,
        dailyBudget: 120,
        campaignDuration: 15,
        simulationRounds: 5,
        seoEnabled: true,
        googleAdsEnabled: true,
        metaAdsEnabled: false,
        displayVideoShoppingEnabled: true,
        difficulty: 'easy',
        targetKPI: 'conversions',
        checkpointRequired: false,
        certificateEnabled: true,
        timingRule: 'instant'
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.scenarioId).toBeDefined();
    customScenarioId = body.scenarioId;
  });

  it('POST /api/v1/sandbox/start initializes simulation state', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sandbox/start',
      headers: { cookie: learnerCookies.join('; ') },
      payload: { scenarioId: customScenarioId }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.simulationId).toBeDefined();
    expect(body.status).toBe('DECISION_OPEN');
    expect(body.currentRound).toBe(1);
  });

  it('GET /api/v1/sandbox/state retrieves active state', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/sandbox/state',
      headers: { cookie: learnerCookies.join('; ') }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.hasState).toBe(true);
    expect(body.state.currentRound).toBe(1);
    expect(body.state.class.scenario.name).toBe('My Awesome Custom Challenge');
  });

  it('POST /api/v1/sandbox/decision saves user decisions', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sandbox/decision',
      headers: { cookie: learnerCookies.join('; ') },
      payload: {
        seoTargetKeywords: ['fashion app'],
        seoContentQuality: 7.0,
        seoBacklinkBudget: 100,
        googleCampaigns: [
          {
            name: 'Google display campaign',
            budget: 1000,
            campaignType: 'Display'
          }
        ],
        metaCampaigns: []
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.decision.submitted).toBe(true);
  });

  it('POST /api/v1/sandbox/run processes round instantly when instant timing is selected', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sandbox/run',
      headers: { cookie: learnerCookies.join('; ') }
    });

    // Individual learner planType duration is 30 days -> 24 hours delay, so should return delayed info!
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.instant).toBe(false);
    expect(body.nextResultAt).toBeDefined();
    expect(body.progress.status).toBe('PROCESSING');
  });

  it('POST /api/v1/sandbox/fast-forward bypasses delays', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sandbox/fast-forward',
      headers: { cookie: learnerCookies.join('; ') }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.result.nextRound).toBe(2);
  });

  it('GET /api/v1/sandbox/report returns aggregated metrics and scores', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/sandbox/report',
      headers: { cookie: learnerCookies.join('; ') }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.metrics).toBeDefined();
    expect(body.summary.score).toBeDefined();
    expect(body.summary.roas).toBeDefined();
  });

  it('GET /api/v1/sandbox/certificate/check returns eligibility details', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/sandbox/certificate/check',
      headers: { cookie: learnerCookies.join('; ') }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    // Since simulation is not completed, eligible must be false
    expect(body.eligible).toBe(false);
    expect(body.reasons).toContain('Simulation status must be COMPLETED.');
  });
});
