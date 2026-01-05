/**
 * Controller for Death Claims API
 */

import type { Request, Response, NextFunction } from 'express';
import type { DeathClaimService } from '../application/deathClaimService';
import { asyncLocalStorage } from '@/shared/infrastructure/context/AsyncLocalStorageManager';
import { searchService } from '@/shared/infrastructure/search';
import {
  DeathClaimResponseDto,
  DeathClaimDetailsResponseDto,
  ClaimDocumentResponseDto,
  ClaimDocumentListResponseDto,
  DashboardStatsResponseDto,
  MemberBenefitResponseDto,
  DeathClaimListResponseDto,
} from './dtos/responseDtos';

export class DeathClaimsController {
  constructor(private readonly deathClaimService: DeathClaimService) {}

  /**
   * POST /api/death-claims/report
   * Report a new death claim
   */
  reportDeath = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = asyncLocalStorage.getContext()?.userSession?.userId;
      
      const claim = await this.deathClaimService.reportDeath({
        ...req.body,
        reportedBy: userId || req.body.reportedBy,
      });

      return next({ responseSchema: DeathClaimResponseDto, data: claim, status: 201 });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/death-claims/:claimId/documents
   * Upload a claim document
   * Accepts multipart/form-data with 'file' field
   */
  uploadDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { claimId } = req.params;
      const userId = asyncLocalStorage.getContext()?.userSession?.userId;

      // Get file from multer
      const file = req.file;
      if (!file) {
        throw new Error('No file uploaded. Please provide a file in the "file" field.');
      }

      const document = await this.deathClaimService.uploadClaimDocument({
        claimId,
        documentType: req.body.documentType,
        documentName: req.body.documentName || file.originalname,
        fileBuffer: file.buffer,
        mimeType: file.mimetype,
        uploadedBy: userId || req.body.uploadedBy,
      });

      return next({ responseSchema: ClaimDocumentResponseDto, data: document, status: 201 });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/death-claims/:claimId/verify
   * Verify claim documents
   */
  verifyDocuments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { claimId } = req.params;
      const userId = asyncLocalStorage.getContext()?.userSession?.userId;

      const claim = await this.deathClaimService.verifyClaimDocuments({
        claimId,
        verificationNotes: req.body.verificationNotes,
        verifiedBy: userId || req.body.verifiedBy,
      });

      return next({ responseSchema: DeathClaimResponseDto, data: claim, status: 200 });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/death-claims/:claimId/documents/:documentId/verify
   * Verify individual document
   */
  verifyIndividualDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { claimId, documentId } = req.params;
      const userId = asyncLocalStorage.getContext()?.userSession?.userId;

      const document = await this.deathClaimService.verifyIndividualDocument(
        claimId,
        documentId,
        userId || req.body.verifiedBy,
        req.body.verificationStatus,
        req.body.notes,
        req.body.rejectionReason
      );

      return next({ responseSchema: ClaimDocumentResponseDto, data: document, status: 200 });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/death-claims/:claimId/submit
   * Submit claim for approval
   */
  submitForApproval = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { claimId } = req.params;
      const userId = asyncLocalStorage.getContext()?.userSession?.userId || 'system';

      const claim = await this.deathClaimService.submitClaimForApproval(claimId, userId);

      return next({ responseSchema: DeathClaimResponseDto, data: claim, status: 200 });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/death-claims/:claimId/settle
   * Settle an approved claim (payout to nominee)
   * Accepts multipart/form-data with optional 'acknowledgmentFile' field
   */
  settleClaim = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { claimId } = req.params;
      const userId = asyncLocalStorage.getContext()?.userSession?.userId;

      // Get optional acknowledgment file from multer
      let nomineeAcknowledgmentFile;
      if (req.file) {
        nomineeAcknowledgmentFile = {
          fileBuffer: req.file.buffer,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
        };
      }

      const claim = await this.deathClaimService.settleDeathClaim({
        claimId,
        paymentMethod: req.body.paymentMethod,
        paymentReference: req.body.paymentReference,
        paymentDate: new Date(req.body.paymentDate),
        nomineeAcknowledgmentFile,
        paidBy: userId || req.body.paidBy,
      });

      return next({ responseSchema: DeathClaimResponseDto, data: claim, status: 200 });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/death-claims/:claimId
   * Get claim details by ID
   */
  getClaimById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { claimId } = req.params;

      const claim = await this.deathClaimService.getClaimByIdWithDetails(claimId);
      return next({ responseSchema: DeathClaimDetailsResponseDto, data: claim, status: 200 });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/death-claims/:claimId/documents
   * Get all documents for a claim
   */
  getClaimDocuments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { claimId } = req.params;

      const documents = await this.deathClaimService.getClaimDocuments(claimId);

      return next({ responseSchema: ClaimDocumentListResponseDto, data: documents, status: 200 });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/death-claims/:claimId/documents/:documentId/download
   * Download a claim document
   */
  downloadDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { claimId, documentId } = req.params;

      const { buffer, document } = await this.deathClaimService.getDocumentFile(claimId, documentId);

      // Set headers for file download
      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${document.documentName}"`);
      res.setHeader('Content-Length', buffer.length);

      // Stream the file
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/death-claims
   * List claims with filters
   */
  listClaims = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { claimStatus, forumId, areaId, unitId, agentId, page, limit } = req.query;

      const skip = ((Number(page) || 1) - 1) * (Number(limit) || 20);

      const result = await this.deathClaimService.listClaims({
        claimStatus: claimStatus as any,
        forumId: forumId as string,
        areaId: areaId as string,
        unitId: unitId as string,
        agentId: agentId as string,
        skip,
        take: Number(limit) || 20,
      });

      return next({ 
        responseSchema: DeathClaimListResponseDto, 
        data: result, 
        status: 200,
        pagination: {
          page: Number(page) || 1,
          limit: Number(limit) || 20,
          total: result.total,
          totalPages: Math.ceil(result.total / (Number(limit) || 20)),
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/death-claims/dashboard/stats
   * Get dashboard statistics
   */
  getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.deathClaimService.getDashboardStats();
        console.log(stats);
      return next({ responseSchema: DashboardStatsResponseDto, data: stats, status: 200 });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/death-claims/search
   * Search death claims using advanced search
   */
  searchClaims = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await searchService.execute({
        ...req.body,
        model: 'DeathClaim',
      });

      return next({ responseSchema: DeathClaimListResponseDto, data: result, status: 200 });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/death-claims/requiring-action
   * Get claims requiring immediate action (UnderVerification)
   */
  getRequiringAction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = req.query;
      const skip = ((Number(page) || 1) - 1) * (Number(limit) || 50);

      const result = await this.deathClaimService.listClaims({
        claimStatus: 'UnderVerification' as any,
        skip,
        take: Number(limit) || 50,
      });

      return next({ 
        responseSchema: DeathClaimListResponseDto, 
        data: result, 
        status: 200,
      });
    } catch (err) {
      next(err);
    }
  };
}
