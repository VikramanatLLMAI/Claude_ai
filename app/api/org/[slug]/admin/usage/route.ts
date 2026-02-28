/**
 * Org Admin Usage API - Org-Wide Usage Aggregates
 *
 * GET /api/org/[slug]/admin/usage
 *
 * Returns org-wide usage summary with total requests/tokens for 24h/7d/30d,
 * per-model breakdown, and daily trend data for the last 30 days.
 * Used by the admin usage monitoring dashboard.
 *
 * Covers: OUSE-04
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { organization, tenantDb } = auth;

  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total requests and tokens for different time ranges
    const [totals24h, totals7d, totals30d] = await Promise.all([
      (tenantDb.usageRecord as any).aggregate({
        where: { createdAt: { gte: twentyFourHoursAgo } },
        _count: { id: true },
        _sum: { inputTokens: true, outputTokens: true, thinkingTokens: true },
      }),
      (tenantDb.usageRecord as any).aggregate({
        where: { createdAt: { gte: sevenDaysAgo } },
        _count: { id: true },
        _sum: { inputTokens: true, outputTokens: true, thinkingTokens: true },
      }),
      (tenantDb.usageRecord as any).aggregate({
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: { id: true },
        _sum: { inputTokens: true, outputTokens: true, thinkingTokens: true },
      }),
    ]);

    const sumTokens = (agg: any) =>
      (agg._sum?.inputTokens ?? 0) +
      (agg._sum?.outputTokens ?? 0) +
      (agg._sum?.thinkingTokens ?? 0);

    // Per-model breakdown (last 30 days)
    const perModelGroups = await (tenantDb.usageRecord as any).groupBy({
      by: ['model'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: { id: true },
      _sum: { inputTokens: true, outputTokens: true, thinkingTokens: true },
    });

    const perModel = (perModelGroups as any[]).map((g: any) => ({
      model: g.model,
      requests: g._count.id,
      tokens: (g._sum?.inputTokens ?? 0) + (g._sum?.outputTokens ?? 0) + (g._sum?.thinkingTokens ?? 0),
    }));

    // Daily trend for last 30 days
    // Use raw SQL for date truncation since Prisma groupBy doesn't support date functions
    const dailyTrend = await (tenantDb.$queryRawUnsafe as any)(`
      SELECT
        DATE(created_at) as date,
        COUNT(*)::int as requests,
        COALESCE(SUM(input_tokens), 0)::bigint + COALESCE(SUM(output_tokens), 0)::bigint + COALESCE(SUM(thinking_tokens), 0)::bigint as tokens
      FROM usage_records
      WHERE organization_id = $1
        AND created_at >= $2
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `, organization.id, thirtyDaysAgo);

    const trend = (dailyTrend as any[]).map((row: any) => ({
      date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date).split('T')[0],
      requests: Number(row.requests),
      tokens: Number(row.tokens),
    }));

    return NextResponse.json({
      requests: {
        last24h: totals24h._count.id,
        last7d: totals7d._count.id,
        last30d: totals30d._count.id,
      },
      tokens: {
        last24h: sumTokens(totals24h),
        last7d: sumTokens(totals7d),
        last30d: sumTokens(totals30d),
      },
      perModel,
      trend,
    });
  } catch (error) {
    console.error('[AdminUsage] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}
