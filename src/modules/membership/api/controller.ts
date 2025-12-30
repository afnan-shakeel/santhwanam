import { Request, Response, NextFunction } from 'express';
import { MembershipTierService } from '../application/membershipTierService';
import { MembershipTierDto, MembershipTierListDto } from './dtos/membershipTierDtos';
import { NotFoundError } from '@/shared/utils/error-handling/httpErrors';

export class MembershipTierController {
  constructor(private readonly tierService: MembershipTierService) {}

  getAllTiers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      const tiers = await this.tierService.getAllTiers(activeOnly);

      return next({ responseSchema: MembershipTierListDto, data: tiers, status: 200 });
    } catch (error) {
      next(error);
    }
  };

  getTierById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tierId } = req.params;
      const tier = await this.tierService.getTierById(tierId);

      if (!tier) {
        throw new NotFoundError('Membership tier not found');
      }

      return next({ responseSchema: MembershipTierDto, data: tier, status: 200 });
    } catch (error) {
      next(error);
    }
  };
}
