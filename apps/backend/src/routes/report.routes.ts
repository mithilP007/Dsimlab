import { FastifyInstance } from 'fastify';
import { requireRole, AuthenticatedRequest } from '../auth/middleware';
import { UserRole } from '../auth/roles';
import { prisma } from '../db/client';
import { z } from 'zod';
import { aggregateSimulationReport } from '../services/report/aggregator';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';
import { limitsService } from '../services/billing/limits.service';
import { logActivity } from '../utils/audit';
import { cacheService } from '../utils/caching';

export async function reportRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/report/class/:classId
   * Generates a cohort-wide aggregation report for class instructors
   */
  fastify.get('/class/:classId', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;

    const paramsSchema = z.object({
      classId: z.string().uuid('Invalid Class UUID format')
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    // Verify instructor ownership of classroom
    const targetClass = await prisma.class.findFirst({
      where: {
        id: parsedParams.data.classId,
        instructorId: authReq.user!.id
      }
    });

    if (!targetClass) {
      throw new NotFoundError('Class cohort not found or unauthorized.');
    }

    const studentSimulations = await prisma.simulationState.findMany({
      where: { classId: parsedParams.data.classId },
      include: { user: true }
    });

    const reportRows = await Promise.all(
      studentSimulations.map(async sim => {
        const stats = await aggregateSimulationReport(sim.id);
        return {
          studentId: sim.user.id,
          studentName: sim.user.name,
          studentEmail: sim.user.email,
          currentRound: sim.currentRound,
          isCompleted: sim.isCompleted,
          totalRevenue: stats.totals.revenue,
          totalSpend: stats.totals.spend,
          googleAdsSpend: stats.totals.googleCost,
          metaAdsSpend: stats.totals.metaCost,
          averageCompositeScore: stats.averages.roundCompositeIndex,
          averagePercentileRank: stats.averages.roundPercentileRank,
        };
      })
    );

    return reply.status(200).send({
      success: true,
      className: targetClass.name,
      report: reportRows
    });
  });

  /**
   * GET /api/v1/report/certificate-summary
   * Returns a summary report of all certificates earned by the current student.
   */
  fastify.get('/certificate-summary', { preHandler: [requireRole([UserRole.STUDENT_COLLEGE, UserRole.INDIVIDUAL, UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const certs = await prisma.certificate.findMany({
      where: { userId: authReq.user!.id },
      orderBy: { issueDate: 'desc' }
    });

    return reply.status(200).send({
      success: true,
      report: certs.map(c => ({
        verificationId: c.verificationId,
        band: c.band,
        issueDate: c.issueDate,
        compositeScore: c.compositeScore,
        pdfUrl: c.pdfUrl
      }))
    });
  });

  /**
   * GET /api/v1/report/verification-report/:verificationId
   * Returns validation stats for a specific certificate verification ID.
   */
  fastify.get('/verification-report/:verificationId', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const { verificationId } = request.params as { verificationId: string };
    const cert = await prisma.certificate.findUnique({
      where: { verificationId },
      include: { simulation: { include: { user: true } } }
    });

    if (!cert) {
      throw new NotFoundError('Certificate not found.');
    }

    const verificationLogs = await prisma.auditLog.findMany({
      where: {
        userId: cert.userId,
        action: 'CERTIFICATE_VERIFICATION'
      },
      orderBy: { createdAt: 'desc' }
    });

    return reply.status(200).send({
      success: true,
      verificationId,
      recipientName: cert.recipientName,
      band: cert.band,
      issueDate: cert.issueDate,
      totalVerifications: verificationLogs.length,
      verificationHistory: verificationLogs.map(log => ({
        timestamp: log.createdAt,
        ipAddress: log.ipAddress || 'unknown',
        details: log.details
      }))
    });
  });

  /**
   * GET /api/v1/report/student-credentials
   * Returns credentials history, milestones and skill growths for the student dashboard.
   */
  fastify.get('/student-credentials', { preHandler: [requireRole([UserRole.STUDENT_COLLEGE, UserRole.INDIVIDUAL, UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    
    const certs = await prisma.certificate.findMany({
      where: { userId: authReq.user!.id },
      orderBy: { issueDate: 'desc' }
    });

    const timeline = certs.map(c => {
      let skillsArray: string[] = [];
      try {
        skillsArray = JSON.parse(c.skills);
      } catch {
        skillsArray = [];
      }

      return {
        type: 'CERTIFICATE_EARNED',
        title: `${c.band} Level Certificate Issued`,
        date: c.issueDate,
        score: c.compositeScore,
        skills: skillsArray
      };
    });

    // Add milestones from notifications
    const notices = await prisma.notification.findMany({
      where: { userId: authReq.user!.id, type: 'achievement' },
      orderBy: { createdAt: 'desc' }
    });

    notices.forEach(n => {
      timeline.push({
        type: 'MILESTONE_UNLOCKED',
        title: n.title,
        date: n.createdAt,
        score: 0,
        skills: []
      });
    });

    // Sort timeline chronologically
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return reply.status(200).send({
      success: true,
      totalCertifications: certs.length,
      timeline
    });
  });

  /**
   * GET /api/v1/report/class/:classId/credentials
   * Returns classroom-wide credentials timeline and success summaries (Instructor view)
   */
  fastify.get('/class/:classId/credentials', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { classId } = request.params as { classId: string };

    const targetClass = await prisma.class.findFirst({
      where: { id: classId, instructorId: authReq.user!.id }
    });

    if (!targetClass) {
      throw new NotFoundError('Class not found or unauthorized.');
    }

    const certs = await prisma.certificate.findMany({
      where: { simulation: { classId } },
      include: { simulation: { include: { user: true } } },
      orderBy: { issueDate: 'desc' }
    });

    return reply.status(200).send({
      success: true,
      className: targetClass.name,
      report: certs.map(c => ({
        studentName: c.recipientName,
        studentEmail: c.simulation.user.email,
        verificationId: c.verificationId,
        band: c.band,
        issueDate: c.issueDate,
        compositeScore: c.compositeScore
      }))
    });
  });

  /**
   * GET /api/v1/report/analytics/certifications
   * Admin analytics module providing total certificates, verification requests, distributions and trends.
   */
  fastify.get('/analytics/certifications', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (_request, reply) => {
    // Total certificates
    const totalIssued = await prisma.certificate.count();

    // Verification requests (from audit logs)
    const verificationRequests = await prisma.auditLog.count({
      where: { action: 'CERTIFICATE_VERIFICATION' }
    });

    // Most common level
    const certs = await prisma.certificate.findMany({
      select: { band: true, issueDate: true }
    });

    const levelCounts: Record<string, number> = {};
    certs.forEach(c => {
      const b = c.band.toUpperCase();
      levelCounts[b] = (levelCounts[b] || 0) + 1;
    });

    let mostCommonLevel = 'None';
    let maxCount = 0;
    Object.entries(levelCounts).forEach(([lvl, cnt]) => {
      if (cnt > maxCount) {
        maxCount = cnt;
        mostCommonLevel = lvl;
      }
    });

    // Institution-wise Distribution
    const certsWithUsers = await prisma.certificate.findMany({
      include: { simulation: { include: { user: true } } }
    });

    const institutionCounts: Record<string, number> = {};
    certsWithUsers.forEach(c => {
      const inst = c.simulation.user.institution || 'Individual Sandbox';
      institutionCounts[inst] = (institutionCounts[inst] || 0) + 1;
    });

    // Growth Trends (last 6 months)
    const growthTrends: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      growthTrends[key] = 0;
    }

    certs.forEach(c => {
      const date = new Date(c.issueDate);
      const key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      if (growthTrends[key] !== undefined) {
        growthTrends[key]++;
      }
    });

    return reply.status(200).send({
      success: true,
      totalIssued,
      verificationRequests,
      mostCommonLevel,
      institutionDistribution: Object.entries(institutionCounts).map(([name, count]) => ({ name, count })),
      growthTrends: Object.entries(growthTrends).map(([month, count]) => ({ month, count }))
    });
  });

  /**
   * GET /api/v1/report/class/:classId/nba
   * Generates NBA Reports: Course Outcome average scores, outcome attainment rates, PO mappings.
   */
  fastify.get('/class/:classId/nba', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { classId } = request.params as { classId: string };

    const targetClass = await prisma.class.findFirst({
      where: { id: classId, instructorId: authReq.user!.id }
    });
    if (!targetClass) throw new NotFoundError('Class cohort not found or unauthorized.');

    const cacheKey = `cache:report:nba:${classId}`;
    const cached = await cacheService.get<any>(cacheKey);
    if (cached) {
      return reply.status(200).send(cached);
    }

    await limitsService.checkExportLimit(authReq.user!.id);

    const students = await prisma.user.findMany({
      where: { classId, role: UserRole.STUDENT_COLLEGE },
      include: {
        simulations: {
          include: {
            scoreBreakdowns: { orderBy: { round: 'desc' }, take: 1 }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const reportRows = students.map(s => {
      const sim = s.simulations[0];
      const latestBreakdown = sim?.scoreBreakdowns[0];
      return {
        studentId: s.id,
        studentName: s.name,
        studentEmail: s.email,
        co1: latestBreakdown?.seoScore || 0,
        co2: latestBreakdown?.googleAdsScore || 0,
        co3: latestBreakdown?.metaAdsScore || 0,
        co4: latestBreakdown?.efficiencyRoi || latestBreakdown?.budgetScore || 0,
        co5: latestBreakdown?.strategicConsistency || latestBreakdown?.revenueScore || 0
      };
    });

    const totalStudents = reportRows.length;
    const calculateAttainment = (scores: number[]) => {
      if (totalStudents === 0) return 0;
      const attainedCount = scores.filter(score => score >= 70).length;
      return parseFloat(((attainedCount / totalStudents) * 100).toFixed(1));
    };

    const calculateAverage = (scores: number[]) => {
      if (totalStudents === 0) return 0;
      const sum = scores.reduce((a, b) => a + b, 0);
      return parseFloat((sum / totalStudents).toFixed(1));
    };

    const co1Scores = reportRows.map(r => r.co1);
    const co2Scores = reportRows.map(r => r.co2);
    const co3Scores = reportRows.map(r => r.co3);
    const co4Scores = reportRows.map(r => r.co4);
    const co5Scores = reportRows.map(r => r.co5);

    const co1Attainment = calculateAttainment(co1Scores);
    const co2Attainment = calculateAttainment(co2Scores);
    const co3Attainment = calculateAttainment(co3Scores);
    const co4Attainment = calculateAttainment(co4Scores);
    const co5Attainment = calculateAttainment(co5Scores);

    const co1Average = calculateAverage(co1Scores);
    const co2Average = calculateAverage(co2Scores);
    const co3Average = calculateAverage(co3Scores);
    const co4Average = calculateAverage(co4Scores);
    const co5Average = calculateAverage(co5Scores);

    // Mappings PO1-PO7
    const po1Attainment = parseFloat(((co1Attainment + co2Attainment + co3Attainment) / 3).toFixed(1));
    const po2Attainment = co5Attainment;
    const po3Attainment = parseFloat(((co1Attainment + co2Attainment + co3Attainment) / 3).toFixed(1));
    const po4Attainment = co5Attainment;
    const po5Attainment = parseFloat(((co1Attainment + co2Attainment + co3Attainment) / 3).toFixed(1));
    const po6Attainment = co4Attainment;
    const po7Attainment = co4Attainment;

    const responsePayload = {
      success: true,
      className: targetClass.name,
      totalStudents,
      attainments: {
        co: { co1: co1Attainment, co2: co2Attainment, co3: co3Attainment, co4: co4Attainment, co5: co5Attainment },
        po: { po1: po1Attainment, po2: po2Attainment, po3: po3Attainment, po4: po4Attainment, po5: po5Attainment, po6: po6Attainment, po7: po7Attainment }
      },
      averages: {
        co: { co1: co1Average, co2: co2Average, co3: co3Average, co4: co4Average, co5: co5Average }
      },
      students: reportRows
    };

    await cacheService.set(cacheKey, responsePayload, 600); // 10 mins

    return reply.status(200).send(responsePayload);
  });

  /**
   * GET /api/v1/report/class/:classId/obe
   * Generates OBE attainment report: CO/PO/PSO achievements, assessment distributions, gap analysis.
   */
  fastify.get('/class/:classId/obe', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { classId } = request.params as { classId: string };

    const targetClass = await prisma.class.findFirst({
      where: { id: classId, instructorId: authReq.user!.id }
    });
    if (!targetClass) throw new NotFoundError('Class cohort not found or unauthorized.');

    const cacheKey = `cache:report:obe:${classId}`;
    const cached = await cacheService.get<any>(cacheKey);
    if (cached) {
      return reply.status(200).send(cached);
    }

    const students = await prisma.user.findMany({
      where: { classId, role: UserRole.STUDENT_COLLEGE },
      include: {
        simulations: {
          include: {
            scoreBreakdowns: { orderBy: { round: 'desc' }, take: 1 }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const reportRows = students.map(s => {
      const sim = s.simulations[0];
      const latestBreakdown = sim?.scoreBreakdowns[0];
      return {
        co1: latestBreakdown?.seoScore || 0,
        co2: latestBreakdown?.googleAdsScore || 0,
        co3: latestBreakdown?.metaAdsScore || 0,
        co4: latestBreakdown?.efficiencyRoi || latestBreakdown?.budgetScore || 0,
        co5: latestBreakdown?.strategicConsistency || latestBreakdown?.revenueScore || 0
      };
    });

    const totalStudents = reportRows.length;
    const calculateAttainment = (scores: number[]) => {
      if (totalStudents === 0) return 0;
      const attainedCount = scores.filter(score => score >= 70).length;
      return parseFloat(((attainedCount / totalStudents) * 100).toFixed(1));
    };

    const co1Attainment = calculateAttainment(reportRows.map(r => r.co1));
    const co2Attainment = calculateAttainment(reportRows.map(r => r.co2));
    const co3Attainment = calculateAttainment(reportRows.map(r => r.co3));
    const co4Attainment = calculateAttainment(reportRows.map(r => r.co4));
    const co5Attainment = calculateAttainment(reportRows.map(r => r.co5));

    const po1Attainment = parseFloat(((co1Attainment + co2Attainment + co3Attainment) / 3).toFixed(1));
    const po2Attainment = co5Attainment;
    const po3Attainment = parseFloat(((co1Attainment + co2Attainment + co3Attainment) / 3).toFixed(1));
    const po4Attainment = co5Attainment;
    const po5Attainment = parseFloat(((co1Attainment + co2Attainment + co3Attainment) / 3).toFixed(1));
    const po6Attainment = co4Attainment;
    const po7Attainment = co4Attainment;

    const pso1Attainment = parseFloat(((co1Attainment + co2Attainment + co3Attainment) / 3).toFixed(1));
    const pso2Attainment = co4Attainment;

    const distribution = {
      excellent: 0,
      veryGood: 0,
      good: 0,
      satisfactory: 0,
      unsatisfactory: 0
    };

    students.forEach(s => {
      const sim = s.simulations[0];
      const score = sim?.scoreBreakdowns[0]?.compositeIndex || 0;
      if (score >= 90) distribution.excellent++;
      else if (score >= 80) distribution.veryGood++;
      else if (score >= 70) distribution.good++;
      else if (score >= 50) distribution.satisfactory++;
      else distribution.unsatisfactory++;
    });

    const recommendations: string[] = [];
    if (co1Attainment < 75) recommendations.push("Recommend supplementary lectures on organic search engine crawlability and keyword density strategies.");
    if (co2Attainment < 75) recommendations.push("Recommend targeted sandbox sessions on Google PPC keyword matching, CPC bidding ceilings, and conversion funnels.");
    if (co3Attainment < 75) recommendations.push("Recommend classroom case analysis of Meta Paid Social ad placements, ad-fatigue scaling, and target demographic optimization.");
    if (co4Attainment < 75) recommendations.push("Recommend budget discipline exercises focusing on pacing controls and ROI optimization multipliers.");
    if (co5Attainment < 75) recommendations.push("Recommend injecting random market shock event scenarios to prepare students for algorithmic updates and competitive price volatility.");
    if (recommendations.length === 0) recommendations.push("Accreditation readiness is high. Suggest continuing with the current curriculum pace.");

    await logActivity(
      authReq.user!.id,
      'EXPORT_REPORT',
      `Exported NBA Outcome Mapping Report for class cohort: ${targetClass.name}`
    );

    const responsePayload = {
      success: true,
      className: targetClass.name,
      attainments: {
        co: { co1: co1Attainment, co2: co2Attainment, co3: co3Attainment, co4: co4Attainment, co5: co5Attainment },
        po: { po1: po1Attainment, po2: po2Attainment, po3: po3Attainment, po4: po4Attainment, po5: po5Attainment, po6: po6Attainment, po7: po7Attainment },
        pso: { pso1: pso1Attainment, pso2: pso2Attainment }
      },
      distribution,
      recommendations
    };

    await cacheService.set(cacheKey, responsePayload, 600); // 10 mins

    return reply.status(200).send(responsePayload);
  });

  /**
   * GET /api/v1/report/class/:classId/accreditation
   * Generates NBA & OBE Readiness indices, Graduate Attribute maps, and overall coverage reports.
   */
  fastify.get('/class/:classId/accreditation', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { classId } = request.params as { classId: string };

    const targetClass = await prisma.class.findFirst({
      where: { id: classId, instructorId: authReq.user!.id }
    });
    if (!targetClass) throw new NotFoundError('Class cohort not found or unauthorized.');

    await limitsService.checkExportLimit(authReq.user!.id);

    const students = await prisma.user.findMany({
      where: { classId, role: UserRole.STUDENT_COLLEGE },
      include: {
        simulations: {
          include: {
            scoreBreakdowns: { orderBy: { round: 'desc' }, take: 1 }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const reportRows = students.map(s => {
      const sim = s.simulations[0];
      const latestBreakdown = sim?.scoreBreakdowns[0];
      return {
        co1: latestBreakdown?.seoScore || 0,
        co2: latestBreakdown?.googleAdsScore || 0,
        co3: latestBreakdown?.metaAdsScore || 0,
        co4: latestBreakdown?.efficiencyRoi || latestBreakdown?.budgetScore || 0,
        co5: latestBreakdown?.strategicConsistency || latestBreakdown?.revenueScore || 0
      };
    });

    const totalStudents = reportRows.length;
    const calculateAttainment = (scores: number[]) => {
      if (totalStudents === 0) return 0;
      const attainedCount = scores.filter(score => score >= 70).length;
      return parseFloat(((attainedCount / totalStudents) * 100).toFixed(1));
    };

    const co1Attainment = calculateAttainment(reportRows.map(r => r.co1));
    const co2Attainment = calculateAttainment(reportRows.map(r => r.co2));
    const co3Attainment = calculateAttainment(reportRows.map(r => r.co3));
    const co4Attainment = calculateAttainment(reportRows.map(r => r.co4));
    const co5Attainment = calculateAttainment(reportRows.map(r => r.co5));

    const po1Attainment = parseFloat(((co1Attainment + co2Attainment + co3Attainment) / 3).toFixed(1));
    const po2Attainment = co5Attainment;
    const po3Attainment = parseFloat(((co1Attainment + co2Attainment + co3Attainment) / 3).toFixed(1));
    const po4Attainment = co5Attainment;
    const po5Attainment = parseFloat(((co1Attainment + co2Attainment + co3Attainment) / 3).toFixed(1));
    const po6Attainment = co4Attainment;
    const po7Attainment = co4Attainment;

    const nbaReadiness = parseFloat(((po1Attainment + po2Attainment + po3Attainment + po4Attainment + po5Attainment + po6Attainment + po7Attainment) / 7).toFixed(1));
    const obeReadiness = parseFloat(((co1Attainment + co2Attainment + co3Attainment + co4Attainment + co5Attainment) / 5).toFixed(1));
    
    const pos = [po1Attainment, po2Attainment, po3Attainment, po4Attainment, po5Attainment, po6Attainment, po7Attainment];
    const coveredPOs = pos.filter(po => po >= 70).length;
    const poCoveragePercent = parseFloat(((coveredPOs / 7) * 100).toFixed(1));

    const instructor = await prisma.user.findUnique({ where: { id: targetClass.instructorId } });

    await logActivity(
      authReq.user!.id,
      'EXPORT_REPORT',
      `Exported OBE accreditation report for class cohort: ${targetClass.name}`
    );

    return reply.status(200).send({
      success: true,
      className: targetClass.name,
      nbaReadiness,
      obeReadiness,
      poCoveragePercent,
      graduateAttributes: {
        engineeringKnowledge: po1Attainment,
        problemAnalysis: po2Attainment,
        solutionDesign: po3Attainment,
        investigations: po4Attainment,
        modernToolUsage: po5Attainment,
        individualTeamWork: po6Attainment,
        communicationEthics: po7Attainment
      },
      institution: instructor?.institution || 'SimLab Academy'
    });
  });

  /**
   * GET /api/v1/report/class/:classId/performance
   * Generates class-wide statistics: pass rates, median scores, highest/lowest scores, and registry listings.
   */
  fastify.get('/class/:classId/performance', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { classId } = request.params as { classId: string };

    const targetClass = await prisma.class.findFirst({
      where: { id: classId, instructorId: authReq.user!.id }
    });
    if (!targetClass) throw new NotFoundError('Class cohort not found or unauthorized.');

    const students = await prisma.user.findMany({
      where: { classId, role: UserRole.STUDENT_COLLEGE },
      include: {
        simulations: {
          include: {
            scoreBreakdowns: { orderBy: { round: 'desc' }, take: 1 }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const scores = students
      .map(s => s.simulations[0]?.scoreBreakdowns[0]?.compositeIndex || 0)
      .sort((a, b) => a - b);

    const avgScore = scores.length > 0 ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : 0;
    const highestScore = scores.length > 0 ? scores[scores.length - 1] : 0;
    const lowestScore = scores.length > 0 ? scores[0] : 0;

    let medianScore = 0;
    if (scores.length > 0) {
      const mid = Math.floor(scores.length / 2);
      medianScore = scores.length % 2 !== 0 ? scores[mid] : parseFloat(((scores[mid - 1] + scores[mid]) / 2).toFixed(1));
    }

    const passCount = scores.filter(s => s >= 50).length;
    const passRate = scores.length > 0 ? parseFloat(((passCount / scores.length) * 100).toFixed(1)) : 0;

    const certsCount = await prisma.certificate.count({
      where: { simulation: { classId } }
    });
    const certificationRate = students.length > 0 ? parseFloat(((certsCount / students.length) * 100).toFixed(1)) : 0;

    const leaderboard = students
      .map(s => ({
        id: s.id,
        name: s.name,
        score: s.simulations[0]?.scoreBreakdowns[0]?.compositeIndex || 0
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return reply.status(200).send({
      success: true,
      className: targetClass.name,
      stats: {
        average: avgScore,
        highest: highestScore,
        lowest: lowestScore,
        median: medianScore,
        passRate,
        certificationRate
      },
      leaderboard
    });
  });

  /**
   * GET /api/v1/report/student/:studentId
   * Generates student individual performance outcome report: traffic curves, achievements, recommendations.
   */
  fastify.get('/student/:studentId', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const { studentId } = request.params as { studentId: string };

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        simulations: {
          include: {
            scoreBreakdowns: { orderBy: { round: 'asc' } },
            metrics: { orderBy: { round: 'asc' } }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!student) throw new NotFoundError('Student not found.');

    const activeSim = student.simulations[0];
    const breakdowns = activeSim?.scoreBreakdowns || [];
    const dailyMetrics = activeSim?.metrics || [];

    const roundMetrics = breakdowns.map(b => {
      const roundData = dailyMetrics.filter(m => m.round === b.round);
      const totalClicks = roundData.reduce((sum, m) => sum + m.organicClicks + m.googleClicks + m.metaClicks, 0);
      const totalRevenue = roundData.reduce((sum, m) => sum + m.revenue, 0);
      return {
        round: b.round,
        seoScore: b.seoScore,
        googleAdsScore: b.googleAdsScore,
        metaAdsScore: b.metaAdsScore,
        compositeScore: b.compositeIndex,
        clicks: totalClicks,
        revenue: totalRevenue
      };
    });

    const cert = await prisma.certificate.findFirst({
      where: { userId: student.id }
    });

    const notices = await prisma.notification.findMany({
      where: { userId: student.id, type: 'achievement' }
    });
    const achievements = notices.map(n => n.title.replace('Achievement Unlocked: ', ''));

    const checkpoints = activeSim ? await prisma.checkpointValidation.findMany({
      where: { simulationId: activeSim.id },
      orderBy: { roundNumber: 'asc' }
    }) : [];

    const recommendations: string[] = [];
    const latestBreakdown = breakdowns[breakdowns.length - 1];
    if (latestBreakdown) {
      if (latestBreakdown.seoScore < 75) recommendations.push("Focus on increasing SEO keyword density and matching high-volume search queries.");
      if (latestBreakdown.googleAdsScore < 75) recommendations.push("Optimize your Google PPC campaigns: remove low CTR words and review max budget ceilings.");
      if (latestBreakdown.metaAdsScore < 75) recommendations.push("Improve Meta social campaigns: test different target demographic options and adjust creative bidding.");
      if (latestBreakdown.efficiencyRoi < 75) recommendations.push("Reduce cost per conversion (CPC/CPA) by targeting high-converting keywords to scale return on ad spend (ROAS).");
    }
    if (recommendations.length === 0) recommendations.push("Outstanding performance! Continue monitoring weekly conversion splits to maintain alignment.");

    return reply.status(200).send({
      success: true,
      studentName: student.name,
      studentEmail: student.email,
      roundsCount: breakdowns.length,
      history: roundMetrics,
      certificate: cert ? { band: cert.band, issueDate: cert.issueDate, verificationId: cert.verificationId } : null,
      achievements,
      recommendations,
      checkpoints
    });
  });

  /**
   * GET /api/v1/report/instructor/comparisons
   * Generates comparisons of managed classes across scenarios, semesters, and industries.
   */
  fastify.get('/instructor/comparisons', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;

    const classes = await prisma.class.findMany({
      where: { instructorId: authReq.user!.id },
      include: {
        scenario: true,
        students: {
          include: {
            simulations: {
              include: {
                scoreBreakdowns: { orderBy: { round: 'desc' }, take: 1 }
              },
              take: 1
            }
          }
        }
      }
    });

    const comparisons = classes.map(c => {
      const studentScores = c.students.map(s => s.simulations[0]?.scoreBreakdowns[0]?.compositeIndex || 0);
      const avgScore = studentScores.length > 0 ? parseFloat((studentScores.reduce((a, b) => a + b, 0) / studentScores.length).toFixed(1)) : 0;
      
      const completionsCount = c.students.filter(s => s.simulations[0]?.isCompleted).length;
      const completionRate = c.students.length > 0 ? parseFloat(((completionsCount / c.students.length) * 100).toFixed(1)) : 0;

      return {
        classId: c.id,
        className: c.name,
        scenario: c.scenario.name,
        industry: c.scenario.industry,
        semester: c.createdAt.toLocaleString('default', { month: 'short', year: 'numeric' }),
        studentsCount: c.students.length,
        averageScore: avgScore,
        completionRate
      };
    });

    return reply.status(200).send({
      success: true,
      comparisons
    });
  });

  /**
   * GET /api/v1/report/class/:classId/ai-insights
   * Performs dynamic strengths and weaknesses analysis on classroom scores.
   */
  fastify.get('/class/:classId/ai-insights', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { classId } = request.params as { classId: string };

    const targetClass = await prisma.class.findFirst({
      where: { id: classId, instructorId: authReq.user!.id }
    });
    if (!targetClass) throw new NotFoundError('Class cohort not found or unauthorized.');

    const students = await prisma.user.findMany({
      where: { classId, role: UserRole.STUDENT_COLLEGE },
      include: {
        simulations: {
          include: {
            scoreBreakdowns: { orderBy: { round: 'desc' }, take: 1 }
          },
          take: 1
        }
      }
    });

    const scores = students.map(s => s.simulations[0]?.scoreBreakdowns[0]);
    const validScores = scores.filter((b): b is Exclude<typeof b, undefined> => !!b);
    
    let seoAvg = 0, googleAvg = 0, metaAvg = 0, roiAvg = 0, consistencyAvg = 0;
    if (validScores.length > 0) {
      seoAvg = validScores.reduce((sum, b) => sum + b.seoScore, 0) / validScores.length;
      googleAvg = validScores.reduce((sum, b) => sum + b.googleAdsScore, 0) / validScores.length;
      metaAvg = validScores.reduce((sum, b) => sum + b.metaAdsScore, 0) / validScores.length;
      roiAvg = validScores.reduce((sum, b) => sum + (b.efficiencyRoi || b.budgetScore || 0), 0) / validScores.length;
      consistencyAvg = validScores.reduce((sum, b) => sum + (b.strategicConsistency || 0), 0) / validScores.length;
    }

    const categories = [
      { name: 'SEO Strategy', avg: seoAvg, weakMsg: 'Organic search query targeting and content crawlability quality scores represent a major bottleneck.' },
      { name: 'Google Ads Bidding', avg: googleAvg, weakMsg: 'Google PPC campaign bidding strategies, negative keyword exclusions, and click-through scaling show gaps.' },
      { name: 'Meta Social Campaigns', avg: metaAvg, weakMsg: 'Meta Paid Social ad placements, target interest groups selection, and media creative fatigue need adjustments.' },
      { name: 'Budget Pacing & ROI', avg: roiAvg, weakMsg: 'Cost per conversion controls and overall return on ad spend (ROAS) efficiency require scaling.' },
      { name: 'Strategic Consistency', avg: consistencyAvg, weakMsg: 'Pacing consistency and adaptability under volatile market events are low.' }
    ];

    const sorted = [...categories].sort((a, b) => b.avg - a.avg);
    const strengths = sorted.slice(0, 2).map(c => `Class excels in ${c.name} (average score: ${c.avg.toFixed(1)}%). Students are successfully designing aligned plans.`);
    const weaknesses = sorted.slice(-2).reverse().map(c => `${c.name} represents a major gap (average score: ${c.avg.toFixed(1)}%). ${c.weakMsg}`);

    const atRiskStudents = students
      .filter(s => (s.simulations[0]?.scoreBreakdowns[0]?.compositeIndex || 0) < 60)
      .map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        score: s.simulations[0]?.scoreBreakdowns[0]?.compositeIndex || 0
      }));

    return reply.status(200).send({
      success: true,
      strengths,
      weaknesses,
      atRiskCount: atRiskStudents.length,
      riskIndicators: atRiskStudents,
      accreditationSuggestions: weaknesses.map(w => `Integrate a dedicated review lecture or diagnostic homework targeting ${w.split(' represents')[0]} parameters.`),
      instructorRecommendations: [
        "Schedule synchronous practice round clinics to let students test campaign variables safely.",
        "Highlight CAC/CPA metrics in class reviews to emphasize budget discipline."
      ]
    });
  });

  /**
   * GET /api/v1/report/class/:classId/grades/export
   * Exports student grades as a CSV sheet.
   */
  fastify.get('/class/:classId/grades/export', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { classId } = request.params as { classId: string };

    const targetClass = await prisma.class.findFirst({
      where: { id: classId, instructorId: authReq.user!.id }
    });
    if (!targetClass) throw new NotFoundError('Class cohort not found or unauthorized.');

    const students = await prisma.user.findMany({
      where: { classId, role: UserRole.STUDENT_COLLEGE },
      include: {
        simulations: {
          include: {
            scoreBreakdowns: { orderBy: { round: 'desc' }, take: 1 },
            certificates: true
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const csvHeaders = [
      'Student Name',
      'Email',
      'Current Round',
      'Simulation Completed',
      'Composite Score',
      'Strategic Alignment',
      'ROI Efficiency',
      'Budget Discipline',
      'Risk Management',
      'Adaptability Score',
      'Certificate Band'
    ].join(',');

    const csvRows = students.map(s => {
      const sim = s.simulations[0];
      const score = sim?.scoreBreakdowns[0];
      const cert = sim?.certificates[0];
      
      return [
        `"${s.name.replace(/"/g, '""')}"`,
        `"${s.email.replace(/"/g, '""')}"`,
        sim ? sim.currentRound : 1,
        sim ? (sim.isCompleted ? 'Yes' : 'No') : 'No',
        score ? score.compositeIndex.toFixed(1) : '0.0',
        score ? score.strategicAlignment.toFixed(1) : '0.0',
        score ? score.efficiencyRoi.toFixed(1) : '0.0',
        score ? score.budgetDiscipline.toFixed(1) : '0.0',
        score ? score.riskManagement.toFixed(1) : '0.0',
        score ? score.adaptability.toFixed(1) : '0.0',
        cert ? cert.band : 'None'
      ].join(',');
    });

    const csvData = [csvHeaders, ...csvRows].join('\n');

    await logActivity(
      authReq.user!.id,
      'EXPORT_GRADES',
      `Exported CSV grades spreadsheet for class cohort: ${targetClass.name}`
    );

    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', `attachment; filename=grades_export_${classId}.csv`)
      .status(200)
      .send(csvData);
  });

  /**
   * GET /api/v1/report/class/:classId/faculty-evaluation
   * Generates a faculty evaluation analysis and outcome assessment report.
   */
  fastify.get('/class/:classId/faculty-evaluation', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { classId } = request.params as { classId: string };

    const targetClass = await prisma.class.findFirst({
      where: { id: classId, instructorId: authReq.user!.id }
    });
    if (!targetClass) throw new NotFoundError('Class cohort not found or unauthorized.');

    const students = await prisma.user.findMany({
      where: { classId, role: UserRole.STUDENT_COLLEGE },
      include: {
        simulations: {
          include: {
            scoreBreakdowns: { orderBy: { round: 'desc' }, take: 1 }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const scores = students
      .map(s => s.simulations[0]?.scoreBreakdowns[0]?.compositeIndex || 0)
      .filter(Boolean);

    const averageScore = scores.length > 0 ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const completionRate = students.length > 0
      ? parseFloat(((students.filter(s => s.simulations[0]?.isCompleted).length / students.length) * 100).toFixed(1))
      : 0;

    let teachingPerformanceRating = 'Satisfactory';
    if (averageScore >= 80) teachingPerformanceRating = 'Excellent';
    else if (averageScore >= 70) teachingPerformanceRating = 'Very Good';
    else if (averageScore >= 60) teachingPerformanceRating = 'Good';

    const selfReflectionSummary = `This faculty evaluation analysis reviews educational outcomes for the course cohort "${targetClass.name}". A total of ${students.length} students enrolled in the simulation workspace, achieving a class average composite index of ${averageScore}%. The highest student score was ${highestScore}%, with an overall simulation completion rate of ${completionRate}%. Based on outcome metrics, the educational performance rating for this session is assessed as "${teachingPerformanceRating}".`;

    return reply.status(200).send({
      success: true,
      className: targetClass.name,
      evaluation: {
        totalEnrolled: students.length,
        averageScore,
        highestScore,
        completionRate,
        teachingPerformanceRating,
        selfReflectionSummary,
        accreditationStandard: "OBE Criteria III (Accreditation Outcome Alignment)",
        recommendingAction: averageScore < 70 
          ? "Recommend scheduling one-on-one review clinics and increasing baseline walkthrough time." 
          : "Curriculum pacing is highly aligned. Suggest adding intermediate-level scenarios for next term."
      }
    });
  });
}
