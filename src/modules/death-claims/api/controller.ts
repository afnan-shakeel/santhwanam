/**
 * Controller for Death Claims API
 */

import type { Request, Response, NextFunction } from 'express';
import type { DeathClaimService } from '../application/deathClaimService';
import { asyncLocalStorage } from '@/shared/infrastructure/context/AsyncLocalStorageManager';

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

      res.status(201).json({
        success: true,
        data: claim,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/death-claims/:claimId/documents
   * Upload a claim document
   * NOTE: This is a simplified version. In production, use multipart/form-data
   */
  uploadDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { claimId } = req.params;
      const userId = asyncLocalStorage.getContext()?.userSession?.userId;

      // TODO: Replace with actual file upload from multipart
      // For now, expecting fileBuffer as base64 in request
      const fileBuffer = Buffer.from(req.body.fileBuffer || '', 'base64');

      const document = await this.deathClaimService.uploadClaimDocument({
        claimId,
        documentType: req.body.documentType,
        documentName: req.body.documentName,
        fileBuffer,
        mimeType: req.body.mimeType,
        uploadedBy: userId || req.body.uploadedBy,
      });

      res.status(201).json({
        success: true,
        data: document,
      });
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

      res.status(200).json({
        success: true,
        data: claim,
      });
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

      res.status(200).json({
        success: true,
        data: claim,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/death-claims/:claimId/settle
   * Settle an approved claim (payout to nominee)
   */
  settleClaim = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { claimId } = req.params;
      const userId = asyncLocalStorage.getContext()?.userSession?.userId;

      // TODO: Handle actual file upload for acknowledgment
      let nomineeAcknowledgmentFile;
      if (req.body.acknowledgmentFileBuffer) {
        nomineeAcknowledgmentFile = {
          fileBuffer: Buffer.from(req.body.acknowledgmentFileBuffer, 'base64'),
          fileName: req.body.acknowledgmentFileName,
          mimeType: req.body.acknowledgmentMimeType,
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

      res.status(200).json({
        success: true,
        data: claim,
      });
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

      const claim = await this.deathClaimService.getClaimById(claimId);

      res.status(200).json({
        success: true,
        data: claim,
      });
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

      res.status(200).json({
        success: true,
        data: documents,
      });
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

      res.status(200).json({
        success: true,
        data: result.claims,
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
}
