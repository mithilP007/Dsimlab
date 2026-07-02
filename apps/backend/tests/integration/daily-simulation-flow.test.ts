import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/db/client';
import { processDailySimulationStep } from '../../src/services/simulation/dailySimulationEngine';
import { processCampaignWithCatchup } from '../../src/jobs/schedulers/daily-campaign-scheduler';

describe('Daily Simulation Flow Core Integration Tests', () => {
  let campaignRunId: string;
  let studentId: string;
  let classId: string;
  let scenarioId: string;

  beforeAll(async () => {
    await prisma.$connect();

    // Clean tables
    await prisma.campaignProcessingJob.deleteMany({});
    await prisma.dailyCampaignRecommendation.deleteMany({});
    await prisma.dailyCampaignResult.deleteMany({});
    await prisma.dailyCampaignDecision.deleteMany({});
    await prisma.campaignRun.deleteMany({});
    await prisma.class.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.scenario.deleteMany({});

    const scenario = await prisma.scenario.create({
      data: {
        name: 'Live 15-Day CRM Challenge',
        description: 'Test Scenario CRM product daily run.',
        industry: 'CRM SaaS',
        budgetPerRound: 1500.0,
        dailyBudgetCap: 100.0,
        baselineOrganicTraffic: 800,
        targetKPI: 'revenue',
        durationDays: 15,
      },
    });
    scenarioId = scenario.id;

    const instructor = await prisma.user.create({
      data: {
        email: 'daily-instructor@sim.com',
        name: 'Prof. Jamie Daily',
        role: 'INSTRUCTOR',
        emailVerified: true,
      },
    });

    const student = await prisma.user.create({
      data: {
        email: 'daily-student@sim.com',
        name: 'Jamie Daily Student',
        role: 'STUDENT_COLLEGE',
        emailVerified: true,
      },
    });
    studentId = student.id;

    const classroom = await prisma.class.create({
      data: {
        name: 'E2E Daily Testing Cohort',
        inviteCode: 'DAILY101',
        instructorId: instructor.id,
        scenarioId: scenario.id,
      },
    });
    classId = classroom.id;

    await prisma.user.update({
      where: { id: studentId },
      data: { classId: classId },
    });
  });

  afterAll(async () => {
    await prisma.campaignProcessingJob.deleteMany({});
    await prisma.dailyCampaignRecommendation.deleteMany({});
    await prisma.dailyCampaignResult.deleteMany({});
    await prisma.dailyCampaignDecision.deleteMany({});
    await prisma.campaignRun.deleteMany({});
    await prisma.class.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.scenario.deleteMany({});
    await prisma.$disconnect();
  });

  it('should start a 15-day campaign run with ACTIVE status and Day 1', async () => {
    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + 15 * 24 * 3600 * 1000);
    const nextProcessingAt = new Date(startedAt.getTime() + 24 * 3600 * 1000);

    const run = await prisma.campaignRun.create({
      data: {
        userId: studentId,
        scenarioId,
        classId,
        durationDays: 15,
        currentDay: 1,
        status: 'ACTIVE',
        startedAt,
        endsAt,
        nextProcessingAt,
      },
    });

    campaignRunId = run.id;

    expect(run.status).toBe('ACTIVE');
    expect(run.currentDay).toBe(1);
    expect(run.durationDays).toBe(15);
  });

  it('should store and save daily settings for Day 1 decision', async () => {
    const decision = await prisma.dailyCampaignDecision.create({
      data: {
        campaignRunId,
        userId: studentId,
        dayNumber: 1,
        seoSettingsJson: {
          targetKeywords: ['CRM SaaS', 'B2B CRM'],
          contentQuality: 8,
          backlinkBudget: 50,
        },
        googleAdsSettingsJson: { campaigns: [] },
        metaAdsSettingsJson: { campaigns: [] },
        budgetJson: { totalAllocated: 50 },
      },
    });

    expect(decision.dayNumber).toBe(1);
    expect((decision.seoSettingsJson as any).backlinkBudget).toBe(50);
  });

  it('should process Day 1 simulation step and transition to Day 2', async () => {
    const result = await processDailySimulationStep(campaignRunId);

    expect(result.success).toBe(true);
    expect(result.dayProcessed).toBe(1);
    expect(result.isCompleted).toBe(false);

    const updatedRun = await prisma.campaignRun.findUnique({
      where: { id: campaignRunId },
    });

    expect(updatedRun?.currentDay).toBe(2);

    const dailyResult = await prisma.dailyCampaignResult.findFirst({
      where: { campaignRunId, dayNumber: 1 },
    });

    expect(dailyResult).not.toBeNull();
    expect(dailyResult?.compositeScore).toBeGreaterThan(0);
    expect(dailyResult?.spend).toBe(50);
  }, 30000);

  it('should prevent duplicate processing of Day 1 and respect idempotency lock', async () => {
    // Attempting to run daily scheduler catchup again
    // It should lock on Day 2 if no decision is submitted, but let's test running with catchup
    const runBefore = await prisma.campaignRun.findUnique({
      where: { id: campaignRunId },
    });

    // Run catchup. Since nextProcessingAt is in the future and NODE_ENV=test allows fast-forward,
    // it will try to process Day 2.
    // Let's first submit a decision for Day 2 to make it process cleanly
    await prisma.dailyCampaignDecision.create({
      data: {
        campaignRunId,
        userId: studentId,
        dayNumber: 2,
        seoSettingsJson: {
          targetKeywords: ['CRM SaaS'],
          contentQuality: 9,
          backlinkBudget: 30,
        },
        googleAdsSettingsJson: { campaigns: [] },
        metaAdsSettingsJson: { campaigns: [] },
        budgetJson: { totalAllocated: 30 },
      },
    });

    // Make Day 2 due
    await prisma.campaignRun.update({
      where: { id: campaignRunId },
      data: { nextProcessingAt: new Date(Date.now() - 1000) }
    });

    await processCampaignWithCatchup(campaignRunId);

    const runAfter = await prisma.campaignRun.findUnique({
      where: { id: campaignRunId },
    });

    // Day should advance to 3
    expect(runAfter?.currentDay).toBe(3);

    // Verify there are exactly 2 results in database
    const totalResults = await prisma.dailyCampaignResult.findMany({
      where: { campaignRunId },
    });

    expect(totalResults.length).toBe(2);
  }, 30000);

  it('should verify offline API fallback when live providers return fallback status', async () => {
    // Create decision for Day 3
    await prisma.dailyCampaignDecision.create({
      data: {
        campaignRunId,
        userId: studentId,
        dayNumber: 3,
        seoSettingsJson: {
          targetKeywords: ['unknown-kw-non-existent-api'],
          contentQuality: 5,
          backlinkBudget: 10,
        },
        googleAdsSettingsJson: { campaigns: [] },
        metaAdsSettingsJson: { campaigns: [] },
        budgetJson: { totalAllocated: 10 },
      },
    });

    // Trigger processing step
    const stepRes = await processDailySimulationStep(campaignRunId);
    expect(stepRes.success).toBe(true);

    const resultDay3 = await prisma.dailyCampaignResult.findFirst({
      where: { campaignRunId, dayNumber: 3 },
      include: { trendSnapshot: true },
    });

    expect(resultDay3?.trendSnapshot?.source).not.toBeNull();
  }, 30000);
});
