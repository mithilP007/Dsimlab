import { prisma } from '../db/client';


// Standard scrypt password hash for "password123" used by Better-Auth representation
const MOCK_PASSWORD_HASH = '$argon2id$v=19$m=65536,t=3,p=4$q+wV2gX2N2hFzRk$dummyhash';

async function main() {
  console.log('Starting Database Master Seeding...');

  // 1. Clean Database
  console.log('Cleaning active tables...');
  await prisma.billingEvent.deleteMany({});
  await prisma.couponUsage.deleteMany({});
  await prisma.coupon.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.plan.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.certificate.deleteMany({});
  await prisma.scoreBreakdown.deleteMany({});
  await prisma.dailyMetric.deleteMany({});
  await prisma.marketEvent.deleteMany({});
  await prisma.decision.deleteMany({});
  await prisma.simulationState.deleteMany({});
  await prisma.class.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.scenario.deleteMany({});
  
  // 1.5 Seed Pricing Plans
  console.log('Seeding Pricing Plans...');
  await prisma.plan.createMany({
    data: [
      {
        name: 'Free Trial',
        code: 'free',
        priceMonthly: 0,
        priceYearly: 0,
        simulationLimit: 1,
        studentLimit: 5,
        instructorLimit: 0,
        certificateLimit: 0,
        reportExportLimit: 1,
        storageLimitMb: 50,
        features: JSON.stringify(['1 Sandbox Campaign Run', 'Basic SEO Simulator access', 'Email Support'])
      },
      {
        name: 'Individual Basic',
        code: 'individual_basic',
        priceMonthly: 1500,
        priceYearly: 15000,
        simulationLimit: 5,
        studentLimit: 0,
        instructorLimit: 0,
        certificateLimit: 5,
        reportExportLimit: 5,
        storageLimitMb: 100,
        features: JSON.stringify(['5 Sandbox Campaign Runs', 'Access to Google & Meta Ads', 'Full Bronze/Silver Certificates', 'Email Support'])
      },
      {
        name: 'Individual Pro',
        code: 'individual_pro',
        priceMonthly: 3000,
        priceYearly: 30000,
        simulationLimit: -1,
        studentLimit: 0,
        instructorLimit: 0,
        certificateLimit: -1,
        reportExportLimit: -1,
        storageLimitMb: 500,
        features: JSON.stringify(['Unlimited Campaign Runs', 'All Ads Engines', 'All Certificates (Platinum included)', 'Priority Support'])
      },
      {
        name: 'Instructor',
        code: 'instructor',
        priceMonthly: 5000,
        priceYearly: 50000,
        simulationLimit: -1,
        studentLimit: 30,
        instructorLimit: 0,
        certificateLimit: -1,
        reportExportLimit: -1,
        storageLimitMb: 1024,
        features: JSON.stringify(['Classroom Management (Up to 30 students)', 'NBA & OBE Accredited Reports', 'Student Analytics Ledgers', 'Export Reports to PDF/CSV'])
      },
      {
        name: 'College License',
        code: 'college',
        priceMonthly: 15000,
        priceYearly: 150000,
        simulationLimit: -1,
        studentLimit: 200,
        instructorLimit: 10,
        certificateLimit: -1,
        reportExportLimit: -1,
        storageLimitMb: 5120,
        features: JSON.stringify(['Colleges Hub (Up to 10 Instructors, 200 Students)', 'Accreditation Readiness Indexes', 'Bulk Student Imports', 'Premium Dedicated Support'])
      },
      {
        name: 'Enterprise License',
        code: 'enterprise',
        priceMonthly: 45000,
        priceYearly: 450000,
        simulationLimit: -1,
        studentLimit: -1,
        instructorLimit: -1,
        certificateLimit: -1,
        reportExportLimit: -1,
        storageLimitMb: 20480,
        features: JSON.stringify(['Unlimited Cohorts, Instructors & Students', 'Custom Scenario Builders', 'SLA Dedicated Account Managers', 'Single Sign-On (SSO) integration'])
      }
    ]
  });

  console.log('Seeding Coupons...');
  await prisma.coupon.createMany({
    data: [
      {
        code: 'WELCOME50',
        discountType: 'percentage',
        discountValue: 50.0,
        durationMonths: 3,
        isActive: true
      },
      {
        code: 'FLAT1000',
        discountType: 'flat',
        discountValue: 1000.0,
        durationMonths: 1,
        isActive: true
      },
      {
        code: 'TRIAL30',
        discountType: 'trial_extension',
        discountValue: 30.0,
        isActive: true
      }
    ]
  });

  // 2. Create Scenarios
  console.log('Seeding Simulation Scenarios...');
  const scenarioSaaS = await prisma.scenario.create({
    data: {
      name: 'Global SaaS Marketing Challenge',
      description: 'Acquire corporate customers for a collaborative cloud CRM tool in a competitive B2B space.',
      industry: 'B2B Software',
      startRound: 1,
      maxRounds: 10,
      budgetPerRound: 5000.0,
      baselineOrganicTraffic: 1500,
      targetKPI: 'revenue',
    },
  });

  const scenarioB2C = await prisma.scenario.create({
    data: {
      name: 'Fashion Retail E-Commerce Blitz',
      description: 'Scale organic and paid social traffic for a sustainable custom apparel brand.',
      industry: 'Apparel E-Commerce',
      startRound: 1,
      maxRounds: 8,
      budgetPerRound: 3500.0,
      baselineOrganicTraffic: 3000,
      targetKPI: 'conversions',
    },
  });

  // 3. Create Default Users (Instructor & Student)
  console.log('Seeding Instructor Account...');
  const instructor = await prisma.user.create({
    data: {
      email: 'instructor@simulation.com',
      emailVerified: true,
      name: 'Dr. Sarah Jenkins',
      role: 'INSTRUCTOR',
    },
  });

  // Better-Auth credential account linking
  await prisma.account.create({
    data: {
      userId: instructor.id,
      accountId: 'instructor@simulation.com',
      providerId: 'credential',
      password: MOCK_PASSWORD_HASH,
    },
  });

  const instructorPlan = await prisma.plan.findFirst({ where: { code: 'instructor' } });
  await prisma.subscription.create({
    data: {
      userId: instructor.id,
      planId: instructorPlan!.id,
      status: 'active',
      billingCycle: 'monthly',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  });

  console.log('Seeding Student Account...');
  const student = await prisma.user.create({
    data: {
      email: 'student@simulation.com',
      emailVerified: true,
      name: 'Alex Johnson',
      role: 'STUDENT_COLLEGE',
    },
  });

  await prisma.account.create({
    data: {
      userId: student.id,
      accountId: 'student@simulation.com',
      providerId: 'credential',
      password: MOCK_PASSWORD_HASH,
    },
  });

  const studentPlan = await prisma.plan.findFirst({ where: { code: 'free' } });
  await prisma.subscription.create({
    data: {
      userId: student.id,
      planId: studentPlan!.id,
      status: 'active',
      billingCycle: 'trial',
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    }
  });

  // 4. Create Default Class
  console.log('Seeding Class Cohort...');
  const defaultClass = await prisma.class.create({
    data: {
      name: 'Digital Marketing Core - Summer 2026',
      inviteCode: 'MKT202',
      instructorId: instructor.id,
      scenarioId: scenarioSaaS.id,
    },
  });

  // Assign Student to Class
  await prisma.user.update({
    where: { id: student.id },
    data: { classId: defaultClass.id },
  });

  // 5. Initialize Simulation session for the student
  console.log('Initializing Active Student Simulation Session...');
  const simulation = await prisma.simulationState.create({
    data: {
      userId: student.id,
      classId: defaultClass.id,
      currentRound: 1,
      isCompleted: false,
      cumulativeSpend: 0.0,
      cumulativeRevenue: 0.0,
      score: 0.0,
    },
  });

  // Initialize a placeholder round 1 decision
  await prisma.decision.create({
    data: {
      simulationId: simulation.id,
      round: 1,
      seoTargetKeywords: JSON.stringify(['best crm software 1', 'sales dashboard api 9']),
      seoContentQuality: 6.0,
      seoBacklinkBudget: 250.0,
      googleCampaigns: JSON.stringify([
        {
          name: 'Search CRM Campaigns',
          budget: 1500.0,
          keywords: [
            { word: 'best crm software 1', bid: 3.50 }
          ]
        }
      ]),
      metaCampaigns: JSON.stringify([
        {
          name: 'Social Founders Target',
          budget: 1200.0,
          audienceInterest: 'business-owners',
          bidType: 'LOWEST_COST',
          bidAmount: 0.0,
          placement: 'feed-reels',
          creativeQuality: 7.0
        }
      ]),
      submitted: false,
    },
  });

  console.log('Master Seeding process completed successfully!');
  console.log(`- Scenario SaaS ID: ${scenarioSaaS.id}`);
  console.log(`- Scenario B2C ID: ${scenarioB2C.id}`);
  console.log(`- Classroom Invite Code: ${defaultClass.inviteCode}`);
  console.log(`- Default Student Log: student@simulation.com (pw: password123)`);
  console.log(`- Default Instructor Log: instructor@simulation.com (pw: password123)`);
}

main()
  .catch(err => {
    console.error('Error executing master seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
