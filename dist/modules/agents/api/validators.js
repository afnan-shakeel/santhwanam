/**
 * Zod validators for Agents API
 */
import { z } from "zod";
// Enums
const RegistrationStatusEnum = z.enum([
    "Draft",
    "PendingApproval",
    "Approved",
    "Rejected",
]);
const AgentStatusEnum = z.enum([
    "Active",
    "Inactive",
    "Suspended",
    "Terminated",
]);
const GenderEnum = z.enum(["Male", "Female", "Other"]);
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
    message: "Agent must be at least 18 years old",
});
// Agent code: alphanumeric with hyphens/underscores
const agentCodeSchema = z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/);
// Start Agent Registration
export const startAgentRegistrationSchema = z.object({
    unitId: z.string().uuid(),
    areaId: z.string().uuid(),
    forumId: z.string().uuid(),
    agentCode: agentCodeSchema,
    firstName: z.string().min(1).max(100),
    middleName: z.string().max(100).optional().nullable(),
    lastName: z.string().min(1).max(100),
    dateOfBirth: dateOfBirthSchema,
    gender: GenderEnum.optional().nullable(),
    contactNumber: z.string().min(10).max(20),
    alternateContactNumber: z.string().min(10).max(20).optional().nullable(),
    email: z.string().email(),
    addressLine1: z.string().max(255).optional(),
    addressLine2: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    postalCode: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
    joinedDate: z.coerce.date(),
});
// Update Agent Draft
export const updateAgentDraftSchema = z.object({
    firstName: z.string().min(1).max(100).optional().nullable(),
    middleName: z.string().max(100).optional().nullable(),
    lastName: z.string().min(1).max(100).optional().nullable(),
    dateOfBirth: dateOfBirthSchema.optional().nullable(),
    gender: GenderEnum.optional().nullable(),
    contactNumber: z.string().min(10).max(20).optional().nullable(),
    alternateContactNumber: z.string().min(10).max(20).optional().nullable(),
    email: z.string().email().optional().nullable(),
    addressLine1: z.string().max(255).optional().nullable(),
    addressLine2: z.string().max(255).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(100).optional().nullable(),
    postalCode: z.string().max(20).optional().nullable(),
    country: z.string().max(100).optional().nullable(),
});
// Update Agent (approved)
export const updateAgentSchema = z.object({
    firstName: z.string().min(1).max(100).optional(),
    middleName: z.string().max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    contactNumber: z.string().min(10).max(20).optional(),
    alternateContactNumber: z.string().min(10).max(20).optional(),
    addressLine1: z.string().max(255).optional(),
    addressLine2: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    postalCode: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
});
// Terminate Agent
export const terminateAgentSchema = z.object({
    terminationReason: z.string().min(10).max(500),
});
// ===== AGENT PROFILE APIs =====
// Update Agent Profile
export const updateAgentProfileSchema = z.object({
    firstName: z.string().min(1).max(100).optional(),
    middleName: z.string().max(100).optional().nullable(),
    lastName: z.string().min(1).max(100).optional(),
    contactNumber: z.string().min(10).max(20).optional(),
    alternateContactNumber: z.string().min(10).max(20).optional().nullable(),
    email: z.string().email().optional(),
    addressLine1: z.string().max(255).optional().nullable(),
    addressLine2: z.string().max(255).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(100).optional().nullable(),
    postalCode: z.string().max(20).optional().nullable(),
    country: z.string().max(100).optional().nullable(),
});
// Agent Stats Query
export const agentStatsQuerySchema = z.object({
    period: z.enum(["thisMonth", "lastMonth", "thisYear"]).optional().default("thisMonth"),
});
// Agent Members Query
export const agentMembersQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: z.enum(["Active", "Suspended", "Frozen", "Closed", "Deceased"]).optional(),
    tier: z.string().uuid().optional(),
    search: z.string().max(100).optional(),
});
// Agent Members Export Query
export const agentMembersExportQuerySchema = z.object({
    format: z.enum(["csv", "excel"]).optional().default("csv"),
});
// Agent Performance Query
export const agentPerformanceQuerySchema = z.object({
    period: z.enum(["thisMonth", "lastMonth", "thisYear"]).optional().default("thisMonth"),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
});
// Path Params
export const agentIdParamSchema = z.object({
    agentId: z.string().uuid(),
});
//# sourceMappingURL=validators.js.map