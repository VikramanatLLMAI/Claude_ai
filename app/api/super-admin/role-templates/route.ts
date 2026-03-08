/**
 * Super Admin Role Template API - List
 *
 * GET /api/super-admin/role-templates - List all system role templates
 *
 * Requires Super Admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { getTemplates } from '@/lib/services/role-template-service';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

/**
 * GET /api/super-admin/role-templates
 * List all system role templates (defaults merged with any overrides).
 */
export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlGet = checkRateLimit(`api:${authResult.user.id}`, RATE_LIMITS.api);
  if (!rlGet.allowed) return rateLimitResponse(rlGet.retryAfterSeconds);

  try {
    const templates = await getTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
