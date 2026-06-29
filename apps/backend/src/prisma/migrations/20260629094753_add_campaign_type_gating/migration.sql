-- AlterTable
ALTER TABLE "Scenario" ADD COLUMN     "allowedCampaignTypes" TEXT NOT NULL DEFAULT '["Search", "Display", "Video", "Shopping"]',
ADD COLUMN     "checkpointRequired" BOOLEAN NOT NULL DEFAULT true;
