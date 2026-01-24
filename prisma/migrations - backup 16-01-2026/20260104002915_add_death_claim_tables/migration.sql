-- CreateEnum
CREATE TYPE "DeathClaimStatus" AS ENUM ('Reported', 'UnderVerification', 'Verified', 'PendingApproval', 'Approved', 'Settled', 'Rejected');

-- CreateEnum
CREATE TYPE "DeathClaimVerificationStatus" AS ENUM ('Pending', 'InProgress', 'Completed', 'Rejected');

-- CreateEnum
CREATE TYPE "DeathClaimSettlementStatus" AS ENUM ('Pending', 'Completed');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('Cash', 'BankTransfer', 'Cheque');

-- CreateEnum
CREATE TYPE "ClaimDocumentType" AS ENUM ('DeathCertificate', 'NewspaperClipping', 'PoliceReport', 'MedicalReport', 'PostMortemReport', 'Other');

-- CreateEnum
CREATE TYPE "ClaimDocumentVerificationStatus" AS ENUM ('Pending', 'Verified', 'Rejected');

-- CreateTable
CREATE TABLE "DeathClaim" (
    "claimId" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "claimStatus" "DeathClaimStatus" NOT NULL DEFAULT 'Reported',
    "approvalRequestId" TEXT,
    "memberId" TEXT NOT NULL,
    "memberCode" TEXT NOT NULL,
    "memberName" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "forumId" TEXT NOT NULL,
    "deathDate" TIMESTAMP(3) NOT NULL,
    "deathPlace" TEXT,
    "causeOfDeath" TEXT,
    "reportedBy" TEXT NOT NULL,
    "reportedByRole" TEXT NOT NULL,
    "reportedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "initialNotes" TEXT,
    "nomineeId" TEXT NOT NULL,
    "nomineeName" TEXT NOT NULL,
    "nomineeRelation" TEXT NOT NULL,
    "nomineeContactNumber" TEXT NOT NULL,
    "nomineeAddress" JSONB NOT NULL,
    "benefitAmount" DECIMAL(15,2),
    "verificationStatus" "DeathClaimVerificationStatus" NOT NULL DEFAULT 'Pending',
    "verifiedBy" TEXT,
    "verifiedDate" TIMESTAMP(3),
    "verificationNotes" TEXT,
    "settlementStatus" "DeathClaimSettlementStatus" NOT NULL DEFAULT 'Pending',
    "paymentMethod" "PaymentMethod",
    "paymentReference" TEXT,
    "paymentDate" TIMESTAMP(3),
    "paidBy" TEXT,
    "nomineeAcknowledgment" TEXT,
    "journalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,

    CONSTRAINT "DeathClaim_pkey" PRIMARY KEY ("claimId")
);

-- CreateTable
CREATE TABLE "DeathClaimDocument" (
    "documentId" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "documentType" "ClaimDocumentType" NOT NULL,
    "documentName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificationStatus" "ClaimDocumentVerificationStatus" NOT NULL DEFAULT 'Pending',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,

    CONSTRAINT "DeathClaimDocument_pkey" PRIMARY KEY ("documentId")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeathClaim_claimNumber_key" ON "DeathClaim"("claimNumber");

-- CreateIndex
CREATE INDEX "DeathClaim_claimNumber_idx" ON "DeathClaim"("claimNumber");

-- CreateIndex
CREATE INDEX "DeathClaim_memberId_idx" ON "DeathClaim"("memberId");

-- CreateIndex
CREATE INDEX "DeathClaim_claimStatus_idx" ON "DeathClaim"("claimStatus");

-- CreateIndex
CREATE INDEX "DeathClaim_approvalRequestId_idx" ON "DeathClaim"("approvalRequestId");

-- CreateIndex
CREATE INDEX "DeathClaim_agentId_idx" ON "DeathClaim"("agentId");

-- CreateIndex
CREATE INDEX "DeathClaim_unitId_idx" ON "DeathClaim"("unitId");

-- CreateIndex
CREATE INDEX "DeathClaim_forumId_idx" ON "DeathClaim"("forumId");

-- CreateIndex
CREATE INDEX "DeathClaimDocument_claimId_idx" ON "DeathClaimDocument"("claimId");

-- CreateIndex
CREATE INDEX "DeathClaimDocument_documentType_idx" ON "DeathClaimDocument"("documentType");

-- AddForeignKey
ALTER TABLE "DeathClaim" ADD CONSTRAINT "DeathClaim_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("requestId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeathClaim" ADD CONSTRAINT "DeathClaim_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("memberId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeathClaim" ADD CONSTRAINT "DeathClaim_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "MembershipTier"("tierId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeathClaim" ADD CONSTRAINT "DeathClaim_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("agentId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeathClaim" ADD CONSTRAINT "DeathClaim_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("unitId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeathClaim" ADD CONSTRAINT "DeathClaim_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("entryId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeathClaimDocument" ADD CONSTRAINT "DeathClaimDocument_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "DeathClaim"("claimId") ON DELETE RESTRICT ON UPDATE CASCADE;
