-- AlterTable
ALTER TABLE "SimulationState" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'INITIALIZED';

-- CreateTable
CREATE TABLE "RoundSnapshot" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoundSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoundSnapshot_simulationId_round_key" ON "RoundSnapshot"("simulationId", "round");

-- AddForeignKey
ALTER TABLE "RoundSnapshot" ADD CONSTRAINT "RoundSnapshot_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "SimulationState"("id") ON DELETE CASCADE ON UPDATE CASCADE;
