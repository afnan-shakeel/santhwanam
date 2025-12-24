/**
 * Controller for Approval Workflow API
 */

import type { Request, Response, NextFunction } from 'express';
import type { ApprovalWorkflowService } from '../application/approvalWorkflowService';
import type { ApprovalRequestService } from '../application/approvalRequestService';
import type { CreateWorkflowCommand } from '../application/commands/createWorkflowCommand';
import type { UpdateWorkflowCommand } from '../application/commands/updateWorkflowCommand';
import type { SubmitRequestCommand } from '../application/commands/submitRequestCommand';
import type { ProcessApprovalCommand } from '../application/commands/processApprovalCommand';
import type {
  CreateWorkflowDTO,
  UpdateWorkflowDTO,
  SubmitRequestDTO,
  ProcessApprovalDTO,
} from './validators';
import {
  ApprovalWorkflowResponseDto,
  ApprovalWorkflowListResponseDto,
  ApprovalWorkflowsSearchResponseDto,
  ApprovalRequestsSearchResponseDto,
  SubmitRequestResponseDto,
  ProcessApprovalResponseDto,
  PendingApprovalsListResponseDto,
  ApprovalRequestWithExecutionsResponseDto,
  SuccessResponseDto,
} from './dtos/responseDtos';

export class ApprovalWorkflowController {
  constructor(
    private readonly workflowService: ApprovalWorkflowService,
    private readonly requestService: ApprovalRequestService,
    private readonly createWorkflowCommand: CreateWorkflowCommand,
    private readonly updateWorkflowCommand: UpdateWorkflowCommand,
    private readonly submitRequestCommand: SubmitRequestCommand,
    private readonly processApprovalCommand: ProcessApprovalCommand
  ) {}

  createWorkflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = req.body as CreateWorkflowDTO;
      const result = await this.createWorkflowCommand.execute(dto);
      return next({ dto: ApprovalWorkflowResponseDto, data: result, status: 201 });
    } catch (err) {
      next(err)
    }
  };

  updateWorkflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workflowId } = req.params;
      const dto = req.body as UpdateWorkflowDTO;
      const result = await this.updateWorkflowCommand.execute({
        workflowId,
        ...dto,
      });
      return next({ dto: ApprovalWorkflowResponseDto, data: result, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  getWorkflowById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workflowId } = req.params;
      const result = await this.workflowService.getWorkflowById(workflowId);
      return next({ dto: ApprovalWorkflowResponseDto, data: result, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  getWorkflowByCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workflowCode } = req.params;
      const result = await this.workflowService.getWorkflowByCode(workflowCode);
      return next({ dto: ApprovalWorkflowResponseDto, data: result, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  listActiveWorkflows = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { module } = req.query;
      const workflows = await this.workflowService.listActiveWorkflows(module as any);
      return next({ dto: ApprovalWorkflowListResponseDto, data: workflows, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  listAllWorkflows = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workflows = await this.workflowService.listAllWorkflows();
      return next({ dto: ApprovalWorkflowListResponseDto, data: workflows, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  searchWorkflows = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const searchReq = req.body as any;
      const result = await this.workflowService.searchWorkflows(searchReq);
      return next({ dto: ApprovalWorkflowsSearchResponseDto, data: result, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  searchRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const searchReq = req.body as any;
      const result = await this.requestService.searchRequests(searchReq);
      return next({ dto: ApprovalRequestsSearchResponseDto, data: result, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  submitRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = req.body as SubmitRequestDTO;
      const result = await this.submitRequestCommand.execute(dto);
      return next({ dto: SubmitRequestResponseDto, data: result, status: 201 });
    } catch (err) {
      next(err)
    }
  };

  processApproval = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = req.body as ProcessApprovalDTO;
      const result = await this.processApprovalCommand.execute(dto);
      return next({ dto: ProcessApprovalResponseDto, data: result, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  getPendingApprovals = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { approverId } = req.params;
      const executions = await this.requestService.getPendingApprovals(approverId);
      return next({ dto: PendingApprovalsListResponseDto, data: executions, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  getRequestById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { requestId } = req.params;
      const result = await this.requestService.getRequestById(requestId);
      console.log('Fetched request with executions and workflow:', result);
      return next({ dto: ApprovalRequestWithExecutionsResponseDto, data: result, status: 200 });
    } catch (err) {
      next(err)
    }
  };

  getRequestByEntity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityType, entityId } = req.params;
      const result = await this.requestService.getRequestByEntity(entityType, entityId);
      return next({ dto: ApprovalRequestWithExecutionsResponseDto, data: result, status: 200 });
    } catch (err) {
      next(err)
    }
  };
}
