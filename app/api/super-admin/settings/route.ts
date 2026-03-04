/**
 * Platform Settings API - Super Admin
 *
 * GET  /api/super-admin/settings  — Fetch current platform settings
 * PATCH /api/super-admin/settings — Update platform settings
 *
 * Protected: requireSuperAdmin()
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import { getPlatformSettings, updatePlatformSettings } from '@/lib/services/platform-settings-service';
import { UpdatePlatformSettingsSchema, formatValidationErrors } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const settings = await getPlatformSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to fetch platform settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platform settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = UpdatePlatformSettingsSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: formatValidationErrors(result.error.issues) },
      { status: 400 }
    );
  }

  const ip = getIpAddress(req);

  try {
    const updated = await updatePlatformSettings(result.data, auth.user.id, ip);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update platform settings:', error);
    return NextResponse.json(
      { error: 'Failed to update platform settings' },
      { status: 500 }
    );
  }
}
