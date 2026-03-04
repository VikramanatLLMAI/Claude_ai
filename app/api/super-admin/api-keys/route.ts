/**
 * Super Admin API Keys - List & Create
 *
 * GET  /api/super-admin/api-keys - List all platform API keys (masked)
 * POST /api/super-admin/api-keys - Create a new API key
 *
 * All routes require Super Admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import { listApiKeys, createApiKey } from '@/lib/services/api-key-service';
import { CreateApiKeySchema, formatValidationErrors } from '@/lib/validation';

/**
 * GET /api/super-admin/api-keys
 * List all platform API keys with masked keys and assignment info.
 */
export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const keys = await listApiKeys();
    return NextResponse.json(keys);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/super-admin/api-keys
 * Create a new platform API key with optional org assignments.
 * Returns 201 with created key (masked).
 */
export async function POST(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await req.json();
    const parsed = CreateApiKeySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationErrors(parsed.error.issues) },
        { status: 400 }
      );
    }

    const ipAddress = getIpAddress(req);
    const key = await createApiKey(
      parsed.data,
      authResult.user.id,
      ipAddress
    );

    return NextResponse.json(key, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
