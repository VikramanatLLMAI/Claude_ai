/**
 * Org Analytics Service
 *
 * Aggregates organization-level analytics data for the Org Admin analytics dashboard.
 * All queries are explicitly scoped to a single organization via orgId parameter.
 * Uses raw prisma with explicit organizationId filters for queries that join
 * non-org-scoped tables (User, Session, PlatformApiKey).
 *
 * Functions:
 * - getKpiSummary: Active/suspended members, invitations, conversations, messages, tokens, near-limit users
 * - getUsageTrends: Daily token usage breakdown by type
 * - getTokensByUserRoleModel: Token usage grouped by user, role, model
 * - getModelDistribution: Usage grouped by model
 * - getTopUsers: Top N users by token consumption
 * - getPerRoleUsage: Usage grouped by role
 * - getMcpUsage: MCP tool invocation trends
 * - getAvgResponseTime: Average response time per model
 * - getErrorRate: Error type distribution
 * - getPeakUsageHours: Hour x day usage heatmap
 * - getInvitationStats: Invitation status distribution
 * - getApiKeyUsage: API key consumption for this org
 * - getUsersNearLimits: Users approaching daily limits
 * - getInactiveUsers: Users inactive for 30+ days
 *
 * Covers: OANA-01 through OANA-15
 */

import prisma from '@/lib/db';

// ============================================
// Types
// ============================================

export interface OrgKpiSummary {
  activeMembers: number;
  suspendedMembers: number;
  pendingInvitations: number;
  totalConversations: number;
  totalMessages: number;
  totalTokens: number;
  usersNearLimits: number;
}

export interface OrgUsageTrendPoint {
  date: string;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
}

export interface UserRoleModelUsage {
  userName: string;
  roleName: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ModelDistributionItem {
  modelId: string;
  totalTokens: number;
  requestCount: number;
}

export interface TopUserItem {
  userId: string;
  userName: string;
  roleName: string;
  totalTokens: number;
  messageCount: number;
}

export interface PerRoleUsageItem {
  roleId: string;
  roleName: string;
  totalTokens: number;
  requestCount: number;
  userCount: number;
}

export interface OrgMcpUsagePoint {
  date: string;
  toolCallCount: number;
}

export interface AvgResponseTimeItem {
  modelId: string;
  avgDurationMs: number;
}

export interface OrgErrorRateItem {
  errorType: string;
  count: number;
}

export interface OrgPeakUsagePoint {
  hour: number;
  dayOfWeek: number;
  count: number;
}

export interface InvitationStatsItem {
  status: string;
  count: number;
}

export interface ApiKeyUsageItem {
  keyName: string;
  maskedKey: string;
  totalTokens: number;
  requestCount: number;
}

export interface UserNearLimitItem {
  userId: string;
  userName: string;
  roleName: string;
  usagePercent: number;
  limitType: 'requests' | 'tokens';
}

export interface InactiveUserItem {
  userId: string;
  userName: string;
  email: string;
  roleName: string;
  lastActiveAt: string | null;
  daysSinceActive: number;
}

// ============================================
// KPI Summary (OANA-01, OANA-02, OANA-14)
// ============================================

/**
 * Get org KPI summary: members, invitations, conversations, messages, tokens, near-limit users.
 */
export async function getKpiSummary(orgId: string): Promise<OrgKpiSummary> {
  const [memberCounts, pendingInvitations, totalConversations, totalMessages, tokenTotals, nearLimitCount] =
    await Promise.all([
      // Member counts by status
      prisma.orgMember.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: { id: true },
      }),
      // Pending invitations
      prisma.invitation.count({
        where: { organizationId: orgId, status: 'PENDING' },
      }),
      // Total conversations
      prisma.conversation.count({
        where: { organizationId: orgId },
      }),
      // Total messages
      prisma.message.count({
        where: { organizationId: orgId },
      }),
      // Token totals
      prisma.usageRecord.aggregate({
        where: { organizationId: orgId },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          thinkingTokens: true,
        },
      }),
      // Users near limits (>= 80% of daily role limit)
      // Uses raw SQL to join UsageRecord with OrgMember and Role
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT om.id)::bigint AS count
        FROM org_members om
        JOIN roles r ON r.id = om.role_id
        LEFT JOIN (
          SELECT user_id,
                 COUNT(*)::integer AS req_count,
                 SUM(input_tokens + output_tokens + thinking_tokens)::bigint AS total_tokens
          FROM usage_records
          WHERE organization_id = ${orgId}
            AND DATE(created_at) = CURRENT_DATE
          GROUP BY user_id
        ) today ON today.user_id = om.user_id
        WHERE om.organization_id = ${orgId}
          AND om.status = 'ACTIVE'
          AND (
            (r.daily_request_limit IS NOT NULL AND today.req_count >= r.daily_request_limit * 0.8)
            OR
            (r.daily_token_limit IS NOT NULL AND today.total_tokens >= r.daily_token_limit * 0.8)
          )
      `,
    ]);

  const activeMembers =
    memberCounts.find((g: { status: string; _count: { id: number } }) => g.status === 'ACTIVE')?._count.id ?? 0;
  const suspendedMembers =
    memberCounts.find((g: { status: string; _count: { id: number } }) => g.status === 'SUSPENDED')?._count.id ?? 0;

  const totalTokens =
    (tokenTotals._sum.inputTokens ?? 0) +
    (tokenTotals._sum.outputTokens ?? 0) +
    (tokenTotals._sum.thinkingTokens ?? 0);

  return {
    activeMembers,
    suspendedMembers,
    pendingInvitations,
    totalConversations,
    totalMessages,
    totalTokens,
    usersNearLimits: Number(nearLimitCount[0]?.count ?? 0),
  };
}

// ============================================
// Usage Trends (OANA-07)
// ============================================

/**
 * Get daily token usage grouped by type for an org.
 */
export async function getUsageTrends(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<OrgUsageTrendPoint[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      date: Date;
      input_tokens: bigint;
      output_tokens: bigint;
      thinking_tokens: bigint;
    }>
  >`
    SELECT
      DATE(created_at) AS date,
      SUM(input_tokens)::bigint AS input_tokens,
      SUM(output_tokens)::bigint AS output_tokens,
      SUM(thinking_tokens)::bigint AS thinking_tokens
    FROM usage_records
    WHERE organization_id = ${orgId}
      AND created_at >= ${startDate}
      AND created_at <= ${endDate}
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at) ASC
  `;

  return rows.map((row) => ({
    date: row.date.toISOString().slice(0, 10),
    inputTokens: Number(row.input_tokens),
    outputTokens: Number(row.output_tokens),
    thinkingTokens: Number(row.thinking_tokens),
  }));
}

// ============================================
// Tokens by User/Role/Model (OANA-03)
// ============================================

/**
 * Get token usage grouped by user, role, and model.
 */
export async function getTokensByUserRoleModel(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<UserRoleModelUsage[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      user_name: string;
      role_name: string;
      model: string;
      input_tokens: bigint;
      output_tokens: bigint;
    }>
  >`
    SELECT
      u.name AS user_name,
      r.name AS role_name,
      ur.model,
      SUM(ur.input_tokens)::bigint AS input_tokens,
      SUM(ur.output_tokens)::bigint AS output_tokens
    FROM usage_records ur
    JOIN org_members om ON om.user_id = ur.user_id AND om.organization_id = ur.organization_id
    JOIN users u ON u.id = ur.user_id
    JOIN roles r ON r.id = om.role_id
    WHERE ur.organization_id = ${orgId}
      AND ur.created_at >= ${startDate}
      AND ur.created_at <= ${endDate}
    GROUP BY u.name, r.name, ur.model
    ORDER BY SUM(ur.input_tokens + ur.output_tokens) DESC
  `;

  return rows.map((row) => ({
    userName: row.user_name,
    roleName: row.role_name,
    modelId: row.model,
    inputTokens: Number(row.input_tokens),
    outputTokens: Number(row.output_tokens),
  }));
}

// ============================================
// Model Distribution (OANA-04)
// ============================================

/**
 * Get usage distribution across models for an org.
 */
export async function getModelDistribution(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<ModelDistributionItem[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      model: string;
      total_tokens: bigint;
      request_count: bigint;
    }>
  >`
    SELECT
      model,
      SUM(input_tokens + output_tokens + thinking_tokens)::bigint AS total_tokens,
      COUNT(*)::bigint AS request_count
    FROM usage_records
    WHERE organization_id = ${orgId}
      AND created_at >= ${startDate}
      AND created_at <= ${endDate}
    GROUP BY model
    ORDER BY total_tokens DESC
  `;

  return rows.map((row) => ({
    modelId: row.model,
    totalTokens: Number(row.total_tokens),
    requestCount: Number(row.request_count),
  }));
}

// ============================================
// Top Users (OANA-05)
// ============================================

/**
 * Get top N users by total token consumption in an org.
 */
export async function getTopUsers(
  orgId: string,
  startDate: Date,
  endDate: Date,
  limit = 10
): Promise<TopUserItem[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      user_id: string;
      user_name: string;
      role_name: string;
      total_tokens: bigint;
      message_count: bigint;
    }>
  >`
    SELECT
      ur.user_id,
      u.name AS user_name,
      r.name AS role_name,
      SUM(ur.input_tokens + ur.output_tokens + ur.thinking_tokens)::bigint AS total_tokens,
      COUNT(ur.id)::bigint AS message_count
    FROM usage_records ur
    JOIN org_members om ON om.user_id = ur.user_id AND om.organization_id = ur.organization_id
    JOIN users u ON u.id = ur.user_id
    JOIN roles r ON r.id = om.role_id
    WHERE ur.organization_id = ${orgId}
      AND ur.created_at >= ${startDate}
      AND ur.created_at <= ${endDate}
    GROUP BY ur.user_id, u.name, r.name
    ORDER BY total_tokens DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    userId: row.user_id,
    userName: row.user_name,
    roleName: row.role_name,
    totalTokens: Number(row.total_tokens),
    messageCount: Number(row.message_count),
  }));
}

// ============================================
// Per-Role Usage (OANA-06)
// ============================================

/**
 * Get usage aggregated by role for an org.
 */
export async function getPerRoleUsage(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<PerRoleUsageItem[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      role_id: string;
      role_name: string;
      total_tokens: bigint;
      request_count: bigint;
      user_count: bigint;
    }>
  >`
    SELECT
      r.id AS role_id,
      r.name AS role_name,
      COALESCE(SUM(ur.input_tokens + ur.output_tokens + ur.thinking_tokens), 0)::bigint AS total_tokens,
      COUNT(ur.id)::bigint AS request_count,
      COUNT(DISTINCT ur.user_id)::bigint AS user_count
    FROM roles r
    LEFT JOIN org_members om ON om.role_id = r.id AND om.organization_id = ${orgId}
    LEFT JOIN usage_records ur ON ur.user_id = om.user_id
      AND ur.organization_id = ${orgId}
      AND ur.created_at >= ${startDate}
      AND ur.created_at <= ${endDate}
    WHERE r.organization_id = ${orgId}
    GROUP BY r.id, r.name
    ORDER BY total_tokens DESC
  `;

  return rows.map((row) => ({
    roleId: row.role_id,
    roleName: row.role_name,
    totalTokens: Number(row.total_tokens),
    requestCount: Number(row.request_count),
    userCount: Number(row.user_count),
  }));
}

// ============================================
// MCP Usage (OANA-08)
// ============================================

/**
 * Get MCP tool invocation trends for an org.
 * Counts messages with role='tool' in org-scoped conversations grouped by date.
 */
export async function getMcpUsage(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<OrgMcpUsagePoint[]> {
  const rows = await prisma.$queryRaw<
    Array<{ date: Date; tool_call_count: bigint }>
  >`
    SELECT
      DATE(m.created_at) AS date,
      COUNT(*)::bigint AS tool_call_count
    FROM messages m
    WHERE m.organization_id = ${orgId}
      AND m.role = 'tool'
      AND m.created_at >= ${startDate}
      AND m.created_at <= ${endDate}
    GROUP BY DATE(m.created_at)
    ORDER BY DATE(m.created_at) ASC
  `;

  return rows.map((row) => ({
    date: row.date.toISOString().slice(0, 10),
    toolCallCount: Number(row.tool_call_count),
  }));
}

// ============================================
// Avg Response Time (OANA-09)
// ============================================

/**
 * Get average response time per model for an org.
 * Uses requestDurationMs from UsageRecord.
 */
export async function getAvgResponseTime(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<AvgResponseTimeItem[]> {
  const rows = await prisma.$queryRaw<
    Array<{ model: string; avg_duration_ms: number }>
  >`
    SELECT
      model,
      AVG(request_duration_ms)::float AS avg_duration_ms
    FROM usage_records
    WHERE organization_id = ${orgId}
      AND created_at >= ${startDate}
      AND created_at <= ${endDate}
      AND request_duration_ms IS NOT NULL
    GROUP BY model
    ORDER BY avg_duration_ms DESC
  `;

  return rows.map((row) => ({
    modelId: row.model,
    avgDurationMs: Math.round(row.avg_duration_ms),
  }));
}

// ============================================
// Error Rate (OANA-10)
// ============================================

/**
 * Get error type distribution for an org.
 * Checks Message.metadata for errorType field.
 */
export async function getErrorRate(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<OrgErrorRateItem[]> {
  const rows = await prisma.$queryRaw<
    Array<{ error_type: string; count: bigint }>
  >`
    SELECT
      metadata->>'errorType' AS error_type,
      COUNT(*)::bigint AS count
    FROM messages
    WHERE organization_id = ${orgId}
      AND created_at >= ${startDate}
      AND created_at <= ${endDate}
      AND metadata->>'errorType' IS NOT NULL
    GROUP BY metadata->>'errorType'
    ORDER BY count DESC
  `;

  return rows.map((row) => ({
    errorType: row.error_type,
    count: Number(row.count),
  }));
}

// ============================================
// Peak Usage Hours (OANA-11)
// ============================================

/**
 * Get usage heatmap data grouped by hour of day and day of week.
 * Day of week: 0=Sunday through 6=Saturday.
 */
export async function getPeakUsageHours(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<OrgPeakUsagePoint[]> {
  const rows = await prisma.$queryRaw<
    Array<{ hour: number; day: number; count: bigint }>
  >`
    SELECT
      EXTRACT(HOUR FROM created_at)::integer AS hour,
      EXTRACT(DOW FROM created_at)::integer AS day,
      COUNT(*)::bigint AS count
    FROM usage_records
    WHERE organization_id = ${orgId}
      AND created_at >= ${startDate}
      AND created_at <= ${endDate}
    GROUP BY
      EXTRACT(HOUR FROM created_at),
      EXTRACT(DOW FROM created_at)
    ORDER BY day, hour
  `;

  return rows.map((row) => ({
    hour: row.hour,
    dayOfWeek: row.day,
    count: Number(row.count),
  }));
}

// ============================================
// Invitation Stats (OANA-12)
// ============================================

/**
 * Get invitation status distribution for an org.
 */
export async function getInvitationStats(
  orgId: string
): Promise<InvitationStatsItem[]> {
  const rows = await prisma.invitation.groupBy({
    by: ['status'],
    where: { organizationId: orgId },
    _count: { id: true },
  });

  return rows.map((row: { status: string; _count: { id: number } }) => ({
    status: row.status,
    count: row._count.id,
  }));
}

// ============================================
// API Key Usage (OANA-13)
// ============================================

/**
 * Get API key consumption for this org.
 * Queries PlatformApiKeyAssignment for keys assigned to this org,
 * then attributes usage to those keys.
 */
export async function getApiKeyUsage(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<ApiKeyUsageItem[]> {
  // Get keys assigned to this org via PlatformApiKeyAssignment
  const assignments = await prisma.platformApiKeyAssignment.findMany({
    where: { organizationId: orgId },
    include: {
      apiKey: {
        select: {
          id: true,
          name: true,
          encryptedKey: true,
        },
      },
    },
  });

  if (assignments.length === 0) {
    // Fall back to org-level aggregate usage
    const aggregate = await prisma.usageRecord.aggregate({
      where: {
        organizationId: orgId,
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        thinkingTokens: true,
      },
      _count: { id: true },
    });

    const totalTokens =
      (aggregate._sum.inputTokens ?? 0) +
      (aggregate._sum.outputTokens ?? 0) +
      (aggregate._sum.thinkingTokens ?? 0);

    if (totalTokens === 0 && aggregate._count.id === 0) return [];

    return [
      {
        keyName: 'Platform Key (shared)',
        maskedKey: '***',
        totalTokens,
        requestCount: aggregate._count.id,
      },
    ];
  }

  // Get org-level usage in the period (all usage attributed to assigned keys)
  const orgUsage = await prisma.usageRecord.aggregate({
    where: {
      organizationId: orgId,
      createdAt: { gte: startDate, lte: endDate },
    },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      thinkingTokens: true,
    },
    _count: { id: true },
  });

  const totalTokens =
    (orgUsage._sum.inputTokens ?? 0) +
    (orgUsage._sum.outputTokens ?? 0) +
    (orgUsage._sum.thinkingTokens ?? 0);

  // Mask key: show first 7 + "..." + last 4
  return assignments.map((a) => {
    const rawKey = a.apiKey.encryptedKey;
    // The key is encrypted, so we can only show the name
    const maskedKey = rawKey.length > 11
      ? rawKey.slice(0, 7) + '...' + rawKey.slice(-4)
      : '***';

    return {
      keyName: a.apiKey.name,
      maskedKey,
      // If multiple keys, split evenly (best effort since individual attribution not possible)
      totalTokens: assignments.length === 1 ? totalTokens : Math.round(totalTokens / assignments.length),
      requestCount: assignments.length === 1 ? orgUsage._count.id : Math.round(orgUsage._count.id / assignments.length),
    };
  });
}

// ============================================
// Users Near Limits (OANA-14)
// ============================================

/**
 * Get active org members whose today's usage is >= 80% of their role's daily limits.
 */
export async function getUsersNearLimits(
  orgId: string
): Promise<UserNearLimitItem[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      user_id: string;
      user_name: string;
      role_name: string;
      req_pct: number;
      tok_pct: number;
    }>
  >`
    SELECT * FROM (
      SELECT
        om.user_id,
        u.name AS user_name,
        r.name AS role_name,
        CASE
          WHEN r.daily_request_limit IS NOT NULL AND today.req_count IS NOT NULL
            THEN (today.req_count::float / r.daily_request_limit * 100)
          ELSE 0
        END AS req_pct,
        CASE
          WHEN r.daily_token_limit IS NOT NULL AND today.total_tokens IS NOT NULL
            THEN (today.total_tokens::float / r.daily_token_limit * 100)
          ELSE 0
        END AS tok_pct
      FROM org_members om
      JOIN users u ON u.id = om.user_id
      JOIN roles r ON r.id = om.role_id
      LEFT JOIN (
        SELECT user_id,
               COUNT(*)::integer AS req_count,
               SUM(input_tokens + output_tokens + thinking_tokens)::bigint AS total_tokens
        FROM usage_records
        WHERE organization_id = ${orgId}
          AND DATE(created_at) = CURRENT_DATE
        GROUP BY user_id
      ) today ON today.user_id = om.user_id
      WHERE om.organization_id = ${orgId}
        AND om.status = 'ACTIVE'
    ) sub
    WHERE sub.req_pct >= 80 OR sub.tok_pct >= 80
    ORDER BY GREATEST(sub.req_pct, sub.tok_pct) DESC
  `;

  return rows.map((row) => {
    const reqPct = Number(row.req_pct);
    const tokPct = Number(row.tok_pct);
    const isRequestBased = reqPct >= tokPct;
    return {
      userId: row.user_id,
      userName: row.user_name,
      roleName: row.role_name,
      usagePercent: Math.round(isRequestBased ? reqPct : tokPct),
      limitType: isRequestBased ? 'requests' as const : 'tokens' as const,
    };
  });
}

// ============================================
// Inactive Users (OANA-15)
// ============================================

/**
 * Get org members who have been inactive for 30+ days.
 * Inactive = status ACTIVE AND (lastActiveAt < 30 days ago OR lastActiveAt is null AND joinedAt < 30 days ago)
 */
export async function getInactiveUsers(
  orgId: string
): Promise<InactiveUserItem[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const rows = await prisma.$queryRaw<
    Array<{
      user_id: string;
      user_name: string;
      email: string;
      role_name: string;
      last_active_at: Date | null;
      days_since_active: number;
    }>
  >`
    SELECT
      om.user_id,
      u.name AS user_name,
      u.email,
      r.name AS role_name,
      om.last_active_at,
      CASE
        WHEN om.last_active_at IS NOT NULL
          THEN EXTRACT(DAY FROM NOW() - om.last_active_at)::integer
        ELSE EXTRACT(DAY FROM NOW() - om.joined_at)::integer
      END AS days_since_active
    FROM org_members om
    JOIN users u ON u.id = om.user_id
    JOIN roles r ON r.id = om.role_id
    WHERE om.organization_id = ${orgId}
      AND om.status = 'ACTIVE'
      AND (
        (om.last_active_at IS NOT NULL AND om.last_active_at < ${thirtyDaysAgo})
        OR
        (om.last_active_at IS NULL AND om.joined_at < ${thirtyDaysAgo})
      )
    ORDER BY days_since_active DESC
  `;

  return rows.map((row) => ({
    userId: row.user_id,
    userName: row.user_name,
    email: row.email,
    roleName: row.role_name,
    lastActiveAt: row.last_active_at?.toISOString() ?? null,
    daysSinceActive: Number(row.days_since_active),
  }));
}
