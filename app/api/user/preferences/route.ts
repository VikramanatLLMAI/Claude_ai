import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import prisma from '@/lib/db';
import { z } from 'zod';

const PatchPreferencesSchema = z.object({
  themeMode: z.enum(['light', 'dark', 'system']).optional(),
});

// GET /api/user/preferences - Return user preferences
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

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
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { preferences: updatedPreferences as any },
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
