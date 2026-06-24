import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app';
import { prisma } from '../../src/db/client';

describe('Flexible Scenario Assignment Integration Tests', () => {
  const instructorEmail = 'assign-instructor@sim.com';
  const student1Email = 'assign-student1@sim.com';
  const student2Email = 'assign-student2@sim.com';
  const password = 'Password123!';

  let instructorCookies: any;
  let student1Cookies: any;
  let student2Cookies: any;

  let instructorId: string;
  let student1Id: string;
  let student2Id: string;

  let classId: string;
  let scenarioId: string;
  let createdAssignmentId: string;

  beforeAll(async () => {
    await prisma.$connect();

    // Cleanup existing test accounts
    const testEmails = [instructorEmail, student1Email, student2Email];
    await prisma.scenarioAssignmentStudent.deleteMany({});
    await prisma.scenarioAssignment.deleteMany({});
    await prisma.campaignRun.deleteMany({});
    await prisma.simulationState.deleteMany({});

    await prisma.account.deleteMany({
      where: {
        user: { email: { in: testEmails } }
      }
    });
    await prisma.user.deleteMany({
      where: { email: { in: testEmails } }
    });

    // Create scenario
    const scenario = await prisma.scenario.create({
      data: {
        name: 'Assignment Verification Scenario',
        description: 'Test template for assignments',
        industry: 'EdTech SaaS',
        budgetPerRound: 5000.0,
        dailyBudgetCap: 120.0,
        baselineOrganicTraffic: 1000,
        targetKPI: 'revenue',
      }
    });
    scenarioId = scenario.id;

    // Register & Login Instructor
    await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: { email: instructorEmail, password, name: 'Instructor Assignment' }
    });
    const iUser = await prisma.user.update({
      where: { email: instructorEmail },
      data: { role: 'INSTRUCTOR', status: 'active' }
    });
    instructorId = iUser.id;

    const iLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: instructorEmail, password }
    });
    instructorCookies = iLogin.headers['set-cookie'];

    // Create Classroom
    const classRes = await app.inject({
      method: 'POST',
      url: '/api/v1/class',
      headers: { cookie: instructorCookies },
      payload: { name: 'Assignment Testing Cohort', scenarioId }
    });
    const classBody = JSON.parse(classRes.body);
    classId = classBody.class.id;

    // Register & Login Student 1
    await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: { email: student1Email, password, name: 'Student One' }
    });
    const s1 = await prisma.user.update({
      where: { email: student1Email },
      data: { role: 'STUDENT_COLLEGE', status: 'active', classId }
    });
    student1Id = s1.id;
    await prisma.classEnrollment.create({
      data: {
        classId,
        studentId: student1Id,
        studentEmail: student1Email,
        status: 'ACTIVE'
      }
    });

    const s1Login = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: student1Email, password }
    });
    student1Cookies = s1Login.headers['set-cookie'];

    // Register & Login Student 2
    await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: { email: student2Email, password, name: 'Student Two' }
    });
    const s2 = await prisma.user.update({
      where: { email: student2Email },
      data: { role: 'STUDENT_COLLEGE', status: 'active', classId }
    });
    student2Id = s2.id;
    await prisma.classEnrollment.create({
      data: {
        classId,
        studentId: student2Id,
        studentEmail: student2Email,
        status: 'ACTIVE'
      }
    });

    const s2Login = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: student2Email, password }
    });
    student2Cookies = s2Login.headers['set-cookie'];
  });

  afterAll(async () => {
    await prisma.scenarioAssignmentStudent.deleteMany({});
    await prisma.scenarioAssignment.deleteMany({});
    await prisma.campaignRun.deleteMany({});
    await prisma.simulationState.deleteMany({});
    
    const testEmails = [instructorEmail, student1Email, student2Email];
    await prisma.account.deleteMany({
      where: { user: { email: { in: testEmails } } }
    });
    await prisma.user.deleteMany({
      where: { email: { in: testEmails } }
    });
    await prisma.class.deleteMany({ where: { id: classId } });
    await prisma.scenario.deleteMany({ where: { id: scenarioId } });
    await prisma.$disconnect();
  });

  it('should successfully create an assignment in DRAFT mode for the entire class', async () => {
    // Set start date slightly in the past (10 seconds ago) to guarantee active status on publish
    const startDate = new Date(Date.now() - 10000);
    const endDate = new Date(startDate.getTime() + 15 * 24 * 3600 * 1000);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/assignments',
      headers: { cookie: instructorCookies },
      payload: {
        assignmentName: 'Class Midterm simulation',
        classId,
        scenarioId,
        targetType: 'CLASS',
        durationDays: 15,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dailyProcessingTime: '08:00',
        dailyBudgetCap: 100.0,
        difficulty: 'medium',
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.assignment.status).toBe('DRAFT');
    expect(body.assignment.durationDays).toBe(15);
    createdAssignmentId = body.assignment.id;
  });

  it('should publish the assignment and transition it to ACTIVE', async () => {
    const pubRes = await app.inject({
      method: 'POST',
      url: `/api/v1/assignments/${createdAssignmentId}/publish`,
      headers: { cookie: instructorCookies }
    });
    expect(pubRes.statusCode).toBe(200);
    const body = JSON.parse(pubRes.body);
    expect(body.assignment.status).toBe('ACTIVE');
  });

  it('should prevent creating a conflicting overlapping assignment for same students', async () => {
    const startDate = new Date(Date.now() - 5000);
    const endDate = new Date(startDate.getTime() + 30 * 24 * 3600 * 1000);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/assignments',
      headers: { cookie: instructorCookies },
      payload: {
        assignmentName: 'Conflicting Overlapping Challenge',
        classId,
        scenarioId,
        targetType: 'STUDENT',
        targetStudentIds: [student1Id],
        durationDays: 30,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dailyProcessingTime: '08:00',
        dailyBudgetCap: 100.0,
        difficulty: 'medium',
      }
    });

    // Should return 400 Bad Request due to overlap validation against ACTIVE assignment
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toContain('Time overlap conflict detected');
  });

  it('should allow student 1 to fetch their active assignment once published and start campaign', async () => {
    // 1. Student fetches active assignment
    const activeRes = await app.inject({
      method: 'GET',
      url: '/api/v1/assignments/student/active',
      headers: { cookie: student1Cookies }
    });
    expect(activeRes.statusCode).toBe(200);
    const activeBody = JSON.parse(activeRes.body);
    expect(activeBody.activeAssignment).not.toBeNull();
    expect(activeBody.activeAssignment.assignment.id).toBe(createdAssignmentId);

    // 2. Student starts campaign and inherits assignment settings
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/v1/campaign/start',
      headers: { cookie: student1Cookies }
    });
    expect(startRes.statusCode).toBe(201);
    const startBody = JSON.parse(startRes.body);
    expect(startBody.durationDays).toBe(15);

    // Verify CampaignRun model contains assignment ID
    const run = await prisma.campaignRun.findUnique({
      where: { id: startBody.campaignRunId }
    });
    expect(run?.assignmentId).toBe(createdAssignmentId);
  });

  it('should enforce assignment daily budget cap during student decisions submission', async () => {
    const stateRes = await app.inject({
      method: 'GET',
      url: '/api/v1/campaign/state',
      headers: { cookie: student1Cookies }
    });
    const runId = JSON.parse(stateRes.body).run.id;

    // Submit decision with spend exceeding dailyBudgetCap (which is 100.0)
    const decRes = await app.inject({
      method: 'POST',
      url: '/api/v1/campaign/decision',
      headers: { cookie: student1Cookies },
      payload: {
        campaignRunId: runId,
        dayNumber: 1,
        seoSettings: {
          targetKeywords: ['CRM SaaS'],
          contentQuality: 8,
          backlinkBudget: 50.0,
        },
        googleAdsSettings: {
          campaigns: [{ name: 'Ad Campaign', budget: 80.0, keywords: [] }]
        },
        metaAdsSettings: {
          campaigns: []
        }
      }
    });

    // Total proposed spend = 50 + 80 = 130 > 100 limit. Must fail with validation error.
    expect(decRes.statusCode).toBe(400);
    const decBody = JSON.parse(decRes.body);
    expect(decBody.error).toContain('exceeds the daily limit');
  });

  it('should successfully submit decision under the budget limit', async () => {
    const stateRes = await app.inject({
      method: 'GET',
      url: '/api/v1/campaign/state',
      headers: { cookie: student1Cookies }
    });
    const runId = JSON.parse(stateRes.body).run.id;

    const decRes = await app.inject({
      method: 'POST',
      url: '/api/v1/campaign/decision',
      headers: { cookie: student1Cookies },
      payload: {
        campaignRunId: runId,
        dayNumber: 1,
        seoSettings: {
          targetKeywords: ['CRM SaaS'],
          contentQuality: 8,
          backlinkBudget: 40.0,
        },
        googleAdsSettings: {
          campaigns: [{ name: 'Ad Campaign', budget: 50.0, keywords: [] }]
        },
        metaAdsSettings: {
          campaigns: []
        }
      }
    });

    expect(decRes.statusCode).toBe(200);
  });

  it('should prevent student from accessing other student campaign details', async () => {
    const s1State = await app.inject({
      method: 'GET',
      url: '/api/v1/campaign/state',
      headers: { cookie: student1Cookies }
    });
    const s1RunId = JSON.parse(s1State.body).run.id;

    // Student 2 tries to read Student 1's campaign results
    const readRes = await app.inject({
      method: 'GET',
      url: `/api/v1/campaign/results?campaignRunId=${s1RunId}`,
      headers: { cookie: student2Cookies }
    });

    expect(readRes.statusCode).toBe(403); // Forbidden access
  });
});
