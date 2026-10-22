-- A Google-only account has no password, so the column stops being required.
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

ALTER TABLE "User" ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "googleEmail" TEXT;

CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
