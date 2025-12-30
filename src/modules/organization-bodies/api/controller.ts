/**
 * Controller for Organization Bodies API
 */

import type { Request, Response, NextFunction } from 'express';
import type { ForumService } from '../application/forumService';
import type { AreaService } from '../application/areaService';
import type { UnitService } from '../application/unitService';
import type {
  CreateForumCommand,
  UpdateForumCommand,
  AssignForumAdminCommand,
  CreateAreaCommand,
  UpdateAreaCommand,
  AssignAreaAdminCommand,
  CreateUnitCommand,
  UpdateUnitCommand,
  AssignUnitAdminCommand,
} from '../application/commands';
import {
  ForumResponseDto,
  ForumListResponseDto,
  ForumsSearchResponseDto,
  AreaResponseDto,
  AreaListResponseDto,
  AreasSearchResponseDto,
  UnitResponseDto,
  UnitListResponseDto,
  UnitsSearchResponseDto,
} from './dtos/responseDtos';

export class OrganizationBodiesController {
  constructor(
    private readonly forumService: ForumService,
    private readonly areaService: AreaService,
    private readonly unitService: UnitService,
    private readonly createForumCmd: CreateForumCommand,
    private readonly updateForumCmd: UpdateForumCommand,
    private readonly assignForumAdminCmd: AssignForumAdminCommand,
    private readonly createAreaCmd: CreateAreaCommand,
    private readonly updateAreaCmd: UpdateAreaCommand,
    private readonly assignAreaAdminCmd: AssignAreaAdminCommand,
    private readonly createUnitCmd: CreateUnitCommand,
    private readonly updateUnitCmd: UpdateUnitCommand,
    private readonly assignUnitAdminCmd: AssignUnitAdminCommand
  ) {}

  // Forum endpoints
  createForum = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const forum = await this.createForumCmd.execute(req.body);
      return next({ responseSchema: ForumResponseDto, data: forum, status: 201 });
    } catch (err) {
      next(err)
    }
  };

  updateForum = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { forumId } = req.params;
      const forum = await this.updateForumCmd.execute(forumId, req.body);
      return next({ responseSchema: ForumResponseDto, data: forum, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  assignForumAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { forumId } = req.params;
      const forum = await this.assignForumAdminCmd.execute(forumId, req.body);
      return next({ responseSchema: ForumResponseDto, data: forum, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  getForumById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { forumId } = req.params;
      const forum = await this.forumService.getForumById(forumId);
      return next({ responseSchema: ForumResponseDto, data: forum, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  getForumByCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { forumCode } = req.params;
      const forum = await this.forumService.getForumByCode(forumCode);
      return next({ responseSchema: ForumResponseDto, data: forum, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  listForums = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const forums = await this.forumService.listForums();
      return next({ responseSchema: ForumListResponseDto, data: forums, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  // Area endpoints
  createArea = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const area = await this.createAreaCmd.execute(req.body);
      return next({ responseSchema: AreaResponseDto, data: area, status: 201 });
    } catch (err) {
      next(err)
    }
  };

  updateArea = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { areaId } = req.params;
      const area = await this.updateAreaCmd.execute(areaId, req.body);
      return next({ responseSchema: AreaResponseDto, data: area, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  assignAreaAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { areaId } = req.params;
      const area = await this.assignAreaAdminCmd.execute(areaId, req.body);
      return next({ responseSchema: AreaResponseDto, data: area, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  getAreaById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { areaId } = req.params;
      const area = await this.areaService.getAreaById(areaId);
      return next({ responseSchema: AreaResponseDto, data: area, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  listAreasByForum = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { forumId } = req.params;
      const areas = await this.areaService.listAreasByForum(forumId);
      return next({ responseSchema: AreaListResponseDto, data: areas, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  // Unit endpoints
  createUnit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const unit = await this.createUnitCmd.execute(req.body);
      return next({ responseSchema: UnitResponseDto, data: unit, status: 201 });
    } catch (err) {
      next(err)
    }
  };

  updateUnit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { unitId } = req.params;
      const unit = await this.updateUnitCmd.execute(unitId, req.body);
      return next({ responseSchema: UnitResponseDto, data: unit, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  assignUnitAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { unitId } = req.params;
      const unit = await this.assignUnitAdminCmd.execute(unitId, req.body);
      return next({ responseSchema: UnitResponseDto, data: unit, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  getUnitById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { unitId } = req.params;
      const unit = await this.unitService.getUnitById(unitId);
      return next({ responseSchema: UnitResponseDto, data: unit, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  listUnitsByArea = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { areaId } = req.params;
      const units = await this.unitService.listUnitsByArea(areaId);
      return next({ responseSchema: UnitListResponseDto, data: units, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  listUnitsByForum = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { forumId } = req.params;
      const units = await this.unitService.listUnitsByForum(forumId);
      return next({ responseSchema: UnitListResponseDto, data: units, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  // Search endpoints
  searchForums = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.forumService.searchForums(req.body);
      return next({ responseSchema: ForumsSearchResponseDto, data: result, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  searchAreas = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.areaService.searchAreas(req.body);
      return next({ responseSchema: AreasSearchResponseDto, data: result, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  searchUnits = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.unitService.searchUnits(req.body);
      return next({ responseSchema: UnitsSearchResponseDto, data: result, status: 200 });
    } catch (err) {
      next(err)
    }
  };
}
