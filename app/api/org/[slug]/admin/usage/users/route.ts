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
import prisma from '@/lib/db';

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

    // Cast required: Prisma $extends loses model types in tenantPrisma()
    const members = await (tenantDb.orgMember as typeof prisma.orgMember).findMany({
      where: { status: 'ACTIVE' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        role: { select: { id: true, name: true, dailyRequestLimit: true, dailyTokenLimit: true } },
      },
    });

    // Get rolling 24h usage grouped by user
    const usageByUser = await (tenantDb.usageRecord as typeof prisma.usageRecord).groupBy({
      by: ['userId'],
      where: { createdAt: { gte: windowStart } },
      _count: { id: true },
      _sum: { inputTokens: true, outputTokens: true, thinkingTokens: true },
    });

    // Build a map of userId -> usage
    const usageMap = new Map<string, { requests: number; tokens: number }>();
    for (const row of usageByUser) {
      const r = row as typeof row & { userId: string; _count: { id: number }; _sum: { inputTokens: number | null; outputTokens: number | null; thinkingTokens: number | null } };
      usageMap.set(r.userId, {
        requests: r._count.id,
        tokens:
          (r._sum?.inputTokens ?? 0) +
          (r._sum?.outputTokens ?? 0) +
          (r._sum?.thinkingTokens ?? 0),
      });
    }

    // Build per-user data
    interface MemberWithIncludes { user: { id: string; name: string; email: string }; role: { id: string; name: string; dailyRequestLimit: number | null; dailyTokenLimit: number | null }; lastActiveAt: Date | null }
    const users = (members as MemberWithIncludes[]).map((member) => {
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
    users.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    return NextResponse.json({ users });
  } catch (error) {
    console.error('[AdminUsageUsers] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch per-user usage data' },
      { status: 500 }
    );
  }
}
