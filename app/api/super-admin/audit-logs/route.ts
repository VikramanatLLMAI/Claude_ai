/**
 * Super Admin Audit Logs API - List with Pagination
 *
 * GET /api/super-admin/audit-logs
 *
 * Returns paginated, filtered audit log entries.
 * Also supports fetching available filter options (actions, users, orgs).
 *
 * Query params (all optional):
 *   page        — Page number (default: 1)
 *   pageSize    — Rows per page: 10, 25, 50 (default: 25)
 *   startDate   — ISO datetime string (inclusive)
 *   endDate     — ISO datetime string (inclusive)
 *   organizationId — UUID filter
 *   action      — Partial match string
 *   userId      — UUID filter
 *   sortBy      — "createdAt" | "action" (default: "createdAt")
 *   sortOrder   — "asc" | "desc" (default: "desc")
 *
 * Special:
 *   ?meta=true  — Returns { actions, users } for filter dropdowns
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import {
  listAuditLogs,
  getAvailableActions,
  getAuditLogUsers,
} from '@/lib/services/audit-log-service';
import { AuditLogFilterSchema, formatValidationErrors } from '@/lib/validation';
import prisma from '@/lib/db';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

/**
 * GET /api/super-admin/audit-logs
 */
export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlGet = checkRateLimit(`api:${authResult.user.id}`, RATE_LIMITS.api);
  if (!rlGet.allowed) return rateLimitResponse(rlGet.retryAfterSeconds);

  try {
    const { searchParams } = req.nextUrl;

    // ?meta=true — return filter options for dropdowns
    if (searchParams.get('meta') === 'true') {
      const [actions, users, orgs] = await Promise.all([
        getAvailableActions(),
        getAuditLogUsers(),
        prisma.organization.findMany({
          where: { deletedAt: null },
          select: { id: true, name: true, slug: true },
          orderBy: { name: 'asc' },
        }),
      ]);
      return NextResponse.json({ actions, users, orgs });
    }

    // Parse and validate filter params
    const rawParams = Object.fromEntries(searchParams.entries());
    const parsed = AuditLogFilterSchema.safeParse(rawParams);

    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationErrors(parsed.error.issues) },
        { status: 400 }
      );
    }

    const result = await listAuditLogs(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Audit logs API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
