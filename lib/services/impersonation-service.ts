/**
 * Impersonation Service
 *
 * Manages Super Admin user impersonation sessions for IT support.
 * Creates real sessions as the target user with full audit trail.
 *
 * Functions:
 * - startImpersonation: Create an impersonation session as target user
 * - endImpersonation: Terminate an impersonation session
 * - getImpersonationStatus: Check current session impersonation state
 *
 * Covers: SAUD-04
 */

import prisma from '@/lib/db';
import { auditLog, type PrismaTransactionClient } from '@/lib/services/audit-service';
import { randomBytes } from 'crypto';

// ============================================
// Types
// ============================================

export type ImpersonationDuration = 15 | 30 | 60;

export interface ImpersonationStartResult {
  token: string;
  orgSlug: string;
}

export interface ImpersonationStatus {
  isImpersonating: boolean;
  impersonatorName?: string;
  targetUserName?: string;
  targetUserEmail?: string;
  reason?: string;
  expiresAt?: Date;
}

// ============================================
// Start Impersonation
// ============================================

/**
 * Start impersonating a target user.
 *
 * Creates a real session as the target user with impersonation metadata.
 * The session is treated as the target user for all authorization checks.
 * The impersonatorId is metadata for audit trail only.
 *
 * @param superAdminId - ID of the Super Admin initiating impersonation
 * @param targetUserId - ID of the user to impersonate
 * @param durationMinutes - Session duration: 15, 30, or 60 minutes
 * @param reason - Reason for impersonation (audit trail)
 * @param ipAddress - IP address of the request
 * @returns Token and org slug for redirect
 */
export async function startImpersonation(
  superAdminId: string,
  targetUserId: string,
  durationMinutes: ImpersonationDuration,
  reason: string,
  ipAddress: string | null
): Promise<ImpersonationStartResult> {
  return prisma.$transaction(async (tx: PrismaTransactionClient) => {
    // 1. Verify superAdminId is a Super Admin
    const superAdmin = await tx.user.findUnique({
      where: { id: superAdminId },
      select: { id: true, isSuperAdmin: true, name: true },
    });

    if (!superAdmin || !superAdmin.isSuperAdmin) {
      throw new Error('Only Super Admins can impersonate users');
    }

    // 2. Get target user and their org membership
    const targetUser = await tx.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true, isSuperAdmin: true },
    });

    if (!targetUser) {
      throw new Error('Target user not found');
    }

    if (targetUser.isSuperAdmin) {
      throw new Error('Cannot impersonate another Super Admin');
    }

    // Find target user's primary org membership (first active membership)
    const orgMember = await tx.orgMember.findFirst({
      where: {
        userId: targetUserId,
        status: 'ACTIVE',
        organization: {
          deletedAt: null,
          status: 'ACTIVE',
        },
      },
      include: {
        organization: {
          select: { id: true, slug: true, name: true },
        },
      },
    });

    if (!orgMember) {
      throw new Error('Target user has no active organization membership');
    }

    // 3. Create impersonation session
    const token = randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

    await tx.session.create({
      data: {
        userId: targetUserId,
        token,
        organizationId: orgMember.organization.id,
        expiresAt,
        impersonatorId: superAdminId,
        impersonationReason: reason,
        impersonationExpiresAt: expiresAt,
        ipAddress,
      },
    });

    // 4. Audit log
    await auditLog.record(tx, {
      userId: superAdminId,
      action: 'impersonation.started',
      targetType: 'User',
      targetId: targetUserId,
      organizationId: null, // Platform-level action
      ipAddress,
      metadata: {
        targetUserId,
        targetUserName: targetUser.name,
        targetUserEmail: targetUser.email,
        targetOrgId: orgMember.organization.id,
        targetOrgSlug: orgMember.organization.slug,
        targetOrgName: orgMember.organization.name,
        reason,
        durationMinutes,
      },
    });

    // 5. Return token and org slug for redirect
    return {
      token,
      orgSlug: orgMember.organization.slug,
    };
  });
}

// ============================================
// End Impersonation
// ============================================

/**
 * End an active impersonation session.
 *
 * Deletes the impersonation session and logs the action.
 *
 * @param sessionToken - The impersonation session token
 * @param superAdminId - ID of the Super Admin ending impersonation
 * @param ipAddress - IP address of the request
 */
export async function endImpersonation(
  sessionToken: string,
  superAdminId: string,
  ipAddress: string | null
): Promise<void> {
  await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    // 1. Find session by token, verify impersonatorId matches
    const session = await tx.session.findUnique({
      where: { token: sessionToken },
      select: {
        id: true,
        userId: true,
        impersonatorId: true,
        impersonationReason: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.impersonatorId) {
      throw new Error('This is not an impersonation session');
    }

    if (session.impersonatorId !== superAdminId) {
      throw new Error('Not authorized to end this impersonation session');
    }

    // 2. Delete the impersonation session
    await tx.session.delete({
      where: { id: session.id },
    });

    // 3. Calculate duration
    const durationMs = Date.now() - session.createdAt.getTime();
    const durationMinutes = Math.round(durationMs / 60000);

    // 4. Audit log
    await auditLog.record(tx, {
      userId: superAdminId,
      action: 'impersonation.ended',
      targetType: 'User',
      targetId: session.userId,
      organizationId: null, // Platform-level action
      ipAddress,
      metadata: {
        targetUserId: session.userId,
        targetUserName: session.user.name,
        targetUserEmail: session.user.email,
        reason: session.impersonationReason,
        actualDurationMinutes: durationMinutes,
      },
    });
  });
}

// ============================================
// Get Impersonation Status
// ============================================

/**
 * Get the impersonation status of the current session.
 *
 * @param sessionToken - The current session token
 * @returns Impersonation status details, or isImpersonating: false
 */
export async function getImpersonationStatus(
  sessionToken: string
): Promise<ImpersonationStatus> {
  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    select: {
      impersonatorId: true,
      impersonationReason: true,
      impersonationExpiresAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!session || !session.impersonatorId) {
    return { isImpersonating: false };
  }

  // Get impersonator's name
  const impersonator = await prisma.user.findUnique({
    where: { id: session.impersonatorId },
    select: { name: true },
  });

  return {
    isImpersonating: true,
    impersonatorName: impersonator?.name ?? 'Unknown',
    targetUserName: session.user.name,
    targetUserEmail: session.user.email,
    reason: session.impersonationReason ?? undefined,
    expiresAt: session.impersonationExpiresAt ?? undefined,
  };
}
