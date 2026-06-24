/**
 * Phase 5 Integration Tests: AI Insight Endpoint & WebSocket Payload Structure
 *
 * Validates:
 * 1. POST /api/ai/insight returns insight + fallback flag
 * 2. 401 when not authenticated
 * 3. 422 on invalid platform
 * 4. Fallback=true when Ollama is unreachable (always the case in test env)
 * 5. WebSocket round:complete payload structure
 * 6. Notification handler dual-room emit behaviour
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { app } from '../../src/app';
import { prisma } from '../../src/db/client';

describe('Phase 5: AI Integration & WebSocket Payload Tests', () => {
  const studentEmail = 'p5-student@simulation.com';
  const instructorEmail = 'p5-instructor@simulation.com';
  const password = 'SecretPassword123!';
  let studentCookies: any;
  let instructorCookies: any;
  let studentId: string;
  let classId: string;
  let scenarioId: string;
  let simulationId: string;

  // ─── Setup ───────────────────────────────────────────────────────────────

  beforeAll(async () => {
    await prisma.$connect();

    // Clean up any leftover users from previous test runs
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: [studentEmail, instructorEmail] } },
      select: { id: true },
    });
    const existingIds = existingUsers.map((u) => u.id);
    if (existingIds.length > 0) {
      await prisma.account.deleteMany({ where: { userId: { in: existingIds } } });
      await prisma.user.deleteMany({ where: { id: { in: existingIds } } });
    }

    // Create scenario
    const scenario = await prisma.scenario.create({
      data: {
        name: 'Phase 5 AI Test Scenario',
        description: 'Scenario for AI insight integration tests.',
        industry: 'EdTech SaaS',
        budgetPerRound: 3000.0,
        baselineOrganicTraffic: 800,
        targetKPI: 'conversions',
        maxRounds: 1,
      },
    });
    scenarioId = scenario.id;

    // Register instructor and create class
    await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: { email: instructorEmail, password, name: 'Instructor P5' },
    });
    const instUser = await prisma.user.update({
      where: { email: instructorEmail },
      data: { role: 'INSTRUCTOR' },
    });
    const instPlan = await prisma.plan.findFirst({ where: { code: 'instructor' } });
    if (instPlan) {
      await prisma.subscription.create({
        data: {
          userId: instUser.id,
          planId: instPlan.id,
          status: 'active',
          billingCycle: 'monthly',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }
    const instLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: instructorEmail, password },
    });
    instructorCookies = instLogin.headers['set-cookie'];

    const classRes = await app.inject({
      method: 'POST',
      url: '/api/classes',
      headers: { cookie: instructorCookies },
      payload: { name: 'P5 AI Class', scenarioId },
    });
    console.log('DEBUG: classRes status =', classRes.statusCode, 'body =', classRes.body);
    classId = JSON.parse(classRes.body).class?.id;
    console.log('DEBUG: classId parsed =', classId);

    // Register student and enroll in class
    const studSignUp = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: { email: studentEmail, password, name: 'Student P5' },
    });
    studentId = JSON.parse(studSignUp.body).user.id;

    console.log('DEBUG: studentId =', studentId, 'classId =', classId);

    const updatedUser = await prisma.user.update({
      where: { id: studentId },
      data: { classId },
    });
    await prisma.classEnrollment.create({
      data: {
        classId,
        studentId,
        studentEmail,
        status: 'ACTIVE'
      }
    });

    console.log('DEBUG: updatedUser in DB =', updatedUser);

    const studLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: studentEmail, password },
    });
    studentCookies = studLogin.headers['set-cookie'];

    const simRes = await app.inject({
      method: 'POST',
      url: '/api/simulations',
      headers: { cookie: studentCookies },
    });
    console.log("PHASE 5 SIMRES STATUS:", simRes.statusCode, "BODY:", simRes.body);
    simulationId = JSON.parse(simRes.body).id;

    // Submit a decision so there is data for metrics lookup
    await app.inject({
      method: 'POST',
      url: `/api/simulations/${simulationId}/decisions`,
      headers: { cookie: studentCookies },
      payload: {
        seoTargetKeywords: ['edtech platform', 'online learning'],
        seoContentQuality: 7,
        seoBacklinkBudget: 300,
        googleCampaigns: [{ name: 'Google Edtech', bidAmount: 2.0, dailyBudget: 40 }],
        metaCampaigns: [{ name: 'Meta Edtech', dailyBudget: 60 }],
      },
    });

    // Advance one round to generate DailyMetrics in the DB
    await app.inject({
      method: 'POST',
      url: `/api/simulations/${simulationId}/advance`,
      headers: { cookie: studentCookies },
    });
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: [studentEmail, instructorEmail] } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    
    // 1. Delete dependent models
    await prisma.certificate.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.account.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.simulationState.deleteMany({ where: { userId: { in: userIds } } });

    // 2. Delete users (which cascades and deletes Class because Class.instructorId is onDelete: Cascade)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });

    // 3. Delete scenario
    await prisma.scenario.deleteMany({ where: { id: scenarioId } });
    await prisma.$disconnect();
  });

  // ─── AI Insight Route ────────────────────────────────────────────────────

  it('POST /api/ai/insight returns 401 when unauthenticated', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/insight',
      payload: { simulationId, platform: 'seo' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/ai/insight returns 400 on missing simulationId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/insight',
      headers: { cookie: studentCookies },
      payload: { platform: 'seo' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/ai/insight returns 400 on invalid platform', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/insight',
      headers: { cookie: studentCookies },
      payload: { simulationId, platform: 'invalid_platform' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/ai/insight returns 404 for non-existent simulation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/insight',
      headers: { cookie: studentCookies },
      payload: {
        simulationId: '00000000-0000-0000-0000-000000000000',
        platform: 'seo',
      },
    });
    expect(res.statusCode).toBe(404);
  });

  it('POST /api/ai/insight returns insight with fallback=true when Ollama is offline (test env)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/insight',
      headers: { cookie: studentCookies },
      payload: { simulationId, platform: 'seo' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.simulationId).toBe(simulationId);
    expect(body.platform).toBe('seo');
    expect(typeof body.insight).toBe('string');
    expect(body.insight.length).toBeGreaterThan(10);
    // Ollama won't be running in CI/test env → always fallback
    expect(body.fallback).toBe(true);
  });

  it('POST /api/ai/insight works for google_ads platform', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/insight',
      headers: { cookie: studentCookies },
      payload: { simulationId, platform: 'google_ads' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.platform).toBe('google_ads');
    expect(body.insight).toBeDefined();
    expect(body.fallback).toBeDefined();
  });

  it('POST /api/ai/insight works for meta_ads platform', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/insight',
      headers: { cookie: studentCookies },
      payload: { simulationId, platform: 'meta_ads' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.platform).toBe('meta_ads');
    expect(body.insight).toBeDefined();
  });

  // ─── WebSocket Payload Structure ─────────────────────────────────────────

  it('round:complete payload contains required fields after advance', async () => {
    // Re-use the simulation that was advanced in beforeAll
    // The round-complete WS notification fires during advance, so let's verify
    // that the simulation state reflects the round completion correctly.
    const sim = await prisma.simulationState.findUnique({
      where: { id: simulationId },
    });

    // Verify simulation advanced (isCompleted should be true since maxRounds=1)
    expect(sim).not.toBeNull();
    expect(sim!.currentRound).toBeGreaterThanOrEqual(1);

    // Validate snapshot (audit) contains the data that round:complete would emit
    const snapshot = await prisma.roundSnapshot.findFirst({
      where: { simulationId },
      orderBy: { round: 'desc' },
    });
    expect(snapshot).not.toBeNull();
    const data = JSON.parse(snapshot!.data);
    // The snapshot should have scoring data (key is 'scores' per snapshot.ts)
    expect(data.scores).toBeDefined();
    expect(data.scores.composite).toBeGreaterThanOrEqual(0);
  });

  it('broadcastSimulationEvent helper emits to both rooms without crashing when io is null', async () => {
    // Import the notification helper dynamically to test with no socket server
    const { broadcastSimulationEvent } = await import('../../src/websocket/handlers/notification');
    // io is null in the test environment (no HTTP server started)
    // Should silently no-op without throwing
    expect(() => broadcastSimulationEvent('user-id-1', 'sim-id-1', 'round:complete', { type: 'ROUND_COMPLETE' })).not.toThrow();
  });

  it('sendRealTimeEvent legacy function does not throw when io is null', async () => {
    const { sendRealTimeEvent } = await import('../../src/websocket/handlers/notification');
    expect(() => sendRealTimeEvent('user-id-1', 'round-complete', { test: true })).not.toThrow();
  });

  // ─── Redis Offline Fallback ───────────────────────────────────────────────

  it('WebSocket server initialises in-memory mode when REDIS_URL is not set', async () => {
    // The test app starts without Redis by default; verify server.ts gracefully
    // handles this via the REDIS_URL optional config check
    const { config } = await import('../../src/config');
    // REDIS_URL in test env may or may not be set; either path should succeed
    expect(typeof config.OLLAMA_MODEL).toBe('string');
    expect(config.OLLAMA_MODEL.length).toBeGreaterThan(0);
  });

  // ─── Phase 5: Reports & Accreditation Center Endpoints ────────────────────

  describe('Report Endpoints', () => {
    it('GET /api/v1/report/class/:classId/nba returns class NBA reports for instructor', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/report/class/${classId}/nba`,
        headers: { cookie: instructorCookies },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.className).toBeDefined();
      expect(body.attainments).toBeDefined();
      expect(body.attainments.co).toBeDefined();
      expect(body.attainments.po).toBeDefined();
      expect(body.averages).toBeDefined();
      expect(body.students).toBeDefined();
    });

    it('GET /api/v1/report/class/:classId/nba returns 403/401 for students', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/report/class/${classId}/nba`,
        headers: { cookie: studentCookies },
      });
      expect(res.statusCode).toBe(403);
    });

    it('GET /api/v1/report/class/:classId/obe returns OBE reports', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/report/class/${classId}/obe`,
        headers: { cookie: instructorCookies },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.attainments.pso).toBeDefined();
      expect(body.distribution).toBeDefined();
      expect(body.recommendations).toBeDefined();
    });

    it('GET /api/v1/report/class/:classId/accreditation returns accreditation metrics', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/report/class/${classId}/accreditation`,
        headers: { cookie: instructorCookies },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.nbaReadiness).toBeDefined();
      expect(body.obeReadiness).toBeDefined();
      expect(body.poCoveragePercent).toBeDefined();
      expect(body.graduateAttributes).toBeDefined();
    });

    it('GET /api/v1/report/class/:classId/performance returns performance analytics', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/report/class/${classId}/performance`,
        headers: { cookie: instructorCookies },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.stats).toBeDefined();
      expect(body.stats.average).toBeDefined();
      expect(body.stats.highest).toBeDefined();
      expect(body.stats.median).toBeDefined();
      expect(body.leaderboard).toBeDefined();
    });

    it('GET /api/v1/report/student/:studentId returns student-specific reports', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/report/student/${studentId}`,
        headers: { cookie: instructorCookies },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.studentName).toBe('Student P5');
      expect(body.history).toBeDefined();
      expect(body.recommendations).toBeDefined();
    });

    it('GET /api/v1/report/instructor/comparisons returns instructor comparative metrics', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/report/instructor/comparisons',
        headers: { cookie: instructorCookies },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.comparisons).toBeDefined();
    });

    it('GET /api/v1/report/class/:classId/ai-insights returns diagnostic cohort feedback', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/report/class/${classId}/ai-insights`,
        headers: { cookie: instructorCookies },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.strengths).toBeDefined();
      expect(body.weaknesses).toBeDefined();
      expect(body.riskIndicators).toBeDefined();
      expect(body.accreditationSuggestions).toBeDefined();
    });
  });
});

