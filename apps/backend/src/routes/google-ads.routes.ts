import { FastifyInstance } from 'fastify';
import { requireAuth, AuthenticatedRequest } from '../auth/middleware';
import { prisma } from '../db/client';
import { z } from 'zod';
import { ValidationError, NotFoundError } from '../utils/errors';
import { logActivity, createNotification } from '../utils/audit';

export async function googleAdsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/google-ads/decision
   * Fetches the Google Ads campaign configs for the current round
   */
  fastify.get('/decision', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    
    const sim = await prisma.simulationState.findFirst({
      where: { userId: authReq.user!.id, classId: authReq.user!.classId! }
    });

    if (!sim) {
      throw new NotFoundError('Simulation not initialized.');
    }

    const decision = await prisma.decision.findUnique({
      where: {
        simulationId_round: {
          simulationId: sim.id,
          round: sim.currentRound
        }
      }
    });

    return reply.status(200).send({
      success: true,
      campaigns: decision ? JSON.parse(decision.googleCampaigns) : []
    });
  });

  /**
   * POST /api/v1/google-ads/decision
   * Updates/Saves Google Ads campaign configs
   */
  fastify.post('/decision', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;

    const bodySchema = z.object({
      campaigns: z.array(z.object({
        name: z.string().min(1, 'Campaign name cannot be empty'),
        budget: z.number().nonnegative('Budget must be positive'),
        keywords: z.array(z.object({
          word: z.string().min(1, 'Keyword word is required'),
          bid: z.number().positive('Bid must be greater than zero')
        })).min(1, 'Campaign must target at least one keyword')
      }))
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const sim = await prisma.simulationState.findFirst({
      where: { userId: authReq.user!.id, classId: authReq.user!.classId! }
    });

    if (!sim) {
      throw new NotFoundError('Simulation not initialized.');
    }

    const decision = await prisma.decision.upsert({
      where: {
        simulationId_round: {
          simulationId: sim.id,
          round: sim.currentRound
        }
      },
      update: {
        googleCampaigns: JSON.stringify(parsed.data.campaigns)
      },
      create: {
        simulationId: sim.id,
        round: sim.currentRound,
        googleCampaigns: JSON.stringify(parsed.data.campaigns),
        seoTargetKeywords: JSON.stringify([]),
        seoContentQuality: 5.0,
        seoBacklinkBudget: 0.0,
        metaCampaigns: JSON.stringify([])
      }
    });

    // Write audit log with "fees of operation" (Google Ads budgets spent)
    const totalGoogleBudget = parsed.data.campaigns.reduce((acc, c) => acc + c.budget, 0);
    await logActivity(
      authReq.user!.id,
      'GOOGLE_ADS_DECISION_SUBMIT',
      `Submitted Google Ads choices for Round ${sim.currentRound}. Created ${parsed.data.campaigns.length} campaigns. Total Google Ads Budget Spent: $${totalGoogleBudget}.`
    );

    // Notify instructor
    const targetClass = await prisma.class.findUnique({
      where: { id: sim.classId },
      select: { instructorId: true }
    });
    if (targetClass?.instructorId) {
      await createNotification(
        targetClass.instructorId,
        'info',
        'Google Ads Campaign Updated',
        `${authReq.user!.name} updated Google Ads campaigns. Total budget spent: $${totalGoogleBudget}.`,
        authReq.user!.name,
        '/instructor'
      );
    }

    return reply.status(200).send({
      success: true,
      campaigns: JSON.parse(decision.googleCampaigns)
    });
  });
}

