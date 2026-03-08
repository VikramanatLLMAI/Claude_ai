/**
 * Super Admin User Search API
 *
 * GET /api/super-admin/users - Search users across all organizations
 *
 * Requires Super Admin authentication.
 * Covers: SAUD-04 (user search for impersonation)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import prisma from '@/lib/db';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

/**
 * GET /api/super-admin/users
 *
 * Search users across all orgs.
 * Query params: search (name or email), page, pageSize
 * Returns users with org membership context.
 */
export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlGet = checkRateLimit(`api:${authResult.user.id}`, RATE_LIMITS.api);
  if (!rlGet.allowed) return rateLimitResponse(rlGet.retryAfterSeconds);

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));

    // Build where clause for search
    const searchFilter = search
      ? {
          OR: [
            { user: { name: { contains: search, mode: 'insensitive' as const } } },
            { user: { email: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : {};

    // Only active org members in active, non-deleted orgs
    const baseWhere = {
      ...searchFilter,
      user: {
        ...((searchFilter as Record<string, unknown>).OR ? {} : {}),
        isSuperAdmin: false, // Exclude Super Admins from impersonation targets
      },
      organization: {
        deletedAt: null,
        status: 'ACTIVE',
      },
    };

    // If search filter exists, merge the user condition
    const where = search
      ? {
          AND: [
            {
              OR: [
                { user: { name: { contains: search, mode: 'insensitive' as const } } },
                { user: { email: { contains: search, mode: 'insensitive' as const } } },
              ],
            },
            { user: { isSuperAdmin: false } },
            { organization: { deletedAt: null, status: 'ACTIVE' } },
          ],
        }
      : {
          user: { isSuperAdmin: false },
          organization: { deletedAt: null, status: 'ACTIVE' },
        };

    const [members, total] = await Promise.all([
      prisma.orgMember.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarBase64: true },
          },
          organization: {
            select: { id: true, name: true, slug: true },
          },
          role: {
            select: { id: true, name: true },
          },
        },
        orderBy: [
          { user: { name: 'asc' } },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.orgMember.count({ where }),
    ]);

    const users = members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatarBase64: m.user.avatarBase64,
      orgId: m.organization.id,
      orgName: m.organization.name,
      orgSlug: m.organization.slug,
      roleName: m.role.name,
      status: m.status,
      memberId: m.id,
    }));

    return NextResponse.json({
      users,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('User search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
