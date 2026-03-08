/**
 * Super Admin Analytics API Route
 *
 * GET /api/super-admin/analytics
 *
 * Query params:
 * - startDate: ISO string (required)
 * - endDate: ISO string (required)
 * - section: "kpi" | "trends" | "topOrgs" | "errors" | "peakHours" |
 *            "apiKeys" | "mcp" | "registrations" | "adoption" | "all" (default: "all")
 *
 * Supports section-based loading for parallel fetching from frontend.
 * KPI section is lightweight; chart sections can load in parallel.
 *
 * Covers: SANA-01 through SANA-12
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';
import {
  getKpiSummary,
  getUsageTrends,
  getTokensByOrgModel,
  getTopOrgsByUsage,
  getErrorRates,
  getPeakUsageHours,
  getApiKeyConsumption,
  getMcpUsageTrends,
  getRegistrationTrends,
  getFeatureAdoption,
} from '@/lib/services/platform-analytics-service';

type AnalyticsSection =
  | 'kpi'
  | 'trends'
  | 'topOrgs'
  | 'errors'
  | 'peakHours'
  | 'apiKeys'
  | 'mcp'
  | 'registrations'
  | 'adoption'
  | 'all';

export async function GET(req: NextRequest) {
  // Auth check
  const auth = await requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlGet = checkRateLimit(`api:${auth.user.id}`, RATE_LIMITS.api);
  if (!rlGet.allowed) return rateLimitResponse(rlGet.retryAfterSeconds);

  // Parse query params
  const { searchParams } = req.nextUrl;
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  const section = (searchParams.get('section') ?? 'all') as AnalyticsSection;

  if (!startDateParam || !endDateParam) {
    return NextResponse.json(
      { error: 'startDate and endDate are required' },
      { status: 400 }
    );
  }

  const startDate = new Date(startDateParam);
  const endDate = new Date(endDateParam);

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
    // Section-specific loading for frontend performance
    if (section === 'kpi') {
      const kpi = await getKpiSummary();
      return NextResponse.json({ kpi });
    }

    if (section === 'trends') {
      const trends = await getUsageTrends(startDate, endDate);
      return NextResponse.json({ trends });
    }

    if (section === 'topOrgs') {
      const topOrgs = await getTopOrgsByUsage(startDate, endDate);
      return NextResponse.json({ topOrgs });
    }

    if (section === 'errors') {
      const errors = await getErrorRates(startDate, endDate);
      return NextResponse.json({ errors });
    }

    if (section === 'peakHours') {
      const peakHours = await getPeakUsageHours(startDate, endDate);
      return NextResponse.json({ peakHours });
    }

    if (section === 'apiKeys') {
      const apiKeys = await getApiKeyConsumption(startDate, endDate);
      return NextResponse.json({ apiKeys });
    }

    if (section === 'mcp') {
      const mcp = await getMcpUsageTrends(startDate, endDate);
      return NextResponse.json({ mcp });
    }

    if (section === 'registrations') {
      const registrations = await getRegistrationTrends(startDate, endDate);
      return NextResponse.json({ registrations });
    }

    if (section === 'adoption') {
      const adoption = await getFeatureAdoption(startDate, endDate);
      return NextResponse.json({ adoption });
    }

    // 'all' or unknown section: fetch all data in parallel
    const [
      kpi,
      trends,
      tokensByOrgModel,
      topOrgs,
      errors,
      peakHours,
      apiKeys,
      mcp,
      registrations,
      adoption,
    ] = await Promise.all([
      getKpiSummary(),
      getUsageTrends(startDate, endDate),
      getTokensByOrgModel(startDate, endDate),
      getTopOrgsByUsage(startDate, endDate),
      getErrorRates(startDate, endDate),
      getPeakUsageHours(startDate, endDate),
      getApiKeyConsumption(startDate, endDate),
      getMcpUsageTrends(startDate, endDate),
      getRegistrationTrends(startDate, endDate),
      getFeatureAdoption(startDate, endDate),
    ]);

    return NextResponse.json({
      kpi,
      trends,
      tokensByOrgModel,
      topOrgs,
      errors,
      peakHours,
      apiKeys,
      mcp,
      registrations,
      adoption,
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
