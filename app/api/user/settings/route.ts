import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAuth } from '@/lib/auth-middleware';
import { updateUser } from '@/lib/storage';
import { validate, UpdateUserSettingsSchema } from '@/lib/validation';

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
    const result = validate(UpdateUserSettingsSchema, body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.errors!.map(e => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      );
    }
    const data = result.data!;

    // Build update object
    const updates: Record<string, unknown> = {};

    if (data.name !== undefined) updates.name = data.name;
    if (data.avatarBase64 !== undefined) updates.avatarBase64 = data.avatarBase64;
    if (data.preferences !== undefined) updates.preferences = data.preferences;

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
