-- AlterTable
ALTER TABLE "PlatformAccount" ADD COLUMN     "lastSyncError" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TaskCompletion" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual';
