/**
 * Commands for Organization Bodies
 * Thin wrappers around services with AsyncLocalStorage actor tracking
 */
import { asyncLocalStorage } from '@/shared/infrastructure/context/AsyncLocalStorageManager';
import { UnauthorizedError } from '@/shared/utils/error-handling/httpErrors';
export class CreateForumCommand {
    forumService;
    constructor(forumService) {
        this.forumService = forumService;
    }
    async execute(dto) {
        const createdBy = asyncLocalStorage.tryGetUserId();
        if (!createdBy) {
            throw new UnauthorizedError('User not authenticated');
        }
        return await this.forumService.createForum({ ...dto, createdBy });
    }
}
export class UpdateForumCommand {
    forumService;
    constructor(forumService) {
        this.forumService = forumService;
    }
    async execute(forumId, dto) {
        const updatedBy = asyncLocalStorage.tryGetUserId();
        if (!updatedBy) {
            throw new UnauthorizedError('User not authenticated');
        }
        return this.forumService.updateForum(forumId, { ...dto, updatedBy });
    }
}
export class AssignForumAdminCommand {
    forumService;
    constructor(forumService) {
        this.forumService = forumService;
    }
    async execute(forumId, dto) {
        const assignedBy = asyncLocalStorage.tryGetUserId();
        if (!assignedBy) {
            throw new UnauthorizedError('User not authenticated');
        }
        return this.forumService.assignForumAdmin(forumId, dto.newAdminUserId, assignedBy);
    }
}
export class CreateAreaCommand {
    areaService;
    constructor(areaService) {
        this.areaService = areaService;
    }
    async execute(dto) {
        const createdBy = asyncLocalStorage.tryGetUserId();
        if (!createdBy) {
            throw new UnauthorizedError('User not authenticated');
        }
        return this.areaService.createArea({ ...dto, createdBy });
    }
}
export class UpdateAreaCommand {
    areaService;
    constructor(areaService) {
        this.areaService = areaService;
    }
    async execute(areaId, dto) {
        const updatedBy = asyncLocalStorage.tryGetUserId();
        if (!updatedBy) {
            throw new UnauthorizedError('User not authenticated');
        }
        return this.areaService.updateArea(areaId, { ...dto, updatedBy });
    }
}
export class AssignAreaAdminCommand {
    areaService;
    constructor(areaService) {
        this.areaService = areaService;
    }
    async execute(areaId, dto) {
        const assignedBy = asyncLocalStorage.tryGetUserId();
        if (!assignedBy) {
            throw new UnauthorizedError('User not authenticated');
        }
        return this.areaService.assignAreaAdmin(areaId, dto.newAdminUserId, assignedBy);
    }
}
export class CreateUnitCommand {
    unitService;
    constructor(unitService) {
        this.unitService = unitService;
    }
    async execute(dto) {
        const createdBy = asyncLocalStorage.tryGetUserId();
        if (!createdBy) {
            throw new UnauthorizedError('User not authenticated');
        }
        return this.unitService.createUnit({ ...dto, createdBy });
    }
}
export class UpdateUnitCommand {
    unitService;
    constructor(unitService) {
        this.unitService = unitService;
    }
    async execute(unitId, dto) {
        const updatedBy = asyncLocalStorage.tryGetUserId();
        if (!updatedBy) {
            throw new UnauthorizedError('User not authenticated');
        }
        return this.unitService.updateUnit(unitId, { ...dto, updatedBy });
    }
}
export class AssignUnitAdminCommand {
    unitService;
    constructor(unitService) {
        this.unitService = unitService;
    }
    async execute(unitId, dto) {
        const assignedBy = asyncLocalStorage.tryGetUserId();
        if (!assignedBy) {
            throw new UnauthorizedError('User not authenticated');
        }
        return this.unitService.assignUnitAdmin(unitId, dto.newAdminUserId, assignedBy);
    }
}
//# sourceMappingURL=index.js.map