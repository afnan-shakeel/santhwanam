import { ModelConfigs } from './types'

export const modelConfigs: ModelConfigs = {
  User: {
    searchable: ['firstName', 'lastName', 'email'],
    sortable: ['createdAt', 'lastSyncedAt', 'firstName', 'lastName', 'email'],
    filters: ['isActive', 'createdAt', 'email', 'firstName', 'lastName'],
    relations: ['userRoles'],
  },
  Role: {
    searchable: ['roleCode', 'roleName', 'description'],
    sortable: ['createdAt', 'updatedAt', 'roleCode', 'roleName'],
    filters: ['isActive', 'isSystemRole', 'scopeType', 'createdAt', 'roleCode'],
    relations: ['rolePermissions', 'userRoles'],
  },
  Permission: {
    searchable: ['permissionCode', 'permissionName', 'description', 'module'],
    sortable: ['createdAt', 'permissionCode', 'permissionName', 'module'],
    filters: ['isActive', 'module', 'action', 'createdAt', 'permissionCode'],
    relations: ['rolePermissions'],
  },
  Forum: {
    searchable: ['forumName', 'forumCode'],
    sortable: ['createdAt', 'forumName'],
    filters: ['isActive', 'createdAt', 'forumName', 'forumCode','adminUserId'],
    relations: ['areas'],
  },
  ApprovalWorkflow: {
    searchable: ['workflowCode', 'workflowName', 'entityType', 'module'],
    sortable: ['createdAt', 'workflowCode', 'workflowName'],
    filters: ['module', 'entityType', 'workflowCode', 'createdAt'],
    relations: ['stages'],
  },
  ApprovalRequest: {
    searchable: ['entityType', 'entityId', 'requestedBy', 'status'],
    sortable: ['requestedAt', 'status'],
    filters: ['status', 'workflowId', 'requestedBy', 'entityType', 'forumId', 'areaId', 'unitId', 'createdAt'],
    relations: ['executions', 'workflow'],
  },
  Area: {
    searchable: ['areaName'],
    sortable: ['createdAt', 'areaName'],
    filters: ['isActive', 'createdAt', 'areaName', 'forumId', 'forum.forumCode', 'forum.forumName'],
    relations: ['units'],
  },
  Unit: {
    searchable: ['unitName'],
    sortable: ['createdAt', 'unitName'],
    filters: ['isActive', 'createdAt', 'unitName', 'areaId', 'forumId'],
    relations: ['agents', 'members'],
  },
  Agent: {
    searchable: ['firstName', 'lastName', 'agentCode'],
    sortable: ['createdAt', 'firstName', 'agentCode'],
    filters: ['isActive', 'createdAt', 'firstName', 'agentCode', 'unitId'],
    relations: [],
  },
  Member: {
    searchable: ['firstName', 'middleName','lastName','memberCode'],
    sortable: ['createdAt', 'memberCode'],
    filters: ['createdAt', 'firstName', 'middleName', 'lastName', 'memberCode', 'unitId'],
    relations: [],
  },
  DeathClaim: {
    searchable: [],
    sortable: ['createdAt', 'reportedDate'],
    filters: [],
    relations: ['tier', 'agent', 'unit', 'approvalRequest', 'contributionCycles']
  }
}
