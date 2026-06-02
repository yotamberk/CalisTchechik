-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "endDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SessionLog" ADD COLUMN     "startedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Week" ADD COLUMN     "endDate" TIMESTAMP(3);
