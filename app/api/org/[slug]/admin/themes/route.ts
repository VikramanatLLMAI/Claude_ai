/**
 * Org Admin Theme Selection API
 *
 * GET  /api/org/[slug]/admin/themes - Get assigned themes + current active theme
 * PUT  /api/org/[slug]/admin/themes - Set active theme from assigned themes
 *
 * Requires Org Admin authentication.
 * (OTHM-05, OTHM-06, OTHM-07)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import {
  getAssignedThemes,
  setActiveTheme,
} from '@/lib/services/theme-service';
import { z } from 'zod';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

const SetActiveThemeSchema = z.object({
  activeTheme: z.string().min(1, 'Theme name is required'),
});

/**
 * GET /api/org/[slug]/admin/themes
 * Return assigned themes and current active theme for the organization.
 */
export async function GET(req: NextRequest) {
  const authResult = await requireOrgAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const result = await getAssignedThemes(authResult.organization.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/org/[slug]/admin/themes
 * Set the active theme for the organization.
 * Body: { activeTheme: string }
 * Server-side validates theme is in assigned set (OTHM-07).
 */
export async function PUT(req: NextRequest) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();

  const authResult = await requireOrgAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await req.json();
    const parsed = SetActiveThemeSchema.safeParse(body);

    if (!parsed.success) {
      const messages = parsed.error.issues.map((e: { message: string }) => e.message).join(', ');
      return NextResponse.json({ error: messages }, { status: 400 });
    }

    const { activeTheme } = parsed.data;
    const ipAddress = getIpAddress(req);

    await setActiveTheme(
      authResult.organization.id,
      activeTheme,
      authResult.user.id,
      ipAddress
    );

    return NextResponse.json({ success: true, activeTheme });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not assigned') ? 400 : 500;
    if (status === 500) console.error('API error:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
