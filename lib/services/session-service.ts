/**
 * Session Service
 *
 * Session management operations for admin console.
 * Uses raw prisma (not tenantDb) since Session is NOT org-scoped.
 *
 * Functions:
 * - listUserSessions: List sessions for a user with optional org filter
 * - revokeSession: Delete a specific session (cannot revoke current)
 * - forceLogoutUser: Delete all sessions for a user
 *
 * Covers: SAFE-10
 */

import prisma from '@/lib/db';

// ============================================
// Types
// ============================================

export interface SessionInfo {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
  isCurrent: boolean;
}

// ============================================
// List Sessions
// ============================================

/**
 * List all active sessions for a user.
 *
 * Sessions are NOT org-scoped, but can be optionally filtered by organizationId.
 * Each session includes an `isCurrent` flag comparing against the current session ID.
 *
 * @param userId - User whose sessions to list
 * @param currentSessionId - ID of the current request's session (for isCurrent flag)
 * @param orgId - Optional org filter (sessions store organizationId)
 */
export async function listUserSessions(
  userId: string,
  currentSessionId: string,
  orgId?: string
): Promise<SessionInfo[]> {
  const where: Record<string, unknown> = {
    userId,
    expiresAt: { gt: new Date() }, // Only non-expired sessions
  };

  if (orgId) {
    where.organizationId = orgId;
  }

  const sessions = await prisma.session.findMany({
    where,
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { lastUsedAt: 'desc' },
  });

  return sessions.map((s) => ({
    id: s.id,
    userAgent: s.userAgent,
    ipAddress: s.ipAddress,
    createdAt: s.createdAt,
    lastUsedAt: s.lastUsedAt,
    isCurrent: s.id === currentSessionId,
  }));
}

// ============================================
// Revoke Session
// ============================================

/**
 * Revoke (delete) a specific session.
 *
 * Validates:
 * - Cannot revoke the current session (would log the user out)
 *
 * @param sessionId - Session to revoke
 * @param currentSessionId - ID of the current request's session
 */
export async function revokeSession(
  sessionId: string,
  currentSessionId: string
): Promise<{ success: boolean }> {
  // Guard: cannot revoke current session
  if (sessionId === currentSessionId) {
    throw new Error('Cannot revoke your current session. Use logout instead.');
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  await prisma.session.delete({
    where: { id: sessionId },
  });

  return { success: true };
}

// ============================================
// Force Logout
// ============================================

/**
 * Force logout a user by deleting all their sessions.
 *
 * Optionally filtered by organizationId.
 * If currentSessionId is provided, that session is preserved (so the admin
 * forcing the logout doesn't log themselves out if forcing their own).
 *
 * @param userId - User to force logout
 * @param orgId - Optional org filter
 * @param currentSessionId - Optional session to preserve
 */
export async function forceLogoutUser(
  userId: string,
  orgId?: string,
  currentSessionId?: string
): Promise<{ deletedCount: number }> {
  const where: Record<string, unknown> = { userId };

  if (orgId) {
    where.organizationId = orgId;
  }

  // Preserve the current session if specified
  if (currentSessionId) {
    where.id = { not: currentSessionId };
  }

  const result = await prisma.session.deleteMany({ where });

  return { deletedCount: result.count };
}
