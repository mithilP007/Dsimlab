import { prisma } from '../db/client';


// Standard scrypt password hash for "password123" used by Better-Auth representation
const MOCK_PASSWORD_HASH = '$argon2id$v=19$m=65536,t=3,p=4$q+wV2gX2N2hFzRk$dummyhash';

async function main() {
  console.log('Starting Database Master Seeding...');

  // 1. Clean Database
  console.log('Cleaning active tables...');
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
