import { FastifyInstance } from 'fastify';
import { requireAuth, AuthenticatedRequest } from '../auth/middleware';
import { prisma } from '../db/client';
import { z } from 'zod';
import * as crypto from 'crypto';
import { checkCertificateEligibility } from '../services/certificate/eligibility';
import { generateVerificationHash, verifyCertificateHash } from '../services/certificate/verifier';
import { generateCertificatePDF } from '../services/certificate/generator';
import { ValidationError, NotFoundError } from '../utils/errors';
import { validateStateTransition, SimulationStatus } from '../services/simulation/state-machine';
import { scheduleCertificateGeneration } from '../jobs/queue';
import fs from 'fs';
import path from 'path';

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
      where: { userId: authReq.user!.id, classId: authReq.user!.classId! },
      include: { class: { include: { scenario: true } } }
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

    const year = issueDate.getFullYear();
    const random4 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const hash = crypto.createHash('sha256').update(authReq.user!.name + sim.id).digest('hex').substring(0, 8).toUpperCase();
    const verificationId = `DMSL-${year}-${random4}-${hash}`;
    const skills = ["SEO Optimization", "PPC Bidding Strategy", "Meta Ads Audiences", "ROAS Scaling", "Budget Pacing"];

    const certificate = await prisma.certificate.create({
      data: {
        simulationId: sim.id,
        userId: authReq.user!.id,
        recipientName: authReq.user!.name,
        issueDate,
        verificationHash,
        verificationId,
        compositeScore: check.compositeScore,
        pdfUrl: `/api/v1/certificate/download/${sim.id}`,
        band: check.band || 'COMPETENT',
        skills: JSON.stringify(skills)
      }
    });

    // Schedule PDF generation in the background queue
    await scheduleCertificateGeneration(
      authReq.user!.name,
      sim.class?.scenario?.industry || 'Digital Marketing',
      check.band || 'COMPETENT',
      skills,
      verificationId,
      issueDate
    );

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

    const verificationId = cert.verificationId || cert.verificationHash;
    const certPath = path.join(process.cwd(), 'uploads', 'certificates', `${verificationId}.pdf`);
    
    let pdfBuffer: Buffer;
    if (fs.existsSync(certPath)) {
      pdfBuffer = fs.readFileSync(certPath);
    } else {
      pdfBuffer = await generateCertificatePDF(
        cert.recipientName,
        cert.simulation.class.scenario.industry,
        cert.band || 'COMPETENT',
        cert.skills ? JSON.parse(cert.skills) : [],
        verificationId,
        cert.issueDate
      );
    }

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
