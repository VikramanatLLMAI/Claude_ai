/**
 * Org Admin Usage API - Per-User Usage Breakdown
 *
 * GET /api/org/[slug]/admin/usage/users
 *
 * Returns per-user usage data with request/token counts, limits, percentages,
 * status badges (normal/warning/blocked/inactive), and last active timestamps.
 * Used by the admin usage monitoring dashboard user table.
 *
 * Covers: OUSE-04, OUSE-05, OALT-01, OALT-02
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const WARNING_THRESHOLD = 0.8;

export async function GET(req: NextRequest) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { tenantDb } = auth;

  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - TWENTY_FOUR_HOURS_MS);
    const inactiveThreshold = new Date(now.getTime() - THIRTY_DAYS_MS);

    // Get all org members with user and role info
    const members = await (tenantDb.orgMember as any).findMany({
      where: { status: 'ACTIVE' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        role: { select: { id: true, name: true, dailyRequestLimit: true, dailyTokenLimit: true } },
      },
    });

    // Get rolling 24h usage grouped by user
    const usageByUser = await (tenantDb.usageRecord as any).groupBy({
      by: ['userId'],
      where: { createdAt: { gte: windowStart } },
      _count: { id: true },
      _sum: { inputTokens: true, outputTokens: true, thinkingTokens: true },
    });

    // Build a map of userId -> usage
    const usageMap = new Map<string, { requests: number; tokens: number }>();
    for (const row of usageByUser as any[]) {
      usageMap.set(row.userId, {
        requests: row._count.id,
        tokens:
          (row._sum?.inputTokens ?? 0) +
          (row._sum?.outputTokens ?? 0) +
          (row._sum?.thinkingTokens ?? 0),
      });
    }

    // Build per-user data
    const users = (members as any[]).map((member: any) => {
      const usage = usageMap.get(member.user.id) ?? { requests: 0, tokens: 0 };
      const requestLimit: number | null = member.role.dailyRequestLimit;
      const tokenLimit: number | null = member.role.dailyTokenLimit;

      const requestPercentage = requestLimit
        ? Math.min(usage.requests / requestLimit, 1)
        : 0;
      const tokenPercentage = tokenLimit
        ? Math.min(usage.tokens / tokenLimit, 1)
        : 0;

      // Determine status
      let status: 'normal' | 'warning' | 'blocked' | 'inactive' = 'normal';

      // Check inactive first (30+ days since last activity)
      const lastActiveAt: Date | null = member.lastActiveAt;
      if (!lastActiveAt || lastActiveAt < inactiveThreshold) {
        status = 'inactive';
      }

      // Override with usage status if applicable (active user can still be warning/blocked)
      const isBlocked =
        (requestLimit !== null && usage.requests >= requestLimit) ||
        (tokenLimit !== null && usage.tokens >= tokenLimit);
      const isWarning =
        !isBlocked &&
        ((requestLimit !== null && requestPercentage >= WARNING_THRESHOLD) ||
          (tokenLimit !== null && tokenPercentage >= WARNING_THRESHOLD));

      if (isBlocked) status = 'blocked';
      else if (isWarning) status = 'warning';

      return {
        userId: member.user.id,
        userName: member.user.name,
        userEmail: member.user.email,
        roleName: member.role.name,
        requestCount24h: usage.requests,
        tokenCount24h: usage.tokens,
        requestLimit,
        tokenLimit,
        requestPercentage,
        tokenPercentage,
        lastActiveAt: lastActiveAt?.toISOString() ?? null,
        status,
      };
    });

    // Sort: blocked first, then warning, then normal, then inactive
    const statusOrder = { blocked: 0, warning: 1, normal: 2, inactive: 3 };
    users.sort((a: any, b: any) => statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder]);

    return NextResponse.json({ users });
  } catch (error) {
    console.error('[AdminUsageUsers] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch per-user usage data' },
      { status: 500 }
    );
  }
}
