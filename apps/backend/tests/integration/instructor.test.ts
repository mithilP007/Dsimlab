import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/db/client';

describe('Instructor Features Integration Tests', () => {
  let instructorId: string;
  let scenarioId: string;

  beforeAll(async () => {
    await prisma.$connect();

    await prisma.class.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.scenario.deleteMany({});

    const scenario = await prisma.scenario.create({
      data: {
        name: 'CRM SaaS Class Template',
        description: 'Mock instructor template scenario.',
        industry: 'CRM SaaS',
        budgetPerRound: 5000.0,
        baselineOrganicTraffic: 1000,
        targetKPI: 'revenue'
      }
    });
    scenarioId = scenario.id;

    const instructor = await prisma.user.create({
      data: {
        email: 'professor@sim.com',
        name: 'Professor Jennings',
        role: 'INSTRUCTOR',
        emailVerified: true
      }
    });
    instructorId = instructor.id;
  });

  afterAll(async () => {
    await prisma.class.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.scenario.deleteMany({});
    await prisma.$disconnect();
  });

  it('should allow creating a class cohort linked to an instructor and a scenario', async () => {
    const inviteCode = 'MKT888';

    const testClass = await prisma.class.create({
      data: {
        name: 'Advanced E-Commerce Cohort',
        inviteCode,
        instructorId: instructorId,
        scenarioId: scenarioId
      }
    });

    expect(testClass.inviteCode).toBe(inviteCode);
    expect(testClass.instructorId).toBe(instructorId);
    expect(testClass.scenarioId).toBe(scenarioId);

    const checkClass = await prisma.class.findUnique({
      where: { inviteCode }
    });

    expect(checkClass).not.toBeNull();
    expect(checkClass?.name).toBe('Advanced E-Commerce Cohort');
  });
});
