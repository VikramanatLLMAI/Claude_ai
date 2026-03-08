import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import prisma from '@/lib/db';
import { z } from 'zod';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';
import type { Prisma } from '@/lib/generated/prisma/client';

const PatchPreferencesSchema = z.object({
  themeMode: z.enum(['light', 'dark', 'system']).optional(),
});

// GET /api/user/preferences - Return user preferences
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlGet = checkRateLimit(`api:${user.id}`, RATE_LIMITS.api);
  if (!rlGet.allowed) return rateLimitResponse(rlGet.retryAfterSeconds);

  try {
    const preferences = (user.preferences as Record<string, unknown>) || {};
    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Get preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to get preferences' },
      { status: 500 }
    );
  }
}

// PATCH /api/user/preferences - Update user preferences
export async function PATCH(req: NextRequest) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();

  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlPatch = checkRateLimit(`api:${user.id}`, RATE_LIMITS.api);
  if (!rlPatch.allowed) return rateLimitResponse(rlPatch.retryAfterSeconds);

  try {
    const body = await req.json();
    const parsed = PatchPreferencesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const currentPreferences = (user.preferences as Record<string, unknown>) || {};
    const updatedPreferences = { ...currentPreferences };

    if (parsed.data.themeMode !== undefined) {
      updatedPreferences.themeMode = parsed.data.themeMode;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      // Cast required: Prisma InputJsonValue is stricter than runtime Json
      data: { preferences: updatedPreferences as Prisma.InputJsonValue },
      select: { preferences: true },
    });

    return NextResponse.json({ preferences: updatedUser.preferences });
  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
