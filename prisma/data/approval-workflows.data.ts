/**
 * Approval Workflows Data
 * Default workflows for the system
 */

export const DEFAULT_WORKFLOWS = [
  {
    code: 'agent_registration',
    name: 'Agent Registration Approval',
    description: 'Workflow for approving new agent registrations',
    module: 'Agents',
    stages: [
      {
        stageName: 'Unit Admin Review',
        stageOrder: 1,
        approverType: 'Hierarchy',
        isOptional: false,
        autoApprove: false,
      },
      {
        stageName: 'Area Admin Review',
        stageOrder: 2,
        approverType: 'Hierarchy',
        isOptional: false,
        autoApprove: false,
      },
      {
        stageName: 'Final Approval',
        stageOrder: 3,
        approverType: 'Role',
        roleCode: 'forum_admin',
        isOptional: false,
        autoApprove: false,
      },
    ],
  },
  {
    code: 'member_registration',
    name: 'Member Registration Approval',
    description: 'Workflow for approving new member registrations',
    module: 'Membership',
    stages: [
      {
        stageName: 'Agent Review',
        stageOrder: 1,
        approverType: 'Hierarchy',
        isOptional: false,
        autoApprove: false,
      },
      {
        stageName: 'Unit Admin Verification',
        stageOrder: 2,
        approverType: 'Hierarchy',
        isOptional: false,
        autoApprove: false,
      },
      {
        stageName: 'Final Approval',
        stageOrder: 3,
        approverType: 'Role',
        roleCode: 'area_admin',
        isOptional: false,
        autoApprove: false,
      },
    ],
  },
  {
    code: 'wallet_deposit',
    name: 'Wallet Deposit Approval',
    description: 'Workflow for approving wallet deposit requests',
    module: 'Wallet',
    stages: [
      {
        stageName: 'Unit Admin Verification',
        stageOrder: 1,
        approverType: 'Hierarchy',
        isOptional: false,
        autoApprove: false,
      },
      {
        stageName: 'Area Admin Approval',
        stageOrder: 2,
        approverType: 'Role',
        roleCode: 'area_admin',
        isOptional: true,
        autoApprove: false,
      },
    ],
  },
  {
    code: 'death_claim_approval',
    name: 'Death Claim Approval',
    description: 'Workflow for approving death benefit claims',
    module: 'Claims',
    stages: [
      {
        stageName: 'Unit Admin Review',
        stageOrder: 1,
        approverType: 'Hierarchy',
        isOptional: false,
        autoApprove: false,
      },
      {
        stageName: 'Area Admin Verification',
        stageOrder: 2,
        approverType: 'Role',
        roleCode: 'area_admin',
        isOptional: false,
        autoApprove: false,
      },
      {
        stageName: 'Forum Admin Final Approval',
        stageOrder: 3,
        approverType: 'Role',
        roleCode: 'forum_admin',
        isOptional: false,
        autoApprove: false,
      },
    ],
  },
  {
    code: 'cash_handover_to_super_admin',
    name: 'Cash Handover to Super Admin',
    description: 'Workflow for approving cash handovers to the super admin (final cash custody)',
    module: 'CashManagement',
    stages: [
      {
        stageName: 'Super Admin Approval',
        stageOrder: 1,
        approverType: 'Role',
        roleCode: 'super_admin',
        isOptional: false,
        autoApprove: false,
      },
    ],
  },
];
