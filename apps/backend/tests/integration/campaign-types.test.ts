import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app';
import { prisma } from '../../src/db/client';

describe('Multiple Campaign Type Integration Tests', () => {
  const studentEmail = 'types-student@simulation.com';
  const instructorEmail = 'types-instructor@simulation.com';
  const password = 'SecretPassword123!';

  let studentCookies: any;
  let instructorCookies: any;
  let studentId: string;
  let classId: string;
  let scenarioId: string;
  let simulationId: string;

  beforeAll(async () => {
    await prisma.$connect();

    // Clean up
    await prisma.dailyMetric.deleteMany({});
    await prisma.decision.deleteMany({});
    await prisma.simulationState.deleteMany({});
    await prisma.classEnrollment.deleteMany({});
    await prisma.class.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.scenario.deleteMany({});

    // 1. Create Scenario
    const scenario = await prisma.scenario.create({
      data: {
        name: 'Types Scenario',
        description: 'Test campaign types.',
        industry: 'B2B Software',
        budgetPerRound: 15000.0,
        baselineOrganicTraffic: 1000,
        targetKPI: 'revenue',
        maxRounds: 2
      }
    });
    scenarioId = scenario.id;

    // 2. Register Instructor & Class
    await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: { email: instructorEmail, password, name: 'Instructor Types' }
    });
    await prisma.user.update({
      where: { email: instructorEmail },
      data: { role: 'INSTRUCTOR' }
    });
    const instLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: instructorEmail, password }
    });
    instructorCookies = instLogin.headers['set-cookie'];

    const classRes = await app.inject({
      method: 'POST',
      url: '/api/classes',
      headers: { cookie: instructorCookies },
      payload: { name: 'Types Classroom', scenarioId }
    });
    classId = JSON.parse(classRes.body).class.id;

    // 3. Register Student & Join Class
    const studSignUp = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: { email: studentEmail, password, name: 'Student Types' }
    });
    studentId = JSON.parse(studSignUp.body).user.id;

    await prisma.user.update({
      where: { id: studentId },
      data: { classId }
    });
    await prisma.classEnrollment.create({
      data: {
        classId,
        studentId,
        studentEmail,
        status: 'ACTIVE'
      }
    });

    const studLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: studentEmail, password }
    });
    studentCookies = studLogin.headers['set-cookie'];

    // 4. Start Simulation
    const simRes = await app.inject({
      method: 'POST',
      url: '/api/simulations',
      headers: { cookie: studentCookies }
    });
    simulationId = JSON.parse(simRes.body).id;
  });

  afterAll(async () => {
    await prisma.dailyMetric.deleteMany({});
    await prisma.decision.deleteMany({});
    await prisma.simulationState.deleteMany({});
    await prisma.classEnrollment.deleteMany({});
    await prisma.class.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.scenario.deleteMany({});
    await app.close();
    await prisma.$disconnect();
  });

  it('should calculate impressions, clicks, cost, and conversions for Search, Display, Video, and Shopping campaigns', async () => {
    // 1. Submit unified decisions for Round 1
    const decRes = await app.inject({
      method: 'POST',
      url: `/api/simulations/${simulationId}/decisions`,
      headers: { cookie: studentCookies },
      payload: {
        seoTargetKeywords: ['CRM software'],
        seoContentQuality: 8.0,
        seoBacklinkBudget: 500.0,
        googleCampaigns: [
          {
            name: 'Search Campaign',
            campaignType: 'Search',
            budget: 3000.0,
            keywords: [
              { word: 'crm software', bid: 2.50 }
            ]
          },
          {
            name: 'Display Campaign',
            campaignType: 'Display',
            budget: 2000.0,
            audiences: ['business-owners', 'tech-enthusiasts']
          },
          {
            name: 'Video Campaign',
            campaignType: 'Video',
            budget: 1500.0,
            targetCpvBid: 0.06
          },
          {
            name: 'Shopping Campaign',
            campaignType: 'Shopping',
            budget: 2500.0,
            productFeeds: [
              { id: 'p1', name: 'CRM Startup Plan', bid: 1.10 },
              { id: 'p2', name: 'CRM Growth Plan', bid: 2.20 }
            ]
          }
        ],
        metaCampaigns: []
      }
    });

    expect(decRes.statusCode).toBe(200);

    // 2. Advance round
    const advRes = await app.inject({
      method: 'POST',
      url: `/api/v1/simulation/advance`,
      headers: { cookie: studentCookies }
    });
    expect(advRes.statusCode).toBe(200);

    // 3. Fetch calculated daily metrics
    const metrics = await prisma.dailyMetric.findMany({
      where: { simulationId, round: 1 }
    });

    expect(metrics.length).toBe(30);

    // Compute sums of Google Ads metrics
    const totalGoogleImpressions = metrics.reduce((sum, m) => sum + m.googleImpressions, 0);
    const totalGoogleClicks = metrics.reduce((sum, m) => sum + m.googleClicks, 0);
    const totalGoogleCost = metrics.reduce((sum, m) => sum + m.googleCost, 0);
    const totalGoogleConversions = metrics.reduce((sum, m) => sum + m.googleConversions, 0);

    // Assert that we have non-zero realistic metrics generated across display, video, shopping and search
    expect(totalGoogleImpressions).toBeGreaterThan(1000);
    expect(totalGoogleClicks).toBeGreaterThan(20);
    expect(totalGoogleCost).toBeGreaterThan(100);
    expect(totalGoogleConversions).toBeGreaterThan(0);
    
    // Assert costs are capped by the sum of budgets
    const totalGoogleBudget = 3000.0 + 2000.0 + 1500.0 + 2500.0;
    expect(totalGoogleCost).toBeLessThanOrEqual(totalGoogleBudget * 1.05); // allow tiny pacer rounding
  });
});
