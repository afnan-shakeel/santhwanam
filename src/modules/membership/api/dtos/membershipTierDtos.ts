import { z } from 'zod';

export const MembershipTierDto = z.object({
  tierId: z.string(),
  tierCode: z.string(),
  tierName: z.string(),
  description: z.string().nullable().optional(),
  registrationFee: z.number(),
  advanceDepositAmount: z.number(),
  contributionAmount: z.number(),
  deathBenefitAmount: z.number(),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  createdAt: z.date(),
  createdBy: z.string(),
  updatedAt: z.date().nullable().optional(),
  updatedBy: z.string().nullable().optional(),
});

export const MembershipTierListDto = z.array(MembershipTierDto);

export type MembershipTier = z.infer<typeof MembershipTierDto>;
export type MembershipTierList = z.infer<typeof MembershipTierListDto>;
