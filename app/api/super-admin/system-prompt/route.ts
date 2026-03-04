/**
 * Platform System Prompt API - Super Admin
 *
 * GET  /api/super-admin/system-prompt  — Fetch current platform system prompt
 * PATCH /api/super-admin/system-prompt — Update platform system prompt
 *
 * The platform prompt is Layer 1 of the 4-layer prompt stack.
 * Falls back to the hardcoded default in lib/system-prompts.ts when no custom
 * prompt has been saved.
 *
 * Protected: requireSuperAdmin()
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import { getPlatformSettings, updatePlatformSettings } from '@/lib/services/platform-settings-service';
import { DEFAULT_PLATFORM_PROMPT } from '@/lib/system-prompts';
import { UpdatePlatformPromptSchema, formatValidationErrors } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const settings = await getPlatformSettings();
    return NextResponse.json({
      prompt: settings.platformPrompt || DEFAULT_PLATFORM_PROMPT,
      isCustom: !!settings.platformPrompt,
    });
  } catch (error) {
    console.error('Failed to fetch platform system prompt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platform system prompt' },
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

  const result = UpdatePlatformPromptSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: formatValidationErrors(result.error.issues) },
      { status: 400 }
    );
  }

  const ip = getIpAddress(req);

  try {
    // null means "reset to default" (store null in DB so fallback kicks in)
    const promptValue = result.data.prompt === DEFAULT_PLATFORM_PROMPT
      ? null
      : result.data.prompt || null;

    await updatePlatformSettings(
      { platformPrompt: promptValue },
      auth.user.id,
      ip
    );

    return NextResponse.json({
      prompt: promptValue || DEFAULT_PLATFORM_PROMPT,
      isCustom: !!promptValue,
    });
  } catch (error) {
    console.error('Failed to update platform system prompt:', error);
    return NextResponse.json(
      { error: 'Failed to update platform system prompt' },
      { status: 500 }
    );
  }
}
