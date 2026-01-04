// Domain: Contribution Collection Repositories
// Repository interfaces for contribution cycles and member contributions

import {
  ContributionCycle,
  MemberContribution,
  ContributionCycleStatus,
  MemberContributionStatus,
  ContributionCycleWithStats,
  MemberContributionWithRelations,
} from './entities';

export interface ContributionCycleRepository {
  create(data: Omit<ContributionCycle, 'createdAt' | 'updatedAt'>, tx?: any): Promise<ContributionCycle>;
  
  findById(cycleId: string, tx?: any): Promise<ContributionCycle | null>;
  
  findByIdWithContributions(cycleId: string, tx?: any): Promise<ContributionCycleWithStats | null>;
  
  findByDeathClaimId(deathClaimId: string, tx?: any): Promise<ContributionCycle | null>;
  
  findByCycleNumber(cycleNumber: string, tx?: any): Promise<ContributionCycle | null>;
  
  update(
    cycleId: string,
    data: Partial<Omit<ContributionCycle, 'cycleId' | 'cycleNumber' | 'createdAt'>>,
    tx?: any
  ): Promise<ContributionCycle>;
  
  findAll(filters: {
    status?: ContributionCycleStatus;
    forumId?: string;
    page: number;
    limit: number;
  }): Promise<{ cycles: ContributionCycle[]; total: number }>;
}

export interface MemberContributionRepository {
  create(data: Omit<MemberContribution, 'createdAt' | 'updatedAt'>, tx?: any): Promise<MemberContribution>;
  
  createMany(data: Omit<MemberContribution, 'createdAt' | 'updatedAt'>[], tx?: any): Promise<void>;
  
  findById(contributionId: string, tx?: any): Promise<MemberContribution | null>;
  
  findByIdWithRelations(contributionId: string, tx?: any): Promise<MemberContributionWithRelations | null>;
  
  update(
    contributionId: string,
    data: Partial<Omit<MemberContribution, 'contributionId' | 'createdAt'>>,
    tx?: any
  ): Promise<MemberContribution>;
  
  updateMany(
    where: {
      cycleId?: string;
      contributionStatus?: MemberContributionStatus[];
    },
    data: Partial<Omit<MemberContribution, 'contributionId' | 'createdAt'>>,
    tx?: any
  ): Promise<number>;
  
  findByCycleId(
    cycleId: string,
    filters?: {
      status?: MemberContributionStatus;
      agentId?: string;
      page: number;
      limit: number;
    }
  ): Promise<{ contributions: MemberContribution[]; total: number }>;
  
  findByMemberId(
    memberId: string,
    filters: {
      status?: MemberContributionStatus;
      page: number;
      limit: number;
    }
  ): Promise<{ contributions: MemberContributionWithRelations[]; total: number }>;
  
  findByAgentId(
    agentId: string,
    filters: {
      cycleId?: string;
      status?: MemberContributionStatus;
      page: number;
      limit: number;
    }
  ): Promise<{ contributions: MemberContributionWithRelations[]; total: number }>;
  
  findPreviousMissedContribution(
    memberId: string,
    excludeCycleId: string,
    tx?: any
  ): Promise<MemberContribution | null>;
  
  findPendingByCycleId(cycleId: string, tx?: any): Promise<MemberContribution[]>;
  
  calculateCycleStatistics(cycleId: string, tx?: any): Promise<{
    totalCollected: number;
    totalPending: number;
    totalMissed: number;
    collectedAmount: number;
  }>;
}
