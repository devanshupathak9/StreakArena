-- Existing tasks are all recurring habits, which is what the default encodes.
ALTER TABLE "Task" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'daily',
ADD COLUMN     "dueDate" DATE;

CREATE TABLE "PlatformActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "localDate" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "externalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformActivity_userId_platform_localDate_externalId_key"
    ON "PlatformActivity"("userId", "platform", "localDate", "externalId");

CREATE INDEX "PlatformActivity_userId_platform_localDate_idx"
    ON "PlatformActivity"("userId", "platform", "localDate");

ALTER TABLE "PlatformActivity" ADD CONSTRAINT "PlatformActivity_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
