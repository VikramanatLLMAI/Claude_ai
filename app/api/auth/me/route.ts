/**
 * Current User API
 * GET /api/auth/me - Get current user info with optional org context
 *
 * Uses requireAuth (not requireOrgAuth) because this endpoint must work
 * for both org users and Super Admins.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import prisma from '@/lib/db';
import { resolveOrgSlug } from '@/lib/resolve-org';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlGet = checkRateLimit(`api:${user.id}`, RATE_LIMITS.api);
  if (!rlGet.allowed) return rateLimitResponse(rlGet.retryAfterSeconds);

  try {
    // Build base response
    const response: Record<string, unknown> = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarBase64: user.avatarBase64,
        preferences: user.preferences,
        isSuperAdmin: user.isSuperAdmin,
        createdAt: user.createdAt.toISOString(),
      },
    };

    // If org context available and user is not Super Admin, enrich with org info
    if (!user.isSuperAdmin) {
      const slug = resolveOrgSlug(req);
      if (slug) {
        const orgMember = await prisma.orgMember.findFirst({
          where: {
            userId: user.id,
            organization: {
              slug,
              deletedAt: null,
              status: 'ACTIVE',
            },
          },
          include: {
            organization: true,
            role: true,
          },
        });

        if (orgMember) {
          response.organization = {
            id: orgMember.organization.id,
            name: orgMember.organization.name,
            slug: orgMember.organization.slug,
          };
          response.role = {
            id: orgMember.role.id,
            name: orgMember.role.name,
            permissions: orgMember.role.permissions,
            personalMcpEnabled: orgMember.role.personalMcpEnabled,
          };
        }
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}
