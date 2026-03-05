/**
 * Org Admin Audit Logs Export API
 *
 * GET /api/org/[slug]/admin/audit-logs/export
 *
 * Exports filtered audit logs as CSV or JSON file download.
 * Scoped to the authenticated organization.
 * Capped at 10,000 rows.
 *
 * Query params:
 *   format      - "csv" | "json" (required)
 *   startDate   - ISO datetime string (optional)
 *   endDate     - ISO datetime string (optional)
 *   action      - Partial match string (optional)
 *   userId      - UUID filter (optional)
 *   sortBy      - "createdAt" | "action" (default: "createdAt")
 *   sortOrder   - "asc" | "desc" (default: "desc")
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { exportAuditLogs } from '@/lib/services/audit-log-service';
import { z } from 'zod';

const ExportQuerySchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  action: z.string().optional(),
  userId: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'action']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * GET /api/org/[slug]/admin/audit-logs/export
 */
export async function GET(req: NextRequest) {
  const authResult = await requireOrgAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const orgId = authResult.organization.id;

  try {
    const { searchParams } = req.nextUrl;
    const rawParams = Object.fromEntries(searchParams.entries());

    const parsed = ExportQuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ') },
        { status: 400 }
      );
    }

    const { format, ...filters } = parsed.data;
    // FORCE organizationId to the authenticated org
    const result = await exportAuditLogs({ ...filters, organizationId: orgId }, format);

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error('Org audit logs export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
