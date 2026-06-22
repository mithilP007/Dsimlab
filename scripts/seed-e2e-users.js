const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BACKEND_URL = 'http://localhost:5000';

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
    console.log(`POST ${url} for ${payload.email}: Status ${res.status}, Response: ${text.substring(0, 100)}`);
  } catch (err) {
    console.error(`Failed to register ${payload.email}:`, err.message);
  }
}

async function run() {
  console.log('--- Registering E2E users via APIs ---');
  
  // 1. Register super admin, instructor, students via standard email sign up
  const defaultPassword = 'Test@123456';
  await seedUser('/api/auth/sign-up/email', { email: 'superadmin@simlab.test', password: defaultPassword, name: 'Super Admin' });
  await seedUser('/api/auth/sign-up/email', { email: 'instructor@simlab.test', password: defaultPassword, name: 'Instructor Jenkins' });
  await seedUser('/api/auth/sign-up/email', { email: 'student1@simlab.test', password: defaultPassword, name: 'Student One' });
  await seedUser('/api/auth/sign-up/email', { email: 'student2@simlab.test', password: defaultPassword, name: 'Student Two' });
  
  // 2. Register individual learner via individual registration route (which auto-provisions sandbox)
  await seedUser('/api/auth/register/individual', { email: 'individual@simlab.test', password: defaultPassword, name: 'Individual Learner', planType: '30' });

  console.log('--- Aligning DB roles and statuses ---');
  await prisma.$connect();

  // Super Admin -> ADMIN
  await prisma.user.update({
    where: { email: 'superadmin@simlab.test' },
    data: { role: 'ADMIN', status: 'active', emailVerified: true }
  });
  console.log('- Set superadmin@simlab.test to ADMIN / active');

  // Instructor -> INSTRUCTOR
  await prisma.user.update({
    where: { email: 'instructor@simlab.test' },
    data: { role: 'INSTRUCTOR', status: 'active', emailVerified: true }
  });
  console.log('- Set instructor@simlab.test to INSTRUCTOR / active');

  // Student One -> STUDENT_COLLEGE (active)
  await prisma.user.update({
    where: { email: 'student1@simlab.test' },
    data: { role: 'STUDENT_COLLEGE', status: 'active', emailVerified: true }
  });
  console.log('- Set student1@simlab.test to STUDENT_COLLEGE / active');

  // Student Two -> STUDENT_COLLEGE (active)
  await prisma.user.update({
    where: { email: 'student2@simlab.test' },
    data: { role: 'STUDENT_COLLEGE', status: 'active', emailVerified: true }
  });
  console.log('- Set student2@simlab.test to STUDENT_COLLEGE / active');

  // Individual -> INDIVIDUAL (active)
  await prisma.user.update({
    where: { email: 'individual@simlab.test' },
    data: { role: 'INDIVIDUAL', status: 'active', emailVerified: true }
  });
  console.log('- Set individual@simlab.test to INDIVIDUAL / active');

  // Seed Pricing Plan subscription for instructor so they can create classes
  const instUser = await prisma.user.findUnique({ where: { email: 'instructor@simlab.test' } });
  const instructorPlan = await prisma.plan.findFirst({ where: { code: 'instructor' } });
  if (instUser && instructorPlan) {
    const existingSub = await prisma.subscription.findFirst({ where: { userId: instUser.id } });
    if (!existingSub) {
      await prisma.subscription.create({
        data: {
          userId: instUser.id,
          planId: instructorPlan.id,
          status: 'active',
          billingCycle: 'monthly',
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      });
      console.log('- Seeded instructor subscription plan');
    }
  }

  // Ensure scenarios exist so instructors can create cohorts
  const scenarioCount = await prisma.scenario.count();
  if (scenarioCount === 0) {
    console.log('Seeding baseline scenario...');
    await prisma.scenario.create({
      data: {
        name: 'Global SaaS Marketing Challenge',
        description: 'Acquire corporate customers for a collaborative cloud CRM tool in a competitive B2B space.',
        industry: 'B2B Software',
        startRound: 1,
        maxRounds: 10,
        budgetPerRound: 5000.0,
        baselineOrganicTraffic: 1500,
        targetKPI: 'revenue',
      }
    });
  }

  await prisma.$disconnect();
  console.log('E2E test users seeding completed successfully!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
