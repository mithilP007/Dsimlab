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
    const allowed = sim.class?.scenario?.allowedPlatforms
      ? JSON.parse(sim.class.scenario.allowedPlatforms)
      : ["SEO", "GOOGLE_ADS", "META_ADS"];

    const skills: string[] = [];
    if (allowed.includes("SEO")) {
      skills.push("SEO Optimization", "Organic Search Analytics");
    }
    if (allowed.includes("GOOGLE_ADS")) {
      skills.push("PPC Bidding Strategy", "Google Auction Optimization");
    }
    if (allowed.includes("META_ADS")) {
      skills.push("Meta Ads Audiences", "Demographic Ad Targeting");
    }
    skills.push("ROAS Scaling", "Budget Pacing");

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
  /**
   * GET /api/v1/certificate/download-html/:id
   * Returns a structured, print-ready HTML certificate for browser-based download/printing.
   * Serves as a browser-friendly alternative to the PDF download.
   */
  fastify.get('/download-html/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const paramsSchema = z.object({
      id: z.string().min(1, 'Certificate ID cannot be empty')
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    const cert = await prisma.certificate.findFirst({
      where: {
        id: parsedParams.data.id,
        userId: authReq.user!.id // ensure ownership
      },
      include: {
        simulation: {
          include: { class: { include: { scenario: true, instructor: { select: { name: true } } } } }
        }
      }
    });

    if (!cert) {
      throw new NotFoundError('Certificate not found or you do not have access to this certificate.');
    }

    const skills: string[] = cert.skills ? JSON.parse(cert.skills) : [];
    const verificationId = cert.verificationId || cert.verificationHash;
    const issueDate = new Date(cert.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const scenarioName = cert.simulation?.class?.scenario?.name || 'Digital Marketing Simulation';
    const industry = cert.simulation?.class?.scenario?.industry || 'Digital Marketing';
    const instructorName = cert.simulation?.class?.instructor?.name || 'Simulation Instructor';
    const className = cert.simulation?.class?.name || 'Simulation Lab';
    const bandLabel = {
      DISTINCTION: 'Distinction',
      MERIT: 'Merit',
      COMPETENT: 'Competent',
      PASS: 'Pass',
    }[cert.band || 'COMPETENT'] || cert.band || 'Competent';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificate of Completion – ${cert.recipientName}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Georgia', 'Times New Roman', serif; background: #f4f1ea; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
    .cert-wrapper { background: #fff; border: 2px solid #b8860b; box-shadow: 0 0 0 8px #f4f1ea, 0 0 0 10px #b8860b; max-width: 900px; width: 100%; padding: 60px 80px; position: relative; }
    .cert-header { text-align: center; border-bottom: 1px solid #b8860b; padding-bottom: 24px; margin-bottom: 32px; }
    .cert-logo { font-size: 13px; letter-spacing: 3px; text-transform: uppercase; color: #7a5c0b; }
    .cert-title { font-size: 38px; color: #1a1a1a; margin: 12px 0 4px; letter-spacing: 1px; }
    .cert-subtitle { font-size: 16px; color: #555; letter-spacing: 2px; text-transform: uppercase; }
    .cert-body { text-align: center; }
    .cert-presented { font-size: 16px; color: #555; margin-bottom: 8px; }
    .cert-recipient { font-size: 42px; color: #1a1a1a; font-style: italic; margin: 16px 0; border-bottom: 1px solid #ccc; padding-bottom: 12px; }
    .cert-for { font-size: 15px; color: #555; margin: 20px 0 8px; }
    .cert-scenario { font-size: 22px; font-weight: bold; color: #1a1a1a; margin-bottom: 4px; }
    .cert-industry { font-size: 14px; color: #888; margin-bottom: 24px; }
    .cert-band { display: inline-block; background: #b8860b; color: #fff; padding: 8px 28px; border-radius: 4px; font-size: 18px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px; }
    .cert-score { font-size: 15px; color: #555; margin-bottom: 4px; }
    .cert-score strong { color: #1a1a1a; }
    .cert-skills { margin: 24px 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
    .cert-skill-tag { background: #f4f1ea; border: 1px solid #b8860b; color: #7a5c0b; padding: 4px 14px; border-radius: 20px; font-size: 12px; }
    .cert-footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #b8860b; padding-top: 24px; }
    .cert-sig { text-align: center; }
    .cert-sig-line { width: 160px; border-top: 1px solid #1a1a1a; margin: 0 auto 6px; }
    .cert-sig-name { font-size: 14px; color: #1a1a1a; font-weight: bold; }
    .cert-sig-title { font-size: 11px; color: #888; }
    .cert-verification { text-align: right; font-size: 11px; color: #aaa; }
    .cert-verification strong { color: #555; }
    .cert-qr { margin-top: 6px; font-size: 10px; color: #aaa; word-break: break-all; }
    @media print {
      body { background: #fff; }
      .cert-wrapper { box-shadow: none; border: 1px solid #b8860b; }
    }
  </style>
</head>
<body>
  <div class="cert-wrapper">
    <div class="cert-header">
      <div class="cert-logo">Digital Marketing Simulation Lab</div>
      <div class="cert-title">Certificate of Completion</div>
      <div class="cert-subtitle">Professional Development Award</div>
    </div>
    <div class="cert-body">
      <div class="cert-presented">This is to certify that</div>
      <div class="cert-recipient">${cert.recipientName}</div>
      <div class="cert-for">has successfully completed the simulation</div>
      <div class="cert-scenario">${scenarioName}</div>
      <div class="cert-industry">${industry} Industry &nbsp;|&nbsp; ${className}</div>
      <div class="cert-band">${bandLabel}</div>
      <div class="cert-score">Composite Score: <strong>${cert.compositeScore}%</strong></div>
      <div class="cert-score">Issued: <strong>${issueDate}</strong></div>
      ${skills.length > 0 ? `
      <div class="cert-skills">
        ${skills.map(s => `<span class="cert-skill-tag">${s}</span>`).join('')}
      </div>` : ''}
    </div>
    <div class="cert-footer">
      <div class="cert-sig">
        <div class="cert-sig-line"></div>
        <div class="cert-sig-name">${instructorName}</div>
        <div class="cert-sig-title">Course Instructor</div>
      </div>
      <div class="cert-sig">
        <div class="cert-sig-line"></div>
        <div class="cert-sig-name">DM SimLab Authority</div>
        <div class="cert-sig-title">Digital Marketing Simulation Lab</div>
      </div>
      <div class="cert-verification">
        <div><strong>Verification ID</strong></div>
        <div class="cert-qr">${verificationId}</div>
        <div style="margin-top:4px;">Verify at: dsimlab-frontend.vercel.app/verify</div>
      </div>
    </div>
  </div>
</body>
</html>`;

    return reply
      .status(200)
      .header('Content-Type', 'text/html; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="certificate_${cert.recipientName.replace(/\s+/g, '_')}.html"`)
      .send(html);
  });
}
