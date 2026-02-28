/**
 * Password Policy Service
 *
 * CRUD and enforcement for per-org password policies.
 * Uses raw prisma for PasswordPolicy (org-level, not tenant-scoped model access pattern).
 * Uses tenantDb for OrgMember updates (org-scoped model).
 *
 * Functions:
 * - getPasswordPolicy: Get password policy for an org
 * - updatePasswordPolicy: Upsert password policy with audit logging
 * - validatePasswordAgainstPolicy: Validate a password string against policy rules
 * - checkPasswordChangeRequired: Check if user must change password
 * - forcePasswordReset: Set forcePasswordChange flag on specified OrgMembers
 *
 * Covers: OPWD-04
 */

import prisma from '@/lib/db';
import type { TenantPrismaClient } from '@/lib/tenant';
import { auditLog, type PrismaTransactionClient } from './audit-service';
import type { User, OrgMember, PasswordPolicy } from '@/lib/generated/prisma/client';

// ============================================
// Types
// ============================================

export interface UpdatePasswordPolicyInput {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  expiryDays?: number | null;
}

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export interface PasswordChangeCheckResult {
  required: boolean;
  reason: 'admin_forced' | 'expired' | null;
}

export interface AuditContext {
  userId: string;
  organizationId: string;
  ipAddress: string | null;
}

// ============================================
// Read
// ============================================

/**
 * Get the password policy for an organization.
 *
 * Returns the policy or null (no policy = defaults).
 * Uses raw prisma since PasswordPolicy lookup is by organizationId (unique field).
 *
 * @param orgId - Organization ID
 */
export async function getPasswordPolicy(
  orgId: string
): Promise<PasswordPolicy | null> {
  return prisma.passwordPolicy.findUnique({
    where: { organizationId: orgId },
  });
}

// ============================================
// Write
// ============================================

/**
 * Create or update the password policy for an organization.
 *
 * Uses upsert to handle both creation and update cases.
 * Logs to audit within a transaction.
 *
 * @param orgId - Organization ID
 * @param data - Policy update data
 * @param auditCtx - Audit context
 */
export async function updatePasswordPolicy(
  orgId: string,
  data: UpdatePasswordPolicyInput,
  auditCtx: AuditContext
): Promise<PasswordPolicy> {
  // Validate minLength if provided
  if (data.minLength !== undefined) {
    if (!Number.isInteger(data.minLength) || data.minLength < 1) {
      throw new Error('Minimum password length must be a positive integer');
    }
    if (data.minLength > 128) {
      throw new Error('Minimum password length cannot exceed 128');
    }
  }

  // Validate expiryDays if provided
  if (data.expiryDays !== undefined && data.expiryDays !== null) {
    if (!Number.isInteger(data.expiryDays) || data.expiryDays < 1) {
      throw new Error('Password expiry days must be a positive integer');
    }
  }

  return prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const policy = await tx.passwordPolicy.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        minLength: data.minLength ?? 8,
        requireUppercase: data.requireUppercase ?? false,
        requireLowercase: data.requireLowercase ?? false,
        requireNumbers: data.requireNumbers ?? false,
        requireSpecialChars: data.requireSpecialChars ?? false,
        expiryDays: data.expiryDays ?? null,
      },
      update: {
        ...(data.minLength !== undefined && { minLength: data.minLength }),
        ...(data.requireUppercase !== undefined && { requireUppercase: data.requireUppercase }),
        ...(data.requireLowercase !== undefined && { requireLowercase: data.requireLowercase }),
        ...(data.requireNumbers !== undefined && { requireNumbers: data.requireNumbers }),
        ...(data.requireSpecialChars !== undefined && { requireSpecialChars: data.requireSpecialChars }),
        ...(data.expiryDays !== undefined && { expiryDays: data.expiryDays }),
      },
    });

    await auditLog.record(tx, {
      userId: auditCtx.userId,
      action: 'password_policy.updated',
      targetType: 'PasswordPolicy',
      targetId: policy.id,
      organizationId: auditCtx.organizationId,
      ipAddress: auditCtx.ipAddress,
      metadata: {
        changes: Object.keys(data),
        minLength: policy.minLength,
        expiryDays: policy.expiryDays,
      },
    });

    return policy;
  });
}

// ============================================
// Validation
// ============================================

/**
 * Validate a password string against a password policy.
 *
 * Returns `{ valid: true, errors: [] }` if the password meets all requirements.
 * If no policy is provided, only checks minimum length of 8 (default).
 *
 * @param password - Password to validate
 * @param policy - Password policy (or null for defaults)
 */
export function validatePasswordAgainstPolicy(
  password: string,
  policy: PasswordPolicy | null
): PasswordValidationResult {
  const errors: string[] = [];

  // Use policy values or defaults
  const minLength = policy?.minLength ?? 8;
  const requireUppercase = policy?.requireUppercase ?? false;
  const requireLowercase = policy?.requireLowercase ?? false;
  const requireNumbers = policy?.requireNumbers ?? false;
  const requireSpecialChars = policy?.requireSpecialChars ?? false;

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// Password Change Check
// ============================================

/**
 * Check if a user is required to change their password.
 *
 * Checks two conditions:
 * 1. Admin-forced: orgMember.forcePasswordChange is true
 * 2. Expired: user.passwordChangedAt + policy.expiryDays < now
 *
 * @param user - User with passwordChangedAt field
 * @param orgMember - OrgMember with forcePasswordChange flag
 * @param policy - Password policy (or null for no expiry check)
 */
export function checkPasswordChangeRequired(
  user: Pick<User, 'passwordChangedAt' | 'createdAt'>,
  orgMember: Pick<OrgMember, 'forcePasswordChange'>,
  policy: PasswordPolicy | null
): PasswordChangeCheckResult {
  // Check admin-forced first (higher priority)
  if (orgMember.forcePasswordChange) {
    return { required: true, reason: 'admin_forced' };
  }

  // Check password expiry
  if (policy?.expiryDays) {
    // Use passwordChangedAt, or fall back to account creation date
    const lastChanged = user.passwordChangedAt ?? user.createdAt;
    const expiryDate = new Date(lastChanged.getTime() + policy.expiryDays * 24 * 60 * 60 * 1000);

    if (new Date() > expiryDate) {
      return { required: true, reason: 'expired' };
    }
  }

  return { required: false, reason: null };
}

// ============================================
// Force Password Reset
// ============================================

/**
 * Set forcePasswordChange=true on specified OrgMembers.
 *
 * Used by admin to force password changes on selected users.
 * Logs an audit entry per user.
 *
 * @param tenantDb - Tenant-scoped Prisma client
 * @param userIds - User IDs to force password change on
 * @param orgId - Organization ID
 * @param auditCtx - Audit context
 */
export async function forcePasswordReset(
  tenantDb: TenantPrismaClient,
  userIds: string[],
  orgId: string,
  auditCtx: AuditContext
): Promise<{ updatedCount: number }> {
  if (userIds.length === 0) {
    return { updatedCount: 0 };
  }

  return tenantDb.$transaction(async (tx: PrismaTransactionClient) => {
    // Update all specified members in one batch
    const result = await tx.orgMember.updateMany({
      where: {
        userId: { in: userIds },
        organizationId: orgId,
      },
      data: { forcePasswordChange: true },
    });

    // Log audit entries per user
    for (const userId of userIds) {
      await auditLog.record(tx, {
        userId: auditCtx.userId,
        action: 'user.force_password_reset',
        targetType: 'User',
        targetId: userId,
        organizationId: auditCtx.organizationId,
        ipAddress: auditCtx.ipAddress,
        metadata: { forcedBy: auditCtx.userId },
      });
    }

    return { updatedCount: result.count };
  });
}
