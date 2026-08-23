-- Replace the published flag with an explicit visibility state. Existing
-- published scenarios remain discoverable; every unpublished scenario stays
-- private as a draft.
CREATE TYPE "ScenarioVisibility" AS ENUM ('DRAFT', 'UNLISTED', 'PUBLIC');

ALTER TABLE "Scenario"
ADD COLUMN "visibility" "ScenarioVisibility" NOT NULL DEFAULT 'DRAFT';

UPDATE "Scenario"
SET "visibility" = 'PUBLIC'
WHERE "published" = true;

ALTER TABLE "Scenario" DROP COLUMN "published";

CREATE INDEX "Scenario_visibility_updatedAt_idx"
ON "Scenario"("visibility", "updatedAt");
