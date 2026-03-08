/**
 * Force Logout API (Org Admin)
 *
 * POST /api/org/[slug]/admin/users/[userId]/force-logout
 *
 * Forces a user to be logged out from all sessions within this organization.
 * If the admin is force-logging out themselves, their current session is preserved.
 *
 * Requires Org Admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { forceLogoutUser } from '@/lib/services/session-service';
import { auditLog, getIpAddress } from '@/lib/services/audit-service';
import prisma from '@/lib/db';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

/**
 * POST /api/org/[slug]/admin/users/[userId]/force-logout
 * Force-logout a user from all sessions in this organization.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { userId } = await params;

  try {
    // Validate that the target user belongs to this organization
    const targetMember = await auth.tenantDb.orgMember.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!targetMember) {
      return NextResponse.json(
        { error: 'User not found in this organization' },
        { status: 404 }
      );
    }

    // Extract current admin's session ID to preserve if admin is force-logging out themselves
    let currentSessionId: string | undefined;
    if (userId === auth.user.id) {
      const authHeader = req.headers.get('Authorization') || '';
      const token = authHeader.slice(7);
      const currentSession = await prisma.session.findUnique({
        where: { token },
        select: { id: true },
      });
      if (currentSession) {
        currentSessionId = currentSession.id;
      }
    }

    // Force logout with org filter
    const result = await forceLogoutUser(
      userId,
      auth.organization.id,
      currentSessionId
    );

    const ipAddress = getIpAddress(req);

    // Audit log
    await prisma.$transaction(async (tx) => {
      await auditLog.record(tx, {
        userId: auth.user.id,
        action: 'user.force_logout',
        targetType: 'User',
        targetId: userId,
        organizationId: auth.organization.id,
        ipAddress,
        metadata: {
          sessionsRevoked: result.deletedCount,
          selfLogout: userId === auth.user.id,
        },
      });
    });

    return NextResponse.json({
      success: true,
      sessionsRevoked: result.deletedCount,
    });
  } catch (error) {
    console.error('Failed to force logout user:', error);
    return NextResponse.json(
      { error: 'Failed to force logout user' },
      { status: 500 }
    );
  }
}
