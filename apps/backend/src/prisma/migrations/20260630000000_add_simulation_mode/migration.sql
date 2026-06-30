-- AlterTable
ALTER TABLE "Scenario" ADD COLUMN IF NOT EXISTS "simulationMode" TEXT;
UPDATE "Scenario" SET "simulationMode" = 'GOOGLE_ADS' WHERE "simulationMode" IS NULL;

-- AlterTable
ALTER TABLE "SimulationState" ADD COLUMN IF NOT EXISTS "simulationMode" TEXT;
UPDATE "SimulationState" SET "simulationMode" = 'GOOGLE_ADS' WHERE "simulationMode" IS NULL;
