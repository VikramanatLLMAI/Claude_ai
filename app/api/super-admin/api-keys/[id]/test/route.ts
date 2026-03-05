/**
 * Super Admin API Keys - Test Endpoint
 *
 * POST /api/super-admin/api-keys/[id]/test
 *
 * Tests API key validity by making a minimal Anthropic API call.
 * Returns valid/invalid status and updates lastTestedAt on the record.
 *
 * Requires Super Admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { testApiKey } from '@/lib/services/api-key-service';

/**
 * POST /api/super-admin/api-keys/[id]/test
 * Test API key validity. Returns { valid, error?, lastTestedAt }.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  try {
    const result = await testApiKey(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'API key not found') {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }
    if (error instanceof Error && error.message.includes('Failed to decrypt')) {
      return NextResponse.json({ error: 'Failed to decrypt API key' }, { status: 500 });
    }
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
