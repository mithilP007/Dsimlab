import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app';
import { prisma } from '../../src/db/client';
import { UserRole } from '../../src/auth/roles';

describe('Reports Security & Access Control Integration Tests', () => {
  let adminId: string;
  let instructorAId: string;
  let instructorBId: string;
  let studentAId: string;
  let studentBId: string;
  let classAId: string;
  let classBId: string;
  let scenarioId: string;

  let adminCookies: string[];
  let instructorACookies: string[];
  let instructorBCookies: string[];
  let studentACookies: string[];
  let studentBCookies: string[];

  const password = 'TestSecretPassword123!';

  async function registerAndLogin(email: string, name: string, role: string) {
    const signupRes = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: { email, password, name }
    });
    expect(signupRes.statusCode).toBe(200);

    const user = await prisma.user.update({
      where: { email },
      data: { role, emailVerified: true }
    });

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email, password }
    });
    expect(loginRes.statusCode).toBe(200);

    return { id: user.id, cookies: loginRes.headers['set-cookie'] as string[] };
  }

  beforeAll(async () => {
    await prisma.$connect();

    // Cleanup
    await prisma.checkpointValidation.deleteMany({});
    await prisma.simulationState.deleteMany({});
    await prisma.class.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.scenario.deleteMany({});

    // Create a scenario
    const scenario = await prisma.scenario.create({
      data: {
        name: 'Reports Security Scenario',
        description: 'Test descriptions.',
        industry: 'B2B Software',
        budgetPerRound: 5000.0,
        baselineOrganicTraffic: 1000,
        targetKPI: 'revenue'
      }
    });
    scenarioId = scenario.id;

    // Register users
    const admin = await registerAndLogin('admin-sec@sim.com', 'Admin User', UserRole.ADMIN);
    adminId = admin.id;
    adminCookies = admin.cookies;

    const instA = await registerAndLogin('inst-a-sec@sim.com', 'Instructor A', UserRole.INSTRUCTOR);
    instructorAId = instA.id;
    instructorACookies = instA.cookies;

    const instB = await registerAndLogin('inst-b-sec@sim.com', 'Instructor B', UserRole.INSTRUCTOR);
    instructorBId = instB.id;
    instructorBCookies = instB.cookies;

    const studA = await registerAndLogin('stud-a-sec@sim.com', 'Student A', UserRole.STUDENT_COLLEGE);
    studentAId = studA.id;
    studentACookies = studA.cookies;

    const studB = await registerAndLogin('stud-b-sec@sim.com', 'Student B', UserRole.STUDENT_COLLEGE);
    studentBId = studB.id;
    studentBCookies = studB.cookies;

    // Create classes
    const classA = await prisma.class.create({
      data: {
        name: 'Class A Cohort',
        inviteCode: 'CLSA11',
        instructorId: instructorAId,
        scenarioId: scenarioId
      }
    });
    classAId = classA.id;

    const classB = await prisma.class.create({
      data: {
        name: 'Class B Cohort',
        inviteCode: 'CLSB22',
        instructorId: instructorBId,
        scenarioId: scenarioId
      }
    });
    classBId = classB.id;

    // Associate students to classes
    await prisma.user.update({ where: { id: studentAId }, data: { classId: classAId } });
    await prisma.user.update({ where: { id: studentBId }, data: { classId: classBId } });

    // Initialize simulations
    await prisma.simulationState.create({
      data: { userId: studentAId, classId: classAId, currentRound: 1, status: 'DECISION_OPEN' }
    });
    await prisma.simulationState.create({
      data: { userId: studentBId, classId: classBId, currentRound: 1, status: 'DECISION_OPEN' }
    });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('Instructor A should access Class A reports but get 403 Forbidden for Class B reports', async () => {
    // 1. Success Class A
    const resA = await app.inject({
      method: 'GET',
      url: `/api/v1/report/class/${classAId}`,
      headers: { cookie: instructorACookies.join('; ') }
    });
    expect(resA.statusCode).toBe(200);

    // 2. Forbidden Class B
    const resB = await app.inject({
      method: 'GET',
      url: `/api/v1/report/class/${classBId}`,
      headers: { cookie: instructorACookies.join('; ') }
    });
    expect(resB.statusCode).toBe(403);
    const body = JSON.parse(resB.body);
    expect(body.message || body.error).toContain('authorized');
  });

  it('Instructor A should get 403 Forbidden for Class B sub-reports (nba, obe, accreditation, performance)', async () => {
    const endpoints = ['nba', 'obe', 'accreditation', 'performance'];
    for (const ep of endpoints) {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/report/class/${classBId}/${ep}`,
        headers: { cookie: instructorACookies.join('; ') }
      });
      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.message || body.error).toContain('authorized');
    }
  });

  it('Students should get 403 Forbidden for Class A sub-reports (nba, obe, accreditation, performance)', async () => {
    const endpoints = ['nba', 'obe', 'accreditation', 'performance'];
    for (const ep of endpoints) {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/report/class/${classAId}/${ep}`,
        headers: { cookie: studentACookies.join('; ') }
      });
      expect(res.statusCode).toBe(403);
    }
  });

  it('Super Admin should access Class A sub-reports (nba, obe, accreditation, performance) successfully', async () => {
    const endpoints = ['nba', 'obe', 'accreditation', 'performance'];
    for (const ep of endpoints) {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/report/class/${classAId}/${ep}`,
        headers: { cookie: adminCookies.join('; ') }
      });
      expect(res.statusCode).toBe(200);
    }
  });


  it('Students should get 403 Forbidden for any classroom cohort reports', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/report/class/${classAId}`,
      headers: { cookie: studentACookies.join('; ') }
    });
    expect(res.statusCode).toBe(403);
  });

  it('Super Admin should access any class reports successfully', async () => {
    const resA = await app.inject({
      method: 'GET',
      url: `/api/v1/report/class/${classAId}`,
      headers: { cookie: adminCookies.join('; ') }
    });
    expect(resA.statusCode).toBe(200);

    const resB = await app.inject({
      method: 'GET',
      url: `/api/v1/report/class/${classBId}`,
      headers: { cookie: adminCookies.join('; ') }
    });
    expect(resB.statusCode).toBe(200);
  });

  it('Student A should view their own student report but get 403 for Student B report', async () => {
    // Self
    const resSelf = await app.inject({
      method: 'GET',
      url: `/api/v1/report/student/${studentAId}`,
      headers: { cookie: studentACookies.join('; ') }
    });
    expect(resSelf.statusCode).toBe(200);

    // Other
    const resOther = await app.inject({
      method: 'GET',
      url: `/api/v1/report/student/${studentBId}`,
      headers: { cookie: studentACookies.join('; ') }
    });
    expect(resOther.statusCode).toBe(403);
  });

  it('Instructor A should view Student A report but get 403 for Student B report', async () => {
    // Own student
    const resA = await app.inject({
      method: 'GET',
      url: `/api/v1/report/student/${studentAId}`,
      headers: { cookie: instructorACookies.join('; ') }
    });
    expect(resA.statusCode).toBe(200);

    // Other student
    const resB = await app.inject({
      method: 'GET',
      url: `/api/v1/report/student/${studentBId}`,
      headers: { cookie: instructorACookies.join('; ') }
    });
    expect(resB.statusCode).toBe(403);
  });
});
