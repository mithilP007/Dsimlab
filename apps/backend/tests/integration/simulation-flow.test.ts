import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/db/client';
import { processSimulationRound } from '../../src/services/simulation/engine';
import { captureRoundSnapshot } from '../../src/services/simulation/snapshot';

describe('Simulation Flow Core Integration Tests', () => {
  let simId: string;
  let studentId: string;
  let classId: string;

  beforeAll(async () => {
    await prisma.$connect();

    await prisma.simulationState.deleteMany({});
    await prisma.class.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.scenario.deleteMany({});

    const scenario = await prisma.scenario.create({
      data: {
        name: 'Integration B2B Campaign',
        description: 'Test Scenario CRM product.',
        industry: 'CRM SaaS',
        budgetPerRound: 3000.0,
        baselineOrganicTraffic: 800,
        targetKPI: 'revenue',
      },
    });

    const instructor = await prisma.user.create({
      data: {
        email: 'test-instructor@sim.com',
        name: 'Prof. Jenkins',
        role: 'INSTRUCTOR',
        emailVerified: true,
      },
    });

    const student = await prisma.user.create({
      data: {
        email: 'test-student@sim.com',
        name: 'Jamie Student',
        role: 'STUDENT_COLLEGE',
        emailVerified: true,
      },
    });
    studentId = student.id;

    const classroom = await prisma.class.create({
      data: {
        name: 'E2E Testing Cohort',
        inviteCode: 'TEST99',
        instructorId: instructor.id,
        scenarioId: scenario.id,
      },
    });
    classId = classroom.id;

    await prisma.user.update({
      where: { id: studentId },
      data: { classId: classId },
    });

    const simState = await prisma.simulationState.create({
      data: {
        userId: studentId,
        classId: classId,
        currentRound: 1,
      },
    });
    simId = simState.id;

    await prisma.decision.create({
      data: {
        simulationId: simId,
        round: 1,
        seoTargetKeywords: JSON.stringify(['best crm software 1']),
        seoContentQuality: 7.0,
        seoBacklinkBudget: 300.0,
        googleCampaigns: JSON.stringify([
          {
            name: 'Google Brand Campaign',
            budget: 1500.0,
            keywords: [
              { word: 'best crm software 1', bid: 3.50 }
            ]
          }
        ]),
        metaCampaigns: JSON.stringify([]),
        submitted: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.simulationState.deleteMany({});
    await prisma.class.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.scenario.deleteMany({});
    await prisma.$disconnect();
  });

  it('should calculate active round decisions and transition current round index', async () => {
    await prisma.simulationState.update({
      where: { id: simId },
      data: { status: 'LOCKED' },
    });

    const result = await processSimulationRound(simId);

    expect(result.success).toBe(true);
    expect(result.roundAdvanced).toBe(1);
    expect(result.nextRound).toBe(2);
    expect(result.isCompleted).toBe(false);

    const updated = await prisma.simulationState.findUnique({
      where: { id: simId },
    });

    expect(updated?.currentRound).toBe(2);
    expect(updated?.score).toBeGreaterThan(0.0);
    expect(updated?.cumulativeSpend).toBeGreaterThan(300.0);
  });

  it('should compile an archived JSON snapshot of the completed round', async () => {
    const snapshot = await captureRoundSnapshot(simId, 1);

    expect(snapshot.simulationId).toBe(simId);
    expect(snapshot.round).toBe(1);
    expect(snapshot.scores).not.toBeNull();
    expect(snapshot.scores?.composite).toBeGreaterThan(0.0);
    expect(snapshot.dailyMetrics).toHaveLength(30);

    const savedSnapshot = await prisma.roundSnapshot.findUnique({
      where: {
        simulationId_round: {
          simulationId: simId,
          round: 1,
        },
      },
    });
    expect(savedSnapshot).not.toBeNull();
    const data = JSON.parse(savedSnapshot!.data);
    expect(data.simulationId).toBe(simId);
  });
});
