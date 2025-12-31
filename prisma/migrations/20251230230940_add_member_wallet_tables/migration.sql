-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('Deposit', 'Debit', 'Refund', 'Adjustment');

-- CreateEnum
CREATE TYPE "WalletTransactionStatus" AS ENUM ('Pending', 'Completed', 'Failed', 'Reversed');

-- CreateEnum
CREATE TYPE "WalletDepositRequestStatus" AS ENUM ('Draft', 'PendingApproval', 'Approved', 'Rejected');

-- CreateEnum
CREATE TYPE "WalletDebitRequestStatus" AS ENUM ('PendingAcknowledgment', 'Acknowledged', 'Completed', 'Invalidated', 'Failed');

-- CreateTable
CREATE TABLE "Wallet" (
    "walletId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "currentBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("walletId")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "transactionId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "transactionType" "WalletTransactionType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "balanceAfter" DECIMAL(15,2) NOT NULL,
    "sourceModule" TEXT NOT NULL,
    "sourceEntityId" TEXT,
    "description" TEXT NOT NULL,
    "journalEntryId" TEXT,
    "status" "WalletTransactionStatus" NOT NULL DEFAULT 'Completed',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("transactionId")
);

-- CreateTable
CREATE TABLE "WalletDepositRequest" (
    "depositRequestId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "collectionDate" TIMESTAMP(3) NOT NULL,
    "collectedBy" TEXT NOT NULL,
    "notes" TEXT,
    "requestStatus" "WalletDepositRequestStatus" NOT NULL DEFAULT 'Draft',
    "approvalRequestId" TEXT,
    "journalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),

    CONSTRAINT "WalletDepositRequest_pkey" PRIMARY KEY ("depositRequestId")
);

-- CreateTable
CREATE TABLE "WalletDebitRequest" (
    "debitRequestId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "purpose" TEXT NOT NULL,
    "contributionCycleId" TEXT,
    "contributionId" TEXT,
    "status" "WalletDebitRequestStatus" NOT NULL DEFAULT 'PendingAcknowledgment',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WalletDebitRequest_pkey" PRIMARY KEY ("debitRequestId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_memberId_key" ON "Wallet"("memberId");

-- CreateIndex
CREATE INDEX "Wallet_memberId_idx" ON "Wallet"("memberId");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_idx" ON "WalletTransaction"("walletId");

-- CreateIndex
CREATE INDEX "WalletTransaction_transactionType_idx" ON "WalletTransaction"("transactionType");

-- CreateIndex
CREATE INDEX "WalletTransaction_sourceModule_sourceEntityId_idx" ON "WalletTransaction"("sourceModule", "sourceEntityId");

-- CreateIndex
CREATE INDEX "WalletTransaction_createdAt_idx" ON "WalletTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "WalletDepositRequest_memberId_idx" ON "WalletDepositRequest"("memberId");

-- CreateIndex
CREATE INDEX "WalletDepositRequest_walletId_idx" ON "WalletDepositRequest"("walletId");

-- CreateIndex
CREATE INDEX "WalletDepositRequest_requestStatus_idx" ON "WalletDepositRequest"("requestStatus");

-- CreateIndex
CREATE INDEX "WalletDepositRequest_collectedBy_idx" ON "WalletDepositRequest"("collectedBy");

-- CreateIndex
CREATE INDEX "WalletDebitRequest_memberId_idx" ON "WalletDebitRequest"("memberId");

-- CreateIndex
CREATE INDEX "WalletDebitRequest_walletId_idx" ON "WalletDebitRequest"("walletId");

-- CreateIndex
CREATE INDEX "WalletDebitRequest_status_idx" ON "WalletDebitRequest"("status");

-- CreateIndex
CREATE INDEX "WalletDebitRequest_contributionId_idx" ON "WalletDebitRequest"("contributionId");

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("memberId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("walletId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("entryId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletDepositRequest" ADD CONSTRAINT "WalletDepositRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("memberId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletDepositRequest" ADD CONSTRAINT "WalletDepositRequest_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("walletId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletDepositRequest" ADD CONSTRAINT "WalletDepositRequest_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("requestId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletDepositRequest" ADD CONSTRAINT "WalletDepositRequest_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("entryId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletDebitRequest" ADD CONSTRAINT "WalletDebitRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("memberId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletDebitRequest" ADD CONSTRAINT "WalletDebitRequest_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("walletId") ON DELETE RESTRICT ON UPDATE CASCADE;
