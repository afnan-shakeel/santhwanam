/**
 * Controller for Organization Bodies API
 */
import { ForumResponseDto, ForumListResponseDto, ForumsSearchResponseDto, ForumStatsResponseDto, AreaResponseDto, AreasSearchResponseDto, AreaStatsResponseDto, AreasWithCountsResponseDto, UnitResponseDto, UnitListResponseDto, UnitsSearchResponseDto, UnitStatsResponseDto, UnitsWithCountsResponseDto, } from './dtos/responseDtos';
export class OrganizationBodiesController {
    forumService;
    areaService;
    unitService;
    createForumCmd;
    updateForumCmd;
    assignForumAdminCmd;
    createAreaCmd;
    updateAreaCmd;
    assignAreaAdminCmd;
    createUnitCmd;
    updateUnitCmd;
    assignUnitAdminCmd;
    constructor(forumService, areaService, unitService, createForumCmd, updateForumCmd, assignForumAdminCmd, createAreaCmd, updateAreaCmd, assignAreaAdminCmd, createUnitCmd, updateUnitCmd, assignUnitAdminCmd) {
        this.forumService = forumService;
        this.areaService = areaService;
        this.unitService = unitService;
        this.createForumCmd = createForumCmd;
        this.updateForumCmd = updateForumCmd;
        this.assignForumAdminCmd = assignForumAdminCmd;
        this.createAreaCmd = createAreaCmd;
        this.updateAreaCmd = updateAreaCmd;
        this.assignAreaAdminCmd = assignAreaAdminCmd;
        this.createUnitCmd = createUnitCmd;
        this.updateUnitCmd = updateUnitCmd;
        this.assignUnitAdminCmd = assignUnitAdminCmd;
    }
    // Forum endpoints
    createForum = async (req, res, next) => {
        try {
            const forum = await this.createForumCmd.execute(req.body);
            return next({ responseSchema: ForumResponseDto, data: forum, status: 201 });
        }
        catch (err) {
            next(err);
        }
    };
    updateForum = async (req, res, next) => {
        try {
            const { forumId } = req.params;
            const forum = await this.updateForumCmd.execute(forumId, req.body);
            return next({ responseSchema: ForumResponseDto, data: forum, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    assignForumAdmin = async (req, res, next) => {
        try {
            const { forumId } = req.params;
            const forum = await this.assignForumAdminCmd.execute(forumId, req.body);
            return next({ responseSchema: ForumResponseDto, data: forum, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    getForumById = async (req, res, next) => {
        try {
            const { forumId } = req.params;
            const forum = await this.forumService.getForumById(forumId);
            return next({ responseSchema: ForumResponseDto, data: forum, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    getForumStats = async (req, res, next) => {
        try {
            const { forumId } = req.params;
            const stats = await this.forumService.getForumStats(forumId);
            return next({ responseSchema: ForumStatsResponseDto, data: stats, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    getForumByCode = async (req, res, next) => {
        try {
            const { forumCode } = req.params;
            const forum = await this.forumService.getForumByCode(forumCode);
            return next({ responseSchema: ForumResponseDto, data: forum, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    listForums = async (req, res, next) => {
        try {
            const forums = await this.forumService.listForums();
            return next({ responseSchema: ForumListResponseDto, data: forums, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    // Area endpoints
    createArea = async (req, res, next) => {
        try {
            const area = await this.createAreaCmd.execute(req.body);
            return next({ responseSchema: AreaResponseDto, data: area, status: 201 });
        }
        catch (err) {
            next(err);
        }
    };
    updateArea = async (req, res, next) => {
        try {
            const { areaId } = req.params;
            const area = await this.updateAreaCmd.execute(areaId, req.body);
            return next({ responseSchema: AreaResponseDto, data: area, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    assignAreaAdmin = async (req, res, next) => {
        try {
            const { areaId } = req.params;
            const area = await this.assignAreaAdminCmd.execute(areaId, req.body);
            return next({ responseSchema: AreaResponseDto, data: area, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    getAreaById = async (req, res, next) => {
        try {
            const { areaId } = req.params;
            const area = await this.areaService.getAreaById(areaId);
            return next({ responseSchema: AreaResponseDto, data: area, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    getAreaStats = async (req, res, next) => {
        try {
            const { areaId } = req.params;
            const stats = await this.areaService.getAreaStats(areaId);
            return next({ responseSchema: AreaStatsResponseDto, data: stats, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    listAreasByForum = async (req, res, next) => {
        try {
            const { forumId } = req.params;
            const skip = parseInt(req.query.skip) || 0;
            const take = parseInt(req.query.take) || 20;
            const result = await this.areaService.listAreasByForumWithCounts(forumId, skip, take);
            return next({ responseSchema: AreasWithCountsResponseDto, data: result, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    // Unit endpoints
    createUnit = async (req, res, next) => {
        try {
            const unit = await this.createUnitCmd.execute(req.body);
            return next({ responseSchema: UnitResponseDto, data: unit, status: 201 });
        }
        catch (err) {
            next(err);
        }
    };
    updateUnit = async (req, res, next) => {
        try {
            const { unitId } = req.params;
            const unit = await this.updateUnitCmd.execute(unitId, req.body);
            return next({ responseSchema: UnitResponseDto, data: unit, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    assignUnitAdmin = async (req, res, next) => {
        try {
            const { unitId } = req.params;
            const unit = await this.assignUnitAdminCmd.execute(unitId, req.body);
            return next({ responseSchema: UnitResponseDto, data: unit, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    getUnitById = async (req, res, next) => {
        try {
            const { unitId } = req.params;
            const unit = await this.unitService.getUnitById(unitId);
            return next({ responseSchema: UnitResponseDto, data: unit, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    getUnitStats = async (req, res, next) => {
        try {
            const { unitId } = req.params;
            const stats = await this.unitService.getUnitStats(unitId);
            return next({ responseSchema: UnitStatsResponseDto, data: stats, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    listUnitsByArea = async (req, res, next) => {
        try {
            const { areaId } = req.params;
            const skip = parseInt(req.query.skip) || 0;
            const take = parseInt(req.query.take) || 20;
            const result = await this.unitService.listUnitsByAreaWithCounts(areaId, skip, take);
            return next({ responseSchema: UnitsWithCountsResponseDto, data: result, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    listUnitsByForum = async (req, res, next) => {
        try {
            const { forumId } = req.params;
            const units = await this.unitService.listUnitsByForum(forumId);
            return next({ responseSchema: UnitListResponseDto, data: units, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    // Search endpoints
    searchForums = async (req, res, next) => {
        try {
            const result = await this.forumService.searchForums(req.body);
            return next({ responseSchema: ForumsSearchResponseDto, data: result, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    searchAreas = async (req, res, next) => {
        try {
            const result = await this.areaService.searchAreas(req.body);
            return next({ responseSchema: AreasSearchResponseDto, data: result, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    searchUnits = async (req, res, next) => {
        try {
            const result = await this.unitService.searchUnits(req.body);
            return next({ responseSchema: UnitsSearchResponseDto, data: result, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
}
//# sourceMappingURL=controller.js.map