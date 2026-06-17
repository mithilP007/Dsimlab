import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app';
import { prisma } from '../../src/db/client';

describe('Super Admin Command Center Integration Tests', () => {
  const adminEmail = 'super-admin@simulation.com';
  const studentEmail = 'admin-test-student@simulation.com';
  const password = 'SuperSecretAdmin123!';
  
  let adminCookies: any;
  let studentCookies: any;
  let adminId: string;
  let studentId: string;

  beforeAll(async () => {
    await prisma.$connect();

    // 1. Cleanup
    const emails = [adminEmail, studentEmail];
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

    // 2. Provision Users
    // Admin
    await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: { email: adminEmail, password, name: 'Admin User' }
    });
    const aUser = await prisma.user.update({
      where: { email: adminEmail },
      data: { role: 'ADMIN', institution: 'Harvard University' }
    });
    adminId = aUser.id;

    // Student
    await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: { email: studentEmail, password, name: 'Student User' }
    });
    const sUser = await prisma.user.update({
      where: { email: studentEmail },
      data: { role: 'STUDENT_COLLEGE', institution: 'Harvard University' }
    });
    studentId = sUser.id;

    // Logins to grab session cookies
    const aLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: adminEmail, password }
    });
    adminCookies = aLogin.headers['set-cookie'];

    const sLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: studentEmail, password }
    });
    studentCookies = sLogin.headers['set-cookie'];
  });

  afterAll(async () => {
    const emails = [adminEmail, studentEmail];
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
    await prisma.$disconnect();
  });

  // ─── Route Access Safeguards ──────────────────────────────────────────────

  it('GET /api/v1/admin/dashboard-stats should fail with 401 when unauthenticated', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/dashboard-stats'
    });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/v1/admin/dashboard-stats should fail with 403 for students', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/dashboard-stats',
      headers: { cookie: studentCookies }
    });
    expect(res.statusCode).toBe(403);
  });

  it('GET /api/v1/admin/dashboard-stats should succeed for Admin role', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/dashboard-stats',
      headers: { cookie: adminCookies }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.stats).toBeDefined();
    expect(body.stats.totalUsers).toBeGreaterThanOrEqual(2);
    expect(body.recentActivity).toBeDefined();
  });

  // ─── User Actions & Bulk Commands ─────────────────────────────────────────

  it('POST /api/v1/admin/users/:id/reset-password should reset student password successfully', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/users/${studentId}/reset-password`,
      headers: { cookie: adminCookies }
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);

    // Verify student can log in with new reset password
    const sLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: studentEmail, password: 'ResetPassword123!' }
    });
    expect(sLogin.statusCode).toBe(200);
  });

  it('POST /api/v1/admin/users/bulk-action should suspend student user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users/bulk-action',
      headers: { cookie: adminCookies },
      payload: { userIds: [studentId], action: 'suspend' }
    });
    expect(res.statusCode).toBe(200);

    const suspendedUser = await prisma.user.findUnique({ where: { id: studentId } });
    expect(suspendedUser!.status).toBe('suspended');
  });

  it('POST /api/v1/admin/users/bulk-action should activate suspended student user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users/bulk-action',
      headers: { cookie: adminCookies },
      payload: { userIds: [studentId], action: 'activate' }
    });
    expect(res.statusCode).toBe(200);

    const activeUser = await prisma.user.findUnique({ where: { id: studentId } });
    expect(activeUser!.status).toBe('active');
  });

  // ─── Institution management ──────────────────────────────────────────────

  it('GET /api/v1/admin/institutions should return Harvard University with statistics', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/institutions',
      headers: { cookie: adminCookies }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    const harvard = body.institutions.find((i: any) => i.name === 'Harvard University');
    expect(harvard).toBeDefined();
    expect(harvard.studentsCount).toBeGreaterThanOrEqual(1);
    expect(harvard.status).toBe('active');
  });

  it('PUT /api/v1/admin/institutions/:name should rename Harvard to MIT', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/institutions/Harvard University',
      headers: { cookie: adminCookies },
      payload: { newName: 'MIT' }
    });
    expect(res.statusCode).toBe(200);

    const studentMIT = await prisma.user.findUnique({ where: { id: studentId } });
    expect(studentMIT!.institution).toBe('MIT');
  });

  it('POST /api/v1/admin/institutions/:name/deactivate should suspend users associated with MIT', async () => {
    const res = await app.inject({
      // Renamed to MIT in previous test
      method: 'POST',
      url: '/api/v1/admin/institutions/MIT/deactivate',
      headers: { cookie: adminCookies }
    });
    expect(res.statusCode).toBe(200);

    const studentSuspended = await prisma.user.findUnique({ where: { id: studentId } });
    expect(studentSuspended!.status).toBe('suspended');
  });

  // ─── Audits, Health, and Notifications ─────────────────────────────────────

  it('GET /api/v1/admin/audit-logs should retrieve system audit registry', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/audit-logs',
      headers: { cookie: adminCookies }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.logs.length).toBeGreaterThan(0);
    expect(body.logs[0].actorName).toBeDefined();
  });

  it('GET /api/v1/admin/system-health should return DB connected status and query latencies', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/system-health',
      headers: { cookie: adminCookies }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.health.database).toBe('connected');
    expect(body.health.dbLatencyMs).toBeDefined();
  });

  it('POST /api/v1/admin/broadcast-notification should broadcast system notice successfully', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/broadcast-notification',
      headers: { cookie: adminCookies },
      payload: {
        title: 'Maintenance Alert',
        message: 'System will undergo maintenance at 2 AM EST.'
      }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.recipientsCount).toBeGreaterThanOrEqual(1);
  });
});
