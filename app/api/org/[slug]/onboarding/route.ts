/**
 * User-Facing Onboarding API
 *
 * GET  /api/org/[slug]/onboarding  -- Check if onboarding required + return text
 * POST /api/org/[slug]/onboarding  -- Record onboarding acceptance
 *
 * Uses requireOrgAuth (any org member, not just admin).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAuth } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';
import {
  checkOnboardingRequired,
  acceptOnboarding,
  getOnboardingConfig,
} from '@/lib/services/onboarding-service';

/**
 * GET - Check if onboarding is required for current user + return onboarding text
 */
export async function GET(req: NextRequest) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { user, orgMember, organization } = auth;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlGet = checkRateLimit(`api:${user.id}`, RATE_LIMITS.api);
  if (!rlGet.allowed) return rateLimitResponse(rlGet.retryAfterSeconds);

  const [required, config] = await Promise.all([
    checkOnboardingRequired(user.id, orgMember.id, organization.id),
    getOnboardingConfig(organization.id),
  ]);

  return NextResponse.json({
    required,
    text: config.text,
    version: config.version,
  });
}

/**
 * POST - Record onboarding acceptance
 */
export async function POST(req: NextRequest) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();

  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { user, orgMember, organization } = auth;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlPost = checkRateLimit(`api:${user.id}`, RATE_LIMITS.api);
  if (!rlPost.allowed) return rateLimitResponse(rlPost.retryAfterSeconds);
  const ipAddress = getIpAddress(req);

  try {
    await acceptOnboarding(user.id, orgMember.id, organization.id, ipAddress);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding acceptance API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
