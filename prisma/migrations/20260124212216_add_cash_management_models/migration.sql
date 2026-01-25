-- CreateEnum
CREATE TYPE "CashCustodyUserRole" AS ENUM ('Agent', 'UnitAdmin', 'AreaAdmin', 'ForumAdmin');

-- CreateEnum
CREATE TYPE "CashCustodyStatus" AS ENUM ('Active', 'Inactive', 'Suspended');

-- CreateEnum
CREATE TYPE "CashHandoverStatus" AS ENUM ('Initiated', 'Acknowledged', 'Rejected', 'Cancelled');

-- CreateEnum
CREATE TYPE "CashHandoverType" AS ENUM ('Normal', 'AdminTransition');

-- AlterEnum
ALTER TYPE "WorkflowModule" ADD VALUE 'CashManagement';

-- CreateTable
CREATE TABLE "cash_custodies" (
    "custodyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userRole" "CashCustodyUserRole" NOT NULL,
    "glAccountCode" TEXT NOT NULL,
    "unitId" TEXT,
    "areaId" TEXT,
    "forumId" TEXT,
    "status" "CashCustodyStatus" NOT NULL DEFAULT 'Active',
    "currentBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalReceived" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalTransferred" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "lastTransactionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deactivatedAt" TIMESTAMP(3),
    "deactivatedBy" TEXT,
    "deactivatedReason" TEXT,

    CONSTRAINT "cash_custodies_pkey" PRIMARY KEY ("custodyId")
);

-- CreateTable
CREATE TABLE "cash_handovers" (
    "handoverId" TEXT NOT NULL,
    "handoverNumber" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "fromUserRole" "CashCustodyUserRole" NOT NULL,
    "fromCustodyId" TEXT NOT NULL,
    "fromGlAccountCode" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "toUserRole" TEXT NOT NULL,
    "toCustodyId" TEXT,
    "toGlAccountCode" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "unitId" TEXT,
    "areaId" TEXT,
    "forumId" TEXT NOT NULL,
    "status" "CashHandoverStatus" NOT NULL DEFAULT 'Initiated',
    "handoverType" "CashHandoverType" NOT NULL DEFAULT 'Normal',
    "sourceHandoverId" TEXT,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvalRequestId" TEXT,
    "journalEntryId" TEXT,
    "initiatedAt" TIMESTAMP(3) NOT NULL,
    "acknowledgedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "initiatorNotes" TEXT,
    "receiverNotes" TEXT,
    "rejectionReason" TEXT,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_handovers_pkey" PRIMARY KEY ("handoverId")
);

-- CreateIndex
CREATE INDEX "cash_custodies_userId_idx" ON "cash_custodies"("userId");

-- CreateIndex
CREATE INDEX "cash_custodies_status_idx" ON "cash_custodies"("status");

-- CreateIndex
CREATE INDEX "cash_custodies_forumId_idx" ON "cash_custodies"("forumId");

-- CreateIndex
CREATE INDEX "cash_custodies_glAccountCode_idx" ON "cash_custodies"("glAccountCode");

-- CreateIndex
CREATE UNIQUE INDEX "cash_handovers_handoverNumber_key" ON "cash_handovers"("handoverNumber");

-- CreateIndex
CREATE INDEX "cash_handovers_fromUserId_idx" ON "cash_handovers"("fromUserId");

-- CreateIndex
CREATE INDEX "cash_handovers_toUserId_idx" ON "cash_handovers"("toUserId");

-- CreateIndex
CREATE INDEX "cash_handovers_status_idx" ON "cash_handovers"("status");

-- CreateIndex
CREATE INDEX "cash_handovers_forumId_idx" ON "cash_handovers"("forumId");

-- CreateIndex
CREATE INDEX "cash_handovers_initiatedAt_idx" ON "cash_handovers"("initiatedAt");

-- CreateIndex
CREATE INDEX "cash_handovers_sourceHandoverId_idx" ON "cash_handovers"("sourceHandoverId");

-- AddForeignKey
ALTER TABLE "cash_custodies" ADD CONSTRAINT "cash_custodies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_custodies" ADD CONSTRAINT "cash_custodies_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("unitId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_custodies" ADD CONSTRAINT "cash_custodies_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("areaId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_custodies" ADD CONSTRAINT "cash_custodies_forumId_fkey" FOREIGN KEY ("forumId") REFERENCES "Forum"("forumId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_custodies" ADD CONSTRAINT "cash_custodies_deactivatedBy_fkey" FOREIGN KEY ("deactivatedBy") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_handovers" ADD CONSTRAINT "cash_handovers_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_handovers" ADD CONSTRAINT "cash_handovers_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_handovers" ADD CONSTRAINT "cash_handovers_fromCustodyId_fkey" FOREIGN KEY ("fromCustodyId") REFERENCES "cash_custodies"("custodyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_handovers" ADD CONSTRAINT "cash_handovers_toCustodyId_fkey" FOREIGN KEY ("toCustodyId") REFERENCES "cash_custodies"("custodyId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_handovers" ADD CONSTRAINT "cash_handovers_sourceHandoverId_fkey" FOREIGN KEY ("sourceHandoverId") REFERENCES "cash_handovers"("handoverId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_handovers" ADD CONSTRAINT "cash_handovers_forumId_fkey" FOREIGN KEY ("forumId") REFERENCES "Forum"("forumId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_handovers" ADD CONSTRAINT "cash_handovers_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("requestId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_handovers" ADD CONSTRAINT "cash_handovers_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("entryId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_handovers" ADD CONSTRAINT "cash_handovers_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
