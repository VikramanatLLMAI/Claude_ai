/**
 * Org Admin Settings - API Keys (Read-Only)
 *
 * GET /api/org/[slug]/admin/settings/api-keys
 *
 * Returns API keys assigned to this organization with masked values.
 * This is READ-ONLY -- Org Admins cannot create, modify, or delete API keys.
 *
 * Requires Org Admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import prisma from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

/**
 * Compute masked key: first 7 chars + "..." + last 4 chars of decrypted key.
 */
function maskKey(rawKey: string): string {
  if (rawKey.length <= 11) {
    return rawKey.slice(0, 4) + '...';
  }
  return rawKey.slice(0, 7) + '...' + rawKey.slice(-4);
}

/**
 * GET /api/org/[slug]/admin/settings/api-keys
 */
export async function GET(req: NextRequest) {
  const authResult = await requireOrgAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlGet = checkRateLimit(`api:${authResult.user.id}`, RATE_LIMITS.api);
  if (!rlGet.allowed) return rateLimitResponse(rlGet.retryAfterSeconds);

  const orgId = authResult.organization.id;

  try {
    // Get all API key assignments for this organization
    const assignments = await prisma.platformApiKeyAssignment.findMany({
      where: { organizationId: orgId },
      include: {
        apiKey: {
          select: {
            id: true,
            name: true,
            provider: true,
            encryptedKey: true,
            isActive: true,
            lastTestedAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    // Build response with masked keys
    const keys = assignments.map((a) => {
      let maskedKey = '***';
      try {
        const rawKey = decrypt(a.apiKey.encryptedKey);
        maskedKey = maskKey(rawKey);
      } catch {
        maskedKey = '(unable to read key)';
      }

      return {
        id: a.apiKey.id,
        assignmentId: a.id,
        name: a.apiKey.name,
        provider: a.apiKey.provider,
        maskedKey,
        isActive: a.apiKey.isActive,
        lastTestedAt: a.apiKey.lastTestedAt?.toISOString() ?? null,
        assignedAt: a.assignedAt.toISOString(),
        createdAt: a.apiKey.createdAt.toISOString(),
      };
    });

    return NextResponse.json(keys);
  } catch (error) {
    console.error('Org API keys error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
