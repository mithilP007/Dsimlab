import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app';
import { prisma } from '../../src/db/client';

describe('Checkpoint & Justification Gating Workflow Tests', () => {
  const studentEmail = 'checkpoint-student@simulation.com';
  const instructorEmail = 'checkpoint-instructor@simulation.com';
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
    await prisma.checkpointValidation.deleteMany({});
    await prisma.hardViolation.deleteMany({});
    await prisma.simulationState.deleteMany({});
    await prisma.classEnrollment.deleteMany({});
    await prisma.class.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.scenario.deleteMany({});

    // 1. Create Scenario with checkpointRequired: true, maxRounds: 3
    const scenario = await prisma.scenario.create({
      data: {
        name: 'Gating Scenario',
        description: 'Test gating.',
        industry: 'B2B Software',
        budgetPerRound: 5000.0,
        baselineOrganicTraffic: 1000,
        targetKPI: 'revenue',
        maxRounds: 3,
        checkpointRequired: true
      }
    });
    scenarioId = scenario.id;

    // 2. Register Instructor & Class
    await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: { email: instructorEmail, password, name: 'Instructor Checkpoint' }
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

    const classRes = await app.inject({
      method: 'POST',
      url: '/api/classes',
      headers: { cookie: instructorCookies },
      payload: { name: 'Checkpoint Classroom', scenarioId }
    });
    classId = JSON.parse(classRes.body).class.id;

    // 3. Register Student & Join Class
    const studSignUp = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: { email: studentEmail, password, name: 'Student Checkpoint' }
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
    await prisma.checkpointValidation.deleteMany({});
    await prisma.simulationState.deleteMany({});
    await prisma.classEnrollment.deleteMany({});
    await prisma.class.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.scenario.deleteMany({});
    await app.close();
    await prisma.$disconnect();
  });

  it('should allow advancing Round 1 without a checkpoint, moving student to Round 2', async () => {
    // Submit Round 1 decisions
    const decRes = await app.inject({
      method: 'POST',
      url: `/api/simulations/${simulationId}/decisions`,
      headers: { cookie: studentCookies },
      payload: {
        seoTargetKeywords: ['CRM software'],
        seoContentQuality: 7.0,
        seoBacklinkBudget: 100.0,
        googleCampaigns: [],
        metaCampaigns: []
      }
    });
    expect(decRes.statusCode).toBe(200);

    // Advance round - should move to Round 2 without checking any checkpoints
    const advRes = await app.inject({
      method: 'POST',
      url: `/api/v1/simulation/advance`,
      headers: { cookie: studentCookies }
    });
    expect(advRes.statusCode).toBe(200);

    const sim = await prisma.simulationState.findUnique({ where: { id: simulationId } });
    expect(sim?.currentRound).toBe(2);
  });

  it('should block advancing Round 2 to Round 3 if student has not submitted Round 1 justification', async () => {
    // Submit Round 2 decisions
    await app.inject({
      method: 'POST',
      url: `/api/simulations/${simulationId}/decisions`,
      headers: { cookie: studentCookies },
      payload: {
        seoTargetKeywords: ['sales tracking'],
        seoContentQuality: 8.0,
        seoBacklinkBudget: 200.0,
        googleCampaigns: [],
        metaCampaigns: []
      }
    });

    // Attempt to advance (to Round 3) -> should fail 400 with missing checkpoint message
    const advRes = await app.inject({
      method: 'POST',
      url: `/api/v1/simulation/advance`,
      headers: { cookie: studentCookies }
    });
    expect(advRes.statusCode).toBe(400);
    const body = JSON.parse(advRes.body);
    expect(body.message).toContain('Mandatory checkpoint justification for Round 1 must be submitted');
  });

  it('should accept student justification and calculate a score, then allow advancement', async () => {
    // 1. Submit checkpoint for Round 1
    const cpRes = await app.inject({
      method: 'POST',
      url: '/api/v1/simulation/checkpoint',
      headers: { cookie: studentCookies },
      payload: {
        simulationId,
        roundNumber: 1,
        justificationText: 'We targeted high-volume organic search queries and optimized content relevance to boost rankings and capture traffic conversions.'
      }
    });
    expect(cpRes.statusCode).toBe(201);
    const cpBody = JSON.parse(cpRes.body);
    expect(cpBody.success).toBe(true);
    expect(cpBody.checkpoint.reflectionQualityScore).toBeGreaterThanOrEqual(50);
    expect(cpBody.checkpoint.status).toBe('SUBMITTED');

    // 2. Advance should now succeed
    const advRes = await app.inject({
      method: 'POST',
      url: `/api/v1/simulation/advance`,
      headers: { cookie: studentCookies }
    });
    expect(advRes.statusCode).toBe(200);

    const sim = await prisma.simulationState.findUnique({ where: { id: simulationId } });
    expect(sim?.currentRound).toBe(3);
  });

  it('should allow instructor to view student checkpoints and update feedback comments and scores', async () => {
    // 1. Instructor gets checkpoints
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/simulation/checkpoint/${simulationId}`,
      headers: { cookie: instructorCookies }
    });
    expect(getRes.statusCode).toBe(200);
    const getBody = JSON.parse(getRes.body);
    expect(getBody.checkpoints.length).toBe(1);
    const checkpointId = getBody.checkpoints[0].id;

    // 2. Instructor grades/approves checkpoint
    const gradeRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/simulation/checkpoint/${checkpointId}`,
      headers: { cookie: instructorCookies },
      payload: {
        status: 'APPROVED',
        instructorComment: 'Excellent analysis of SEO traffic drivers!',
        reflectionQualityScore: 90
      }
    });
    expect(gradeRes.statusCode).toBe(200);
    const gradeBody = JSON.parse(gradeRes.body);
    expect(gradeBody.checkpoint.status).toBe('APPROVED');
    expect(gradeBody.checkpoint.instructorComment).toBe('Excellent analysis of SEO traffic drivers!');
    expect(gradeBody.checkpoint.reflectionQualityScore).toBe(90);
  });
});
