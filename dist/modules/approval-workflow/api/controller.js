/**
 * Controller for Approval Workflow API
 */
import { ApprovalWorkflowResponseDto, ApprovalWorkflowListResponseDto, ApprovalWorkflowsSearchResponseDto, ApprovalRequestsSearchResponseDto, SubmitRequestResponseDto, ProcessApprovalResponseDto, PendingApprovalsListResponseDto, PendingApprovalsCountResponseDto, ApprovalRequestWithExecutionsResponseDto, } from './dtos/responseDtos';
export class ApprovalWorkflowController {
    workflowService;
    requestService;
    createWorkflowCommand;
    updateWorkflowCommand;
    submitRequestCommand;
    processApprovalCommand;
    constructor(workflowService, requestService, createWorkflowCommand, updateWorkflowCommand, submitRequestCommand, processApprovalCommand) {
        this.workflowService = workflowService;
        this.requestService = requestService;
        this.createWorkflowCommand = createWorkflowCommand;
        this.updateWorkflowCommand = updateWorkflowCommand;
        this.submitRequestCommand = submitRequestCommand;
        this.processApprovalCommand = processApprovalCommand;
    }
    createWorkflow = async (req, res, next) => {
        try {
            const dto = req.body;
            const result = await this.createWorkflowCommand.execute(dto);
            // Transform the result to match the response DTO structure
            const responseData = {
                ...result.workflow,
                stages: result.stages,
            };
            return next({ responseSchema: ApprovalWorkflowResponseDto, data: responseData, status: 201 });
        }
        catch (err) {
            next(err);
        }
    };
    updateWorkflow = async (req, res, next) => {
        try {
            const { workflowId } = req.params;
            const dto = req.body;
            const result = await this.updateWorkflowCommand.execute({
                workflowId,
                ...dto,
            });
            // Transform the result to match the response DTO structure
            const responseData = {
                ...result.workflow,
                stages: result.stages,
            };
            return next({ responseSchema: ApprovalWorkflowResponseDto, data: responseData, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    getWorkflowById = async (req, res, next) => {
        try {
            const { workflowId } = req.params;
            const result = await this.workflowService.getWorkflowById(workflowId);
            return next({ responseSchema: ApprovalWorkflowResponseDto, data: result, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    getWorkflowByCode = async (req, res, next) => {
        try {
            const { workflowCode } = req.params;
            const result = await this.workflowService.getWorkflowByCode(workflowCode);
            return next({ responseSchema: ApprovalWorkflowResponseDto, data: result, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    listActiveWorkflows = async (req, res, next) => {
        try {
            const { module } = req.query;
            const workflows = await this.workflowService.listActiveWorkflows(module);
            return next({ responseSchema: ApprovalWorkflowListResponseDto, data: workflows, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    listAllWorkflows = async (req, res, next) => {
        try {
            const workflows = await this.workflowService.listAllWorkflows();
            return next({ responseSchema: ApprovalWorkflowListResponseDto, data: workflows, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    searchWorkflows = async (req, res, next) => {
        try {
            const searchReq = req.body;
            const result = await this.workflowService.searchWorkflows(searchReq);
            return next({ responseSchema: ApprovalWorkflowsSearchResponseDto, data: result, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    searchRequests = async (req, res, next) => {
        try {
            const searchReq = req.body;
            const result = await this.requestService.searchRequests(searchReq);
            return next({ responseSchema: ApprovalRequestsSearchResponseDto, data: result, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    submitRequest = async (req, res, next) => {
        try {
            const dto = req.body;
            const result = await this.submitRequestCommand.execute(dto);
            return next({ responseSchema: SubmitRequestResponseDto, data: result, status: 201 });
        }
        catch (err) {
            next(err);
        }
    };
    processApproval = async (req, res, next) => {
        try {
            const dto = req.body;
            const result = await this.processApprovalCommand.execute(dto);
            return next({ responseSchema: ProcessApprovalResponseDto, data: result, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    getPendingApprovals = async (req, res, next) => {
        try {
            const { approverId } = req.params;
            const executions = await this.requestService.getPendingApprovals(approverId);
            return next({ responseSchema: PendingApprovalsListResponseDto, data: executions, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    getPendingApprovalsCount = async (req, res, next) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new Error('User ID not found in request');
            }
            const result = await this.requestService.getPendingApprovalsCount(userId);
            return next({ responseSchema: PendingApprovalsCountResponseDto, data: result, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    getRequestById = async (req, res, next) => {
        try {
            const { requestId } = req.params;
            const result = await this.requestService.getRequestById(requestId);
            return next({ responseSchema: ApprovalRequestWithExecutionsResponseDto, data: result, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
    getRequestByEntity = async (req, res, next) => {
        try {
            const { entityType, entityId } = req.params;
            const result = await this.requestService.getRequestByEntity(entityType, entityId);
            return next({ responseSchema: ApprovalRequestWithExecutionsResponseDto, data: result, status: 200 });
        }
        catch (err) {
            next(err);
        }
    };
}
//# sourceMappingURL=controller.js.map