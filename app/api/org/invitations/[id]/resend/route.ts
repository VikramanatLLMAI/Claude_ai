/**
 * Org Admin Invitation Resend API
 *
 * POST /api/org/invitations/[id]/resend - Resend an invitation
 *
 * Requires Org Admin authentication.
 * Works for PENDING and EXPIRED invitations. Generates new token and resets expiry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import { resendInvitation } from '@/lib/services/invitation-service';

/**
 * POST /api/org/invitations/[id]/resend
 * Resend an invitation with a new token and reset expiry.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireOrgAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const ipAddress = getIpAddress(req);

    const invitation = await resendInvitation(
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
      if (error.message.includes('Cannot resend')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
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
