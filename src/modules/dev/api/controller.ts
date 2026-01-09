/**
 * Controller for Dev API
 * DEV-ONLY: These endpoints are only available in non-production environments
 */

import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import type { DevService } from "../application/devService";
import type { QuickMemberRegistrationRequest } from "./validators";
import {
  Gender,
  RelationType,
  IdProofType,
  CollectionMode,
} from "@/modules/members/domain/entities";
import { ForbiddenError } from "@/shared/utils/error-handling/httpErrors";

// Response DTOs
export const QuickMemberRegistrationResponseDto = z
  .object({
    member: z
      .object({
        memberId: z.string(),
        memberCode: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        memberStatus: z.string().nullable(),
        registrationStatus: z.string(),
      })
      .passthrough(),
    wallet: z
      .object({
        walletId: z.string(),
        balance: z.number(),
      })
      .nullable(),
    nominees: z.array(
      z
        .object({
          nomineeId: z.string(),
          name: z.string(),
          relationType: z.string(),
        })
        .passthrough()
    ),
    registrationPayment: z
      .object({
        paymentId: z.string(),
        registrationFee: z.number(),
        advanceDeposit: z.number(),
        totalAmount: z.number(),
        approvalStatus: z.string(),
      })
      .passthrough(),
  })
  .passthrough();

export class DevController {
  constructor(private readonly devService: DevService) {}

  /**
   * POST /api/dev/members/quick-register
   * Quick register a member bypassing approval workflow
   */
  quickRegisterMember = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Environment check (additional safety)
      if (process.env.NODE_ENV === "production") {
        throw new ForbiddenError("Dev endpoints not available in production");
      }

      const body: QuickMemberRegistrationRequest = req.body;

      // Transform request to service input
      const input = {
        firstName: body.firstName,
        middleName: body.middleName,
        lastName: body.lastName,
        dateOfBirth: new Date(body.dateOfBirth),
        gender: body.gender as Gender,
        contactNumber: body.contactNumber,
        alternateContactNumber: body.alternateContactNumber,
        email: body.email || undefined,
        addressLine1: body.addressLine1,
        addressLine2: body.addressLine2,
        city: body.city,
        state: body.state,
        postalCode: body.postalCode,
        country: body.country,
        tierId: body.tierId,
        agentId: body.agentId,
        registrationFee: body.registrationFee,
        advanceDeposit: body.advanceDeposit,
        collectionMode: body.collectionMode as CollectionMode | undefined,
        collectionDate: body.collectionDate
          ? new Date(body.collectionDate)
          : undefined,
        referenceNumber: body.referenceNumber,
        nominees: body.nominees?.map((n) => ({
          name: n.name,
          relationType: n.relationType as RelationType,
          dateOfBirth: new Date(n.dateOfBirth),
          contactNumber: n.contactNumber,
          alternateContactNumber: n.alternateContactNumber,
          addressLine1: n.addressLine1,
          addressLine2: n.addressLine2,
          city: n.city,
          state: n.state,
          postalCode: n.postalCode,
          country: n.country,
          idProofType: n.idProofType as IdProofType,
          idProofNumber: n.idProofNumber,
        })),
        autoApprove: body.autoApprove,
        createWallet: body.createWallet,
      };

      const result = await this.devService.quickRegisterMember(input);

      return next({
        responseSchema: QuickMemberRegistrationResponseDto,
        data: result,
        status: 201,
      });
    } catch (err) {
      next(err);
    }
  };
}
