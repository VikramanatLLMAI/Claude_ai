/**
 * Org Admin Analytics API Route
 *
 * GET /api/org/[slug]/admin/analytics
 *
 * Query params:
 * - section: "kpi" | "trends" | "users" | "models" | "roles" | "usage" |
 *            "mcp" | "errors" | "peak" | "invitations" | "apiKeys" | "all" (required)
 * - startDate: ISO string (optional, defaults to 30 days ago)
 * - endDate: ISO string (optional, defaults to now)
 * - export: "csv" (optional, exports section data as CSV)
 *
 * Supports section-based loading for parallel fetching from frontend.
 *
 * Covers: OANA-01 through OANA-15
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import {
  getKpiSummary,
  getUsageTrends,
  getTokensByUserRoleModel,
  getModelDistribution,
  getTopUsers,
  getPerRoleUsage,
  getMcpUsage,
  getAvgResponseTime,
  getErrorRate,
  getPeakUsageHours,
  getInvitationStats,
  getApiKeyUsage,
  getUsersNearLimits,
  getInactiveUsers,
} from '@/lib/services/org-analytics-service';

type AnalyticsSection =
  | 'kpi'
  | 'trends'
  | 'users'
  | 'models'
  | 'roles'
  | 'usage'
  | 'mcp'
  | 'errors'
  | 'peak'
  | 'invitations'
  | 'apiKeys'
  | 'all';

// ============================================
// CSV Helpers
// ============================================

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const BOM = '\uFEFF';

function toCsv(headers: string[], rows: unknown[][]): string {
  const csvLines = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => row.map(escapeCsvValue).join(',')),
  ];
  return BOM + csvLines.join('\r\n');
}

function csvResponse(csv: string, section: string): NextResponse {
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="org-analytics-${section}-${date}.csv"`,
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sectionToCsv(section: string, data: any): string {
  switch (section) {
    case 'kpi': {
      const kpi = data.kpi;
      return toCsv(
        ['Metric', 'Value'],
        [
          ['Active Members', kpi.activeMembers],
          ['Suspended Members', kpi.suspendedMembers],
          ['Pending Invitations', kpi.pendingInvitations],
          ['Total Conversations', kpi.totalConversations],
          ['Total Messages', kpi.totalMessages],
          ['Total Tokens', kpi.totalTokens],
          ['Users Near Limits', kpi.usersNearLimits],
        ]
      );
    }
    case 'trends': {
      return toCsv(
        ['Date', 'Input Tokens', 'Output Tokens', 'Thinking Tokens'],
        data.trends.map((t: { date: string; inputTokens: number; outputTokens: number; thinkingTokens: number }) => [
          t.date, t.inputTokens, t.outputTokens, t.thinkingTokens,
        ])
      );
    }
    case 'users': {
      const rows = [
        ...data.topUsers.map((u: { userName: string; roleName: string; totalTokens: number; messageCount: number }) => [
          u.userName, u.roleName, u.totalTokens, u.messageCount, 'top-user',
        ]),
        ...data.nearLimitUsers.map((u: { userName: string; roleName: string; usagePercent: number; limitType: string }) => [
          u.userName, u.roleName, u.usagePercent, u.limitType, 'near-limit',
        ]),
        ...data.inactiveUsers.map((u: { userName: string; roleName: string; email: string; daysSinceActive: number }) => [
          u.userName, u.roleName, u.email, u.daysSinceActive, 'inactive',
        ]),
      ];
      return toCsv(['Name', 'Role', 'Value1', 'Value2', 'Category'], rows);
    }
    case 'models': {
      const modelRows = data.modelDistribution.map(
        (m: { modelId: string; totalTokens: number; requestCount: number }) => [
          m.modelId, m.totalTokens, m.requestCount,
        ]
      );
      return toCsv(['Model', 'Total Tokens', 'Request Count'], modelRows);
    }
    case 'roles': {
      return toCsv(
        ['Role', 'Total Tokens', 'Request Count', 'User Count'],
        data.roles.map((r: { roleName: string; totalTokens: number; requestCount: number; userCount: number }) => [
          r.roleName, r.totalTokens, r.requestCount, r.userCount,
        ])
      );
    }
    case 'usage': {
      return toCsv(
        ['User', 'Role', 'Model', 'Input Tokens', 'Output Tokens'],
        data.usage.map((u: { userName: string; roleName: string; modelId: string; inputTokens: number; outputTokens: number }) => [
          u.userName, u.roleName, u.modelId, u.inputTokens, u.outputTokens,
        ])
      );
    }
    case 'mcp': {
      return toCsv(
        ['Date', 'Tool Call Count'],
        data.mcp.map((m: { date: string; toolCallCount: number }) => [m.date, m.toolCallCount])
      );
    }
    case 'errors': {
      return toCsv(
        ['Error Type', 'Count'],
        data.errors.map((e: { errorType: string; count: number }) => [e.errorType, e.count])
      );
    }
    case 'peak': {
      return toCsv(
        ['Hour', 'Day of Week', 'Count'],
        data.peak.map((p: { hour: number; dayOfWeek: number; count: number }) => [p.hour, p.dayOfWeek, p.count])
      );
    }
    case 'invitations': {
      return toCsv(
        ['Status', 'Count'],
        data.invitations.map((i: { status: string; count: number }) => [i.status, i.count])
      );
    }
    case 'apiKeys': {
      return toCsv(
        ['Key Name', 'Masked Key', 'Total Tokens', 'Request Count'],
        data.apiKeys.map((k: { keyName: string; maskedKey: string; totalTokens: number; requestCount: number }) => [
          k.keyName, k.maskedKey, k.totalTokens, k.requestCount,
        ])
      );
    }
    default:
      return '';
  }
}

// ============================================
// GET Handler
// ============================================

export async function GET(req: NextRequest) {
  // Auth check
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const orgId = auth.organization.id;

  // Parse query params
  const { searchParams } = req.nextUrl;
  const section = searchParams.get('section') as AnalyticsSection | null;
  const exportFormat = searchParams.get('export');

  if (!section) {
    return NextResponse.json(
      { error: 'section parameter is required' },
      { status: 400 }
    );
  }

  const validSections: AnalyticsSection[] = [
    'kpi', 'trends', 'users', 'models', 'roles', 'usage',
    'mcp', 'errors', 'peak', 'invitations', 'apiKeys', 'all',
  ];

  if (!validSections.includes(section)) {
    return NextResponse.json(
      { error: `Invalid section. Valid sections: ${validSections.join(', ')}` },
      { status: 400 }
    );
  }

  // Default date range: last 30 days
  const endDateParam = searchParams.get('endDate');
  const startDateParam = searchParams.get('startDate');

  const endDate = endDateParam ? new Date(endDateParam) : new Date();
  const startDate = startDateParam
    ? new Date(startDateParam)
    : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json(
      { error: 'Invalid date format. Use ISO strings.' },
      { status: 400 }
    );
  }

  if (startDate > endDate) {
    return NextResponse.json(
      { error: 'startDate must be before endDate' },
      { status: 400 }
    );
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: Record<string, any> = {};

    switch (section) {
      case 'kpi': {
        result = { kpi: await getKpiSummary(orgId) };
        break;
      }
      case 'trends': {
        result = { trends: await getUsageTrends(orgId, startDate, endDate) };
        break;
      }
      case 'users': {
        const [topUsers, nearLimitUsers, inactiveUsers] = await Promise.all([
          getTopUsers(orgId, startDate, endDate),
          getUsersNearLimits(orgId),
          getInactiveUsers(orgId),
        ]);
        result = { topUsers, nearLimitUsers, inactiveUsers };
        break;
      }
      case 'models': {
        const [modelDistribution, avgResponseTime] = await Promise.all([
          getModelDistribution(orgId, startDate, endDate),
          getAvgResponseTime(orgId, startDate, endDate),
        ]);
        result = { modelDistribution, avgResponseTime };
        break;
      }
      case 'roles': {
        result = { roles: await getPerRoleUsage(orgId, startDate, endDate) };
        break;
      }
      case 'usage': {
        result = { usage: await getTokensByUserRoleModel(orgId, startDate, endDate) };
        break;
      }
      case 'mcp': {
        result = { mcp: await getMcpUsage(orgId, startDate, endDate) };
        break;
      }
      case 'errors': {
        result = { errors: await getErrorRate(orgId, startDate, endDate) };
        break;
      }
      case 'peak': {
        result = { peak: await getPeakUsageHours(orgId, startDate, endDate) };
        break;
      }
      case 'invitations': {
        result = { invitations: await getInvitationStats(orgId) };
        break;
      }
      case 'apiKeys': {
        result = { apiKeys: await getApiKeyUsage(orgId, startDate, endDate) };
        break;
      }
      case 'all': {
        const [
          kpi, trends, topUsers, nearLimitUsers, inactiveUsers,
          modelDistribution, avgResponseTime, roles, usage,
          mcp, errors, peak, invitations, apiKeys,
        ] = await Promise.all([
          getKpiSummary(orgId),
          getUsageTrends(orgId, startDate, endDate),
          getTopUsers(orgId, startDate, endDate),
          getUsersNearLimits(orgId),
          getInactiveUsers(orgId),
          getModelDistribution(orgId, startDate, endDate),
          getAvgResponseTime(orgId, startDate, endDate),
          getPerRoleUsage(orgId, startDate, endDate),
          getTokensByUserRoleModel(orgId, startDate, endDate),
          getMcpUsage(orgId, startDate, endDate),
          getErrorRate(orgId, startDate, endDate),
          getPeakUsageHours(orgId, startDate, endDate),
          getInvitationStats(orgId),
          getApiKeyUsage(orgId, startDate, endDate),
        ]);
        result = {
          kpi, trends, topUsers, nearLimitUsers, inactiveUsers,
          modelDistribution, avgResponseTime, roles, usage,
          mcp, errors, peak, invitations, apiKeys,
        };
        break;
      }
    }

    // CSV export
    if (exportFormat === 'csv') {
      if (section === 'all') {
        return NextResponse.json(
          { error: 'CSV export is not supported for section=all. Export individual sections.' },
          { status: 400 }
        );
      }
      const csv = sectionToCsv(section, result);
      return csvResponse(csv, section);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Org analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
