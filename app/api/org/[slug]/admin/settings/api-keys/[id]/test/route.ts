/**
 * Org Admin Settings - Test API Key
 *
 * POST /api/org/[slug]/admin/settings/api-keys/[id]/test
 *
 * Tests API key validity by making a minimal Anthropic API call.
 * Verifies the key assignment belongs to this org (security check).
 * Records audit log: 'api_key.tested'
 *
 * Requires Org Admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { testApiKey } from '@/lib/services/api-key-service';
import prisma from '@/lib/db';
import { auditLog, getIpAddress } from '@/lib/services/audit-service';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

/**
 * POST /api/org/[slug]/admin/settings/api-keys/[id]/test
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();
  const authResult = await requireOrgAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const orgId = authResult.organization.id;

  try {
    // Security check: verify the API key is assigned to this org
    const assignment = await prisma.platformApiKeyAssignment.findFirst({
      where: {
        apiKeyId: id,
        organizationId: orgId,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'API key not found or not assigned to this organization' },
        { status: 404 }
      );
    }

    // Test the key using the existing service function
    const result = await testApiKey(id);

    // Record audit log
    const ipAddress = getIpAddress(req);
    await prisma.$transaction(async (tx) => {
      await auditLog.record(tx, {
        userId: authResult.user.id,
        action: 'api_key.tested',
        targetType: 'PlatformApiKey',
        targetId: id,
        organizationId: orgId,
        ipAddress,
        metadata: {
          keyName: assignment.apiKeyId,
          valid: result.valid,
          ...(result.error ? { error: result.error } : {}),
        },
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'API key not found') {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }
    if (error instanceof Error && error.message.includes('Failed to decrypt')) {
      return NextResponse.json({ error: 'Failed to decrypt API key' }, { status: 500 });
    }
    console.error('Org API key test error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
