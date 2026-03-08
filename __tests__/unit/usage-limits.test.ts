/**
 * Unit tests for usage limit enforcement
 *
 * Tests cover:
 * - checkUserUsageLimits: unlimited, under limit, blocked, warning, token calculation
 * - checkOrgMonthlyCeiling: no ceiling, request exceeded, token exceeded, OrgSettings override
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkUserUsageLimits,
  checkOrgMonthlyCeiling,
  type MonthlyUsage,
} from '@/lib/services/usage-service';

// Create a mock tenantDb for user usage tests
function createMockTenantDb() {
  return {
    usageRecord: {
      aggregate: vi.fn(),
      findFirst: vi.fn(),
    },
  } as any;
}

describe('checkUserUsageLimits', () => {
  let mockTenantDb: ReturnType<typeof createMockTenantDb>;

  beforeEach(() => {
    mockTenantDb = createMockTenantDb();
  });

  it('returns allowed=true immediately when both limits are null (unlimited)', async () => {
    const result = await checkUserUsageLimits(mockTenantDb, 'user-1', {
      dailyRequestLimit: null,
      dailyTokenLimit: null,
    });

    expect(result.allowed).toBe(true);
    expect(result.blocked).toBe(false);
    expect(result.warning).toBe(false);
    expect(result.requestStatus).toBeNull();
    expect(result.tokenStatus).toBeNull();
    // Should not have queried the DB at all
    expect(mockTenantDb.usageRecord.aggregate).not.toHaveBeenCalled();
  });

  it('returns allowed=true, blocked=false when usage is under limit', async () => {
    mockTenantDb.usageRecord.aggregate.mockResolvedValue({
      _count: { id: 5 },
      _sum: { inputTokens: 100, outputTokens: 200, thinkingTokens: 50 },
    });

    const result = await checkUserUsageLimits(mockTenantDb, 'user-1', {
      dailyRequestLimit: 100,
      dailyTokenLimit: 10000,
    });

    expect(result.allowed).toBe(true);
    expect(result.blocked).toBe(false);
    expect(result.requestStatus?.current).toBe(5);
    expect(result.requestStatus?.limit).toBe(100);
  });

  it('returns blocked=true when request count >= dailyRequestLimit', async () => {
    mockTenantDb.usageRecord.aggregate.mockResolvedValue({
      _count: { id: 100 },
      _sum: { inputTokens: 500, outputTokens: 500, thinkingTokens: 0 },
    });
    mockTenantDb.usageRecord.findFirst.mockResolvedValue({
      createdAt: new Date(Date.now() - 3600000), // 1 hour ago
    });

    const result = await checkUserUsageLimits(mockTenantDb, 'user-1', {
      dailyRequestLimit: 100,
      dailyTokenLimit: null,
    });

    expect(result.allowed).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.requestStatus?.current).toBe(100);
    expect(result.resetAt).toBeTruthy();
  });

  it('returns warning=true when usage >= 80% of limit', async () => {
    mockTenantDb.usageRecord.aggregate.mockResolvedValue({
      _count: { id: 85 },
      _sum: { inputTokens: 0, outputTokens: 0, thinkingTokens: 0 },
    });

    const result = await checkUserUsageLimits(mockTenantDb, 'user-1', {
      dailyRequestLimit: 100,
      dailyTokenLimit: null,
    });

    expect(result.warning).toBe(true);
    expect(result.blocked).toBe(false);
    expect(result.allowed).toBe(true);
  });

  it('calculates token total as sum of input + output + thinking tokens', async () => {
    mockTenantDb.usageRecord.aggregate.mockResolvedValue({
      _count: { id: 1 },
      _sum: { inputTokens: 1000, outputTokens: 2000, thinkingTokens: 500 },
    });

    const result = await checkUserUsageLimits(mockTenantDb, 'user-1', {
      dailyRequestLimit: null,
      dailyTokenLimit: 5000,
    });

    // 1000 + 2000 + 500 = 3500, under 5000 limit
    expect(result.allowed).toBe(true);
    expect(result.tokenStatus?.current).toBe(3500);
    expect(result.tokenStatus?.limit).toBe(5000);
  });

  it('returns blocked=true when token usage >= dailyTokenLimit', async () => {
    mockTenantDb.usageRecord.aggregate.mockResolvedValue({
      _count: { id: 10 },
      _sum: { inputTokens: 3000, outputTokens: 5000, thinkingTokens: 2000 },
    });
    mockTenantDb.usageRecord.findFirst.mockResolvedValue({
      createdAt: new Date(Date.now() - 7200000),
    });

    const result = await checkUserUsageLimits(mockTenantDb, 'user-1', {
      dailyRequestLimit: null,
      dailyTokenLimit: 10000, // 3000 + 5000 + 2000 = 10000 >= limit
    });

    expect(result.allowed).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.tokenStatus?.current).toBe(10000);
  });

  it('handles null token sums gracefully', async () => {
    mockTenantDb.usageRecord.aggregate.mockResolvedValue({
      _count: { id: 0 },
      _sum: { inputTokens: null, outputTokens: null, thinkingTokens: null },
    });

    const result = await checkUserUsageLimits(mockTenantDb, 'user-1', {
      dailyRequestLimit: 100,
      dailyTokenLimit: 10000,
    });

    expect(result.allowed).toBe(true);
    expect(result.tokenStatus?.current).toBe(0);
    expect(result.requestStatus?.current).toBe(0);
  });
});

describe('checkOrgMonthlyCeiling', () => {
  it('returns allowed=true when org has no ceiling', () => {
    const org = { monthlyRequestCeiling: null, monthlyTokenCeiling: null };
    const usage: MonthlyUsage = { totalRequests: 1000, totalTokens: 500000 };

    const result = checkOrgMonthlyCeiling(org, null, usage);

    expect(result.allowed).toBe(true);
    expect(result.requestStatus).toBeNull();
    expect(result.tokenStatus).toBeNull();
  });

  it('returns allowed=false when request count exceeds ceiling', () => {
    const org = { monthlyRequestCeiling: 100, monthlyTokenCeiling: null };
    const usage: MonthlyUsage = { totalRequests: 150, totalTokens: 500000 };

    const result = checkOrgMonthlyCeiling(org, null, usage);

    expect(result.allowed).toBe(false);
    expect(result.requestStatus?.current).toBe(150);
    expect(result.requestStatus?.limit).toBe(100);
  });

  it('returns allowed=false when token count exceeds ceiling', () => {
    const org = { monthlyRequestCeiling: null, monthlyTokenCeiling: 100000 };
    const usage: MonthlyUsage = { totalRequests: 50, totalTokens: 150000 };

    const result = checkOrgMonthlyCeiling(org, null, usage);

    expect(result.allowed).toBe(false);
    expect(result.tokenStatus?.current).toBe(150000);
    expect(result.tokenStatus?.limit).toBe(100000);
  });

  it('OrgSettings limit overrides Organization ceiling when lower', () => {
    const org = { monthlyRequestCeiling: 1000, monthlyTokenCeiling: null };
    const orgSettings = { monthlyRequestLimit: 500, monthlyTokenLimit: null };
    const usage: MonthlyUsage = { totalRequests: 600, totalTokens: 0 };

    const result = checkOrgMonthlyCeiling(org, orgSettings, usage);

    // Effective limit is min(1000, 500) = 500, usage 600 >= 500 => blocked
    expect(result.allowed).toBe(false);
    expect(result.requestStatus?.limit).toBe(500);
  });

  it('Organization ceiling used when OrgSettings limit is null', () => {
    const org = { monthlyRequestCeiling: 200, monthlyTokenCeiling: null };
    const orgSettings = { monthlyRequestLimit: null, monthlyTokenLimit: null };
    const usage: MonthlyUsage = { totalRequests: 250, totalTokens: 0 };

    const result = checkOrgMonthlyCeiling(org, orgSettings, usage);

    expect(result.allowed).toBe(false);
    expect(result.requestStatus?.limit).toBe(200);
  });

  it('returns allowed=true when usage is under both ceilings', () => {
    const org = { monthlyRequestCeiling: 1000, monthlyTokenCeiling: 500000 };
    const usage: MonthlyUsage = { totalRequests: 100, totalTokens: 50000 };

    const result = checkOrgMonthlyCeiling(org, null, usage);

    expect(result.allowed).toBe(true);
    expect(result.requestStatus?.current).toBe(100);
    expect(result.tokenStatus?.current).toBe(50000);
  });
});
