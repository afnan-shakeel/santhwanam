// Module: Dev
// Main entry point for dev module (dev-only endpoints)

import { DevService } from "./application/devService";
import { DevController } from "./api/controller";
import { createDevRouter } from "./api/router";

import { PrismaRoleRepository } from '@/modules/iam/infrastructure/prisma/roleRepository'
import { PrismaUserRepository } from '@/modules/iam/infrastructure/prisma/userRepository'
import { PrismaUserRoleRepository } from '@/modules/iam/infrastructure/prisma/userRoleRepository';

// Member repositories
import { PrismaMemberRepository } from "@/modules/members/infrastructure/prisma/memberRepository";
import { PrismaNomineeRepository } from "@/modules/members/infrastructure/prisma/nomineeRepository";
import { PrismaRegistrationPaymentRepository } from "@/modules/members/infrastructure/prisma/registrationPaymentRepository";
import { PrismaMembershipTierRepository } from "@/modules/members/infrastructure/prisma/membershipTierRepository";

// Agent repository
import { PrismaAgentRepository } from "@/modules/agents/infrastructure/prisma/agentRepository";

// Wallet repositories
import { PrismaWalletRepository } from "@/modules/wallet/infrastructure/prisma/walletRepository";
import { PrismaWalletTransactionRepository } from "@/modules/wallet/infrastructure/prisma/walletTransactionRepository";

// Initialize repositories
const memberRepo = new PrismaMemberRepository();
const nomineeRepo = new PrismaNomineeRepository();
const registrationPaymentRepo = new PrismaRegistrationPaymentRepository();
const membershipTierRepo = new PrismaMembershipTierRepository();
const agentRepo = new PrismaAgentRepository();
const walletRepo = new PrismaWalletRepository();
const walletTransactionRepo = new PrismaWalletTransactionRepository();
const userRepo = new PrismaUserRepository();
const roleRepo = new PrismaRoleRepository();
const userRoleRepo = new PrismaUserRoleRepository();

// Initialize service
const devService = new DevService(
  userRepo,
  roleRepo,
  userRoleRepo,
  memberRepo,
  nomineeRepo,
  registrationPaymentRepo,
  membershipTierRepo,
  agentRepo,
  walletRepo,
  walletTransactionRepo
);

// Initialize controller
const devController = new DevController(devService);

// Create router
const devRouter = createDevRouter(devController);

export { devRouter, devService };
