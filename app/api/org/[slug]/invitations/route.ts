/**
 * Org Admin Invitation API - List & Create
 *
 * GET  /api/org/[slug]/invitations - List all invitations for the organization
 * POST /api/org/[slug]/invitations - Create a new invitation
 *
 * All routes require Org Admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import { createInvitation, listInvitations } from '@/lib/services/invitation-service';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';
import {
  CreateInvitationSchema,
  formatValidationErrors,
} from '@/lib/validation';

/**
 * GET /api/org/[slug]/invitations
 * List all invitations for the current organization.
 */
export async function GET(req: NextRequest) {
  const authResult = await requireOrgAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const invitations = await listInvitations(authResult.organization.id);
    return NextResponse.json(invitations);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/org/[slug]/invitations
 * Create a new invitation. Sends email to the invited user.
 */
export async function POST(req: NextRequest) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();

  const authResult = await requireOrgAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await req.json();
    const parsed = CreateInvitationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationErrors(parsed.error.issues) },
        { status: 400 }
      );
    }

    const ipAddress = getIpAddress(req);
    const invitation = await createInvitation(
      parsed.data,
      {
        id: authResult.organization.id,
        name: authResult.organization.name,
        slug: authResult.organization.slug,
      },
      authResult.user.id,
      ipAddress
    );

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('already pending')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
      if (error.message.includes('Role not found')) {
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
