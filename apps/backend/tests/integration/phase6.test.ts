import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app';
import { prisma } from '../../src/db/client';
import fs from 'fs';
import path from 'path';

describe('Phase 6: Testing, Documentation, API Contract, and Security Hardening', () => {
  const studentEmail = 'p6-student@simulation.com';
  const instructorEmail = 'p6-instructor@simulation.com';
  const adminEmail = 'p6-admin@simulation.com';
  const password = 'SecretPassword123!';

  let studentCookies: any;
  let instructorCookies: any;
  let adminCookies: any;
  let studentId: string;
  let instructorId: string;
  let adminId: string;

  beforeAll(async () => {
    await prisma.$connect();

    // 1. Cleanup old test users if any
    const emails = [studentEmail, instructorEmail, adminEmail];
    await prisma.account.deleteMany({
      where: {
        userId: {
          in: await prisma.user.findMany({
            where: { email: { in: emails } },
            select: { id: true }
          }).then(users => users.map(u => u.id))
        }
      }
    });
    await prisma.user.deleteMany({
      where: { email: { in: emails } }
    });

    // 2. Register & set roles
    // Student
    await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: { email: studentEmail, password, name: 'Student P6' }
    });
    const sUser = await prisma.user.findUnique({ where: { email: studentEmail } });
    studentId = sUser!.id;

    // Instructor
    await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: { email: instructorEmail, password, name: 'Instructor P6' }
    });
    const iUser = await prisma.user.update({
      where: { email: instructorEmail },
      data: { role: 'INSTRUCTOR' }
    });
    instructorId = iUser.id;

    // Admin
    await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: { email: adminEmail, password, name: 'Admin P6' }
    });
    const aUser = await prisma.user.update({
      where: { email: adminEmail },
      data: { role: 'ADMIN' }
    });
    adminId = aUser.id;

    // 3. Log in all and grab cookies
    const sLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: studentEmail, password }
    });
    studentCookies = sLogin.headers['set-cookie'];

    const iLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: instructorEmail, password }
    });
    instructorCookies = iLogin.headers['set-cookie'];

    const aLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: adminEmail, password }
    });
    adminCookies = aLogin.headers['set-cookie'];
  });

  afterAll(async () => {
    const emails = [studentEmail, instructorEmail, adminEmail];
    await prisma.account.deleteMany({
      where: {
        userId: {
          in: await prisma.user.findMany({
            where: { email: { in: emails } },
            select: { id: true }
          }).then(users => users.map(u => u.id))
        }
      }
    });
    await prisma.user.deleteMany({
      where: { email: { in: emails } }
    });
    await app.close();
    await prisma.$disconnect();
  });

  describe('Swagger/OpenAPI Documentation Verification', () => {
    it('should serve Swagger UI docs HTML at GET /docs', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/docs'
      });
      // Swagger UI can either return redirect (302) or HTML (200)
      expect([200, 301, 302]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.headers['content-type']).toContain('text/html');
      }
    });

    it('should generate openapi.json file on the disk', () => {
      const filePath = path.join(process.cwd(), 'openapi.json');
      const fileExists = fs.existsSync(filePath);
      expect(fileExists).toBe(true);

      const content = fs.readFileSync(filePath, 'utf8');
      const openapi = JSON.parse(content);
      expect(openapi.openapi).toBeDefined();
      expect(openapi.info.title).toContain('Digital Marketing Simulation Lab API');
      expect(openapi.paths).toBeDefined();
      // Verify major endpoint tags are present
      expect(content).toContain('Simulation');
      expect(content).toContain('SEO');
      expect(content).toContain('Google Ads');
      expect(content).toContain('Meta Ads');
      expect(content).toContain('Instructor');
      expect(content).toContain('Certificate');
      expect(content).toContain('AI');
    });
  });

  describe('Security and Role Guard Restrictions', () => {
    it('unauthorized request should fail with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/me'
      });
      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body).error).toBe('Unauthorized');
    });

    it('student role should be forbidden (403) from instructor endpoints', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/classes',
        headers: { cookie: studentCookies },
        payload: { name: 'Forbidden Class', scenarioId: '4713b39c-a42e-4318-b837-f2b684787612' }
      });
      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).error).toContain('Forbidden');
    });

    it('student role should be forbidden (403) from scenario creation', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/scenarios',
        headers: { cookie: studentCookies },
        payload: {
          name: 'Forbidden Scenario',
          description: 'Forbidden Scenario Description',
          industry: 'SaaS CRM',
          budgetPerRound: 5000.0
        }
      });
      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).error).toContain('Forbidden');
    });

    it('instructor role should be forbidden (403) from admin endpoints', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/users/assign-role',
        headers: { cookie: instructorCookies },
        payload: { userId: studentId, role: 'ADMIN' }
      });
      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).error).toContain('Forbidden');
    });

    it('admin role should bypass instructor/admin guards successfully', async () => {
      // Admin tries to assign role (invalid body uuid format checks if route is hit)
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/users/assign-role',
        headers: { cookie: adminCookies },
        payload: { userId: 'invalid-uuid', role: 'ADMIN' }
      });
      // Should not be 403 Forbidden. Should trigger validation error (400) or success.
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).success).toBe(false);
      expect(JSON.parse(res.body).message).toBeDefined();
    });
  });

  describe('API Contract Shape Verification', () => {
    it('GET /api/me should return authenticated user details with exact contract shape', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/me',
        headers: { cookie: studentCookies }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('email');
      expect(body).toHaveProperty('name');
      expect(body).toHaveProperty('role');
      expect(body).toHaveProperty('institution');
      expect(body).toHaveProperty('planType');
      expect(body.email).toBe(studentEmail);
      expect(body.role).toBe('STUDENT_COLLEGE');
    });
  });
});
