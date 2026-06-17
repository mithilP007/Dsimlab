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

  it('should allow kicking a student from a class', async () => {
    const inviteCode = 'TESTKICK';
    const testClass = await prisma.class.create({
      data: {
        name: 'Kick Test Cohort',
        inviteCode,
        instructorId: instructorId,
        scenarioId: scenarioId
      }
    });

    const student = await prisma.user.create({
      data: {
        email: 'student-to-kick@sim.com',
        name: 'Student To Kick',
        role: 'STUDENT_COLLEGE',
        emailVerified: true,
        classId: testClass.id,
        status: 'active'
      }
    });

    await prisma.simulationState.create({
      data: {
        userId: student.id,
        classId: testClass.id,
        currentRound: 1,
        status: 'DECISION_OPEN'
      }
    });

    const fetchedStudent = await prisma.user.findUnique({
      where: { id: student.id },
      include: { class: true }
    });

    expect(fetchedStudent).not.toBeNull();
    expect(fetchedStudent?.classId).toBe(testClass.id);

    await prisma.$transaction(async (tx) => {
      if (fetchedStudent?.classId) {
        await tx.simulationState.deleteMany({
          where: { userId: student.id, classId: fetchedStudent.classId }
        });
      }
      await tx.user.update({
        where: { id: student.id },
        data: { classId: null, status: 'active' }
      });
    });

    const updatedStudent = await prisma.user.findUnique({
      where: { id: student.id }
    });
    expect(updatedStudent?.classId).toBeNull();

    const updatedSim = await prisma.simulationState.findMany({
      where: { userId: student.id }
    });
    expect(updatedSim.length).toBe(0);
  });
});
