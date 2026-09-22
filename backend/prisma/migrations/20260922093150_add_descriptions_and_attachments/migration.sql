-- AlterTable
ALTER TABLE "GroupMessage" ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "filePath" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "fileType" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "description" TEXT;
