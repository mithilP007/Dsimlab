-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "band" TEXT NOT NULL DEFAULT 'COMPETENT',
ADD COLUMN     "skills" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "verificationId" TEXT;

-- AlterTable
ALTER TABLE "Decision" ADD COLUMN     "seoAnchorText" TEXT,
ADD COLUMN     "seoBacklinkQuality" INTEGER DEFAULT 1,
ADD COLUMN     "seoBodyContent" TEXT,
ADD COLUMN     "seoCoreWebVitals" TEXT,
ADD COLUMN     "seoInternalLinks" INTEGER DEFAULT 0,
ADD COLUMN     "seoMetaDescription" TEXT,
ADD COLUMN     "seoMetaTitle" TEXT,
ADD COLUMN     "seoTechnicalConfig" TEXT,
ADD COLUMN     "seoUrlSlug" TEXT;

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "durationDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ScoreBreakdown" ADD COLUMN     "strategicConsistency" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "SimulationState" ADD COLUMN     "instructorApproved" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TrendSnapshot" ADD COLUMN     "campaignRunId" TEXT,
ADD COLUMN     "confidenceScore" DOUBLE PRECISION DEFAULT 1.0,
ADD COLUMN     "dayNumber" INTEGER,
ADD COLUMN     "rawPayloadJson" JSONB,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "trendDataJson" JSONB,
ALTER COLUMN "simulationId" DROP NOT NULL,
ALTER COLUMN "roundNumber" DROP NOT NULL,
ALTER COLUMN "platform" DROP NOT NULL,
ALTER COLUMN "signals" DROP NOT NULL,
ALTER COLUMN "sources" DROP NOT NULL,
ALTER COLUMN "confidence" DROP NOT NULL,
ALTER COLUMN "fetchedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "CampaignRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "classId" TEXT,
    "assignmentId" TEXT,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "currentDay" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'INITIALIZED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "lastProcessedAt" TIMESTAMP(3),
    "nextProcessingAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCampaignDecision" (
    "id" TEXT NOT NULL,
    "campaignRunId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "seoSettingsJson" JSONB NOT NULL,
    "googleAdsSettingsJson" JSONB NOT NULL,
    "metaAdsSettingsJson" JSONB NOT NULL,
    "budgetJson" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyCampaignDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCampaignResult" (
    "id" TEXT NOT NULL,
    "campaignRunId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "trendSnapshotId" TEXT,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "cpc" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "cpa" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "roas" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "seoTraffic" INTEGER NOT NULL DEFAULT 0,
    "seoRank" INTEGER NOT NULL DEFAULT 0,
    "authorityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "metaReach" INTEGER NOT NULL DEFAULT 0,
    "metaEngagement" INTEGER NOT NULL DEFAULT 0,
    "googleAdsScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "metaAdsScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "seoScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "compositeScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyCampaignResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCampaignRecommendation" (
    "id" TEXT NOT NULL,
    "campaignRunId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "recommendationType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "expectedImpact" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyCampaignRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignProcessingJob" (
    "id" TEXT NOT NULL,
    "campaignRunId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "jobStatus" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "idempotencyKey" TEXT NOT NULL,

    CONSTRAINT "CampaignProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioAssignment" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "institutionId" TEXT,
    "classId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetStudentIdsJson" TEXT NOT NULL,
    "assignmentName" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "dailyProcessingTime" TEXT NOT NULL,
    "dailyBudgetCap" DOUBLE PRECISION NOT NULL,
    "difficulty" TEXT NOT NULL,
    "autoStart" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScenarioAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioAssignmentStudent" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "campaignRunId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ScenarioAssignmentStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckpointValidation" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "studentId" TEXT NOT NULL,
    "justificationText" TEXT NOT NULL,
    "reflectionQualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "instructorComment" TEXT,

    CONSTRAINT "CheckpointValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HardViolation" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "studentId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'BLOCKING',
    "message" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HardViolation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassEnrollment" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "actionByInstructorId" TEXT,
    "rejectionReason" TEXT,
    "removalReason" TEXT,

    CONSTRAINT "ClassEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignRun_userId_idx" ON "CampaignRun"("userId");

-- CreateIndex
CREATE INDEX "CampaignRun_classId_idx" ON "CampaignRun"("classId");

-- CreateIndex
CREATE INDEX "CampaignRun_status_idx" ON "CampaignRun"("status");

-- CreateIndex
CREATE INDEX "CampaignRun_nextProcessingAt_idx" ON "CampaignRun"("nextProcessingAt");

-- CreateIndex
CREATE INDEX "DailyCampaignDecision_userId_idx" ON "DailyCampaignDecision"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCampaignDecision_campaignRunId_dayNumber_key" ON "DailyCampaignDecision"("campaignRunId", "dayNumber");

-- CreateIndex
CREATE INDEX "DailyCampaignResult_userId_idx" ON "DailyCampaignResult"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCampaignResult_campaignRunId_dayNumber_key" ON "DailyCampaignResult"("campaignRunId", "dayNumber");

-- CreateIndex
CREATE INDEX "DailyCampaignRecommendation_campaignRunId_dayNumber_idx" ON "DailyCampaignRecommendation"("campaignRunId", "dayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignProcessingJob_idempotencyKey_key" ON "CampaignProcessingJob"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignProcessingJob_campaignRunId_dayNumber_key" ON "CampaignProcessingJob"("campaignRunId", "dayNumber");

-- CreateIndex
CREATE INDEX "ScenarioAssignment_instructorId_idx" ON "ScenarioAssignment"("instructorId");

-- CreateIndex
CREATE INDEX "ScenarioAssignment_classId_idx" ON "ScenarioAssignment"("classId");

-- CreateIndex
CREATE INDEX "ScenarioAssignment_scenarioId_idx" ON "ScenarioAssignment"("scenarioId");

-- CreateIndex
CREATE INDEX "ScenarioAssignment_status_idx" ON "ScenarioAssignment"("status");

-- CreateIndex
CREATE INDEX "ScenarioAssignmentStudent_studentId_idx" ON "ScenarioAssignmentStudent"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioAssignmentStudent_assignmentId_studentId_key" ON "ScenarioAssignmentStudent"("assignmentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_name_key" ON "Institution"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_code_key" ON "Institution"("code");

-- CreateIndex
CREATE INDEX "CheckpointValidation_simulationId_idx" ON "CheckpointValidation"("simulationId");

-- CreateIndex
CREATE INDEX "CheckpointValidation_studentId_idx" ON "CheckpointValidation"("studentId");

-- CreateIndex
CREATE INDEX "HardViolation_simulationId_idx" ON "HardViolation"("simulationId");

-- CreateIndex
CREATE INDEX "HardViolation_studentId_idx" ON "HardViolation"("studentId");

-- CreateIndex
CREATE INDEX "ClassEnrollment_classId_idx" ON "ClassEnrollment"("classId");

-- CreateIndex
CREATE INDEX "ClassEnrollment_studentId_idx" ON "ClassEnrollment"("studentId");

-- CreateIndex
CREATE INDEX "ClassEnrollment_studentEmail_idx" ON "ClassEnrollment"("studentEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_verificationId_key" ON "Certificate"("verificationId");

-- CreateIndex
CREATE INDEX "TrendSnapshot_campaignRunId_dayNumber_idx" ON "TrendSnapshot"("campaignRunId", "dayNumber");

-- AddForeignKey
ALTER TABLE "TrendSnapshot" ADD CONSTRAINT "TrendSnapshot_campaignRunId_fkey" FOREIGN KEY ("campaignRunId") REFERENCES "CampaignRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRun" ADD CONSTRAINT "CampaignRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRun" ADD CONSTRAINT "CampaignRun_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRun" ADD CONSTRAINT "CampaignRun_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRun" ADD CONSTRAINT "CampaignRun_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ScenarioAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCampaignDecision" ADD CONSTRAINT "DailyCampaignDecision_campaignRunId_fkey" FOREIGN KEY ("campaignRunId") REFERENCES "CampaignRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCampaignResult" ADD CONSTRAINT "DailyCampaignResult_campaignRunId_fkey" FOREIGN KEY ("campaignRunId") REFERENCES "CampaignRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCampaignResult" ADD CONSTRAINT "DailyCampaignResult_trendSnapshotId_fkey" FOREIGN KEY ("trendSnapshotId") REFERENCES "TrendSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCampaignRecommendation" ADD CONSTRAINT "DailyCampaignRecommendation_campaignRunId_fkey" FOREIGN KEY ("campaignRunId") REFERENCES "CampaignRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignProcessingJob" ADD CONSTRAINT "CampaignProcessingJob_campaignRunId_fkey" FOREIGN KEY ("campaignRunId") REFERENCES "CampaignRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioAssignment" ADD CONSTRAINT "ScenarioAssignment_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioAssignment" ADD CONSTRAINT "ScenarioAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioAssignment" ADD CONSTRAINT "ScenarioAssignment_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioAssignmentStudent" ADD CONSTRAINT "ScenarioAssignmentStudent_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ScenarioAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioAssignmentStudent" ADD CONSTRAINT "ScenarioAssignmentStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioAssignmentStudent" ADD CONSTRAINT "ScenarioAssignmentStudent_campaignRunId_fkey" FOREIGN KEY ("campaignRunId") REFERENCES "CampaignRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckpointValidation" ADD CONSTRAINT "CheckpointValidation_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "SimulationState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HardViolation" ADD CONSTRAINT "HardViolation_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "SimulationState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

