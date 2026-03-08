/**
 * Org Admin Users API - List Users
 *
 * GET /api/org/[slug]/admin/users - List org members with filters
 *
 * Supports query params:
 *   search - Filter by name or email (case-insensitive)
 *   role   - Filter by roleId
 *   status - Filter by status: active | inactive | suspended
 *   roles  - If "true", also return available roles for dropdowns
 *
 * Requires Org Admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { listOrgMembers } from '@/lib/services/org-user-service';
import prisma from '@/lib/db';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

/**
 * GET /api/org/[slug]/admin/users
 * List org members with optional search, role, and status filters.
 */
export async function GET(req: NextRequest) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlGet = checkRateLimit(`api:${auth.user.id}`, RATE_LIMITS.api);
  if (!rlGet.allowed) return rateLimitResponse(rlGet.retryAfterSeconds);

  try {
    const { searchParams } = req.nextUrl;
    const search = searchParams.get('search') || undefined;
    const role = searchParams.get('role') || undefined;
    const statusParam = searchParams.get('status') || undefined;
    const includeRoles = searchParams.get('roles') === 'true';

    // Validate status param
    const validStatuses = ['active', 'inactive', 'suspended'] as const;
    const status = statusParam && validStatuses.includes(statusParam as typeof validStatuses[number])
      ? (statusParam as 'active' | 'inactive' | 'suspended')
      : undefined;

    const users = await listOrgMembers(auth.organization.id, {
      search,
      role,
      status,
    });

    const response: Record<string, unknown> = { users };

    // Optionally include roles for dropdowns
    if (includeRoles) {
      const roles = await prisma.role.findMany({
        where: { organizationId: auth.organization.id },
        select: {
          id: true,
          name: true,
          permissions: true,
        },
        orderBy: { createdAt: 'asc' },
      });
      response.roles = roles;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to list org members:', error);
    return NextResponse.json(
      { error: 'Failed to list members' },
      { status: 500 }
    );
  }
}
