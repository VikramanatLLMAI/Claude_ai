/**
 * Zod validation schemas for API request bodies
 * Provides type-safe validation for all API endpoints
 */

import { z } from 'zod';

// ============================================
// Auth Schemas
// ============================================

export const EmailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email format')
  .max(255, 'Email must be less than 255 characters');

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  );

export const RegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: z.string().max(100).optional(),
});

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const PasswordResetRequestSchema = z.object({
  email: EmailSchema,
});

export const PasswordResetSchema = z.object({
  token: z.string().min(32, 'Invalid reset token'),
  newPassword: PasswordSchema,
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: PasswordSchema,
});

// ============================================
// User Settings Schemas
// ============================================

export const UpdateProfileSchema = z.object({
  name: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  fontSize: z.number().min(12).max(24).optional(),
  codeTheme: z.string().max(50).optional(),
  messageDensity: z.enum(['compact', 'comfortable', 'spacious']).optional(),
});

export const AwsCredentialsSchema = z.object({
  accessKeyId: z
    .string()
    .regex(/^(AKIA|ASIA)[A-Z0-9]{16}$/, 'Invalid AWS access key format'),
  secretAccessKey: z
    .string()
    .min(20, 'Secret key must be at least 20 characters')
    .max(100, 'Secret key must be less than 100 characters'),
  region: z.string().regex(/^[a-z]{2}-[a-z]+-\d$/, 'Invalid AWS region format').optional(),
});

// ============================================
// Conversation Schemas
// ============================================

export const CreateConversationSchema = z.object({
  title: z.string().max(200).optional(),
  model: z.string().max(100).optional(),
});

export const UpdateConversationSchema = z.object({
  title: z.string().max(200).optional(),
  isPinned: z.boolean().optional(),
  isShared: z.boolean().optional(),
  model: z.string().max(100).optional(),
});

// ============================================
// Message Schemas
// ============================================

export const MessageRoleSchema = z.enum(['user', 'assistant', 'tool']);

export const CreateMessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string().min(1, 'Message content is required').max(100000),
  parts: z.array(z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const MessageFeedbackSchema = z.object({
  messageId: z.string().uuid('Invalid message ID'),
  feedback: z.enum(['positive', 'negative']),
  comment: z.string().max(1000).optional(),
});

// ============================================
// MCP Connection Schemas
// ============================================

export const McpAuthTypeSchema = z.enum(['none', 'api_key', 'oauth']);

export const CreateMcpConnectionSchema = z.object({
  name: z.string().min(1).max(100, 'Name must be less than 100 characters'),
  serverUrl: z.string().url('Invalid server URL'),
  authType: McpAuthTypeSchema.optional().default('none'),
  oauthClientId: z.string().max(500).optional(),
  oauthClientSecret: z.string().max(500).optional(),
  apiKey: z.string().max(500).optional(),
});

export const UpdateMcpConnectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  serverUrl: z.string().url().optional(),
  status: z.enum(['connected', 'disconnected', 'error']).optional(),
  isActive: z.boolean().optional(),
  lastError: z.string().max(1000).optional().nullable(),
  availableTools: z.array(z.unknown()).optional(),
  lastConnectedAt: z.date().optional(),
});

// ============================================
// Chat Request Schema
// ============================================

export const ChatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().optional(),
    parts: z.array(z.unknown()).optional(),
  })).min(1),
  model: z.string().max(100).optional(),
  enableReasoning: z.boolean().optional(),
  conversationId: z.string().uuid().optional().nullable(),
  webSearch: z.boolean().optional(),
  activeMcpIds: z.array(z.string().uuid()).optional(),
});

// ============================================
// Validation Helper
// ============================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: z.ZodIssue[];
}

/**
 * Validate data against a Zod schema
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error.issues };
}

/**
 * Format Zod errors for API response
 */
export function formatValidationErrors(errors: z.ZodIssue[]): string {
  return errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
}

// ============================================
// Phase 2: Organization Management Schemas
// ============================================

// Slug validation: lowercase alphanumeric + hyphens, 3-50 chars, no leading/trailing hyphens
export const OrgSlugSchema = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(50, 'Slug must be less than 50 characters')
  .regex(
    /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
    'Slug must be lowercase alphanumeric with hyphens, no leading/trailing hyphens'
  )
  .refine((val) => !val.includes('--'), 'Slug cannot contain consecutive hyphens');

export const CreateOrgSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: OrgSlugSchema,
  logoBase64: z.string().max(500000).optional(), // ~375KB max image
  logoDisplayMode: z
    .enum(['PLATFORM_AND_ORG', 'ORG_ONLY'])
    .default('PLATFORM_AND_ORG'),
  initialAdminEmail: EmailSchema.optional(), // Email for initial Org Admin invitation
});

export const UpdateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: OrgSlugSchema.optional(),
  logoDisplayMode: z.enum(['PLATFORM_AND_ORG', 'ORG_ONLY']).optional(),
  monthlyRequestCeiling: z.number().int().positive('Monthly request ceiling must be a positive integer').nullable().optional(),
  monthlyTokenCeiling: z.number().int().positive('Monthly token ceiling must be a positive integer').nullable().optional(),
});

export const OrgLogoSchema = z.object({
  logoBase64: z
    .string()
    .min(1, 'Logo data is required')
    .max(500000, 'Logo must be less than 375KB'),
});

export const CreateSuperAdminSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: z.string().min(1, 'Name is required').max(100),
});

export const UpdateSuperAdminSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: EmailSchema.optional(),
});

export const UpdateRoleTemplateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(500).optional(),
  allowedModels: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  systemInstructions: z.string().max(5000).optional(),
  customInstructionsEnabled: z.boolean().optional(),
  customInstructionsMaxLength: z.number().int().min(100).max(5000).optional(),
  dailyRequestLimit: z.number().int().min(1).nullable().optional(),
  dailyTokenLimit: z.number().int().min(1000).nullable().optional(),
});

// ============================================
// Phase 2: Invitation Schemas
// ============================================

export const CreateInvitationSchema = z.object({
  email: EmailSchema,
  roleId: z.string().uuid('Invalid role ID'),
});

export const SetDefaultRoleSchema = z.object({
  roleId: z.string().uuid('Invalid role ID').nullable(),
});

// ============================================
// Model Registry Schemas
// ============================================

export const CreateModelSchema = z.object({
  modelId: z.string().min(1, 'Model ID is required').max(100),
  displayName: z.string().min(1, 'Display name is required').max(200),
  generationGroup: z.string().min(1, 'Generation group is required').max(50),
  inputPricePerToken: z.number().nonnegative('Input price must be non-negative'),
  outputPricePerToken: z.number().nonnegative('Output price must be non-negative'),
  thinkingPricePerToken: z.number().nonnegative('Thinking price must be non-negative'),
  cacheWritePricePerToken: z.number().nonnegative('Cache write price must be non-negative'),
  cacheReadPricePerToken: z.number().nonnegative('Cache read price must be non-negative'),
  supportsThinking: z.boolean().optional().default(false),
  supportsVision: z.boolean().optional().default(true),
  supportsTools: z.boolean().optional().default(true),
  thinkingType: z.enum(['adaptive', 'extended']).nullable().optional().default(null),
  maxOutputTokens: z.number().int().positive('Max output tokens must be a positive integer'),
  contextWindow: z.number().int().positive('Context window must be a positive integer'),
  status: z.enum(['ACTIVE', 'DEPRECATED']).optional().default('ACTIVE'),
  sortOrder: z.number().int().optional().default(0),
});

export const UpdateModelSchema = z.object({
  modelId: z.string().min(1).max(100).optional(),
  displayName: z.string().min(1).max(200).optional(),
  generationGroup: z.string().min(1).max(50).optional(),
  inputPricePerToken: z.number().nonnegative().optional(),
  outputPricePerToken: z.number().nonnegative().optional(),
  thinkingPricePerToken: z.number().nonnegative().optional(),
  cacheWritePricePerToken: z.number().nonnegative().optional(),
  cacheReadPricePerToken: z.number().nonnegative().optional(),
  supportsThinking: z.boolean().optional(),
  supportsVision: z.boolean().optional(),
  supportsTools: z.boolean().optional(),
  thinkingType: z.enum(['adaptive', 'extended']).nullable().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  contextWindow: z.number().int().positive().optional(),
  status: z.enum(['ACTIVE', 'DEPRECATED']).optional(),
  sortOrder: z.number().int().optional(),
});

// ============================================
// Instruction Schemas (Phase 3 Plan 04)
// ============================================

// Max character limits derived from token limits * ~4 chars/token * server margin
// These are generous character limits; actual token validation happens server-side
export const OrgInstructionsSchema = z.object({
  systemInstructions: z.string().max(Math.ceil(700 * 4 * 1.05), 'Instructions text is too long'),
});

export const RoleInstructionsSchema = z.object({
  systemInstructions: z.string().max(Math.ceil(500 * 4 * 1.05), 'Instructions text is too long'),
});

// ============================================
// Audit Log Filter Schema (Phase 5 Plan 07)
// ============================================

export const AuditLogFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(50).default(25),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  organizationId: z.string().uuid().optional(),
  action: z.string().optional(),
  userId: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'action']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type AuditLogFilterInput = z.infer<typeof AuditLogFilterSchema>;

// Export types inferred from schemas
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type PasswordResetRequestInput = z.infer<typeof PasswordResetRequestSchema>;
export type PasswordResetInput = z.infer<typeof PasswordResetSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type UserPreferencesInput = z.infer<typeof UserPreferencesSchema>;
export type AwsCredentialsInput = z.infer<typeof AwsCredentialsSchema>;
export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;
export type UpdateConversationInput = z.infer<typeof UpdateConversationSchema>;
export type CreateMessageInput = z.infer<typeof CreateMessageSchema>;
export type MessageFeedbackInput = z.infer<typeof MessageFeedbackSchema>;
export type CreateMcpConnectionInput = z.infer<typeof CreateMcpConnectionSchema>;
export type UpdateMcpConnectionInput = z.infer<typeof UpdateMcpConnectionSchema>;
export type ChatRequestInput = z.infer<typeof ChatRequestSchema>;
export type CreateOrgInput = z.infer<typeof CreateOrgSchema>;
export type UpdateOrgInput = z.infer<typeof UpdateOrgSchema>;
export type OrgLogoInput = z.infer<typeof OrgLogoSchema>;
export type CreateSuperAdminInput = z.infer<typeof CreateSuperAdminSchema>;
export type UpdateSuperAdminInput = z.infer<typeof UpdateSuperAdminSchema>;
export type UpdateRoleTemplateInput = z.infer<typeof UpdateRoleTemplateSchema>;
export type CreateInvitationInput = z.infer<typeof CreateInvitationSchema>;
export type SetDefaultRoleInput = z.infer<typeof SetDefaultRoleSchema>;
export type CreateModelInput = z.infer<typeof CreateModelSchema>;
export type UpdateModelInput = z.infer<typeof UpdateModelSchema>;
export type OrgInstructionsInput = z.infer<typeof OrgInstructionsSchema>;
export type RoleInstructionsInput = z.infer<typeof RoleInstructionsSchema>;

// ============================================
// Phase 5: Platform Settings Schemas
// ============================================

export const UpdatePlatformSettingsSchema = z.object({
  platformName: z.string().min(1).max(100).optional(),
  sessionExpiryDays: z.number().int().min(1).max(365).optional(),
  maintenanceMode: z.boolean().optional(),
  featureToggles: z.object({
    webSearch: z.boolean().optional(),
    fileUploads: z.boolean().optional(),
    mcpTools: z.boolean().optional(),
    artifactGeneration: z.boolean().optional(),
    extendedThinking: z.boolean().optional(),
  }).optional(),
});

export const UpdatePlatformPromptSchema = z.object({
  prompt: z.string().max(100000, 'Prompt must be less than 100,000 characters'),
});

export type UpdatePlatformSettingsInput = z.infer<typeof UpdatePlatformSettingsSchema>;
export type UpdatePlatformPromptInput = z.infer<typeof UpdatePlatformPromptSchema>;
