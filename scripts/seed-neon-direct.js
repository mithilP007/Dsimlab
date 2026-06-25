/**
 * seed-neon-direct.js
 * Seeds pilot users directly into Neon via Prisma + better-auth/crypto.
 * No running backend needed. Run with DATABASE_URL env var set.
 *
 * Usage:
 *   $env:DATABASE_URL="<neon_url>" ; node scripts/seed-neon-direct.js
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('better-auth/crypto');

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = 'Test@123456';

const USERS = [
  { email: 'superadmin@simlab.run',       name: 'Super Admin',              role: 'ADMIN',           individual: false },
  { email: 'instructor.alpha@simlab.run', name: 'Dr. John Alpha',           role: 'INSTRUCTOR',      individual: false, institution: 'SimLab Marketing Academy' },
  { email: 'instructor.beta@simlab.run',  name: 'Prof. Mary Beta',          role: 'INSTRUCTOR',      individual: false, institution: 'Digital Growth University' },
  { email: 'student1@simlab.run',         name: 'Pilot Student 1',          role: 'STUDENT_COLLEGE', individual: false },
  { email: 'student2@simlab.run',         name: 'Pilot Student 2',          role: 'STUDENT_COLLEGE', individual: false },
  { email: 'student3@simlab.run',         name: 'Pilot Student 3',          role: 'STUDENT_COLLEGE', individual: false },
  { email: 'student4@simlab.run',         name: 'Pilot Student 4',          role: 'STUDENT_COLLEGE', individual: false },
  { email: 'student5@simlab.run',         name: 'Pilot Student 5',          role: 'STUDENT_COLLEGE', individual: false },
  { email: 'student6@simlab.run',         name: 'Pilot Student 6',          role: 'STUDENT_COLLEGE', individual: false },
  { email: 'student7@simlab.run',         name: 'Pilot Student 7',          role: 'STUDENT_COLLEGE', individual: false },
  { email: 'student8@simlab.run',         name: 'Pilot Student 8',          role: 'STUDENT_COLLEGE', individual: false },
  { email: 'student9@simlab.run',         name: 'Pilot Student 9',          role: 'STUDENT_COLLEGE', individual: false },
  { email: 'student10@simlab.run',        name: 'Pilot Student 10',         role: 'STUDENT_COLLEGE', individual: false },
  { email: 'learner@simlab.run',          name: 'Individual Pilot Learner', role: 'INDIVIDUAL',      individual: true,  planType: '30' },
];

async function upsertUser(u, hashedPw) {
  // Upsert User row
  const user = await prisma.user.upsert({
    where: { email: u.email },
    update: {
      role:          u.role,
      status:        'active',
      emailVerified: true,
      institution:   u.institution || null,
      planType:      u.planType    || null,
    },
    create: {
      email:         u.email,
      name:          u.name,
      role:          u.role,
      emailVerified: true,
      status:        'active',
      institution:   u.institution || null,
      planType:      u.planType    || null,
    },
  });

  // Upsert credential Account row (better-auth credential provider)
  const existing = await prisma.account.findFirst({
    where: { userId: user.id, providerId: 'credential' },
  });

  if (existing) {
    await prisma.account.update({
      where: { id: existing.id },
      data:  { password: hashedPw },
    });
  } else {
    await prisma.account.create({
      data: {
        userId:     user.id,
        accountId:  user.id,
        providerId: 'credential',
        password:   hashedPw,
      },
    });
  }

  console.log(`  ✅ ${u.email} (${u.role})`);
  return user;
}

async function run() {
  const dbUrl = process.env.DATABASE_URL || '';
  const isNeon = dbUrl.includes('neon.tech');
  console.log('\n=== SIMLAB PILOT SEED (NEON DIRECT) ===');
  console.log(`DATABASE_URL target : ${isNeon ? '✅ NEON PRODUCTION' : '⚠️  LOCAL / OTHER'}`);
  console.log(`DB host snippet     : ${dbUrl.split('@')[1]?.split('/')[0] || 'unknown'}\n`);

  if (!isNeon) {
    console.warn('WARNING: DATABASE_URL does not appear to be Neon. Proceeding anyway...\n');
  }

  await prisma.$connect();

  // Hash password once — same hash for all (fine for demo seed)
  console.log('Hashing password with better-auth/crypto (scrypt)...');
  const hashedPw = await hashPassword(DEFAULT_PASSWORD);
  console.log('Password hashed ✅\n');

  // ── 1. Upsert all users ────────────────────────────────────────────────────
  console.log('--- Upserting users & credential accounts ---');
  const userMap = {};
  for (const u of USERS) {
    const user = await upsertUser(u, hashedPw);
    userMap[u.email] = user;
  }

  // ── 2. Seed Plans via raw SQL (Neon schema lacks isActive/durationDays columns) ─
  console.log('\n--- Ensuring Plans exist (raw SQL) ---');
  const plans = [
    { name: 'Free Trial',       code: 'free',             priceMonthly: 0,   priceYearly: 0,    simulationLimit: 1,  studentLimit: 5,  instructorLimit: 0, certificateLimit: 0,  reportExportLimit: 0,  storageLimitMb: 50,  features: '["Basic simulation","1 class","5 students"]' },
    { name: 'Instructor',       code: 'instructor',       priceMonthly: 999, priceYearly: 9990, simulationLimit: -1, studentLimit: 50, instructorLimit: 1, certificateLimit: -1, reportExportLimit: -1, storageLimitMb: 500, features: '["Unlimited simulations","Leaderboard","Certificates","Analytics"]' },
    { name: 'Individual Basic', code: 'individual_basic', priceMonthly: 299, priceYearly: 2990, simulationLimit: 3,  studentLimit: 0,  instructorLimit: 0, certificateLimit: 1,  reportExportLimit: 3,  storageLimitMb: 50,  features: '["3 simulations","Certificate","Basic analytics"]' },
    { name: 'Individual Pro',   code: 'individual_pro',   priceMonthly: 599, priceYearly: 5990, simulationLimit: -1, studentLimit: 0,  instructorLimit: 0, certificateLimit: -1, reportExportLimit: -1, storageLimitMb: 200, features: '["Unlimited simulations","All platforms","Priority support"]' },
  ];

  for (const p of plans) {
    // Use raw SQL to avoid Prisma client schema mismatch (isActive/durationDays not in Neon yet)
    const id = require('crypto').randomUUID();
    await prisma.$queryRawUnsafe(
      `INSERT INTO "Plan" (id, name, code, "priceMonthly", "priceYearly", currency,
         "simulationLimit", "studentLimit", "instructorLimit", "certificateLimit",
         "reportExportLimit", "storageLimitMb", features, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,'INR',$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
       ON CONFLICT (code) DO NOTHING`,
      id, p.name, p.code, p.priceMonthly, p.priceYearly,
      p.simulationLimit, p.studentLimit, p.instructorLimit,
      p.certificateLimit, p.reportExportLimit, p.storageLimitMb, p.features
    );
    console.log(`  ✅ Plan: ${p.name}`);
  }

  // ── 3. Seed Instructor Subscriptions via raw SQL ──────────────────────────
  console.log('\n--- Seeding instructor subscriptions (raw SQL) ---');
  const instPlanRows = await prisma.$queryRawUnsafe(`SELECT id FROM "Plan" WHERE code = 'instructor' LIMIT 1`);
  const instPlan = instPlanRows[0];
  const instEmails = ['instructor.alpha@simlab.run', 'instructor.beta@simlab.run'];
  if (instPlan) {
    for (const email of instEmails) {
      const inst = userMap[email];
      const existingRows = await prisma.$queryRawUnsafe(
        `SELECT id FROM "Subscription" WHERE "userId" = $1 AND "planId" = $2 LIMIT 1`,
        inst.id, instPlan.id
      );
      if (!existingRows.length) {
        const subId = require('crypto').randomUUID();
        const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        await prisma.$queryRawUnsafe(
          `INSERT INTO "Subscription" (id, "userId", "planId", status, "billingCycle", "startDate", "endDate", "cancelAtPeriodEnd", "createdAt", "updatedAt")
           VALUES ($1,$2,$3,'active','monthly',NOW(),$4::timestamp,false,NOW(),NOW())`,
          subId, inst.id, instPlan.id, endDate
        );
        console.log(`  ✅ Subscription created for ${email}`);
      } else {
        console.log(`  ⏭️  Subscription already exists for ${email}`);
      }
    }
  } else {
    console.log('  ⚠️  Instructor plan not found, skipping subscriptions');
  }

  // ── 4. Ensure Scenarios ────────────────────────────────────────────────────
  console.log('\n--- Ensuring Scenarios exist ---');
  const scenariosData = [
    { name: 'Global SaaS Marketing Challenge',  description: 'Acquire corporate customers for a collaborative cloud CRM tool in a B2B space.',              industry: 'B2B Software',        maxRounds: 10, budgetPerRound: 5000, baselineOrganicTraffic: 1500, targetKPI: 'revenue',      difficulty: 'medium' },
    { name: 'Fashion Retail E-Commerce Blitz',  description: 'Scale paid ads and organic rankings for a sustainable apparel custom brand.',                  industry: 'Apparel E-Commerce',  maxRounds: 8,  budgetPerRound: 3500, baselineOrganicTraffic: 3000, targetKPI: 'conversions',  difficulty: 'easy' },
    { name: 'B2B Growth Hack',                  description: 'Optimize high-stakes lead generation campaigns for enterprise sales.',                         industry: 'B2B Enterprise',      maxRounds: 12, budgetPerRound: 7500, baselineOrganicTraffic: 800,  targetKPI: 'clicks',       difficulty: 'hard' },
  ];
  const scenarios = {};
  for (const s of scenariosData) {
    let sc = await prisma.scenario.findFirst({ where: { name: s.name } });
    if (!sc) {
      sc = await prisma.scenario.create({ data: { ...s, startRound: 1 } });
      console.log(`  ✅ Created scenario: ${s.name}`);
    } else {
      console.log(`  ⏭️  Scenario exists: ${s.name}`);
    }
    scenarios[s.name] = sc;
  }

  // ── 5. Create Classes (skip if inviteCode already exists) ─────────────────
  console.log('\n--- Provisioning demo classrooms ---');
  const classMap = {};
  const classesData = [
    { name: 'Intro to SEO',              inviteCode: 'SEO101',  instructorEmail: 'instructor.alpha@simlab.run', scenarioName: 'Global SaaS Marketing Challenge' },
    { name: 'Google Ads Mastery',        inviteCode: 'GADS102', instructorEmail: 'instructor.alpha@simlab.run', scenarioName: 'Fashion Retail E-Commerce Blitz' },
    { name: 'Social Performance Media',  inviteCode: 'SOC103',  instructorEmail: 'instructor.beta@simlab.run',  scenarioName: 'B2B Growth Hack' },
  ];

  for (const c of classesData) {
    let cls = await prisma.class.findFirst({ where: { inviteCode: c.inviteCode } });
    if (!cls) {
      cls = await prisma.class.create({
        data: {
          name:         c.name,
          inviteCode:   c.inviteCode,
          instructorId: userMap[c.instructorEmail].id,
          scenarioId:   scenarios[c.scenarioName].id,
        },
      });
      console.log(`  ✅ Created class: ${c.name} (${c.inviteCode})`);
    } else {
      console.log(`  ⏭️  Class exists: ${c.name} (${c.inviteCode})`);
    }
    classMap[c.inviteCode] = cls;
  }

  // ── 6. Enroll Students (set classId on User; ClassEnrollment table not yet in Neon) ──
  console.log('\n--- Assigning students to classes ---');
  const enrollments = [
    { emails: ['student1@simlab.run','student2@simlab.run','student3@simlab.run','student4@simlab.run'], classCode: 'SEO101' },
    { emails: ['student5@simlab.run','student6@simlab.run','student7@simlab.run','student8@simlab.run'], classCode: 'GADS102' },
    { emails: ['student9@simlab.run','student10@simlab.run'],                                            classCode: 'SOC103' },
  ];

  for (const group of enrollments) {
    const cls = classMap[group.classCode];
    for (const email of group.emails) {
      const student = userMap[email];
      // Set classId on user (works without ClassEnrollment table)
      await prisma.user.update({ where: { id: student.id }, data: { classId: cls.id } });
      console.log(`  ✅ Assigned ${email} → ${group.classCode}`);

      // Try ClassEnrollment insert — skip gracefully if table not in DB
      try {
        await prisma.$queryRawUnsafe(
          `INSERT INTO "ClassEnrollment" (id, "classId", "studentId", "studentEmail", status, "requestedAt", "approvedAt")
           VALUES ($1,$2,$3,$4,'ACTIVE',NOW(),NOW())
           ON CONFLICT DO NOTHING`,
          require('crypto').randomUUID(), cls.id, student.id, email
        );
      } catch (_) {
        // ClassEnrollment table not in Neon yet — skipping
      }
    }
  }

  // ── 7. Verification summary ────────────────────────────────────────────────
  console.log('\n--- VERIFICATION SUMMARY ---');
  const checkEmails = [
    'superadmin@simlab.run',
    'instructor.alpha@simlab.run',
    'instructor.beta@simlab.run',
    'student1@simlab.run',
    'learner@simlab.run',
  ];
  for (const email of checkEmails) {
    const u = await prisma.user.findUnique({ where: { email }, include: { accounts: true } });
    const hasCredential = u?.accounts.some(a => a.providerId === 'credential' && a.password);
    console.log(`  ${hasCredential ? '✅' : '❌'} ${email} | role: ${u?.role} | status: ${u?.status} | password: ${hasCredential ? 'SET' : 'MISSING'}`);
  }

  await prisma.$disconnect();
  console.log('\n=== PILOT SEEDING COMPLETED SUCCESSFULLY ===\n');
}

run().catch(err => {
  console.error('\n❌ SEED FAILED:', err.message);
  console.error(err);
  process.exit(1);
});
