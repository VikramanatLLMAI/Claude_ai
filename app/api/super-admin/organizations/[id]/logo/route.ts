/**
 * Super Admin Organization API - Logo
 *
 * PATCH /api/super-admin/organizations/[id]/logo - Update organization logo
 *
 * Requires Super Admin authentication.
 * Accepts Base64-encoded logo data (max ~375KB).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import { updateOrgLogo } from '@/lib/services/org-service';
import { OrgLogoSchema, formatValidationErrors } from '@/lib/validation';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PATCH /api/super-admin/organizations/[id]/logo
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();

  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlPatch = checkRateLimit(`api:${authResult.user.id}`, RATE_LIMITS.api);
  if (!rlPatch.allowed) return rateLimitResponse(rlPatch.retryAfterSeconds);

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = OrgLogoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationErrors(parsed.error.issues) },
        { status: 400 }
      );
    }

    const ipAddress = getIpAddress(req);
    const org = await updateOrgLogo(
      id,
      parsed.data.logoBase64,
      authResult.user.id,
      ipAddress
    );

    return NextResponse.json(org);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
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
