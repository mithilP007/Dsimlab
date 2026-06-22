const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BACKEND_URL = 'http://localhost:5000';
const defaultPassword = 'Test@123456';

async function seedUser(url, payload) {
  try {
    const res = await fetch(`${BACKEND_URL}${url}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5173'
      },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log(`POST ${url} for ${payload.email}: Status ${res.status}`);
    return JSON.parse(text);
  } catch (err) {
    console.error(`Failed to register ${payload.email}:`, err.message);
    return null;
  }
}

async function run() {
  console.log('=== STARTING PILOT DATABASE SEEDING ===');

  // 1. Create Super Admin
  await seedUser('/api/auth/sign-up/email', { email: 'superadmin@simlab.run', password: defaultPassword, name: 'Super Admin' });
  
  // 2. Create 2 Instructors
  await seedUser('/api/auth/sign-up/email', { email: 'instructor.alpha@simlab.run', password: defaultPassword, name: 'Dr. John Alpha' });
  await seedUser('/api/auth/sign-up/email', { email: 'instructor.beta@simlab.run', password: defaultPassword, name: 'Prof. Mary Beta' });

  // 3. Create 10 Students
  for (let i = 1; i <= 10; i++) {
    await seedUser('/api/auth/sign-up/email', { email: `student${i}@simlab.run`, password: defaultPassword, name: `Pilot Student ${i}` });
  }

  // 4. Create Individual Learner
  await seedUser('/api/auth/register/individual', { email: 'learner@simlab.run', password: defaultPassword, name: 'Individual Pilot Learner', planType: '30' });

  console.log('--- Connecting to Prisma to adjust Roles and Institutions ---');
  await prisma.$connect();

  // Update Super Admin
  await prisma.user.update({
    where: { email: 'superadmin@simlab.run' },
    data: { role: 'ADMIN', status: 'active', emailVerified: true }
  });
  console.log('- Mapped superadmin@simlab.run to ADMIN');

  // Update Instructors
  await prisma.user.update({
    where: { email: 'instructor.alpha@simlab.run' },
    data: { role: 'INSTRUCTOR', status: 'active', emailVerified: true, institution: 'SimLab Marketing Academy' }
  });
  await prisma.user.update({
    where: { email: 'instructor.beta@simlab.run' },
    data: { role: 'INSTRUCTOR', status: 'active', emailVerified: true, institution: 'Digital Growth University' }
  });
  console.log('- Mapped instructors with demo institutions');

  // Update Individual Learner
  await prisma.user.update({
    where: { email: 'learner@simlab.run' },
    data: { role: 'INDIVIDUAL', status: 'active', emailVerified: true }
  });
  console.log('- Mapped individual learner');

  // Update Students
  for (let i = 1; i <= 10; i++) {
    await prisma.user.update({
      where: { email: `student${i}@simlab.run` },
      data: { role: 'STUDENT_COLLEGE', status: 'active', emailVerified: true }
    });
  }
  console.log('- Mapped 10 students to STUDENT_COLLEGE');

  // Seed plans for instructors
  const instPlan = await prisma.plan.findFirst({ where: { code: 'instructor' } });
  const inst1 = await prisma.user.findFirst({ where: { email: 'instructor.alpha@simlab.run' } });
  const inst2 = await prisma.user.findFirst({ where: { email: 'instructor.beta@simlab.run' } });

  if (instPlan && inst1 && inst2) {
    await prisma.subscription.createMany({
      data: [
        {
          userId: inst1.id,
          planId: instPlan.id,
          status: 'active',
          billingCycle: 'monthly',
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        },
        {
          userId: inst2.id,
          planId: instPlan.id,
          status: 'active',
          billingCycle: 'monthly',
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      ]
    });
    console.log('- Seeded active subscriptions for instructors');
  }

  // 5. Ensure Published Scenarios
  console.log('Checking published scenarios...');
  let scenSaaS = await prisma.scenario.findFirst({ where: { name: 'Global SaaS Marketing Challenge' } });
  if (!scenSaaS) {
    scenSaaS = await prisma.scenario.create({
      data: {
        name: 'Global SaaS Marketing Challenge',
        description: 'Acquire corporate customers for a collaborative cloud CRM tool in a B2B space.',
        industry: 'B2B Software',
        startRound: 1,
        maxRounds: 10,
        budgetPerRound: 5000.0,
        baselineOrganicTraffic: 1500,
        targetKPI: 'revenue',
        difficulty: 'medium'
      }
    });
  }
  let scenBlitz = await prisma.scenario.findFirst({ where: { name: 'Fashion Retail E-Commerce Blitz' } });
  if (!scenBlitz) {
    scenBlitz = await prisma.scenario.create({
      data: {
        name: 'Fashion Retail E-Commerce Blitz',
        description: 'Scale paid ads and organic rankings for a sustainable apparel custom brand.',
        industry: 'Apparel E-Commerce',
        startRound: 1,
        maxRounds: 8,
        budgetPerRound: 3500.0,
        baselineOrganicTraffic: 3000,
        targetKPI: 'conversions',
        difficulty: 'easy'
      }
    });
  }
  let scenGrowth = await prisma.scenario.findFirst({ where: { name: 'B2B Growth Hack' } });
  if (!scenGrowth) {
    scenGrowth = await prisma.scenario.create({
      data: {
        name: 'B2B Growth Hack',
        description: 'Optimize high-stakes lead generation campaigns for enterprise sales.',
        industry: 'B2B Enterprise',
        startRound: 1,
        maxRounds: 12,
        budgetPerRound: 7500.0,
        baselineOrganicTraffic: 800,
        targetKPI: 'clicks',
        difficulty: 'hard'
      }
    });
  }
  console.log('- Verified 3 published scenarios');

  // 6. Create 3 Demo Classes
  console.log('Provisioning demo classrooms...');
  const class1 = await prisma.class.create({
    data: {
      name: 'Intro to SEO',
      inviteCode: 'SEO101',
      instructorId: inst1.id,
      scenarioId: scenSaaS.id
    }
  });
  const class2 = await prisma.class.create({
    data: {
      name: 'Google Ads Mastery',
      inviteCode: 'GADS102',
      instructorId: inst1.id,
      scenarioId: scenBlitz.id
    }
  });
  const class3 = await prisma.class.create({
    data: {
      name: 'Social Performance Media',
      inviteCode: 'SOC103',
      instructorId: inst2.id,
      scenarioId: scenGrowth.id
    }
  });
  console.log(`- Created classes: Intro to SEO (SEO101), Google Ads Mastery (GADS102), Social Performance Media (SOC103)`);

  // 7. Enroll Students to Classes
  console.log('Enrolling students into cohorts...');
  // Students 1-4 in class1
  for (let i = 1; i <= 4; i++) {
    await prisma.user.update({
      where: { email: `student${i}@simlab.run` },
      data: { classId: class1.id }
    });
  }
  // Students 5-8 in class2
  for (let i = 5; i <= 8; i++) {
    await prisma.user.update({
      where: { email: `student${i}@simlab.run` },
      data: { classId: class2.id }
    });
  }
  // Students 9-10 in class3
  for (let i = 9; i <= 10; i++) {
    await prisma.user.update({
      where: { email: `student${i}@simlab.run` },
      data: { classId: class3.id }
    });
  }
  console.log('- Distributed students across classes');

  await prisma.$disconnect();
  console.log('=== PILOT SEEDING COMPLETED SUCCESSFULLY ===');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
