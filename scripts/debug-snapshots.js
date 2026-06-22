const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const snapshots = await prisma.roundSnapshot.findMany({
    orderBy: { round: 'asc' }
  });
  console.log(`Found ${snapshots.length} snapshots.`);
  for (const snap of snapshots) {
    const data = JSON.parse(snap.data);
    console.log(`\n--- Round ${snap.round} Snapshot (ID: ${snap.simulationId}) ---`);
    console.log(`Scores:`, data.scores);
    
    let totalGoogleImpressions = 0;
    let totalGoogleClicks = 0;
    let totalGoogleCost = 0;
    let totalGoogleConversions = 0;
    
    let totalMetaImpressions = 0;
    let totalMetaClicks = 0;
    let totalMetaCost = 0;
    let totalMetaConversions = 0;
    
    if (data.dailyMetrics) {
      console.log(`Daily metrics length: ${data.dailyMetrics.length}`);
      data.dailyMetrics.forEach((m, idx) => {
        totalGoogleImpressions += m.googleImpressions || 0;
        totalGoogleClicks += m.googleClicks || 0;
        totalGoogleCost += m.googleCost || 0;
        totalGoogleConversions += m.googleConversions || 0;
        
        totalMetaImpressions += m.metaImpressions || 0;
        totalMetaClicks += m.metaClicks || 0;
        totalMetaCost += m.metaCost || 0;
        totalMetaConversions += m.metaConversions || 0;
        
        if (idx === 0) {
          console.log(`Day 1 metrics sample:`, m);
        }
      });
      console.log(`Google Totals: Clicks=${totalGoogleClicks}, Impressions=${totalGoogleImpressions}, Cost=${totalGoogleCost}, Conversions=${totalGoogleConversions}`);
      console.log(`Meta Totals: Clicks=${totalMetaClicks}, Impressions=${totalMetaImpressions}, Cost=${totalMetaCost}, Conversions=${totalMetaConversions}`);
    } else {
      console.log(`No dailyMetrics found in snapshot.`);
    }
  }
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
