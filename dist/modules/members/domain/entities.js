// Domain: Members
// See `docs/domain/5.membership.md` for details
// Enums
export var RegistrationStatus;
(function (RegistrationStatus) {
    RegistrationStatus["Draft"] = "Draft";
    RegistrationStatus["PendingApproval"] = "PendingApproval";
    RegistrationStatus["Approved"] = "Approved";
    RegistrationStatus["Rejected"] = "Rejected";
})(RegistrationStatus || (RegistrationStatus = {}));
export var RegistrationStep;
(function (RegistrationStep) {
    RegistrationStep["PersonalDetails"] = "PersonalDetails";
    RegistrationStep["Nominees"] = "Nominees";
    RegistrationStep["DocumentsPayment"] = "DocumentsPayment";
    RegistrationStep["Completed"] = "Completed";
})(RegistrationStep || (RegistrationStep = {}));
export var MemberStatus;
(function (MemberStatus) {
    MemberStatus["Active"] = "Active";
    MemberStatus["Frozen"] = "Frozen";
    MemberStatus["Suspended"] = "Suspended";
    MemberStatus["Closed"] = "Closed";
    MemberStatus["Deceased"] = "Deceased";
})(MemberStatus || (MemberStatus = {}));
export var Gender;
(function (Gender) {
    Gender["Male"] = "Male";
    Gender["Female"] = "Female";
    Gender["Other"] = "Other";
})(Gender || (Gender = {}));
export var RelationType;
(function (RelationType) {
    RelationType["Father"] = "Father";
    RelationType["Mother"] = "Mother";
    RelationType["Spouse"] = "Spouse";
    RelationType["Son"] = "Son";
    RelationType["Daughter"] = "Daughter";
    RelationType["Brother"] = "Brother";
    RelationType["Sister"] = "Sister";
    RelationType["Other"] = "Other";
})(RelationType || (RelationType = {}));
export var IdProofType;
(function (IdProofType) {
    IdProofType["NationalID"] = "NationalID";
    IdProofType["Passport"] = "Passport";
    IdProofType["DrivingLicense"] = "DrivingLicense";
    IdProofType["VoterID"] = "VoterID";
    IdProofType["Other"] = "Other";
})(IdProofType || (IdProofType = {}));
export var DocumentType;
(function (DocumentType) {
    DocumentType["NationalID"] = "NationalID";
    DocumentType["Passport"] = "Passport";
    DocumentType["DrivingLicense"] = "DrivingLicense";
    DocumentType["BirthCertificate"] = "BirthCertificate";
    DocumentType["ResidenceCard"] = "ResidenceCard";
    DocumentType["AddressProof_UtilityBill"] = "AddressProof_UtilityBill";
    DocumentType["AddressProof_BankStatement"] = "AddressProof_BankStatement";
    DocumentType["AddressProof_RentalAgreement"] = "AddressProof_RentalAgreement";
    DocumentType["MemberPhoto"] = "MemberPhoto";
    DocumentType["NomineeIDProof"] = "NomineeIDProof";
    DocumentType["Other"] = "Other";
})(DocumentType || (DocumentType = {}));
export var DocumentCategory;
(function (DocumentCategory) {
    DocumentCategory["MemberIdentity"] = "MemberIdentity";
    DocumentCategory["MemberAddress"] = "MemberAddress";
    DocumentCategory["MemberPhoto"] = "MemberPhoto";
    DocumentCategory["NomineeProof"] = "NomineeProof";
    DocumentCategory["Other"] = "Other";
})(DocumentCategory || (DocumentCategory = {}));
export var DocumentVerificationStatus;
(function (DocumentVerificationStatus) {
    DocumentVerificationStatus["Pending"] = "Pending";
    DocumentVerificationStatus["Verified"] = "Verified";
    DocumentVerificationStatus["Rejected"] = "Rejected";
})(DocumentVerificationStatus || (DocumentVerificationStatus = {}));
export var CollectionMode;
(function (CollectionMode) {
    CollectionMode["Cash"] = "Cash";
    CollectionMode["BankTransfer"] = "BankTransfer";
    CollectionMode["Cheque"] = "Cheque";
    CollectionMode["Online"] = "Online";
})(CollectionMode || (CollectionMode = {}));
export var PaymentApprovalStatus;
(function (PaymentApprovalStatus) {
    PaymentApprovalStatus["PendingApproval"] = "PendingApproval";
    PaymentApprovalStatus["Approved"] = "Approved";
    PaymentApprovalStatus["Rejected"] = "Rejected";
})(PaymentApprovalStatus || (PaymentApprovalStatus = {}));
//# sourceMappingURL=entities.js.map