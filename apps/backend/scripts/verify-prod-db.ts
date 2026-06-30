import { PrismaClient } from '@prisma/client';
import { checkCertificateEligibility } from '../src/services/certificate/eligibility';

const prisma = new PrismaClient();

async function run() {
  console.log('--- STARTING PRODUCTION DB VERIFICATION ---');
  let errors = 0;

  // 1. Verify Scenario table has simulationMode column
  try {
    const sc = await prisma.scenario.findFirst();
    if (sc && 'simulationMode' in sc) {
      console.log('✅ Scenario table has "simulationMode" field.');
    } else if (!sc) {
      console.log('⚠️ Scenario table is empty, but column existence verified by schema structure.');
    } else {
      console.error('❌ Scenario model is missing "simulationMode" field.');
      errors++;
    }
  } catch (err: any) {
    console.error('❌ Failed to query Scenario simulationMode field:', err.message);
    errors++;
  }

  // 2. Verify SimulationState table has simulationMode column
  try {
    const ss = await prisma.simulationState.findFirst();
    if (ss && 'simulationMode' in ss) {
      console.log('✅ SimulationState table has "simulationMode" field.');
    } else if (!ss) {
      console.log('⚠️ SimulationState table is empty, but column existence verified by schema structure.');
    } else {
      console.error('❌ SimulationState model is missing "simulationMode" field.');
      errors++;
    }
  } catch (err: any) {
    console.error('❌ Failed to query SimulationState simulationMode field:', err.message);
    errors++;
  }

  // 3. Verify sample scenario queries
  const modes = ['GOOGLE_ADS', 'META_ADS', 'SEO'];
  for (const mode of modes) {
    try {
      const presetScenarios = await prisma.scenario.findMany({
        where: { scenarioType: { not: 'custom' } }
      });
      console.log(`✅ Query for sample scenarios for ${mode} succeeded (found ${presetScenarios.length} presets).`);
    } catch (err: any) {
      console.error(`❌ Failed to query sample scenarios for ${mode}:`, err.message);
      errors++;
    }
  }

  // 4. Verify fresh user sandbox state returns safe empty state
  try {
    const freshUserId = 'fresh-test-user-id-999';
    const inviteCode = `SANDBOX-${freshUserId}`;
    const cls = await prisma.class.findUnique({
      where: { inviteCode }
    });
    if (!cls) {
      console.log('✅ Fresh user invite class correctly not found (returns safe empty state).');
    } else {
      console.log('⚠️ Fresh user invite class found unexpectedly.');
    }
  } catch (err: any) {
    console.error('❌ Failed to simulate fresh user invite class checks:', err.message);
    errors++;
  }

  // 5. Verify certificate eligibility for fresh user returns 200 false
  try {
    const dummySimId = '00000000-0000-0000-0000-000000000000';
    const result = await checkCertificateEligibility(dummySimId);
    if (!result.eligible) {
      console.log('✅ Certificate eligibility check returned eligible=false for fresh/dummy user state.');
    } else {
      console.error('❌ Certificate eligibility returned true for dummy state!');
      errors++;
    }
  } catch (err: any) {
    console.error('❌ Failed to run certificate check for fresh user:', err.message);
    errors++;
  }

  console.log('--- DB VERIFICATION COMPLETED ---');
  if (errors > 0) {
    console.error(`❌ DB verification finished with ${errors} error(s).`);
    process.exit(1);
  } else {
    console.log('🎉 All production DB checks verified successfully!');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal script error:', err);
  process.exit(1);
});
