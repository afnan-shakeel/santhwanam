-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('Draft', 'PendingApproval', 'Approved', 'Rejected');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('Active', 'Inactive', 'Suspended', 'Terminated');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female', 'Other');

-- CreateTable
CREATE TABLE "Agent" (
    "agentId" TEXT NOT NULL,
    "agentCode" TEXT NOT NULL,
    "registrationStatus" "RegistrationStatus" NOT NULL DEFAULT 'Draft',
    "approvalRequestId" TEXT,
    "unitId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "forumId" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "alternateContactNumber" TEXT,
    "email" TEXT NOT NULL,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "agentStatus" "AgentStatus" NOT NULL DEFAULT 'Active',
    "totalActiveMembers" INTEGER NOT NULL DEFAULT 0,
    "totalRegistrations" INTEGER NOT NULL DEFAULT 0,
    "joinedDate" TIMESTAMP(3),
    "terminatedDate" TIMESTAMP(3),
    "terminationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" TEXT,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("agentId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_email_key" ON "Agent"("email");

-- CreateIndex
CREATE INDEX "Agent_unitId_idx" ON "Agent"("unitId");

-- CreateIndex
CREATE INDEX "Agent_areaId_idx" ON "Agent"("areaId");

-- CreateIndex
CREATE INDEX "Agent_forumId_idx" ON "Agent"("forumId");

-- CreateIndex
CREATE INDEX "Agent_userId_idx" ON "Agent"("userId");

-- CreateIndex
CREATE INDEX "Agent_email_idx" ON "Agent"("email");

-- CreateIndex
CREATE INDEX "Agent_approvalRequestId_idx" ON "Agent"("approvalRequestId");

-- CreateIndex
CREATE INDEX "Agent_registrationStatus_idx" ON "Agent"("registrationStatus");

-- CreateIndex
CREATE INDEX "Agent_agentStatus_idx" ON "Agent"("agentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_unitId_agentCode_key" ON "Agent"("unitId", "agentCode");

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("requestId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("unitId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
