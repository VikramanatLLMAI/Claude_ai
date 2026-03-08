/**
 * Super Admin Audit Logs Export API
 *
 * GET /api/super-admin/audit-logs/export
 *
 * Exports filtered audit logs as CSV or JSON file download.
 * Applies the same filter params as the list endpoint (excluding page/pageSize).
 * Capped at 10,000 rows.
 *
 * Query params:
 *   format      — "csv" | "json" (required)
 *   startDate   — ISO datetime string (optional)
 *   endDate     — ISO datetime string (optional)
 *   organizationId — UUID filter (optional)
 *   action      — Partial match string (optional)
 *   userId      — UUID filter (optional)
 *   sortBy      — "createdAt" | "action" (default: "createdAt")
 *   sortOrder   — "asc" | "desc" (default: "desc")
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { exportAuditLogs } from '@/lib/services/audit-log-service';
import { z } from 'zod';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

const ExportQuerySchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  organizationId: z.string().uuid().optional(),
  action: z.string().optional(),
  userId: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'action']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * GET /api/super-admin/audit-logs/export
 */
export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlGet = checkRateLimit(`api:${authResult.user.id}`, RATE_LIMITS.api);
  if (!rlGet.allowed) return rateLimitResponse(rlGet.retryAfterSeconds);

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
    const result = await exportAuditLogs(filters, format);

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error('Audit logs export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
