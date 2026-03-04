/**
 * Platform Analytics Service
 *
 * Aggregates platform-level analytics data for the Super Admin analytics dashboard.
 * All queries use raw prisma (cross-org, platform-level).
 * Uses prisma.$queryRaw for date-grouped aggregations (consistent with usage-service.ts pattern).
 *
 * Functions:
 * - getKpiSummary: Total orgs, users, conversations, messages, tokens
 * - getUsageTrends: Daily token usage breakdown by type
 * - getTokensByOrgModel: Daily tokens grouped by org and model
 * - getTopOrgsByUsage: Top N orgs by total token consumption
 * - getErrorRates: AI error type distribution
 * - getPeakUsageHours: Hour x day usage heatmap data
 * - getApiKeyConsumption: Token consumption per API key assignment
 * - getMcpUsageTrends: MCP tool invocation trends over time
 * - getRegistrationTrends: New org and user registrations over time
 * - getFeatureAdoption: Feature adoption rates across orgs
 *
 * Covers: SANA-01 through SANA-12
 */

import prisma from '@/lib/db';

// ============================================
// Types
// ============================================

export interface KpiSummary {
  totalOrgs: number;
  activeOrgs: number;
  suspendedOrgs: number;
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalConversations: number;
  totalMessages: number;
  totalTokens: number;
}

export interface UsageTrendPoint {
  date: string;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  totalTokens: number;
}

export interface OrgModelUsagePoint {
  date: string;
  orgId: string;
  orgName: string;
  model: string;
  tokens: number;
}

export interface TopOrgUsage {
  orgId: string;
  name: string;
  slug: string;
  totalTokens: number;
  totalMessages: number;
  totalConversations: number;
}

export interface ErrorRateItem {
  type: string;
  count: number;
}

export interface PeakUsagePoint {
  hour: number;
  day: number;
  count: number;
}

export interface ApiKeyConsumptionItem {
  keyId: string;
  keyName: string;
  orgId: string | null;
  orgName: string | null;
  totalTokens: number;
  totalRequests: number;
}

export interface McpUsageTrendPoint {
  date: string;
  toolInvocations: number;
}

export interface RegistrationTrendPoint {
  date: string;
  newOrgs: number;
  newUsers: number;
}

export interface FeatureAdoptionItem {
  feature: string;
  orgCount: number;
  percentage: number;
}

// ============================================
// KPI Summary (SANA-01 to SANA-03)
// ============================================

/**
 * Get platform KPI summary: orgs, users, conversations, messages, tokens.
 */
export async function getKpiSummary(): Promise<KpiSummary> {
  const [orgCounts, userCounts, totalConversations, totalMessages, tokenTotals] =
    await Promise.all([
      // Org counts by status
      prisma.organization.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      // User counts from OrgMember (distinct users by status)
      prisma.orgMember.groupBy({
        by: ['status'],
        _count: { userId: true },
      }),
      // Total conversations
      prisma.conversation.count(),
      // Total messages
      prisma.message.count(),
      // Token totals from UsageRecord
      prisma.usageRecord.aggregate({
        _sum: {
          inputTokens: true,
          outputTokens: true,
          thinkingTokens: true,
        },
      }),
    ]);

  const activeOrgs =
    orgCounts.find((g: { status: string; _count: { id: number } }) => g.status === 'ACTIVE')?._count.id ?? 0;
  const suspendedOrgs =
    orgCounts.find((g: { status: string; _count: { id: number } }) => g.status === 'SUSPENDED')?._count.id ?? 0;

  const activeUsers =
    userCounts.find((g: { status: string; _count: { userId: number } }) => g.status === 'ACTIVE')?._count.userId ?? 0;
  const suspendedUsers =
    userCounts.find((g: { status: string; _count: { userId: number } }) => g.status === 'SUSPENDED')?._count.userId ?? 0;

  const totalTokens =
    (tokenTotals._sum.inputTokens ?? 0) +
    (tokenTotals._sum.outputTokens ?? 0) +
    (tokenTotals._sum.thinkingTokens ?? 0);

  return {
    totalOrgs: activeOrgs + suspendedOrgs,
    activeOrgs,
    suspendedOrgs,
    totalUsers: activeUsers + suspendedUsers,
    activeUsers,
    suspendedUsers,
    totalConversations,
    totalMessages,
    totalTokens,
  };
}

// ============================================
// Usage Trends (SANA-05)
// ============================================

/**
 * Get daily token usage grouped by type (input, output, thinking).
 * Uses raw SQL for DATE() grouping since Prisma groupBy lacks date truncation.
 */
export async function getUsageTrends(
  startDate: Date,
  endDate: Date
): Promise<UsageTrendPoint[]> {
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
    WHERE created_at >= ${startDate} AND created_at <= ${endDate}
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at) ASC
  `;

  return rows.map((row) => {
    const inputTokens = Number(row.input_tokens);
    const outputTokens = Number(row.output_tokens);
    const thinkingTokens = Number(row.thinking_tokens);
    return {
      date: row.date.toISOString().slice(0, 10),
      inputTokens,
      outputTokens,
      thinkingTokens,
      totalTokens: inputTokens + outputTokens + thinkingTokens,
    };
  });
}

// ============================================
// Tokens by Org/Model (SANA-04)
// ============================================

/**
 * Get daily token consumption grouped by organization and model.
 * Returns flat array for building stacked area charts by org.
 */
export async function getTokensByOrgModel(
  startDate: Date,
  endDate: Date
): Promise<OrgModelUsagePoint[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      date: Date;
      organization_id: string;
      org_name: string;
      model: string;
      tokens: bigint;
    }>
  >`
    SELECT
      DATE(ur.created_at) AS date,
      ur.organization_id,
      o.name AS org_name,
      ur.model,
      SUM(ur.input_tokens + ur.output_tokens + ur.thinking_tokens)::bigint AS tokens
    FROM usage_records ur
    JOIN organizations o ON o.id = ur.organization_id
    WHERE ur.created_at >= ${startDate} AND ur.created_at <= ${endDate}
    GROUP BY DATE(ur.created_at), ur.organization_id, o.name, ur.model
    ORDER BY DATE(ur.created_at) ASC
  `;

  return rows.map((row) => ({
    date: row.date.toISOString().slice(0, 10),
    orgId: row.organization_id,
    orgName: row.org_name,
    model: row.model,
    tokens: Number(row.tokens),
  }));
}

// ============================================
// Top Orgs by Usage (SANA-06)
// ============================================

/**
 * Get top N organizations by total token consumption in the time period.
 */
export async function getTopOrgsByUsage(
  startDate: Date,
  endDate: Date,
  limit = 10
): Promise<TopOrgUsage[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      organization_id: string;
      org_name: string;
      slug: string;
      total_tokens: bigint;
      total_requests: bigint;
    }>
  >`
    SELECT
      ur.organization_id,
      o.name AS org_name,
      o.slug,
      SUM(ur.input_tokens + ur.output_tokens + ur.thinking_tokens)::bigint AS total_tokens,
      COUNT(ur.id)::bigint AS total_requests
    FROM usage_records ur
    JOIN organizations o ON o.id = ur.organization_id
    WHERE ur.created_at >= ${startDate} AND ur.created_at <= ${endDate}
    GROUP BY ur.organization_id, o.name, o.slug
    ORDER BY total_tokens DESC
    LIMIT ${limit}
  `;

  // Also get conversation counts per org in the period
  const orgIds = rows.map((r) => r.organization_id);

  let convCounts: Array<{ organizationId: string; _count: { id: number } }> = [];
  if (orgIds.length > 0) {
    convCounts = await prisma.conversation.groupBy({
      by: ['organizationId'],
      where: {
        organizationId: { in: orgIds },
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
    });
  }

  const convCountMap = new Map(
    convCounts.map((c) => [c.organizationId, c._count.id])
  );

  return rows.map((row) => ({
    orgId: row.organization_id,
    name: row.org_name,
    slug: row.slug,
    totalTokens: Number(row.total_tokens),
    totalMessages: Number(row.total_requests),
    totalConversations: convCountMap.get(row.organization_id) ?? 0,
  }));
}

// ============================================
// Error Rates (SANA-07)
// ============================================

/**
 * Get AI error rate data grouped by error type.
 *
 * Checks Message.metadata for errorType field. Since error tracking
 * via metadata is optional, returns empty array if no errors recorded.
 */
export async function getErrorRates(
  startDate: Date,
  endDate: Date
): Promise<ErrorRateItem[]> {
  // Query messages that have error metadata
  const rows = await prisma.$queryRaw<
    Array<{ error_type: string; count: bigint }>
  >`
    SELECT
      metadata->>'errorType' AS error_type,
      COUNT(*)::bigint AS count
    FROM messages
    WHERE created_at >= ${startDate}
      AND created_at <= ${endDate}
      AND metadata->>'errorType' IS NOT NULL
    GROUP BY metadata->>'errorType'
    ORDER BY count DESC
  `;

  if (rows.length === 0) {
    return [];
  }

  return rows.map((row) => ({
    type: row.error_type,
    count: Number(row.count),
  }));
}

// ============================================
// Peak Usage Hours (SANA-08)
// ============================================

/**
 * Get usage heatmap data grouped by hour of day and day of week.
 * Returns 24x7 grid suitable for heatmap rendering.
 * Day of week: 0=Sunday through 6=Saturday.
 */
export async function getPeakUsageHours(
  startDate: Date,
  endDate: Date
): Promise<PeakUsagePoint[]> {
  const rows = await prisma.$queryRaw<
    Array<{ hour: number; day: number; count: bigint }>
  >`
    SELECT
      EXTRACT(HOUR FROM created_at)::integer AS hour,
      EXTRACT(DOW FROM created_at)::integer AS day,
      COUNT(*)::bigint AS count
    FROM usage_records
    WHERE created_at >= ${startDate} AND created_at <= ${endDate}
    GROUP BY
      EXTRACT(HOUR FROM created_at),
      EXTRACT(DOW FROM created_at)
    ORDER BY day, hour
  `;

  return rows.map((row) => ({
    hour: row.hour,
    day: row.day,
    count: Number(row.count),
  }));
}

// ============================================
// API Key Consumption (SANA-09)
// ============================================

/**
 * Get token consumption attributed to each platform API key.
 *
 * Since individual requests are not tagged with keyId, we derive consumption
 * by summing usage per organization and attributing to the active key for that org.
 */
export async function getApiKeyConsumption(
  startDate: Date,
  endDate: Date
): Promise<ApiKeyConsumptionItem[]> {
  // Get all active platform API keys with their org assignments
  const keys = await prisma.platformApiKey.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      organizationId: true,
      organization: {
        select: { id: true, name: true },
      },
    },
  });

  if (keys.length === 0) return [];

  // Get usage per org in the period
  const usageByOrg = await prisma.usageRecord.groupBy({
    by: ['organizationId'],
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
    _count: { id: true },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      thinkingTokens: true,
    },
  });

  const usageMap = new Map(
    (usageByOrg as Array<{
      organizationId: string;
      _count: { id: number };
      _sum: { inputTokens: number | null; outputTokens: number | null; thinkingTokens: number | null };
    }>).map((u) => [
      u.organizationId,
      {
        requests: u._count.id,
        tokens:
          (u._sum.inputTokens ?? 0) +
          (u._sum.outputTokens ?? 0) +
          (u._sum.thinkingTokens ?? 0),
      },
    ])
  );

  return keys.map((key) => {
    const usage = key.organizationId ? usageMap.get(key.organizationId) : undefined;
    return {
      keyId: key.id,
      keyName: key.name,
      orgId: key.organizationId,
      orgName: key.organization?.name ?? null,
      totalTokens: usage?.tokens ?? 0,
      totalRequests: usage?.requests ?? 0,
    };
  });
}

// ============================================
// MCP Usage Trends (SANA-10)
// ============================================

/**
 * Get MCP tool invocation trends over time.
 * Counts messages with role='tool' grouped by date.
 */
export async function getMcpUsageTrends(
  startDate: Date,
  endDate: Date
): Promise<McpUsageTrendPoint[]> {
  const rows = await prisma.$queryRaw<
    Array<{ date: Date; tool_invocations: bigint }>
  >`
    SELECT
      DATE(created_at) AS date,
      COUNT(*)::bigint AS tool_invocations
    FROM messages
    WHERE role = 'tool'
      AND created_at >= ${startDate}
      AND created_at <= ${endDate}
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at) ASC
  `;

  return rows.map((row) => ({
    date: row.date.toISOString().slice(0, 10),
    toolInvocations: Number(row.tool_invocations),
  }));
}

// ============================================
// Registration Trends (SANA-11)
// ============================================

/**
 * Get new org and user registration trends over time.
 * Orgs: grouped by DATE(created_at) from Organization.
 * Users: grouped by DATE(joined_at) from OrgMember.
 */
export async function getRegistrationTrends(
  startDate: Date,
  endDate: Date
): Promise<RegistrationTrendPoint[]> {
  const [orgRows, userRows] = await Promise.all([
    prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT
        DATE(created_at) AS date,
        COUNT(*)::bigint AS count
      FROM organizations
      WHERE created_at >= ${startDate}
        AND created_at <= ${endDate}
        AND deleted_at IS NULL
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `,
    prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT
        DATE(joined_at) AS date,
        COUNT(*)::bigint AS count
      FROM org_members
      WHERE joined_at >= ${startDate}
        AND joined_at <= ${endDate}
      GROUP BY DATE(joined_at)
      ORDER BY DATE(joined_at) ASC
    `,
  ]);

  // Merge by date
  const dateMap = new Map<string, { newOrgs: number; newUsers: number }>();

  for (const row of orgRows) {
    const d = row.date.toISOString().slice(0, 10);
    const existing = dateMap.get(d) ?? { newOrgs: 0, newUsers: 0 };
    existing.newOrgs = Number(row.count);
    dateMap.set(d, existing);
  }

  for (const row of userRows) {
    const d = row.date.toISOString().slice(0, 10);
    const existing = dateMap.get(d) ?? { newOrgs: 0, newUsers: 0 };
    existing.newUsers = Number(row.count);
    dateMap.set(d, existing);
  }

  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));
}

// ============================================
// Feature Adoption (SANA-12)
// ============================================

/**
 * Get feature adoption metrics showing what percentage of orgs use each feature.
 *
 * Features tracked:
 * - File uploads: orgs with messages containing file attachments (parts with type=file)
 * - MCP tools: orgs with messages of role='tool'
 * - Artifacts: orgs with Artifact records
 * - Thinking: orgs with UsageRecord where thinkingTokens > 0
 */
export async function getFeatureAdoption(
  startDate: Date,
  endDate: Date
): Promise<FeatureAdoptionItem[]> {
  const totalOrgs = await prisma.organization.count({
    where: { deletedAt: null, status: 'ACTIVE' },
  });

  if (totalOrgs === 0) {
    return [];
  }

  const [mcpOrgs, artifactOrgs, thinkingOrgs, fileUploadOrgs] = await Promise.all([
    // MCP tools: orgs with tool-role messages
    prisma.$queryRaw<Array<{ org_count: bigint }>>`
      SELECT COUNT(DISTINCT organization_id)::bigint AS org_count
      FROM messages
      WHERE role = 'tool'
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
    `,
    // Artifacts: orgs with artifact records
    prisma.$queryRaw<Array<{ org_count: bigint }>>`
      SELECT COUNT(DISTINCT organization_id)::bigint AS org_count
      FROM artifacts
      WHERE created_at >= ${startDate}
        AND created_at <= ${endDate}
    `,
    // Thinking: orgs with thinking tokens
    prisma.$queryRaw<Array<{ org_count: bigint }>>`
      SELECT COUNT(DISTINCT organization_id)::bigint AS org_count
      FROM usage_records
      WHERE thinking_tokens > 0
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
    `,
    // File uploads: orgs with messages containing file parts
    prisma.$queryRaw<Array<{ org_count: bigint }>>`
      SELECT COUNT(DISTINCT organization_id)::bigint AS org_count
      FROM messages
      WHERE parts IS NOT NULL
        AND parts::text LIKE '%"type":"file"%'
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
    `,
  ]);

  const features = [
    { feature: 'MCP Tools', count: Number(mcpOrgs[0]?.org_count ?? 0) },
    { feature: 'Artifacts', count: Number(artifactOrgs[0]?.org_count ?? 0) },
    { feature: 'Adaptive/Extended Thinking', count: Number(thinkingOrgs[0]?.org_count ?? 0) },
    { feature: 'File Uploads', count: Number(fileUploadOrgs[0]?.org_count ?? 0) },
  ];

  return features.map(({ feature, count }) => ({
    feature,
    orgCount: count,
    percentage: totalOrgs > 0 ? Math.round((count / totalOrgs) * 100) : 0,
  }));
}
