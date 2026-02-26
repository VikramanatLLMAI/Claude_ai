import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAuth } from '@/lib/auth-middleware';
import { updateUser } from '@/lib/storage';

// GET /api/user/settings - Get user settings
export async function GET(req: NextRequest) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    return NextResponse.json({
      name: user.name,
      avatarBase64: user.avatarBase64,
      preferences: user.preferences,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

// PATCH /api/user/settings - Update user settings
export async function PATCH(req: NextRequest) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const body = await req.json();
    const { name, avatarBase64, preferences } = body;

    // Build update object
    const updates: Record<string, unknown> = {};

    if (name !== undefined) updates.name = name;
    if (avatarBase64 !== undefined) updates.avatarBase64 = avatarBase64;
    if (preferences !== undefined) updates.preferences = preferences;

    // Update user (unscoped — User is not org-scoped)
    const updatedUser = await updateUser(user.id, updates);

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      name: updatedUser.name,
      avatarBase64: updatedUser.avatarBase64,
      preferences: updatedUser.preferences,
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
