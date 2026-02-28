/**
 * Bulk Force Password Reset API
 *
 * POST /api/org/[slug]/admin/security/force-reset
 * Forces all org users (except requesting admin) to change password on next login.
 *
 * Requires Org Admin authentication.
 * Covers: OPWD-04, OPWD-06
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import { forcePasswordReset } from '@/lib/services/password-policy-service';

/**
 * POST /api/org/[slug]/admin/security/force-reset
 *
 * Resets forcePasswordChange flag for ALL users in the org EXCEPT the requesting admin.
 * OPWD-06: Admin cannot lock themselves out.
 */
export async function POST(req: NextRequest) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    // Get all org members except the requesting admin
    const orgMembers = await auth.tenantDb.orgMember.findMany({
      where: {
        organizationId: auth.organization.id,
        userId: { not: auth.user.id },
        status: 'ACTIVE',
      },
      select: { userId: true },
    });

    const userIds = orgMembers.map((m: { userId: string }) => m.userId);

    if (userIds.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const ipAddress = getIpAddress(req);
    const result = await forcePasswordReset(
      auth.tenantDb,
      userIds,
      auth.organization.id,
      {
        userId: auth.user.id,
        organizationId: auth.organization.id,
        ipAddress,
      }
    );

    return NextResponse.json({
      success: true,
      count: result.updatedCount,
    });
  } catch (error) {
    console.error('Failed to force password reset:', error);
    return NextResponse.json(
      { error: 'Failed to force password reset' },
      { status: 500 }
    );
  }
}
