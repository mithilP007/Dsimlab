-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "classId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "startRound" INTEGER NOT NULL DEFAULT 1,
    "maxRounds" INTEGER NOT NULL DEFAULT 10,
    "budgetPerRound" DOUBLE PRECISION NOT NULL DEFAULT 5000.0,
    "baselineOrganicTraffic" INTEGER NOT NULL DEFAULT 1000,
    "targetKPI" TEXT NOT NULL DEFAULT 'revenue',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "cumulativeSpend" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "cumulativeRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimulationState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seoTargetKeywords" TEXT NOT NULL,
    "seoContentQuality" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "seoBacklinkBudget" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "googleCampaigns" TEXT NOT NULL,
    "metaCampaigns" TEXT NOT NULL,
    "submitted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMetric" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organicImpressions" INTEGER NOT NULL DEFAULT 0,
    "organicClicks" INTEGER NOT NULL DEFAULT 0,
    "organicCTR" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "organicConversions" INTEGER NOT NULL DEFAULT 0,
    "googleImpressions" INTEGER NOT NULL DEFAULT 0,
    "googleClicks" INTEGER NOT NULL DEFAULT 0,
    "googleCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "googleConversions" INTEGER NOT NULL DEFAULT 0,
    "metaImpressions" INTEGER NOT NULL DEFAULT 0,
    "metaClicks" INTEGER NOT NULL DEFAULT 0,
    "metaCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "metaConversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    CONSTRAINT "DailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketEvent" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "impactMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreBreakdown" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "seoScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "googleAdsScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "metaAdsScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "budgetScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "revenueScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "compositeIndex" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "percentileRank" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreBreakdown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificationHash" TEXT NOT NULL,
    "compositeScore" DOUBLE PRECISION NOT NULL,
    "pdfUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Class_inviteCode_key" ON "Class"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "Decision_simulationId_round_key" ON "Decision"("simulationId", "round");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreBreakdown_simulationId_round_key" ON "ScoreBreakdown"("simulationId", "round");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_verificationHash_key" ON "Certificate"("verificationHash");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationState" ADD CONSTRAINT "SimulationState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationState" ADD CONSTRAINT "SimulationState_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "SimulationState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMetric" ADD CONSTRAINT "DailyMetric_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "SimulationState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreBreakdown" ADD CONSTRAINT "ScoreBreakdown_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "SimulationState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "SimulationState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
