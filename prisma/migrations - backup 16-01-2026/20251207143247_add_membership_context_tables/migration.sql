-- CreateEnum
CREATE TYPE "MemberRegistrationStatus" AS ENUM ('Draft', 'PendingApproval', 'Approved', 'Rejected');

-- CreateEnum
CREATE TYPE "MemberRegistrationStep" AS ENUM ('PersonalDetails', 'Nominees', 'DocumentsPayment', 'Completed');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('Active', 'Frozen', 'Suspended', 'Closed', 'Deceased');

-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('Father', 'Mother', 'Spouse', 'Son', 'Daughter', 'Brother', 'Sister', 'Other');

-- CreateEnum
CREATE TYPE "IdProofType" AS ENUM ('NationalID', 'Passport', 'DrivingLicense', 'VoterID', 'Other');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('NationalID', 'Passport', 'DrivingLicense', 'BirthCertificate', 'ResidenceCard', 'AddressProof_UtilityBill', 'AddressProof_BankStatement', 'AddressProof_RentalAgreement', 'MemberPhoto', 'NomineeIDProof', 'Other');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('MemberIdentity', 'MemberAddress', 'MemberPhoto', 'NomineeProof', 'Other');

-- CreateEnum
CREATE TYPE "DocumentVerificationStatus" AS ENUM ('Pending', 'Verified', 'Rejected');

-- CreateEnum
CREATE TYPE "CollectionMode" AS ENUM ('Cash', 'BankTransfer', 'Cheque', 'Online');

-- CreateEnum
CREATE TYPE "PaymentApprovalStatus" AS ENUM ('PendingApproval', 'Approved', 'Rejected');

-- CreateTable
CREATE TABLE "Member" (
    "memberId" TEXT NOT NULL,
    "memberCode" TEXT NOT NULL,
    "registrationStatus" "MemberRegistrationStatus" NOT NULL DEFAULT 'Draft',
    "registrationStep" "MemberRegistrationStep" NOT NULL DEFAULT 'PersonalDetails',
    "approvalRequestId" TEXT,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "alternateContactNumber" TEXT,
    "email" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "forumId" TEXT NOT NULL,
    "memberStatus" "MemberStatus",
    "suspensionCounter" INTEGER NOT NULL DEFAULT 0,
    "suspensionReason" TEXT,
    "suspendedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "approvedBy" TEXT,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("memberId")
);

-- CreateTable
CREATE TABLE "Nominee" (
    "nomineeId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationType" "RelationType" NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "alternateContactNumber" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "idProofType" "IdProofType" NOT NULL,
    "idProofNumber" TEXT NOT NULL,
    "idProofDocumentId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Nominee_pkey" PRIMARY KEY ("nomineeId")
);

-- CreateTable
CREATE TABLE "MemberDocument" (
    "documentId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "nomineeId" TEXT,
    "documentType" "DocumentType" NOT NULL,
    "documentCategory" "DocumentCategory" NOT NULL,
    "documentName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificationStatus" "DocumentVerificationStatus" NOT NULL DEFAULT 'Pending',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "expiryDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "MemberDocument_pkey" PRIMARY KEY ("documentId")
);

-- CreateTable
CREATE TABLE "RegistrationPayment" (
    "paymentId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "registrationFee" DECIMAL(15,2) NOT NULL,
    "advanceDeposit" DECIMAL(15,2) NOT NULL,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "collectedBy" TEXT NOT NULL,
    "collectionDate" TIMESTAMP(3) NOT NULL,
    "collectionMode" "CollectionMode" NOT NULL,
    "referenceNumber" TEXT,
    "approvalStatus" "PaymentApprovalStatus" NOT NULL DEFAULT 'PendingApproval',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "RegistrationPayment_pkey" PRIMARY KEY ("paymentId")
);

-- CreateTable
CREATE TABLE "MembershipTier" (
    "tierId" TEXT NOT NULL,
    "tierCode" TEXT NOT NULL,
    "tierName" TEXT NOT NULL,
    "description" TEXT,
    "registrationFee" DECIMAL(15,2) NOT NULL,
    "advanceDepositAmount" DECIMAL(15,2) NOT NULL,
    "contributionAmount" DECIMAL(15,2) NOT NULL,
    "deathBenefitAmount" DECIMAL(15,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "MembershipTier_pkey" PRIMARY KEY ("tierId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_memberCode_key" ON "Member"("memberCode");

-- CreateIndex
CREATE INDEX "Member_memberCode_idx" ON "Member"("memberCode");

-- CreateIndex
CREATE INDEX "Member_registrationStatus_idx" ON "Member"("registrationStatus");

-- CreateIndex
CREATE INDEX "Member_memberStatus_idx" ON "Member"("memberStatus");

-- CreateIndex
CREATE INDEX "Member_agentId_idx" ON "Member"("agentId");

-- CreateIndex
CREATE INDEX "Member_unitId_idx" ON "Member"("unitId");

-- CreateIndex
CREATE INDEX "Member_tierId_idx" ON "Member"("tierId");

-- CreateIndex
CREATE INDEX "Member_approvalRequestId_idx" ON "Member"("approvalRequestId");

-- CreateIndex
CREATE INDEX "Nominee_memberId_idx" ON "Nominee"("memberId");

-- CreateIndex
CREATE INDEX "Nominee_memberId_isActive_idx" ON "Nominee"("memberId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Nominee_memberId_priority_key" ON "Nominee"("memberId", "priority");

-- CreateIndex
CREATE INDEX "MemberDocument_memberId_idx" ON "MemberDocument"("memberId");

-- CreateIndex
CREATE INDEX "MemberDocument_nomineeId_idx" ON "MemberDocument"("nomineeId");

-- CreateIndex
CREATE INDEX "MemberDocument_memberId_documentCategory_isActive_idx" ON "MemberDocument"("memberId", "documentCategory", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationPayment_memberId_key" ON "RegistrationPayment"("memberId");

-- CreateIndex
CREATE INDEX "RegistrationPayment_memberId_idx" ON "RegistrationPayment"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipTier_tierCode_key" ON "MembershipTier"("tierCode");

-- CreateIndex
CREATE INDEX "MembershipTier_tierCode_idx" ON "MembershipTier"("tierCode");

-- CreateIndex
CREATE INDEX "MembershipTier_isActive_idx" ON "MembershipTier"("isActive");

-- CreateIndex
CREATE INDEX "MembershipTier_isDefault_idx" ON "MembershipTier"("isDefault");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "MembershipTier"("tierId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("agentId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("unitId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nominee" ADD CONSTRAINT "Nominee_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("memberId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberDocument" ADD CONSTRAINT "MemberDocument_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("memberId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberDocument" ADD CONSTRAINT "MemberDocument_nomineeId_fkey" FOREIGN KEY ("nomineeId") REFERENCES "Nominee"("nomineeId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationPayment" ADD CONSTRAINT "RegistrationPayment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("memberId") ON DELETE RESTRICT ON UPDATE CASCADE;
