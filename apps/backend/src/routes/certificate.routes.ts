import { FastifyInstance } from 'fastify';
import { requireAuth, AuthenticatedRequest } from '../auth/middleware';
import { prisma } from '../db/client';
import { z } from 'zod';
import { checkCertificateEligibility } from '../services/certificate/eligibility';
import { generateVerificationHash, verifyCertificateHash } from '../services/certificate/verifier';
import { generateCertificatePDF } from '../services/certificate/generator';
import { ValidationError, NotFoundError } from '../utils/errors';
import { validateStateTransition, SimulationStatus } from '../services/simulation/state-machine';

export async function certificateRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/certificate/eligibility
   * Checks whether the current student qualifies for a simulator pass certificate
   */
  fastify.get('/eligibility', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    
    const sim = await prisma.simulationState.findFirst({
      where: { userId: authReq.user!.id, classId: authReq.user!.classId! }
    });

    if (!sim) {
      throw new NotFoundError('No active simulation state initialized.');
    }

    const check = await checkCertificateEligibility(sim.id);
    return reply.status(200).send({
      success: true,
      ...check,
    });
  });

  /**
   * POST /api/v1/certificate/generate
   * Creates a signed certificate entry in the database
   */
  fastify.post('/generate', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    
    const sim = await prisma.simulationState.findFirst({
      where: { userId: authReq.user!.id, classId: authReq.user!.classId! }
    });

    if (!sim) {
      throw new NotFoundError('Simulation state not found.');
    }

    // Double check eligibility parameters
    const check = await checkCertificateEligibility(sim.id);
    if (!check.eligible) {
      throw new ValidationError(`Not eligible for certificate. Reasons: ${check.reasons.join(', ')}`);
    }

    // Validate and transition SCORE_LOCKED -> COMPLETED
    validateStateTransition(sim.status as SimulationStatus, SimulationStatus.COMPLETED);
    
    // Update simulation status to COMPLETED
    await prisma.simulationState.update({
      where: { id: sim.id },
      data: { status: 'COMPLETED' }
    });

    // Guard: Prevent double-creation of certificates
    const existing = await prisma.certificate.findFirst({
      where: { simulationId: sim.id }
    });

    if (existing) {
      return reply.status(200).send({
        success: true,
        certificate: existing
      });
    }

    const issueDate = new Date();
    const verificationHash = generateVerificationHash(
      authReq.user!.name,
      authReq.user!.id,
      check.compositeScore,
      issueDate
    );

    const certificate = await prisma.certificate.create({
      data: {
        simulationId: sim.id,
        userId: authReq.user!.id,
        recipientName: authReq.user!.name,
        issueDate,
        verificationHash,
        compositeScore: check.compositeScore,
        pdfUrl: `/api/v1/certificate/download/${sim.id}`
      }
    });

    return reply.status(201).send({
      success: true,
      certificate
    });
  });

  /**
   * GET /api/v1/certificate/download/:id
   * Serves raw PDF download bytes of the requested certificate
   */
  fastify.get('/download/:id', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid('Invalid Simulation ID format')
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    const cert = await prisma.certificate.findFirst({
      where: { simulationId: parsedParams.data.id },
      include: {
        simulation: {
          include: { class: { include: { scenario: true } } }
        }
      }
    });

    if (!cert) {
      throw new NotFoundError('No certificate generated for this simulation.');
    }

    const pdfBuffer = await generateCertificatePDF(
      cert.recipientName,
      cert.simulation.class.scenario.industry,
      cert.band,
      JSON.parse(cert.skills),
      cert.verificationId || cert.verificationHash,
      cert.issueDate
    );

    return reply
      .status(200)
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="certificate_${cert.recipientName.replace(/\s+/g, '_')}.pdf"`)
      .send(pdfBuffer);
  });

  /**
   * GET /api/v1/certificate/verify/:hash
   * Public-facing URL validation checking cryptography hashes (No Auth required)
   */
  fastify.get('/verify/:hash', async (request, reply) => {
    const paramsSchema = z.object({
      hash: z.string().min(1, 'Hash string cannot be empty')
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    const cert = await prisma.certificate.findUnique({
      where: { verificationHash: parsedParams.data.hash },
      include: {
        simulation: {
          include: { class: true }
        }
      }
    });

    if (!cert) {
      return reply.status(200).send({
        verified: false,
        reason: 'No certificate matching the provided hash was found.'
      });
    }

    const isGenuine = verifyCertificateHash(
      parsedParams.data.hash,
      cert.recipientName,
      cert.userId,
      cert.compositeScore,
      cert.issueDate
    );

    if (!isGenuine) {
      return reply.status(200).send({
        verified: false,
        reason: 'Cryptographic hash signature verification failed. Document might be altered.'
      });
    }

    return reply.status(200).send({
      verified: true,
      details: {
        recipientName: cert.recipientName,
        className: cert.simulation.class.name,
        issueDate: cert.issueDate,
        compositeScore: cert.compositeScore
      }
    });
  });
}
