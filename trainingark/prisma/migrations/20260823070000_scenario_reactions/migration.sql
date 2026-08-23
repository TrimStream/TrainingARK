CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'DISLIKE');

CREATE TABLE "ScenarioReaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScenarioReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScenarioReaction_userId_scenarioId_key"
ON "ScenarioReaction"("userId", "scenarioId");

CREATE INDEX "ScenarioReaction_scenarioId_type_idx"
ON "ScenarioReaction"("scenarioId", "type");

ALTER TABLE "ScenarioReaction"
ADD CONSTRAINT "ScenarioReaction_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScenarioReaction"
ADD CONSTRAINT "ScenarioReaction_scenarioId_fkey"
FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
