/**
 * Organization Bodies Module
 * Wires up repositories, services, commands, and API
 */

import { PrismaForumRepository } from './infrastructure/prisma/forumRepository';
import { PrismaAreaRepository } from './infrastructure/prisma/areaRepository';
import { PrismaUnitRepository } from './infrastructure/prisma/unitRepository';
import { PrismaUserRepository } from '@/modules/iam/infrastructure/prisma/userRepository';
import { PrismaRoleRepository } from '@/modules/iam/infrastructure/prisma/roleRepository';
import { PrismaUserRoleRepository } from '@/modules/iam/infrastructure/prisma/userRoleRepository';
import { ForumService } from './application/forumService';
import { AreaService } from './application/areaService';
import { UnitService } from './application/unitService';
import {
  CreateForumCommand,
  UpdateForumCommand,
  AssignForumAdminCommand,
  CreateAreaCommand,
  UpdateAreaCommand,
  AssignAreaAdminCommand,
  CreateUnitCommand,
  UpdateUnitCommand,
  AssignUnitAdminCommand,
} from './application/commands';
import { OrganizationBodiesController } from './api/controller';
import { createOrganizationBodiesRouter } from './api/router';

// Initialize repositories
const forumRepo = new PrismaForumRepository();
const areaRepo = new PrismaAreaRepository();
const unitRepo = new PrismaUnitRepository();
const userRepo = new PrismaUserRepository();
const roleRepo = new PrismaRoleRepository();
const userRoleRepo = new PrismaUserRoleRepository();

// Initialize services
const forumService = new ForumService(forumRepo, userRepo, roleRepo, userRoleRepo);
const areaService = new AreaService(areaRepo, forumRepo, userRepo, roleRepo, userRoleRepo);
const unitService = new UnitService(unitRepo, areaRepo, forumRepo, userRepo, roleRepo, userRoleRepo);

// Initialize commands
const createForumCmd = new CreateForumCommand(forumService);
const updateForumCmd = new UpdateForumCommand(forumService);
const assignForumAdminCmd = new AssignForumAdminCommand(forumService);

const createAreaCmd = new CreateAreaCommand(areaService);
const updateAreaCmd = new UpdateAreaCommand(areaService);
const assignAreaAdminCmd = new AssignAreaAdminCommand(areaService);

const createUnitCmd = new CreateUnitCommand(unitService);
const updateUnitCmd = new UpdateUnitCommand(unitService);
const assignUnitAdminCmd = new AssignUnitAdminCommand(unitService);

// Initialize controller
const controller = new OrganizationBodiesController(
  forumService,
  areaService,
  unitService,
  createForumCmd,
  updateForumCmd,
  assignForumAdminCmd,
  createAreaCmd,
  updateAreaCmd,
  assignAreaAdminCmd,
  createUnitCmd,
  updateUnitCmd,
  assignUnitAdminCmd
);

// Export router
export const organizationBodiesRouter = createOrganizationBodiesRouter(controller);

// Export services for use in other modules
export { forumService, areaService, unitService };
