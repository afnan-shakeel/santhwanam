// Module: Dev
// Main entry point for dev module (dev-only endpoints)

import { DevService } from "./application/devService";
import { DevController } from "./api/controller";
import { createDevRouter } from "./api/router";

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

// Initialize service
const devService = new DevService(
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
