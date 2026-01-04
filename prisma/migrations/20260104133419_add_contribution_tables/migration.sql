-- CreateEnum
CREATE TYPE "ContributionCycleStatus" AS ENUM ('Active', 'Closed');

-- CreateEnum
CREATE TYPE "MemberContributionStatus" AS ENUM ('Pending', 'WalletDebitRequested', 'Acknowledged', 'Collected', 'Missed', 'Exempted');

-- CreateEnum
CREATE TYPE "ContributionPaymentMethod" AS ENUM ('Wallet', 'DirectCash');

-- CreateTable
CREATE TABLE "ContributionCycle" (
    "cycleId" TEXT NOT NULL,
    "cycleNumber" TEXT NOT NULL,
    "deathClaimId" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "deceasedMemberId" TEXT NOT NULL,
    "deceasedMemberName" TEXT NOT NULL,
    "benefitAmount" DECIMAL(15,2) NOT NULL,
    "forumId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "collectionDeadline" TIMESTAMP(3) NOT NULL,
    "cycleStatus" "ContributionCycleStatus" NOT NULL DEFAULT 'Active',
    "totalMembers" INTEGER NOT NULL,
    "totalExpectedAmount" DECIMAL(15,2) NOT NULL,
    "totalCollectedAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalPendingAmount" DECIMAL(15,2) NOT NULL,
    "membersCollected" INTEGER NOT NULL DEFAULT 0,
    "membersPending" INTEGER NOT NULL,
    "membersMissed" INTEGER NOT NULL DEFAULT 0,
    "closedDate" TIMESTAMP(3),
    "closedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ContributionCycle_pkey" PRIMARY KEY ("cycleId")
);

-- CreateTable
CREATE TABLE "MemberContribution" (
    "contributionId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "memberCode" TEXT NOT NULL,
    "memberName" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "expectedAmount" DECIMAL(15,2) NOT NULL,
    "contributionStatus" "MemberContributionStatus" NOT NULL DEFAULT 'Pending',
    "paymentMethod" "ContributionPaymentMethod",
    "collectionDate" TIMESTAMP(3),
    "collectedBy" TEXT,
    "walletDebitRequestId" TEXT,
    "debitAcknowledgedAt" TIMESTAMP(3),
    "cashReceiptReference" TEXT,
    "journalEntryId" TEXT,
    "isConsecutiveMiss" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "MemberContribution_pkey" PRIMARY KEY ("contributionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContributionCycle_cycleNumber_key" ON "ContributionCycle"("cycleNumber");

-- CreateIndex
CREATE INDEX "ContributionCycle_cycleNumber_idx" ON "ContributionCycle"("cycleNumber");

-- CreateIndex
CREATE INDEX "ContributionCycle_deathClaimId_idx" ON "ContributionCycle"("deathClaimId");

-- CreateIndex
CREATE INDEX "ContributionCycle_cycleStatus_idx" ON "ContributionCycle"("cycleStatus");

-- CreateIndex
CREATE INDEX "ContributionCycle_forumId_idx" ON "ContributionCycle"("forumId");

-- CreateIndex
CREATE INDEX "MemberContribution_cycleId_idx" ON "MemberContribution"("cycleId");

-- CreateIndex
CREATE INDEX "MemberContribution_memberId_idx" ON "MemberContribution"("memberId");

-- CreateIndex
CREATE INDEX "MemberContribution_contributionStatus_idx" ON "MemberContribution"("contributionStatus");

-- CreateIndex
CREATE INDEX "MemberContribution_agentId_idx" ON "MemberContribution"("agentId");

-- CreateIndex
CREATE INDEX "MemberContribution_tierId_idx" ON "MemberContribution"("tierId");

-- AddForeignKey
ALTER TABLE "ContributionCycle" ADD CONSTRAINT "ContributionCycle_deathClaimId_fkey" FOREIGN KEY ("deathClaimId") REFERENCES "DeathClaim"("claimId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributionCycle" ADD CONSTRAINT "ContributionCycle_forumId_fkey" FOREIGN KEY ("forumId") REFERENCES "Forum"("forumId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberContribution" ADD CONSTRAINT "MemberContribution_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "ContributionCycle"("cycleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberContribution" ADD CONSTRAINT "MemberContribution_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("memberId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberContribution" ADD CONSTRAINT "MemberContribution_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "MembershipTier"("tierId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberContribution" ADD CONSTRAINT "MemberContribution_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("agentId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberContribution" ADD CONSTRAINT "MemberContribution_walletDebitRequestId_fkey" FOREIGN KEY ("walletDebitRequestId") REFERENCES "WalletDebitRequest"("debitRequestId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberContribution" ADD CONSTRAINT "MemberContribution_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("entryId") ON DELETE SET NULL ON UPDATE CASCADE;
