/**
 * Cleanup Service
 *
 * Scheduled cleanup operations for the platform:
 * - Purge soft-deleted organizations after 30-day grace period (CRON-01)
 * - Cleanup expired invitations (CRON-02)
 * - Cleanup expired sessions (CRON-03)
 *
 * Called by the cron route or triggered manually in development.
 */

import prisma from '@/lib/db';
import { auditLog, type PrismaTransactionClient } from './audit-service';

// ============================================
// Types
// ============================================

export interface CleanupResult {
  purgedOrgs: { count: number; orgNames: string[] };
  expiredInvitations: { count: number };
  expiredSessions: { count: number };
  timestamp: string;
}

// ============================================
// CRON-01: Purge soft-deleted organizations after 30 days
// ============================================

/**
 * Permanently delete organizations that were soft-deleted more than 30 days ago.
 *
 * For each org: cascade deletes conversations, messages, artifacts, members,
 * roles, invitations, settings, theme assignments, password policy, usage records,
 * onboarding agreements, MCP connections, API key assignments, and audit logs.
 *
 * Orphaned users (no other org memberships) remain in the system.
 */
export async function purgeDeletedOrganizations(): Promise<{ count: number; orgNames: string[] }> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Find orgs eligible for purge
  const orgsToDelete = await prisma.organization.findMany({
    where: {
      deletedAt: { not: null, lt: thirtyDaysAgo },
    },
    select: { id: true, name: true, slug: true },
  });

  if (orgsToDelete.length === 0) {
    return { count: 0, orgNames: [] };
  }

  const orgNames: string[] = [];

  // Delete each org in its own transaction for isolation
  for (const org of orgsToDelete) {
    await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      // Cascade delete all org-scoped data
      // Order: dependent records first, then the org itself
      await tx.onboardingAgreement.deleteMany({ where: { organizationId: org.id } });
      await tx.usageRecord.deleteMany({ where: { organizationId: org.id } });
      await tx.artifact.deleteMany({ where: { organizationId: org.id } });
      await tx.message.deleteMany({ where: { organizationId: org.id } });
      await tx.conversation.deleteMany({ where: { organizationId: org.id } });
      await tx.mcpConnection.deleteMany({ where: { organizationId: org.id } });
      await tx.platformApiKeyAssignment.deleteMany({ where: { organizationId: org.id } });
      await tx.platformApiKey.deleteMany({ where: { organizationId: org.id } });
      await tx.orgThemeAssignment.deleteMany({ where: { organizationId: org.id } });
      await tx.orgSettings.deleteMany({ where: { organizationId: org.id } });
      await tx.passwordPolicy.deleteMany({ where: { organizationId: org.id } });
      await tx.invitation.deleteMany({ where: { organizationId: org.id } });
      await tx.orgMember.deleteMany({ where: { organizationId: org.id } });
      await tx.role.deleteMany({ where: { organizationId: org.id } });
      await tx.session.deleteMany({ where: { organizationId: org.id } });
      await tx.auditLog.deleteMany({ where: { organizationId: org.id } });

      // Finally delete the organization itself
      await tx.organization.delete({ where: { id: org.id } });
    });

    orgNames.push(org.name);
  }

  // Platform-level audit log entry for the purge operation
  await prisma.auditLog.create({
    data: {
      userId: null,
      action: 'org.purged',
      targetType: 'Organization',
      metadata: {
        purgedCount: orgNames.length,
        orgNames,
      },
    },
  });

  return { count: orgNames.length, orgNames };
}

// ============================================
// CRON-02: Cleanup expired invitations
// ============================================

/**
 * Delete invitations that are still PENDING but have passed their expiresAt date.
 */
export async function cleanupExpiredInvitations(): Promise<{ count: number }> {
  const result = await prisma.invitation.deleteMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: new Date() },
    },
  });

  if (result.count > 0) {
    await prisma.auditLog.create({
      data: {
        userId: null,
        action: 'invitation.expired_cleanup',
        metadata: { deletedCount: result.count },
      },
    });
  }

  return { count: result.count };
}

// ============================================
// CRON-03: Cleanup expired sessions
// ============================================

/**
 * Delete sessions that have passed their expiresAt date.
 */
export async function cleanupExpiredSessions(): Promise<{ count: number }> {
  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  if (result.count > 0) {
    await prisma.auditLog.create({
      data: {
        userId: null,
        action: 'session.expired_cleanup',
        metadata: { deletedCount: result.count },
      },
    });
  }

  return { count: result.count };
}

// ============================================
// Main entry point for cron route
// ============================================

/**
 * Run all scheduled cleanup tasks.
 * Returns a summary of what was cleaned up.
 */
export async function runScheduledCleanup(): Promise<CleanupResult> {
  const [purgedOrgs, expiredInvitations, expiredSessions] = await Promise.all([
    purgeDeletedOrganizations(),
    cleanupExpiredInvitations(),
    cleanupExpiredSessions(),
  ]);

  return {
    purgedOrgs,
    expiredInvitations,
    expiredSessions,
    timestamp: new Date().toISOString(),
  };
}
