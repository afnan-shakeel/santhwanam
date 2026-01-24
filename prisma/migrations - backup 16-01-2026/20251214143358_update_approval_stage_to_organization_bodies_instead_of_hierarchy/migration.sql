/*
  Warnings:

  - You are about to drop the column `hierarchyLevel` on the `ApprovalStage` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "OrganizationBody" AS ENUM ('Unit', 'Area', 'Forum');

-- AlterEnum
ALTER TYPE "ApproverType" ADD VALUE 'OrganizationAdmin';

-- AlterTable
ALTER TABLE "ApprovalStage" DROP COLUMN "hierarchyLevel",
ADD COLUMN     "organizationBody" "OrganizationBody";

-- DropEnum
DROP TYPE "HierarchyLevel";
