// API: Dev Module Validators
// Zod schemas for dev endpoint request validation

import { z } from "zod";

// Nominee validation schema
const nomineeSchema = z.object({
  name: z.string().min(1, "Nominee name is required"),
  relationType: z.enum([
    "Father",
    "Mother",
    "Spouse",
    "Son",
    "Daughter",
    "Brother",
    "Sister",
    "Other",
  ]),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
  contactNumber: z.string().min(1, "Contact number is required"),
  alternateContactNumber: z.string().optional(),
  addressLine1: z.string().min(1, "Address line 1 is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
  idProofType: z.enum([
    "NationalID",
    "Passport",
    "DrivingLicense",
    "VoterID",
    "Other",
  ]),
  idProofNumber: z.string().min(1, "ID proof number is required"),
});

// Quick member registration schema
export const quickMemberRegistrationSchema = z.object({
  // Personal Information (Required)
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
  gender: z.enum(["Male", "Female", "Other"]),
  contactNumber: z.string().min(1, "Contact number is required"),
  alternateContactNumber: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),

  // Address (Required)
  addressLine1: z.string().min(1, "Address line 1 is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),

  // Membership (Required)
  tierId: z.string().uuid("Invalid tier ID"),
  agentId: z.string().uuid("Invalid agent ID"),

  // Registration Payment (Optional - will use tier defaults)
  registrationFee: z.number().positive().optional(),
  advanceDeposit: z.number().positive().optional(),
  collectionMode: z.enum(["Cash", "BankTransfer", "Cheque", "Online"]).optional(),
  collectionDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    })
    .optional(),
  referenceNumber: z.string().optional(),

  // Nominees (Optional - max 3)
  nominees: z
    .array(nomineeSchema)
    .max(3, "Maximum 3 nominees allowed")
    .optional(),

  // Control flags
  autoApprove: z.boolean().optional().default(true),
  createWallet: z.boolean().optional().default(true),
});

export type QuickMemberRegistrationRequest = z.infer<
  typeof quickMemberRegistrationSchema
>;
