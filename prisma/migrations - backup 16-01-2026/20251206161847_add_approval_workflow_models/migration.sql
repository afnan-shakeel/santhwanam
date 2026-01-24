-- CreateEnum
CREATE TYPE "WorkflowModule" AS ENUM ('Membership', 'Wallet', 'Claims', 'Contributions', 'Organization');

-- CreateEnum
CREATE TYPE "ApproverType" AS ENUM ('Role', 'SpecificUser', 'Hierarchy');

-- CreateEnum
CREATE TYPE "HierarchyLevel" AS ENUM ('Unit', 'Area', 'Forum');

-- CreateEnum
CREATE TYPE "ApprovalRequestStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'Cancelled');

-- CreateEnum
CREATE TYPE "ApprovalStageStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'Skipped');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('Approve', 'Reject');

-- CreateTable
CREATE TABLE "ApprovalWorkflow" (
    "workflowId" TEXT NOT NULL,
    "workflowCode" TEXT NOT NULL,
    "workflowName" TEXT NOT NULL,
    "description" TEXT,
    "module" "WorkflowModule" NOT NULL,
    "entityType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresAllStages" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" TEXT,

    CONSTRAINT "ApprovalWorkflow_pkey" PRIMARY KEY ("workflowId")
);

-- CreateTable
CREATE TABLE "ApprovalStage" (
    "stageId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "stageName" TEXT NOT NULL,
    "stageOrder" INTEGER NOT NULL,
    "approverType" "ApproverType" NOT NULL,
    "roleId" TEXT,
    "userId" TEXT,
    "hierarchyLevel" "HierarchyLevel",
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "autoApprove" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalStage_pkey" PRIMARY KEY ("stageId")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "requestId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "forumId" TEXT,
    "areaId" TEXT,
    "unitId" TEXT,
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL,
    "status" "ApprovalRequestStatus" NOT NULL DEFAULT 'Pending',
    "currentStageOrder" INTEGER,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("requestId")
);

-- CreateTable
CREATE TABLE "ApprovalStageExecution" (
    "executionId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "stageOrder" INTEGER NOT NULL,
    "status" "ApprovalStageStatus" NOT NULL DEFAULT 'Pending',
    "assignedApproverId" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "decision" "ApprovalDecision",
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ApprovalStageExecution_pkey" PRIMARY KEY ("executionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalWorkflow_workflowCode_key" ON "ApprovalWorkflow"("workflowCode");

-- CreateIndex
CREATE INDEX "ApprovalWorkflow_workflowCode_idx" ON "ApprovalWorkflow"("workflowCode");

-- CreateIndex
CREATE INDEX "ApprovalWorkflow_isActive_idx" ON "ApprovalWorkflow"("isActive");

-- CreateIndex
CREATE INDEX "ApprovalStage_workflowId_stageOrder_idx" ON "ApprovalStage"("workflowId", "stageOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalStage_workflowId_stageOrder_key" ON "ApprovalStage"("workflowId", "stageOrder");

-- CreateIndex
CREATE INDEX "ApprovalRequest_entityType_entityId_idx" ON "ApprovalRequest"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_status_idx" ON "ApprovalRequest"("status");

-- CreateIndex
CREATE INDEX "ApprovalRequest_requestedBy_idx" ON "ApprovalRequest"("requestedBy");

-- CreateIndex
CREATE INDEX "ApprovalStageExecution_requestId_idx" ON "ApprovalStageExecution"("requestId");

-- CreateIndex
CREATE INDEX "ApprovalStageExecution_assignedApproverId_status_idx" ON "ApprovalStageExecution"("assignedApproverId", "status");

-- AddForeignKey
ALTER TABLE "ApprovalStage" ADD CONSTRAINT "ApprovalStage_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflow"("workflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflow"("workflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStageExecution" ADD CONSTRAINT "ApprovalStageExecution_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ApprovalRequest"("requestId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStageExecution" ADD CONSTRAINT "ApprovalStageExecution_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ApprovalStage"("stageId") ON DELETE RESTRICT ON UPDATE CASCADE;
