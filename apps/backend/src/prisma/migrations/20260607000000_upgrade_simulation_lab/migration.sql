-- AlterTable
ALTER TABLE "MarketConditionSnapshot" ADD COLUMN     "socialBuzzImpact" DOUBLE PRECISION NOT NULL DEFAULT 1.0;

-- AlterTable
ALTER TABLE "Scenario" ADD COLUMN     "aiHintsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowedAudienceKeywordOptions" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "allowedBiddingStrategies" TEXT NOT NULL DEFAULT '["Manual CPC", "Maximize Clicks", "Maximize Conversions"]',
ADD COLUMN     "allowedGoogleObjectives" TEXT NOT NULL DEFAULT '["Sales", "Leads", "Website Traffic", "Brand Awareness"]',
ADD COLUMN     "allowedMetaObjectives" TEXT NOT NULL DEFAULT '["Awareness", "Traffic", "Engagement", "Leads", "Sales"]',
ADD COLUMN     "allowedPlatforms" TEXT NOT NULL DEFAULT '["SEO", "GOOGLE_ADS", "META_ADS"]',
ADD COLUMN     "certificateEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "difficulty" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN     "marketVolatility" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "scenarioType" TEXT NOT NULL DEFAULT 'standard',
ADD COLUMN     "scoringWeights" TEXT NOT NULL DEFAULT '{"alignment":0.2,"budget":0.1,"optimization":0.2,"keywordAudience":0.2,"creative":0.15,"roi":0.15}',
ADD COLUMN     "targetLocations" TEXT NOT NULL DEFAULT '["Global"]',
ADD COLUMN     "totalBudget" DOUBLE PRECISION NOT NULL DEFAULT 5000.0,
ADD COLUMN     "trendRefreshFrequency" TEXT NOT NULL DEFAULT 'daily';

-- CreateTable
CREATE TABLE "StudentSimulationProgress" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "currentDay" INTEGER NOT NULL DEFAULT 1,
    "totalDays" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'DECISION_OPEN',
    "lastSubmittedAt" TIMESTAMP(3),
    "nextResultAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSimulationProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentSimulationProgress_simulationId_key" ON "StudentSimulationProgress"("simulationId");

-- AddForeignKey
ALTER TABLE "StudentSimulationProgress" ADD CONSTRAINT "StudentSimulationProgress_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "SimulationState"("id") ON DELETE CASCADE ON UPDATE CASCADE;
