/**
 * Zod validators for Members API
 */
import { z } from "zod";
// Enums
const GenderEnum = z.enum(["Male", "Female", "Other"]);
const RelationTypeEnum = z.enum([
    "Father",
    "Mother",
    "Spouse",
    "Son",
    "Daughter",
    "Brother",
    "Sister",
    "Other",
]);
const IdProofTypeEnum = z.enum([
    "NationalID",
    "Passport",
    "DrivingLicense",
    "VoterID",
    "Other",
]);
const DocumentTypeEnum = z.enum([
    "NationalID",
    "Passport",
    "DrivingLicense",
    "BirthCertificate",
    "ResidenceCard",
    "AddressProof_UtilityBill",
    "AddressProof_BankStatement",
    "AddressProof_RentalAgreement",
    "MemberPhoto",
    "NomineeIDProof",
    "Other",
]);
const DocumentCategoryEnum = z.enum([
    "MemberIdentity",
    "MemberAddress",
    "MemberPhoto",
    "NomineeProof",
    "Other",
]);
const CollectionModeEnum = z.enum(["Cash", "BankTransfer", "Cheque", "Online"]);
// Helper: Age validation (>= 18 years)
const dateOfBirthSchema = z.coerce.date().refine((date) => {
    const today = new Date();
    const birthDate = new Date(date);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age >= 18;
}, {
    message: "Member must be at least 18 years old",
});
// ===== STEP 1: PERSONAL DETAILS =====
export const startMemberRegistrationSchema = z.object({
    firstName: z.string().min(2).max(100),
    middleName: z.string().max(100).optional(),
    lastName: z.string().min(2).max(100),
    dateOfBirth: dateOfBirthSchema,
    gender: GenderEnum,
    contactNumber: z.string().min(10).max(20),
    alternateContactNumber: z.string().min(10).max(20).optional().nullable(),
    email: z.string().email().optional(),
    addressLine1: z.string().min(1).max(255),
    addressLine2: z.string().max(255).optional(),
    city: z.string().min(1).max(100),
    state: z.string().min(1).max(100),
    postalCode: z.string().min(1).max(20),
    country: z.string().min(1).max(100),
    tierId: z.string().uuid(),
    unitId: z.string().uuid(),
    agentId: z.string().uuid(),
});
export const savePersonalDetailsAsDraftSchema = z.object({
    firstName: z.string().min(2).max(100).optional(),
    middleName: z.string().max(100).optional(),
    lastName: z.string().min(2).max(100).optional(),
    dateOfBirth: z.coerce.date().optional(),
    gender: GenderEnum.optional(),
    contactNumber: z.string().min(10).max(20).optional(),
    alternateContactNumber: z.string().min(10).max(20).optional().nullable(),
    email: z.string().email().optional(),
    addressLine1: z.string().min(1).max(255).optional(),
    addressLine2: z.string().max(255).optional(),
    city: z.string().min(1).max(100).optional(),
    state: z.string().min(1).max(100).optional(),
    postalCode: z.string().min(1).max(20).optional(),
    country: z.string().min(1).max(100).optional(),
});
// ===== STEP 2: NOMINEES =====
export const addNomineeSchema = z.object({
    name: z.string().min(2).max(255),
    relationType: RelationTypeEnum,
    dateOfBirth: z.coerce.date(),
    contactNumber: z.string().min(10).max(20),
    alternateContactNumber: z.string().min(10).max(20).optional(),
    addressLine1: z.string().min(1).max(255),
    addressLine2: z.string().max(255).optional(),
    city: z.string().min(1).max(100),
    state: z.string().min(1).max(100),
    postalCode: z.string().min(1).max(20),
    country: z.string().min(1).max(100),
    idProofType: IdProofTypeEnum,
    idProofNumber: z.string().min(1).max(100),
});
export const updateNomineeSchema = z.object({
    name: z.string().min(2).max(255).optional(),
    relationType: RelationTypeEnum.optional(),
    dateOfBirth: z.coerce.date().optional(),
    contactNumber: z.string().min(10).max(20).optional(),
    alternateContactNumber: z.string().min(10).max(20).optional(),
    addressLine1: z.string().min(1).max(255).optional(),
    addressLine2: z.string().max(255).optional(),
    city: z.string().min(1).max(100).optional(),
    state: z.string().min(1).max(100).optional(),
    postalCode: z.string().min(1).max(20).optional(),
    country: z.string().min(1).max(100).optional(),
    idProofType: IdProofTypeEnum.optional(),
    idProofNumber: z.string().min(1).max(100).optional(),
});
// ===== STEP 3: DOCUMENTS & PAYMENT =====
export const uploadMemberDocumentSchema = z.object({
    nomineeId: z.string().uuid().optional(),
    documentType: DocumentTypeEnum,
    documentCategory: DocumentCategoryEnum,
    documentName: z.string().min(1).max(255),
    fileUrl: z.string(),
    fileSize: z.number().int().positive().max(5 * 1024 * 1024), // 5MB max
    mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
    expiryDate: z.coerce.date().optional(),
});
export const recordRegistrationPaymentSchema = z.object({
    registrationFee: z.number().positive(),
    advanceDeposit: z.number().positive(),
    collectedBy: z.string().uuid(),
    collectionDate: z.coerce.date(),
    collectionMode: CollectionModeEnum,
    referenceNumber: z.string().max(255).optional(),
});
// ===== QUERY PARAMS =====
export const getMemberDetailsParamsSchema = z.object({
    memberId: z.string().uuid(),
});
export const listMembersQuerySchema = z.object({
    registrationStatus: z
        .enum(["Draft", "PendingApproval", "Approved", "Rejected"])
        .optional(),
    memberStatus: z
        .enum(["Active", "Frozen", "Suspended", "Closed", "Deceased"])
        .optional(),
    unitId: z.string().uuid().optional(),
    agentId: z.string().uuid().optional(),
    areaId: z.string().uuid().optional(),
    forumId: z.string().uuid().optional(),
    tierId: z.string().uuid().optional(),
    searchQuery: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});
// ===== MEMBER MANAGEMENT =====
export const suspendMemberSchema = z.object({
    reason: z.string().min(1).max(500),
    suspendedBy: z.string().uuid(),
});
export const reactivateMemberSchema = z.object({
    reactivatedBy: z.string().uuid(),
});
export const closeMemberAccountSchema = z.object({
    closureReason: z.string().min(1).max(500),
    walletBalanceRefunded: z.number().nonnegative(),
    refundedBy: z.string().uuid(),
    closureDate: z.coerce.date(),
});
// ===== PROFILE MANAGEMENT =====
export const updateMemberProfileSchema = z.object({
    firstName: z.string().min(2).max(100).optional(),
    middleName: z.string().max(100).optional(),
    lastName: z.string().min(2).max(100).optional(),
    dateOfBirth: dateOfBirthSchema.optional(),
    gender: GenderEnum.optional(),
    contactNumber: z.string().min(10).max(20).optional(),
    email: z.string().email().optional(),
    addressLine1: z.string().min(1).max(255).optional(),
    addressLine2: z.string().max(255).optional(),
    city: z.string().min(1).max(100).optional(),
    state: z.string().min(1).max(100).optional(),
    postalCode: z.string().min(1).max(20).optional(),
    country: z.string().min(1).max(100).optional(),
});
export const memberIdParamSchema = z.object({
    memberId: z.string().uuid(),
});
export const documentIdParamSchema = z.object({
    memberId: z.string().uuid(),
    documentId: z.string().uuid(),
});
//# sourceMappingURL=validators.js.map