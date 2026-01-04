// Domain: Agents
// See `docs/domain/4.agents.md` for details
export var RegistrationStatus;
(function (RegistrationStatus) {
    RegistrationStatus["Draft"] = "Draft";
    RegistrationStatus["PendingApproval"] = "PendingApproval";
    RegistrationStatus["Approved"] = "Approved";
    RegistrationStatus["Rejected"] = "Rejected";
})(RegistrationStatus || (RegistrationStatus = {}));
export var AgentStatus;
(function (AgentStatus) {
    AgentStatus["Active"] = "Active";
    AgentStatus["Inactive"] = "Inactive";
    AgentStatus["Suspended"] = "Suspended";
    AgentStatus["Terminated"] = "Terminated";
})(AgentStatus || (AgentStatus = {}));
export var Gender;
(function (Gender) {
    Gender["Male"] = "Male";
    Gender["Female"] = "Female";
    Gender["Other"] = "Other";
})(Gender || (Gender = {}));
//# sourceMappingURL=entities.js.map