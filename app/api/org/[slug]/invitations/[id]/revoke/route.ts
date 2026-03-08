/**
 * Org Admin Invitation Revoke API
 *
 * POST /api/org/[slug]/invitations/[id]/revoke - Revoke a pending invitation
 *
 * Requires Org Admin authentication.
 * Includes SAFE-02 guard: cannot revoke if it would leave org with 0 admins.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import { revokeInvitation } from '@/lib/services/invitation-service';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

/**
 * POST /api/org/[slug]/invitations/[id]/revoke
 * Revoke a pending invitation (status changes to REVOKED).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();
  const authResult = await requireOrgAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const ipAddress = getIpAddress(req);

    const invitation = await revokeInvitation(
      id,
      authResult.organization.id,
      authResult.user.id,
      ipAddress
    );

    return NextResponse.json(invitation);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      if (error.message.includes('Only pending')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      if (error.message.includes('Cannot revoke')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
    }
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
