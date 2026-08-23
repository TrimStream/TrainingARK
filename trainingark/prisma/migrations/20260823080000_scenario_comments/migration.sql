-- Scenario discussion. Authors control only their own comments; platform
-- moderation is represented separately through reports and moderation status.
CREATE TYPE "CommentStatus" AS ENUM ('ACTIVE', 'DELETED', 'REMOVED');
CREATE TYPE "CommentReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'HATE', 'OTHER');
CREATE TYPE "CommentReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

CREATE TABLE "ScenarioComment" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "CommentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScenarioComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommentReport" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" "CommentReportReason" NOT NULL,
    "details" TEXT,
    "status" "CommentReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommentReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScenarioComment_scenarioId_createdAt_idx" ON "ScenarioComment"("scenarioId", "createdAt");
CREATE INDEX "ScenarioComment_userId_idx" ON "ScenarioComment"("userId");
CREATE UNIQUE INDEX "CommentReport_commentId_reporterId_key" ON "CommentReport"("commentId", "reporterId");
CREATE INDEX "CommentReport_status_createdAt_idx" ON "CommentReport"("status", "createdAt");
CREATE INDEX "CommentReport_reporterId_idx" ON "CommentReport"("reporterId");

ALTER TABLE "ScenarioComment" ADD CONSTRAINT "ScenarioComment_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScenarioComment" ADD CONSTRAINT "ScenarioComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommentReport" ADD CONSTRAINT "CommentReport_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "ScenarioComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommentReport" ADD CONSTRAINT "CommentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
