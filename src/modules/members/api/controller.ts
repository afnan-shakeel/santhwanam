/**
 * Controller for Members API
 */

import type { Request, Response, NextFunction } from "express";
import {
  MemberResponseDto,
  NomineeResponseDto,
  NomineeListResponseDto,
  MemberDocumentResponseDto,
  MemberDocumentListResponseDto,
  RegistrationPaymentResponseDto,
  MemberSubmissionResponseDto,
  MemberDetailsResponseDto,
  MemberListResponseDto,
  SuccessResponseDto,
  MemberMetadataResponseDto,
  MemberBenefitResponseDto,
} from './dtos/responseDtos'
import type { MemberService } from "../application/memberService";
import type { SubmitMemberRegistrationHandler } from "../application/commands/submitMemberRegistrationCommand";
import type { SuspendMemberCommand } from "../application/commands/suspendMemberCommand";
import type { ReactivateMemberCommand } from "../application/commands/reactivateMemberCommand";
import type { CloseMemberAccountCommand } from "../application/commands/closeMemberAccountCommand";
import { asyncLocalStorage } from "@/shared/infrastructure/context/AsyncLocalStorageManager";
import { NotFoundError } from "@/shared/utils/error-handling/httpErrors";
import prisma from "@/shared/infrastructure/prisma/prismaClient";

export class MembersController {
  constructor(
    private readonly memberService: MemberService,
    private readonly submitRegistrationCmd: SubmitMemberRegistrationHandler,
    private readonly suspendMemberCmd: SuspendMemberCommand,
    private readonly reactivateMemberCmd: ReactivateMemberCommand,
    private readonly closeMemberAccountCmd: CloseMemberAccountCommand
  ) {}

  // ===== STEP 1: PERSONAL DETAILS =====

  /**
   * POST /api/members/register
   * Start member registration (creates in Draft status)
   */
  startRegistration = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const member = await this.memberService.startRegistration(req.body);
      return next({ responseSchema: MemberResponseDto, data: member, status: 201 });
    } catch (err) {
      next(err)
    }
  };

  /**
   * PATCH /api/members/:memberId/draft/personal-details
   * Save personal details as draft
   */
  savePersonalDetailsAsDraft = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { memberId } = req.params;
    try {
      const member = await this.memberService.savePersonalDetailsAsDraft(
        memberId,
        req.body
      );
      return next({ responseSchema: MemberResponseDto, data: member, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  /**
   * POST /api/members/:memberId/complete/personal-details
   * Complete personal details step
   */
  completePersonalDetailsStep = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { memberId } = req.params;
    try {
      const member = await this.memberService.completePersonalDetailsStep(
        memberId
      );
      return next({ responseSchema: MemberResponseDto, data: member, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  // ===== STEP 2: NOMINEES =====

  /**
   * POST /api/members/:memberId/nominees
   * Add nominee
   */
  addNominee = async (req: Request, res: Response, next: NextFunction) => {
    const { memberId } = req.params;
    try {
      const nominee = await this.memberService.addNominee({
        memberId,
        ...req.body,
      });
      return next({ responseSchema: NomineeResponseDto, data: nominee, status: 201 });
    } catch (err) {
      next(err)
    }
  };

  /**
   * PATCH /api/members/:memberId/nominees/:nomineeId
   * Update nominee
   */
  updateNominee = async (req: Request, res: Response, next: NextFunction) => {
    const { nomineeId } = req.params;
    try {
      const nominee = await this.memberService.updateNominee(nomineeId, req.body);
      return next({ responseSchema: NomineeResponseDto, data: nominee, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  /**
   * DELETE /api/members/:memberId/nominees/:nomineeId
   * Remove nominee (soft delete)
   */
  removeNominee = async (req: Request, res: Response, next: NextFunction) => {
    const { nomineeId } = req.params;
    try {
      await this.memberService.removeNominee(nomineeId);
      return next({ status: 204 });
    } catch (err) {
      next(err)
    }
  };

  /**
   * GET /api/members/:memberId/nominees
   * Get all nominees for member
   */
  getNominees = async (req: Request, res: Response, next: NextFunction) => {
    const { memberId } = req.params;
    try {
      const nominees = await this.memberService.getNomineesByMemberId(memberId);
      return next({ responseSchema: NomineeListResponseDto, data: nominees, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  /**
   * POST /api/members/:memberId/complete/nominees
   * Complete nominees step
   */
  completeNomineesStep = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { memberId } = req.params;
    try {
      const member = await this.memberService.completeNomineesStep(memberId);
      return next({ responseSchema: MemberResponseDto, data: member, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  // ===== STEP 3: DOCUMENTS & PAYMENT =====

  /**
   * POST /api/members/:memberId/documents
   * Upload member document
   */
  uploadDocument = async (req: Request, res: Response, next: NextFunction) => {
    const { memberId } = req.params;
    try {
      const document = await this.memberService.uploadMemberDocument({
        memberId,
        ...req.body,
      });
      return next({ responseSchema: MemberDocumentResponseDto, data: document, status: 201 });
    } catch (err) {
      next(err)
    }
  };

  /**
   * DELETE /api/members/:memberId/documents/:documentId
   * Remove document (soft delete)
   */
  removeDocument = async (req: Request, res: Response, next: NextFunction) => {
    const { documentId } = req.params;
    try {
      await this.memberService.removeMemberDocument(documentId);
      return next({ status: 204 });
    } catch (err) {
      next(err)
    }
  };

  /**
   * GET /api/members/:memberId/documents
   * Get all documents for member
   */
  getDocuments = async (req: Request, res: Response, next: NextFunction) => {
    const { memberId } = req.params;
    try {
      const documents = await this.memberService.getDocumentsByMemberId(memberId);
      return next({ responseSchema: MemberDocumentListResponseDto, data: documents, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  /**
   * POST /api/members/:memberId/payment
   * Record registration payment
   */
  recordPayment = async (req: Request, res: Response, next: NextFunction) => {
    const { memberId } = req.params;
    try {
      const payment = await this.memberService.recordRegistrationPayment({
        memberId,
        ...req.body,
      });
      return next({ responseSchema: RegistrationPaymentResponseDto, data: payment, status: 201 });
    } catch (err) {
      next(err)
    }
  };

  /**
   * GET /api/members/:memberId/payment
   * Get payment for member
   */
  getPayment = async (req: Request, res: Response, next: NextFunction) => {
    const { memberId } = req.params;
    try {
      const payment = await this.memberService.getPaymentByMemberId(memberId);
      console.log(payment, memberId);
      return next({ responseSchema: RegistrationPaymentResponseDto, data: payment, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  // ===== SUBMISSION =====

  /**
   * POST /api/members/:memberId/submit
   * Submit member registration for approval
   */
  submitRegistration = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { memberId } = req.params;
    try {
      const result = await this.submitRegistrationCmd.execute({ memberId });
      return next({ responseSchema: MemberSubmissionResponseDto, data: result, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  // ===== QUERIES =====

  /**
   * GET /api/members/:memberId
   * Get member details with relations
   */
  getMemberDetails = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { memberId } = req.params;
    try {
      const member = await this.memberService.getMemberDetails(memberId);
      return next({ responseSchema: MemberResponseDto, data: member, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  /**
   * GET /api/members
   * List members with filters and pagination
   */
  listMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.memberService.listMembers(req.query);
      return next({ responseSchema: MemberListResponseDto, data: result, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  // ===== MEMBER MANAGEMENT =====

  /**
   * POST /api/members/:memberId/suspend
   * Suspend an active member
   */
  suspendMember = async (req: Request, res: Response, next: NextFunction) => {
    const { memberId } = req.params;
    const { reason, suspendedBy } = req.body;
    try {
      await this.suspendMemberCmd.execute({ memberId, reason, suspendedBy });
      return next({ responseSchema: SuccessResponseDto, data: { success: true }, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  /**
   * POST /api/members/:memberId/reactivate
   * Reactivate a suspended member
   */
  reactivateMember = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { memberId } = req.params;
    const { reactivatedBy } = req.body;
    try {
      await this.reactivateMemberCmd.execute({ memberId, reactivatedBy });
      return next({ responseSchema: SuccessResponseDto, data: { success: true }, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  /**
   * POST /api/members/:memberId/close
   * Close a member account
   */
  closeMemberAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { memberId } = req.params;
    const { closureReason, walletBalanceRefunded, refundedBy, closureDate } =
      req.body;
    try {
      await this.closeMemberAccountCmd.execute({
        memberId,
        closureReason,
        walletBalanceRefunded,
        refundedBy,
        closureDate: new Date(closureDate),
      });
      return next({ responseSchema: SuccessResponseDto, data: { success: true }, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  /**
   * POST /api/members/search
   * Search members with advanced filtering
   */
  searchMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.memberService.searchMembers(req.body);
      return next({ responseSchema: MemberListResponseDto, data: result, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  /**
   * GET /api/members/metadata
   * Get metadata for member documents and payments (document types, categories, collection modes)
   */
  getMetadata = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const metadata = await this.memberService.getMetadata();
      return next({ responseSchema: MemberMetadataResponseDto, data: metadata, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  // ===== PROFILE MANAGEMENT =====

  /**
   * GET /api/members/:memberId/profile
   * Get member profile with wallet information
   */
  getMemberProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { memberId } = req.params;
    try {
      const profile = await this.memberService.getMemberProfile(memberId);
      return next({ responseSchema: MemberResponseDto, data: profile, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  /**
   * GET /api/my-profile
   * Get logged-in member's profile
   */
  getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = asyncLocalStorage.getUserId();
      
      // Find member by user ID
      const member = await prisma.member.findFirst({
        where: { userId: userId },
      });

      if (!member) {
        throw new NotFoundError("Member profile not found");
      }

      const profile = await this.memberService.getMemberProfile(member.memberId);
      return next({ responseSchema: MemberResponseDto, data: profile, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  /**
   * PUT /api/members/:memberId/profile
   * Update member profile (only for approved members)
   */
  updateMemberProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { memberId } = req.params;
    try {
      const updated = await this.memberService.updateMemberProfile(
        memberId,
        req.body
      );
      return next({ responseSchema: MemberResponseDto, data: updated, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  /**
   * GET /api/members/:memberId/documents/:documentId/download
   * Download document file
   */
  downloadDocument = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { documentId } = req.params;
    try {
      const document = await this.memberService.getDocumentsByMemberId(
        req.params.memberId
      );
      
      const doc = document.find((d) => d.documentId === documentId);
      
      if (!doc) {
        throw new NotFoundError("Document not found");
      }

      // Stream file from local path
      const fs = require('fs');
      const path = require('path');
      
      const filePath = doc.fileUrl;
      
      if (!fs.existsSync(filePath)) {
        throw new NotFoundError("File not found on server");
      }

      const fileName = path.basename(filePath);
      
      res.setHeader('Content-Type', doc.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (err) {
      next(err)
    }
  };

  /**
   * GET /api/members/:memberId/benefit
   * Get member's death benefit amount
   */
  getMemberBenefit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { memberId } = req.params;
      const benefit = await this.memberService.getMemberBenefitAmount(memberId);
      
      return next({ responseSchema: MemberBenefitResponseDto, data: benefit, status: 200 });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/nominees/search
   * Search nominees by name and contact number
   */
  searchNominees = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, contactNumber, page, limit } = req.query;

      const result = await this.memberService.searchNominees({
        name: name as string,
        contactNumber: contactNumber as string,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      });

      return next({ 
        responseSchema: NomineeListResponseDto, 
        data: result.nominees, 
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
   * POST /api/members/:memberId/notify
   * Send notification to a member (placeholder)
   */
  notifyMember = async (req: Request, res: Response, next: NextFunction) => {
    const { memberId } = req.params;
    const { type, channel } = req.body;

    // Verify member exists
    const member = await prisma.member.findUnique({
      where: { memberId },
      select: { memberId: true, firstName: true, lastName: true },
    });

    if (!member) {
      throw new NotFoundError(`Member not found: ${memberId}`);
    }

    // TODO: Integrate with actual notification service (SMS/Email/Push)
    // For now, this is a placeholder that acknowledges the request

    next({
      responseSchema: SuccessResponseDto,
      data: {
        success: true,
        message: `Notification (${type}) queued for delivery via ${channel} to ${member.firstName} ${member.lastName}`,
      },
      status: 200,
    });
  };
}
