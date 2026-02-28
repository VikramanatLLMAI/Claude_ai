/**
 * Usage Service
 *
 * Provides rolling 24-hour usage limit checks and org-level usage aggregation.
 * Uses tenantDb for UsageRecord queries (org-scoped model).
 *
 * Functions:
 * - checkUserUsageLimits: Rolling 24h limit check against role limits
 * - getUserUsageSummary: Enriched usage data for chat UI polling
 * - getOrgUsageSummary: Org-wide usage breakdown for admin dashboard
 * - getOrgMonthlyUsage: Calendar month aggregation for ceiling checks
 * - checkOrgMonthlyCeiling: Validate org usage against monthly ceiling
 *
 * Covers: USES-01, SAFE-10
 */

import type { TenantPrismaClient } from '@/lib/tenant';
import type { Role, Organization, OrgSettings } from '@/lib/generated/prisma/client';

// ============================================
// Types
// ============================================

export interface UsageLimitStatus {
  current: number;
  limit: number;
  percentage: number;
}

export interface UsageLimitResult {
  allowed: boolean;
  warning: boolean;
  blocked: boolean;
  requestStatus: UsageLimitStatus | null;
  tokenStatus: UsageLimitStatus | null;
  resetAt: string | null;
}

export interface UserUsageSummary {
  requests: { current: number; limit: number | null; percentage: number };
  tokens: { current: number; limit: number | null; percentage: number };
  resetAt: string | null;
  windowStart: string;
}

export interface OrgUsageSummary {
  totalRequests: number;
  totalTokens: number;
  perUser: Array<{
    userId: string;
    requests: number;
    tokens: number;
  }>;
  perModel: Array<{
    model: string;
    requests: number;
    tokens: number;
  }>;
  timeRange: { from: string; to: string };
}

export interface MonthlyUsage {
  totalRequests: number;
  totalTokens: number;
}

export interface MonthlyCeilingResult {
  allowed: boolean;
  requestStatus: UsageLimitStatus | null;
  tokenStatus: UsageLimitStatus | null;
}

// ============================================
// Constants
// ============================================

const WARNING_THRESHOLD = 0.8; // 80%
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// ============================================
// User-Level Usage Functions
// ============================================

/**
 * Check user usage against role daily limits using a rolling 24-hour window.
 *
 * Uses a single aggregate query for both request count and token sum.
 * Returns immediately with allowed=true if role has no limits (both null).
 *
 * @param tenantDb - Tenant-scoped Prisma client
 * @param userId - User to check
 * @param role - Role with dailyRequestLimit and dailyTokenLimit
 */
export async function checkUserUsageLimits(
  tenantDb: TenantPrismaClient,
  userId: string,
  role: Pick<Role, 'dailyRequestLimit' | 'dailyTokenLimit'>
): Promise<UsageLimitResult> {
  // Unlimited: both limits are null
  if (role.dailyRequestLimit === null && role.dailyTokenLimit === null) {
    return {
      allowed: true,
      warning: false,
      blocked: false,
      requestStatus: null,
      tokenStatus: null,
      resetAt: null,
    };
  }

  const windowStart = new Date(Date.now() - TWENTY_FOUR_HOURS_MS);

  // Single aggregate query for both count and token sum
  const aggregate = await tenantDb.usageRecord.aggregate({
    where: {
      userId,
      createdAt: { gte: windowStart },
    },
    _count: { id: true },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      thinkingTokens: true,
    },
  });

  const currentRequests = aggregate._count.id;
  const currentTokens =
    (aggregate._sum.inputTokens ?? 0) +
    (aggregate._sum.outputTokens ?? 0) +
    (aggregate._sum.thinkingTokens ?? 0);

  // Build status objects
  let requestStatus: UsageLimitStatus | null = null;
  let tokenStatus: UsageLimitStatus | null = null;
  let blocked = false;
  let warning = false;

  if (role.dailyRequestLimit !== null) {
    const percentage = role.dailyRequestLimit > 0
      ? currentRequests / role.dailyRequestLimit
      : currentRequests > 0 ? 1 : 0;
    requestStatus = {
      current: currentRequests,
      limit: role.dailyRequestLimit,
      percentage: Math.min(percentage, 1),
    };
    if (currentRequests >= role.dailyRequestLimit) blocked = true;
    if (percentage >= WARNING_THRESHOLD) warning = true;
  }

  if (role.dailyTokenLimit !== null) {
    const percentage = role.dailyTokenLimit > 0
      ? currentTokens / role.dailyTokenLimit
      : currentTokens > 0 ? 1 : 0;
    tokenStatus = {
      current: currentTokens,
      limit: role.dailyTokenLimit,
      percentage: Math.min(percentage, 1),
    };
    if (currentTokens >= role.dailyTokenLimit) blocked = true;
    if (percentage >= WARNING_THRESHOLD) warning = true;
  }

  // Calculate resetAt from the earliest record in the window
  let resetAt: string | null = null;
  if (blocked) {
    const earliest = await tenantDb.usageRecord.findFirst({
      where: {
        userId,
        createdAt: { gte: windowStart },
      },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    if (earliest) {
      const resetDate = new Date(earliest.createdAt.getTime() + TWENTY_FOUR_HOURS_MS);
      resetAt = resetDate.toISOString();
    }
  }

  return {
    allowed: !blocked,
    warning,
    blocked,
    requestStatus,
    tokenStatus,
    resetAt,
  };
}

/**
 * Get enriched usage summary for a user in the rolling 24-hour window.
 * Used by the chat UI status polling endpoint.
 *
 * @param tenantDb - Tenant-scoped Prisma client
 * @param userId - User to summarize
 * @param role - Role with limit fields
 */
export async function getUserUsageSummary(
  tenantDb: TenantPrismaClient,
  userId: string,
  role: Pick<Role, 'dailyRequestLimit' | 'dailyTokenLimit'>
): Promise<UserUsageSummary> {
  const windowStart = new Date(Date.now() - TWENTY_FOUR_HOURS_MS);

  const aggregate = await tenantDb.usageRecord.aggregate({
    where: {
      userId,
      createdAt: { gte: windowStart },
    },
    _count: { id: true },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      thinkingTokens: true,
    },
  });

  const currentRequests = aggregate._count.id;
  const currentTokens =
    (aggregate._sum.inputTokens ?? 0) +
    (aggregate._sum.outputTokens ?? 0) +
    (aggregate._sum.thinkingTokens ?? 0);

  const requestPercentage = role.dailyRequestLimit
    ? Math.min(currentRequests / role.dailyRequestLimit, 1)
    : 0;
  const tokenPercentage = role.dailyTokenLimit
    ? Math.min(currentTokens / role.dailyTokenLimit, 1)
    : 0;

  // Calculate resetAt from earliest record in window
  let resetAt: string | null = null;
  if (currentRequests > 0) {
    const earliest = await tenantDb.usageRecord.findFirst({
      where: {
        userId,
        createdAt: { gte: windowStart },
      },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });
    if (earliest) {
      resetAt = new Date(earliest.createdAt.getTime() + TWENTY_FOUR_HOURS_MS).toISOString();
    }
  }

  return {
    requests: {
      current: currentRequests,
      limit: role.dailyRequestLimit,
      percentage: requestPercentage,
    },
    tokens: {
      current: currentTokens,
      limit: role.dailyTokenLimit,
      percentage: tokenPercentage,
    },
    resetAt,
    windowStart: windowStart.toISOString(),
  };
}

// ============================================
// Org-Level Usage Functions
// ============================================

/**
 * Get aggregated usage summary for an entire organization.
 * Used by the admin usage dashboard.
 *
 * @param tenantDb - Tenant-scoped Prisma client
 * @param orgId - Organization ID
 * @param timeRange - Optional time range (defaults to last 30 days)
 */
export async function getOrgUsageSummary(
  tenantDb: TenantPrismaClient,
  orgId: string,
  timeRange?: { from: Date; to: Date }
): Promise<OrgUsageSummary> {
  const now = new Date();
  const from = timeRange?.from ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const to = timeRange?.to ?? now;

  const whereClause = {
    createdAt: { gte: from, lte: to },
  };

  // Total aggregation
  const totals = await tenantDb.usageRecord.aggregate({
    where: whereClause,
    _count: { id: true },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      thinkingTokens: true,
    },
  });

  // Per-user breakdown
  const perUserGroups = await tenantDb.usageRecord.groupBy({
    by: ['userId'],
    where: whereClause,
    _count: { id: true },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      thinkingTokens: true,
    },
  });

  // Per-model breakdown
  const perModelGroups = await tenantDb.usageRecord.groupBy({
    by: ['model'],
    where: whereClause,
    _count: { id: true },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      thinkingTokens: true,
    },
  });

  return {
    totalRequests: totals._count.id,
    totalTokens:
      (totals._sum.inputTokens ?? 0) +
      (totals._sum.outputTokens ?? 0) +
      (totals._sum.thinkingTokens ?? 0),
    perUser: (perUserGroups as Array<{ userId: string; _count: { id: number }; _sum: { inputTokens: number | null; outputTokens: number | null; thinkingTokens: number | null } }>).map((g) => ({
      userId: g.userId,
      requests: g._count.id,
      tokens:
        (g._sum.inputTokens ?? 0) +
        (g._sum.outputTokens ?? 0) +
        (g._sum.thinkingTokens ?? 0),
    })),
    perModel: (perModelGroups as Array<{ model: string; _count: { id: number }; _sum: { inputTokens: number | null; outputTokens: number | null; thinkingTokens: number | null } }>).map((g) => ({
      model: g.model,
      requests: g._count.id,
      tokens:
        (g._sum.inputTokens ?? 0) +
        (g._sum.outputTokens ?? 0) +
        (g._sum.thinkingTokens ?? 0),
    })),
    timeRange: { from: from.toISOString(), to: to.toISOString() },
  };
}

/**
 * Get aggregated usage for the current calendar month.
 * Used for monthly ceiling checks.
 *
 * @param tenantDb - Tenant-scoped Prisma client
 * @param orgId - Organization ID
 */
export async function getOrgMonthlyUsage(
  tenantDb: TenantPrismaClient,
  orgId: string
): Promise<MonthlyUsage> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const aggregate = await tenantDb.usageRecord.aggregate({
    where: {
      createdAt: { gte: monthStart },
    },
    _count: { id: true },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      thinkingTokens: true,
    },
  });

  return {
    totalRequests: aggregate._count.id,
    totalTokens:
      (aggregate._sum.inputTokens ?? 0) +
      (aggregate._sum.outputTokens ?? 0) +
      (aggregate._sum.thinkingTokens ?? 0),
  };
}

/**
 * Check organization usage against monthly ceilings.
 *
 * Monthly ceilings are set at two levels:
 * - Organization.monthlyRequestCeiling / monthlyTokenCeiling (hard limit set by Super Admin)
 * - OrgSettings.monthlyRequestLimit / monthlyTokenLimit (soft limit set by Org Admin)
 *
 * The lower of the two is used for enforcement.
 *
 * @param org - Organization with ceiling fields
 * @param orgSettings - OrgSettings with limit fields (or null)
 * @param monthlyUsage - Current month's usage totals
 */
export function checkOrgMonthlyCeiling(
  org: Pick<Organization, 'monthlyRequestCeiling' | 'monthlyTokenCeiling'>,
  orgSettings: Pick<OrgSettings, 'monthlyRequestLimit' | 'monthlyTokenLimit'> | null,
  monthlyUsage: MonthlyUsage
): MonthlyCeilingResult {
  // Determine effective limits (lower of ceiling and limit)
  const effectiveRequestLimit = getEffectiveLimit(
    org.monthlyRequestCeiling,
    orgSettings?.monthlyRequestLimit ?? null
  );
  const effectiveTokenLimit = getEffectiveLimit(
    org.monthlyTokenCeiling,
    orgSettings?.monthlyTokenLimit ?? null
  );

  // If no limits set, everything is allowed
  if (effectiveRequestLimit === null && effectiveTokenLimit === null) {
    return { allowed: true, requestStatus: null, tokenStatus: null };
  }

  let blocked = false;
  let requestStatus: UsageLimitStatus | null = null;
  let tokenStatus: UsageLimitStatus | null = null;

  if (effectiveRequestLimit !== null) {
    const percentage = effectiveRequestLimit > 0
      ? monthlyUsage.totalRequests / effectiveRequestLimit
      : monthlyUsage.totalRequests > 0 ? 1 : 0;
    requestStatus = {
      current: monthlyUsage.totalRequests,
      limit: effectiveRequestLimit,
      percentage: Math.min(percentage, 1),
    };
    if (monthlyUsage.totalRequests >= effectiveRequestLimit) blocked = true;
  }

  if (effectiveTokenLimit !== null) {
    const percentage = effectiveTokenLimit > 0
      ? monthlyUsage.totalTokens / effectiveTokenLimit
      : monthlyUsage.totalTokens > 0 ? 1 : 0;
    tokenStatus = {
      current: monthlyUsage.totalTokens,
      limit: effectiveTokenLimit,
      percentage: Math.min(percentage, 1),
    };
    if (monthlyUsage.totalTokens >= effectiveTokenLimit) blocked = true;
  }

  return { allowed: !blocked, requestStatus, tokenStatus };
}

// ============================================
// Internal Helpers
// ============================================

/**
 * Get the effective limit from two nullable values (ceiling and limit).
 * Returns the lower of the two non-null values, or null if both are null.
 */
function getEffectiveLimit(ceiling: number | null, limit: number | null): number | null {
  if (ceiling === null && limit === null) return null;
  if (ceiling === null) return limit;
  if (limit === null) return ceiling;
  return Math.min(ceiling, limit);
}
