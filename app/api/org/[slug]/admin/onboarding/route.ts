/**
 * Org Admin Onboarding Config API
 *
 * GET /api/org/[slug]/admin/onboarding  -- Get onboarding config
 * PUT /api/org/[slug]/admin/onboarding  -- Update onboarding text + bump version
 *
 * Org Admin manages onboarding text that users must accept.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import {
  getOnboardingConfig,
  updateOnboardingConfig,
} from '@/lib/services/onboarding-service';

/**
 * GET - Return current onboarding config (text + version)
 */
export async function GET(req: NextRequest) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const config = await getOnboardingConfig(auth.organization.id);
  return NextResponse.json(config);
}

/**
 * PUT - Update onboarding text and bump version
 */
export async function PUT(req: NextRequest) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const text = body.text;

    if (typeof text !== 'string') {
      return NextResponse.json(
        { error: 'text must be a string' },
        { status: 400 }
      );
    }

    const ipAddress = getIpAddress(req);

    await updateOnboardingConfig(
      auth.organization.id,
      text,
      auth.user.id,
      ipAddress
    );

    const config = await getOnboardingConfig(auth.organization.id);
    return NextResponse.json(config);
  } catch (error) {
    console.error('Onboarding config API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
