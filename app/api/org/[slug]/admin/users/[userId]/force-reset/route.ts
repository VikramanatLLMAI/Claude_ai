/**
 * Individual Force Password Reset API
 *
 * POST /api/org/[slug]/admin/users/[userId]/force-reset
 * Forces a specific user to change their password on next login.
 *
 * Requires Org Admin authentication.
 * Covers: OPWD-04, OPWD-06
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import { forcePasswordReset } from '@/lib/services/password-policy-service';

/**
 * POST /api/org/[slug]/admin/users/[userId]/force-reset
 *
 * Forces a specific user to change password on next login.
 * OPWD-06: Admin cannot force reset their own password.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { userId } = await params;

    // OPWD-06: Cannot force reset own password
    if (userId === auth.user.id) {
      return NextResponse.json(
        { error: 'Cannot force reset your own password' },
        { status: 400 }
      );
    }

    // Validate user belongs to this org
    const orgMember = await auth.tenantDb.orgMember.findFirst({
      where: {
        userId,
        organizationId: auth.organization.id,
      },
      select: { id: true },
    });

    if (!orgMember) {
      return NextResponse.json(
        { error: 'User not found in this organization' },
        { status: 404 }
      );
    }

    const ipAddress = getIpAddress(req);
    await forcePasswordReset(
      auth.tenantDb,
      [userId],
      auth.organization.id,
      {
        userId: auth.user.id,
        organizationId: auth.organization.id,
        ipAddress,
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to force password reset for user:', error);
    return NextResponse.json(
      { error: 'Failed to force password reset' },
      { status: 500 }
    );
  }
}
