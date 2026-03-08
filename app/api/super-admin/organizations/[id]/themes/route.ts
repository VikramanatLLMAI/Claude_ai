/**
 * Super Admin Theme Assignment API
 *
 * GET  /api/super-admin/organizations/[id]/themes - Get assigned themes + active theme for org
 * PUT  /api/super-admin/organizations/[id]/themes - Set assigned themes for org
 *
 * Requires Super Admin authentication.
 * (SORG-08, SORG-09)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import {
  getAssignedThemes,
  setOrgThemes,
  VALID_THEMES,
} from '@/lib/services/theme-service';
import { z } from 'zod';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

type RouteParams = { params: Promise<{ id: string }> };

const SetThemesSchema = z.object({
  assignedThemes: z.array(z.string()).min(0),
  defaultTheme: z.string().nullable(),
});

/**
 * GET /api/super-admin/organizations/[id]/themes
 * Return assigned themes and current active theme for an organization.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlGet = checkRateLimit(`api:${authResult.user.id}`, RATE_LIMITS.api);
  if (!rlGet.allowed) return rateLimitResponse(rlGet.retryAfterSeconds);

  try {
    const { id } = await params;
    const result = await getAssignedThemes(id);
    return NextResponse.json({
      ...result,
      availableThemes: [...VALID_THEMES],
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/super-admin/organizations/[id]/themes
 * Set the assigned themes for an organization.
 * Body: { assignedThemes: string[], defaultTheme: string | null }
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();

  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlPut = checkRateLimit(`api:${authResult.user.id}`, RATE_LIMITS.api);
  if (!rlPut.allowed) return rateLimitResponse(rlPut.retryAfterSeconds);

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = SetThemesSchema.safeParse(body);

    if (!parsed.success) {
      const messages = parsed.error.issues.map((e: { message: string }) => e.message).join(', ');
      return NextResponse.json({ error: messages }, { status: 400 });
    }

    const { assignedThemes, defaultTheme } = parsed.data;
    const ipAddress = getIpAddress(req);

    const themes = await setOrgThemes(
      id,
      assignedThemes,
      defaultTheme,
      authResult.user.id,
      ipAddress
    );

    return NextResponse.json({ themes });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('Invalid theme') || message.includes('Default theme') ? 400 : 500;
    if (status === 500) console.error('API error:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
