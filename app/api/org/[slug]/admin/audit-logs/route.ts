/**
 * Org Admin Audit Logs API - List with Pagination
 *
 * GET /api/org/[slug]/admin/audit-logs
 *
 * Returns paginated, filtered audit log entries scoped to the organization.
 * Also supports fetching available filter options (actions, users).
 *
 * Query params (all optional):
 *   page        - Page number (default: 1)
 *   pageSize    - Rows per page: 10, 25, 50 (default: 25)
 *   startDate   - ISO datetime string (inclusive)
 *   endDate     - ISO datetime string (inclusive)
 *   action      - Partial match string
 *   userId      - UUID filter
 *   sortBy      - "createdAt" | "action" (default: "createdAt")
 *   sortOrder   - "asc" | "desc" (default: "desc")
 *
 * Special:
 *   ?meta=true  - Returns { actions, users } for filter dropdowns (org-scoped)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import {
  listAuditLogs,
  getAvailableActions,
  getAuditLogUsers,
} from '@/lib/services/audit-log-service';
import { AuditLogFilterSchema, formatValidationErrors } from '@/lib/validation';
import prisma from '@/lib/db';

/**
 * GET /api/org/[slug]/admin/audit-logs
 */
export async function GET(req: NextRequest) {
  const authResult = await requireOrgAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const orgId = authResult.organization.id;

  try {
    const { searchParams } = req.nextUrl;

    // ?meta=true - return filter options for dropdowns (org-scoped)
    if (searchParams.get('meta') === 'true') {
      const [actions, allUsers] = await Promise.all([
        getAvailableActions(),
        getAuditLogUsers(),
      ]);

      // Filter users to only those in this organization
      const orgMembers = await prisma.orgMember.findMany({
        where: { organizationId: orgId },
        select: { userId: true },
      });
      const orgUserIds = new Set(orgMembers.map((m) => m.userId));
      const users = allUsers.filter((u) => orgUserIds.has(u.userId));

      return NextResponse.json({
        actions,
        users,
        orgName: authResult.organization.name,
      });
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

    // FORCE organizationId to the authenticated org (never trust client input)
    const filters = { ...parsed.data, organizationId: orgId };

    const result = await listAuditLogs(filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Org audit logs API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
