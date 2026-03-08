/**
 * Super Admin Organization API - Activate
 *
 * POST /api/super-admin/organizations/[id]/activate - Activate a suspended organization
 *
 * Requires Super Admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import { activateOrganization } from '@/lib/services/org-service';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/super-admin/organizations/[id]/activate
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();

  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlPost = checkRateLimit(`api:${authResult.user.id}`, RATE_LIMITS.api);
  if (!rlPost.allowed) return rateLimitResponse(rlPost.retryAfterSeconds);

  try {
    const { id } = await params;
    const ipAddress = getIpAddress(req);
    const org = await activateOrganization(id, authResult.user.id, ipAddress);

    return NextResponse.json({
      success: true,
      message: 'Organization activated.',
      organization: org,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      if (error.message.includes('already active')) {
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
