-- AddColumn
ALTER TABLE "Participant" ADD COLUMN "userIdentifier" TEXT;

-- CreateIndex
CREATE INDEX "Participant_groupId_idx" ON "Participant"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_groupId_userIdentifier_key" ON "Participant"("groupId", "userIdentifier");
