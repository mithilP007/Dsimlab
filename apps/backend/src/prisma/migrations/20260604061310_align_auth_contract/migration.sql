-- AlterTable
ALTER TABLE "User" ADD COLUMN     "institution" TEXT,
ADD COLUMN     "planType" TEXT,
ALTER COLUMN "role" SET DEFAULT 'STUDENT_COLLEGE';
