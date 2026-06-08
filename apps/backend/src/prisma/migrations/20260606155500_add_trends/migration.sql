-- AlterTable
ALTER TABLE "Scenario" ADD COLUMN     "dailyBudgetCap" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
ADD COLUMN     "dataMode" TEXT NOT NULL DEFAULT 'REAL_TIME_TREND_SIMULATION',
ADD COLUMN     "durationDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "location" TEXT NOT NULL DEFAULT 'Global',
ADD COLUMN     "platforms" TEXT NOT NULL DEFAULT '["SEO", "GOOGLE_ADS", "META_ADS"]',
ADD COLUMN     "refreshTrendEveryRound" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "TrendSnapshot" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "signals" JSONB NOT NULL,
    "sources" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketConditionSnapshot" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "demandIndex" DOUBLE PRECISION NOT NULL,
    "competitionIndex" DOUBLE PRECISION NOT NULL,
    "cpcPressure" DOUBLE PRECISION NOT NULL,
    "cpmPressure" DOUBLE PRECISION NOT NULL,
    "conversionIntent" DOUBLE PRECISION NOT NULL,
    "seasonalImpact" DOUBLE PRECISION NOT NULL,
    "newsImpact" DOUBLE PRECISION NOT NULL,
    "platformModifiers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketConditionSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrendSnapshot_simulationId_roundNumber_idx" ON "TrendSnapshot"("simulationId", "roundNumber");

-- CreateIndex
CREATE INDEX "MarketConditionSnapshot_simulationId_roundNumber_idx" ON "MarketConditionSnapshot"("simulationId", "roundNumber");

-- CreateIndex
CREATE INDEX "DailyMetric_simulationId_round_idx" ON "DailyMetric"("simulationId", "round");

-- CreateIndex
CREATE INDEX "RoundSnapshot_simulationId_round_idx" ON "RoundSnapshot"("simulationId", "round");

-- CreateIndex
CREATE INDEX "ScoreBreakdown_simulationId_round_idx" ON "ScoreBreakdown"("simulationId", "round");

-- CreateIndex
CREATE INDEX "SimulationState_userId_status_idx" ON "SimulationState"("userId", "status");

-- CreateIndex
CREATE INDEX "SimulationState_classId_isCompleted_idx" ON "SimulationState"("classId", "isCompleted");

-- CreateIndex
CREATE INDEX "User_classId_idx" ON "User"("classId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");
