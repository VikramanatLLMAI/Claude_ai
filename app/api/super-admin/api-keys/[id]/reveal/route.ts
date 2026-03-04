/**
 * Super Admin API Keys - Reveal Endpoint
 *
 * GET /api/super-admin/api-keys/[id]/reveal
 *
 * Returns the full decrypted API key for click-to-temporarily-reveal UI.
 * This is the ONLY endpoint that exposes the raw key to the frontend.
 * Access is audit-logged server-side.
 *
 * Requires Super Admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import { revealApiKey } from '@/lib/services/api-key-service';

/**
 * GET /api/super-admin/api-keys/[id]/reveal
 * Decrypt and return the full API key string.
 * Audit-logged on every access.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  try {
    const ipAddress = getIpAddress(req);
    const apiKey = await revealApiKey(id, authResult.user.id, ipAddress);
    return NextResponse.json({ apiKey });
  } catch (error) {
    if (error instanceof Error && error.message === 'API key not found') {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
