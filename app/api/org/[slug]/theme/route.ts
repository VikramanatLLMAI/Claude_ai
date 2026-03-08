/**
 * User-Facing Theme Fetch API
 *
 * GET /api/org/[slug]/theme - Get the active theme for the org
 *
 * Requires any org member authentication (not just admin).
 * This is the endpoint the frontend calls on page load to apply the org theme.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAuth } from '@/lib/auth-middleware';
import { getActiveTheme } from '@/lib/services/theme-service';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

/**
 * GET /api/org/[slug]/theme
 * Return the active theme for the organization with fallback chain.
 * Returns { activeTheme: string | null }
 * null means use platform default (claude theme).
 */
export async function GET(req: NextRequest) {
  const authResult = await requireOrgAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlGet = checkRateLimit(`api:${authResult.user.id}`, RATE_LIMITS.api);
  if (!rlGet.allowed) return rateLimitResponse(rlGet.retryAfterSeconds);

  try {
    const activeTheme = await getActiveTheme(authResult.organization.id);
    return NextResponse.json({ activeTheme });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
