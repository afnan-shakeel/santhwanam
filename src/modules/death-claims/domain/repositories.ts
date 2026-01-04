/**
 * Repository interfaces for Death Claims Module
 */

import { DeathClaim, DeathClaimDocument } from './entities';

export interface DashboardStats {
  pendingVerification: number;
  underContribution: number;
  approvedForPayout: number;
  totalThisYear: number;
  totalBenefitsPaidYTD: number;
  pendingCollections: number;
  successRate: number;
}

export interface DeathClaimRepository {
  create(data: Omit<DeathClaim, 'createdAt' | 'updatedAt'>, tx?: any): Promise<DeathClaim>;
  findById(claimId: string, tx?: any): Promise<DeathClaim | null>;
  findByIdWithDetails(claimId: string, tx?: any): Promise<any | null>;
  findByClaimNumber(claimNumber: string, tx?: any): Promise<DeathClaim | null>;
  findByMemberId(memberId: string, tx?: any): Promise<DeathClaim | null>;
  update(claimId: string, data: Partial<DeathClaim>, tx?: any): Promise<DeathClaim>;
  getLastClaimNumberByYear(year: number, tx?: any): Promise<string | null>;
  list(filters: {
    claimStatus?: string;
    forumId?: string;
    areaId?: string;
    unitId?: string;
    agentId?: string;
    skip?: number;
    take?: number;
  }, tx?: any): Promise<{ claims: DeathClaim[]; total: number }>;
  getDashboardStats(tx?: any): Promise<DashboardStats>;
}

export interface DeathClaimDocumentRepository {
  create(data: Omit<DeathClaimDocument, 'uploadedAt'>, tx?: any): Promise<DeathClaimDocument>;
  findById(documentId: string, tx?: any): Promise<DeathClaimDocument | null>;
  findByClaimId(claimId: string, tx?: any): Promise<DeathClaimDocument[]>;
  findByClaimIdAndType(claimId: string, documentType: string, tx?: any): Promise<DeathClaimDocument | null>;
  update(documentId: string, data: Partial<DeathClaimDocument>, tx?: any): Promise<DeathClaimDocument>;
  delete(documentId: string, tx?: any): Promise<void>;
}
