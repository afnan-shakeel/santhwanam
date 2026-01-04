/**
 * Domain entities for Approval Workflow
 * See docs/domain/2.approval_workflow.md
 */
export var WorkflowModule;
(function (WorkflowModule) {
    WorkflowModule["Agents"] = "Agents";
    WorkflowModule["Membership"] = "Membership";
    WorkflowModule["Wallet"] = "Wallet";
    WorkflowModule["Claims"] = "Claims";
    WorkflowModule["Contributions"] = "Contributions";
    WorkflowModule["Organization"] = "Organization";
})(WorkflowModule || (WorkflowModule = {}));
export var ApproverType;
(function (ApproverType) {
    ApproverType["Role"] = "Role";
    ApproverType["SpecificUser"] = "SpecificUser";
    ApproverType["Hierarchy"] = "Hierarchy";
    ApproverType["OrganizationAdmin"] = "OrganizationAdmin";
})(ApproverType || (ApproverType = {}));
export var organizationBody;
(function (organizationBody) {
    organizationBody["Unit"] = "Unit";
    organizationBody["Area"] = "Area";
    organizationBody["Forum"] = "Forum";
})(organizationBody || (organizationBody = {}));
export var ApprovalRequestStatus;
(function (ApprovalRequestStatus) {
    ApprovalRequestStatus["Pending"] = "Pending";
    ApprovalRequestStatus["Approved"] = "Approved";
    ApprovalRequestStatus["Rejected"] = "Rejected";
    ApprovalRequestStatus["Cancelled"] = "Cancelled";
})(ApprovalRequestStatus || (ApprovalRequestStatus = {}));
export var ApprovalStageStatus;
(function (ApprovalStageStatus) {
    ApprovalStageStatus["Pending"] = "Pending";
    ApprovalStageStatus["Approved"] = "Approved";
    ApprovalStageStatus["Rejected"] = "Rejected";
    ApprovalStageStatus["Skipped"] = "Skipped";
})(ApprovalStageStatus || (ApprovalStageStatus = {}));
export var ApprovalDecision;
(function (ApprovalDecision) {
    ApprovalDecision["Approve"] = "Approve";
    ApprovalDecision["Reject"] = "Reject";
})(ApprovalDecision || (ApprovalDecision = {}));
//# sourceMappingURL=entities.js.map