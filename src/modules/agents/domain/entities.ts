// Domain: Agents
// See `docs/domain/4.agents.md` for details

export enum RegistrationStatus {
  Draft = "Draft",
  PendingApproval = "PendingApproval",
  Approved = "Approved",
  Rejected = "Rejected",
}

export enum AgentStatus {
  Active = "Active",
  Inactive = "Inactive",
  Suspended = "Suspended",
  Terminated = "Terminated",
}

export enum Gender {
  Male = "Male",
  Female = "Female",
  Other = "Other",
}

export interface Agent {
  agentId: string;
  agentCode: string;
  registrationStatus: RegistrationStatus;
  approvalRequestId: string | null;

  // Hierarchy (denormalized)
  unitId: string;
  areaId: string;
  forumId: string;

  // User reference (set after approval)
  userId: string | null;

  // Personal Details
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: Date;
  gender: Gender;

  // Contact Information
  contactNumber: string;
  alternateContactNumber: string | null;
  email: string;

  // Address (optional)
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;

  // Agent Status
  agentStatus: AgentStatus;

  // Statistics
  totalActiveMembers: number;
  totalRegistrations: number;

  // Metadata
  joinedDate: Date | null;
  terminatedDate: Date | null;
  terminationReason: string | null;

  // Audit fields
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string | null;
}

// ===== Agent Member Item (used in agent's member listings) =====

export interface AgentMemberItem {
  memberId: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  contactNumber: string;
  email: string | null;
  memberStatus: string | null;
  registrationStatus: string;
  tier: {
    tierId: string;
    tierCode: string;
    tierName: string;
  };
  wallet: {
    balance: number;
    isLowBalance: boolean;
  } | null;
  createdAt: Date;
  registeredAt: Date | null;
}

// ===== Low Balance Member Item (used in low wallet balance listing) =====

export interface LowBalanceMemberItem {
  memberId: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  contactNumber: string;
  email: string | null;
  memberStatus: string | null;
  walletBalance: number;
  balanceIndicator: "empty" | "low";
}
