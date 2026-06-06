import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app';
import { prisma } from '../../src/db/client';

describe('Phase 1: Authentication & Authorization Integration Tests', () => {
  const studentEmail = 'student-test@simulation.com';
  const instructorEmail = 'instructor-test@simulation.com';
  const password = 'SecretPassword123!';

  beforeAll(async () => {
    await prisma.$connect();

    // Cleanup existing test accounts
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
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('GET /api/v1/auth/me should return 401 when no user is logged in', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)).toEqual({ error: 'Unauthorized' });

    const res2 = await app.inject({
      method: 'GET',
      url: '/api/me',
    });
    expect(res2.statusCode).toBe(401);
    expect(JSON.parse(res2.body)).toEqual({ error: 'Unauthorized' });
  });

  it('should successfully register a student user via email signup', async () => {
    const signupRes = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: {
        email: studentEmail,
        password: password,
        name: 'Student Tester',
      }
    });

    console.log("SIGNUP RESPONSE BODY:", signupRes.body);
    expect(signupRes.statusCode).toBe(200);

    const body = JSON.parse(signupRes.body);
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(studentEmail);
    expect(body.user.role).toBe('STUDENT_COLLEGE'); // Defaults to STUDENT_COLLEGE
  });

  it('should successfully register an instructor user and transition their role', async () => {
    // 1. Sign up instructor
    const signupRes = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: {
        email: instructorEmail,
        password: password,
        name: 'Instructor Tester',
      }
    });

    expect(signupRes.statusCode).toBe(200);

    // 2. Directly update user role to INSTRUCTOR in the database
    const dbUser = await prisma.user.update({
      where: { email: instructorEmail },
      data: { role: 'INSTRUCTOR' }
    });

    expect(dbUser.role).toBe('INSTRUCTOR');
  });

  it('should cryptographically hash passwords and never store them in plain text', async () => {
    const studentUser = await prisma.user.findUnique({
      where: { email: studentEmail },
      include: { accounts: true }
    });

    expect(studentUser).not.toBeNull();
    expect(studentUser?.accounts.length).toBe(1);
    
    const accountPassword = studentUser?.accounts[0].password;
    expect(accountPassword).not.toBeNull();
    expect(accountPassword).not.toBe(password); // Password must be hashed
  });

  it('should authenticate student and return session profile including ID, email, name, role', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: {
        email: studentEmail,
        password: password,
      }
    });

    expect(loginRes.statusCode).toBe(200);

    // Capture the cookie header
    const cookies = loginRes.headers['set-cookie'];
    expect(cookies).toBeDefined();

    // Query GET /api/v1/auth/me using the authenticated session cookies
    const profileRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        cookie: Array.isArray(cookies) ? cookies.join('; ') : cookies
      }
    });

    expect(profileRes.statusCode).toBe(200);
    const body = JSON.parse(profileRes.body);
    expect(body.id).toBeDefined();
    expect(body.email).toBe(studentEmail);
    expect(body.name).toBe('Student Tester');
    expect(body.role).toBe('STUDENT_COLLEGE');
    expect(body.institution).toBe(null);
    expect(body.planType).toBe(null);

    // Query GET /api/me using the authenticated session cookies
    const profileRes2 = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: {
        cookie: Array.isArray(cookies) ? cookies.join('; ') : cookies
      }
    });

    expect(profileRes2.statusCode).toBe(200);
    const body2 = JSON.parse(profileRes2.body);
    expect(body2.id).toBe(body.id);
    expect(body2.email).toBe(studentEmail);
    expect(body2.name).toBe('Student Tester');
    expect(body2.role).toBe('STUDENT_COLLEGE');
    expect(body2.institution).toBe(null);
    expect(body2.planType).toBe(null);
  });

  it('should enforce role guards: student is forbidden from calling instructor-only class routes', async () => {
    // 1. Log in student
    const studentLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: studentEmail, password }
    });
    const studentCookies = studentLogin.headers['set-cookie']!;

    // 2. Call instructor-only class route (POST /api/v1/class)
    const classRes = await app.inject({
      method: 'POST',
      url: '/api/v1/class',
      headers: {
        cookie: Array.isArray(studentCookies) ? studentCookies.join('; ') : studentCookies
      },
      payload: {
        name: 'Simulated Marketing 101',
        scenarioId: 'db7914eb-d02f-410a-9d90-39ebaa251540' // dummy scenario ID
      }
    });

    // 403 Forbidden because caller role is STUDENT_COLLEGE
    expect(classRes.statusCode).toBe(403);
    const body = JSON.parse(classRes.body);
    expect(body.error).toContain('Forbidden: Insufficient permissions');
  });

  it('should enforce role guards: instructor is allowed to access instructor class routes', async () => {
    // 1. Log in instructor
    const instructorLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: instructorEmail, password }
    });
    const instructorCookies = instructorLogin.headers['set-cookie']!;

    // 2. Call instructor-only class route (POST /api/v1/class)
    const classRes = await app.inject({
      method: 'POST',
      url: '/api/v1/class',
      headers: {
        cookie: Array.isArray(instructorCookies) ? instructorCookies.join('; ') : instructorCookies
      },
      payload: {
        name: 'Simulated Marketing 101',
        scenarioId: 'db7914eb-d02f-410a-9d90-39ebaa251540' // dummy scenario ID
      }
    });

    // We expect a validation error or scenario not found (400 or 404), but NOT a 403 Forbidden!
    expect(classRes.statusCode).not.toBe(403);
    expect(classRes.statusCode).not.toBe(401);
  });
});
