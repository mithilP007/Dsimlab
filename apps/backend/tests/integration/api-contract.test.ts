import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app';
import { prisma } from '../../src/db/client';

describe('Phase 3: Scoring & API Contract Integration Tests', () => {
  const studentEmail = 'p3-student@simulation.com';
  const instructorEmail = 'p3-instructor@simulation.com';
  const password = 'SecretPassword123!';
  let studentCookies: any;
  let instructorCookies: any;
  let studentId: string;
  let classId: string;
  let scenarioId: string;
  let simulationId: string;

  beforeAll(async () => {
    await prisma.$connect();

    // 1. Clean up test users
    await prisma.account.deleteMany({
      where: {
        userId: {
          in: await prisma.user.findMany({
            where: { email: { in: [studentEmail, instructorEmail] } },
            select: { id: true }
          }).then(users => users.map(u => u.id))
        }
      }
    });
    await prisma.user.deleteMany({
      where: { email: { in: [studentEmail, instructorEmail] } }
    });

    // 2. Create scenario template
    const scenario = await prisma.scenario.create({
      data: {
        name: 'Phase 3 SaaS scenario',
        description: 'Test scenario for p3.',
        industry: 'CRM SaaS',
        budgetPerRound: 6000.0,
        baselineOrganicTraffic: 1200,
        targetKPI: 'revenue'
      }
    });
    scenarioId = scenario.id;

    // 3. Register and sign in instructor
    await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: { email: instructorEmail, password, name: 'Instructor P3' }
    });
    const instUser = await prisma.user.update({
      where: { email: instructorEmail },
      data: { role: 'INSTRUCTOR' }
    });
    const instLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: instructorEmail, password }
    });
    instructorCookies = instLogin.headers['set-cookie'];

    // 4. Create class via instructor
    const classRes = await app.inject({
      method: 'POST',
      url: '/api/classes',
      headers: { cookie: instructorCookies },
      payload: { name: 'P3 Marketing Simulation Class', scenarioId }
    });
    const classBody = JSON.parse(classRes.body);
    classId = classBody.class.id;

    // 5. Register and sign in student
    const studSignUp = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: { email: studentEmail, password, name: 'Student P3' }
    });
    const studSignUpBody = JSON.parse(studSignUp.body);
    studentId = studSignUpBody.user.id;

    // Associate student to class
    await prisma.user.update({
      where: { id: studentId },
      data: { classId }
    });

    const studLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: studentEmail, password }
    });
    studentCookies = studLogin.headers['set-cookie'];
  });

  afterAll(async () => {
    await prisma.simulationState.deleteMany({
      where: { userId: studentId }
    });
    await prisma.class.deleteMany({
      where: { id: classId }
    });
    await prisma.scenario.deleteMany({
      where: { id: scenarioId }
    });
    await prisma.account.deleteMany({
      where: {
        userId: {
          in: await prisma.user.findMany({
            where: { email: { in: [studentEmail, instructorEmail] } },
            select: { id: true }
          }).then(users => users.map(u => u.id))
        }
      }
    });
    await prisma.user.deleteMany({
      where: { email: { in: [studentEmail, instructorEmail] } }
    });
    await app.close();
    await prisma.$disconnect();
  });

  it('POST /api/simulations should create a simulation state for the student', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/simulations',
      headers: { cookie: studentCookies }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.id).toBeDefined();
    expect(body.userId).toBe(studentId);
    expect(body.classId).toBe(classId);
    expect(body.status).toBe('DECISION_OPEN');

    simulationId = body.id;
  });

  it('GET /api/simulations/:id should return simulation state details', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/simulations/${simulationId}`,
      headers: { cookie: studentCookies }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBe(simulationId);
    expect(body.status).toBe('DECISION_OPEN');
  });

  it('POST /api/simulations/:id/decisions should save SEO, Google Ads, and Meta Ads decisions', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/simulations/${simulationId}/decisions`,
      headers: { cookie: studentCookies },
      payload: {
        seoTargetKeywords: ['best crm software 1', 'top database solution 2'],
        seoContentQuality: 7.0,
        seoBacklinkBudget: 350.0,
        googleCampaigns: [
          {
            name: 'Google Brand Search',
            budget: 1200.0,
            keywords: [
              { word: 'best crm software 1', bid: 3.50 }
            ]
          }
        ],
        metaCampaigns: [
          {
            name: 'Instagram Stories Retargeting',
            budget: 600.0,
            audienceInterest: 'business-owners',
            placement: 'stories',
            creativeQuality: 8.0,
            bidType: 'LOWEST_COST',
            bidAmount: 0.0
          }
        ]
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.decision.seoTargetKeywords).toEqual(['best crm software 1', 'top database solution 2']);
    expect(body.decision.googleCampaigns[0].name).toBe('Google Brand Search');
    expect(body.decision.metaCampaigns[0].placement).toBe('stories');
  });

  it('POST /api/simulations/:id/advance should process simulation round and save snapshots', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/simulations/${simulationId}/advance`,
      headers: { cookie: studentCookies }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.result.roundAdvanced).toBe(1);
    expect(body.result.nextRound).toBe(2);
    expect(body.result.compositeIndex).toBeGreaterThan(0.0);

    // Verify snapshot table entry exists
    const snapshotsRes = await app.inject({
      method: 'GET',
      url: `/api/simulations/${simulationId}/snapshots`,
      headers: { cookie: studentCookies }
    });
    expect(snapshotsRes.statusCode).toBe(200);
    const snapBody = JSON.parse(snapshotsRes.body);
    expect(snapBody.snapshots).toHaveLength(1);
    expect(snapBody.snapshots[0].round).toBe(1);
    expect(snapBody.snapshots[0].data.simulationId).toBe(simulationId);
  });

  it('GET /api/simulations/:id/metrics should retrieve daily metrics', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/simulations/${simulationId}/metrics`,
      headers: { cookie: studentCookies }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.metrics).toHaveLength(30);
  });

  it('GET /api/seo/keywords should work with industry/search filters', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/seo/keywords?search=crm&industry=crm',
      headers: { cookie: studentCookies }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.keywords.length).toBeGreaterThan(0);
    expect(body.keywords[0].keyword).toContain('crm');
  });

  it('GET /api/meta-ads/audiences should return interest audiences details', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/meta-ads/audiences',
      headers: { cookie: studentCookies }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.audiences).toHaveLength(4);
    expect(body.audiences.map((a: any) => a.id)).toContain('business-owners');
  });

  it('POST /api/classes/:id/reset should clear student cohort simulations', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/classes/${classId}/reset`,
      headers: { cookie: instructorCookies }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);

    const checkSim = await prisma.simulationState.findUnique({
      where: { id: simulationId }
    });
    expect(checkSim).toBeNull(); // Successfully deleted/reset
  });
});
