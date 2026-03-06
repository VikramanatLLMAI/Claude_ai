/**
 * Instruction Service
 *
 * Provides save and validation functions for organization-level and role-level
 * system instructions. Validates token budgets server-side and stores plain text
 * as-is (sanitization happens at prompt composition time in system-prompt-service).
 *
 * Used by:
 * - /api/org/[slug]/admin/instructions (org instructions)
 * - /api/org/[slug]/admin/roles/[roleId]/instructions (role instructions)
 */

import { estimateTokenCount, TOKEN_LIMITS, SERVER_MARGIN, CHAR_LIMITS } from '@/lib/token-counter';
import { auditLog, type PrismaTransactionClient } from '@/lib/services/audit-service';
import prisma from '@/lib/db';

/**
 * Result of token budget validation.
 */
export interface TokenBudgetResult {
  valid: boolean;
  tokenCount: number;
  limit: number;
}

/**
 * Result of a save operation.
 */
export interface SaveResult {
  success: boolean;
  error?: string;
}

/**
 * Result of character limit validation.
 */
export interface CharLimitResult {
  valid: boolean;
  charCount: number;
  limit: number;
}

/**
 * Validate that text is within a character limit.
 *
 * @param text - The text to validate
 * @param maxChars - The maximum character count
 * @returns Validation result with character count and limit
 */
export function validateCharacterLimit(text: string, maxChars: number): CharLimitResult {
  const charCount = text.length;
  return {
    valid: charCount <= maxChars,
    charCount,
    limit: maxChars,
  };
}

/**
 * Validate that text is within the token budget (with server margin).
 *
 * @param text - The text to validate
 * @param limit - The token limit (e.g., 700 for org, 500 for role)
 * @returns Validation result with token count and limit
 */
export function validateTokenBudget(text: string, limit: number): TokenBudgetResult {
  const tokenCount = estimateTokenCount(text);
  const maxAllowed = Math.ceil(limit * SERVER_MARGIN);
  return {
    valid: tokenCount <= maxAllowed,
    tokenCount,
    limit,
  };
}

/**
 * Save organization-level system instructions.
 *
 * Validates the token budget (700 tokens max), updates OrgSettings.systemInstructions,
 * and creates an audit log entry. Instructions are stored as plain text.
 *
 * @param orgId - Organization ID
 * @param instructions - System instructions text (plain text)
 * @param actorId - User ID performing the action
 * @param ipAddress - Client IP address for audit logging
 * @returns Save result indicating success or failure with error message
 */
export async function saveOrgInstructions(
  orgId: string,
  instructions: string,
  actorId: string,
  ipAddress: string | null,
): Promise<SaveResult> {
  // Validate token budget
  const validation = validateTokenBudget(instructions, TOKEN_LIMITS.org);
  if (!validation.valid) {
    return {
      success: false,
      error: `Instructions exceed token limit: ~${validation.tokenCount} tokens used, maximum is ${validation.limit} tokens`,
    };
  }

  try {
    await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      await tx.orgSettings.upsert({
        where: { organizationId: orgId },
        update: { systemInstructions: instructions || null },
        create: {
          organizationId: orgId,
          systemInstructions: instructions || null,
        },
      });

      await auditLog.record(tx, {
        userId: actorId,
        action: 'org.instructions.updated',
        targetType: 'OrgSettings',
        targetId: orgId,
        organizationId: orgId,
        ipAddress,
        metadata: {
          tokenCount: validation.tokenCount,
          tokenLimit: validation.limit,
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to save org instructions:', error);
    return {
      success: false,
      error: 'Failed to save instructions. Please try again.',
    };
  }
}

/**
 * Save role-level system instructions.
 *
 * Validates the token budget (500 tokens max), updates Role.systemInstructions,
 * and creates an audit log entry. Instructions are stored as plain text.
 *
 * @param roleId - Role ID
 * @param orgId - Organization ID (for tenant scoping and audit)
 * @param instructions - System instructions text (plain text)
 * @param actorId - User ID performing the action
 * @param ipAddress - Client IP address for audit logging
 * @returns Save result indicating success or failure with error message
 */
export async function saveRoleInstructions(
  roleId: string,
  orgId: string,
  instructions: string,
  actorId: string,
  ipAddress: string | null,
): Promise<SaveResult> {
  // Validate token budget
  const validation = validateTokenBudget(instructions, TOKEN_LIMITS.role);
  if (!validation.valid) {
    return {
      success: false,
      error: `Instructions exceed token limit: ~${validation.tokenCount} tokens used, maximum is ${validation.limit} tokens`,
    };
  }

  try {
    await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      await tx.role.update({
        where: { id: roleId, organizationId: orgId },
        data: { systemInstructions: instructions || null },
      });

      await auditLog.record(tx, {
        userId: actorId,
        action: 'role.instructions.updated',
        targetType: 'Role',
        targetId: roleId,
        organizationId: orgId,
        ipAddress,
        metadata: {
          tokenCount: validation.tokenCount,
          tokenLimit: validation.limit,
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to save role instructions:', error);
    return {
      success: false,
      error: 'Failed to save instructions. Please try again.',
    };
  }
}

/**
 * Save organization-level restriction instructions.
 *
 * Validates the character limit (2000 chars max), updates OrgSettings.restrictionInstructions,
 * and creates an audit log entry. Instructions are stored as plain text.
 *
 * @param orgId - Organization ID
 * @param restrictions - Restriction instructions text (plain text)
 * @param actorId - User ID performing the action
 * @param ipAddress - Client IP address for audit logging
 * @returns Save result indicating success or failure with error message
 */
export async function saveOrgRestrictions(
  orgId: string,
  restrictions: string,
  actorId: string,
  ipAddress: string | null,
): Promise<SaveResult> {
  // Validate character limit
  const validation = validateCharacterLimit(restrictions, CHAR_LIMITS.orgRestrictions);
  if (!validation.valid) {
    return {
      success: false,
      error: `Restriction instructions exceed character limit: ${validation.charCount} characters used, maximum is ${validation.limit} characters`,
    };
  }

  try {
    await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      await tx.orgSettings.upsert({
        where: { organizationId: orgId },
        update: { restrictionInstructions: restrictions || null },
        create: {
          organizationId: orgId,
          restrictionInstructions: restrictions || null,
        },
      });

      await auditLog.record(tx, {
        userId: actorId,
        action: 'org.restrictions.updated',
        targetType: 'OrgSettings',
        targetId: orgId,
        organizationId: orgId,
        ipAddress,
        metadata: {
          charCount: validation.charCount,
          charLimit: validation.limit,
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to save org restrictions:', error);
    return {
      success: false,
      error: 'Failed to save restriction instructions. Please try again.',
    };
  }
}

/**
 * Save role-level restriction instructions.
 *
 * Validates the character limit (1000 chars max), updates Role.restrictionInstructions,
 * and creates an audit log entry. Instructions are stored as plain text.
 *
 * @param roleId - Role ID
 * @param orgId - Organization ID (for tenant scoping and audit)
 * @param restrictions - Restriction instructions text (plain text)
 * @param actorId - User ID performing the action
 * @param ipAddress - Client IP address for audit logging
 * @returns Save result indicating success or failure with error message
 */
export async function saveRoleRestrictions(
  roleId: string,
  orgId: string,
  restrictions: string,
  actorId: string,
  ipAddress: string | null,
): Promise<SaveResult> {
  // Validate character limit
  const validation = validateCharacterLimit(restrictions, CHAR_LIMITS.roleRestrictions);
  if (!validation.valid) {
    return {
      success: false,
      error: `Restriction instructions exceed character limit: ${validation.charCount} characters used, maximum is ${validation.limit} characters`,
    };
  }

  try {
    await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      await tx.role.update({
        where: { id: roleId, organizationId: orgId },
        data: { restrictionInstructions: restrictions || null },
      });

      await auditLog.record(tx, {
        userId: actorId,
        action: 'role.restrictions.updated',
        targetType: 'Role',
        targetId: roleId,
        organizationId: orgId,
        ipAddress,
        metadata: {
          charCount: validation.charCount,
          charLimit: validation.limit,
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to save role restrictions:', error);
    return {
      success: false,
      error: 'Failed to save restriction instructions. Please try again.',
    };
  }
}
