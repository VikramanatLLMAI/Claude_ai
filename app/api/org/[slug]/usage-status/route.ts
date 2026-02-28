/**
 * Usage Status API - Current User's Usage for Chat UI Polling
 *
 * GET /api/org/[slug]/usage-status
 *
 * Returns the current user's rolling 24-hour usage status including
 * request/token counts, percentages against limits, and warning/blocked flags.
 * Lightweight endpoint suitable for polling every 60 seconds from the chat UI.
 *
 * Covers: OUSE-02, OUSE-03, UCHAT-03
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAuth } from '@/lib/auth-middleware';
import { getUserUsageSummary } from '@/lib/services/usage-service';

export async function GET(req: NextRequest) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user, role, tenantDb } = auth;

  try {
    const summary = await getUserUsageSummary(tenantDb, user.id, role);

    // Compute warning and blocked flags
    const requestPercentage = summary.requests.percentage;
    const tokenPercentage = summary.tokens.percentage;

    const blocked =
      (summary.requests.limit !== null && requestPercentage >= 1) ||
      (summary.tokens.limit !== null && tokenPercentage >= 1);

    const warning =
      !blocked &&
      ((summary.requests.limit !== null && requestPercentage >= 0.8) ||
        (summary.tokens.limit !== null && tokenPercentage >= 0.8));

    return NextResponse.json({
      requestStatus: summary.requests.limit !== null
        ? {
            current: summary.requests.current,
            limit: summary.requests.limit,
            percentage: summary.requests.percentage,
          }
        : null,
      tokenStatus: summary.tokens.limit !== null
        ? {
            current: summary.tokens.current,
            limit: summary.tokens.limit,
            percentage: summary.tokens.percentage,
          }
        : null,
      resetAt: summary.resetAt,
      warning,
      blocked,
    });
  } catch (error) {
    console.error('[UsageStatus] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage status' },
      { status: 500 }
    );
  }
}
