/**
 * Public (org-member) Password Policy API
 *
 * GET /api/org/[slug]/password-policy - Read password policy for the org
 *
 * Uses requireOrgAuth (not requireOrgAdmin) so any org member can read the policy.
 * This is specifically needed for the force-password-change page where users
 * need to see full policy requirements but do not have admin access.
 *
 * Covers: OPWD-01, OPWD-02
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAuth } from '@/lib/auth-middleware';
import { getPasswordPolicy } from '@/lib/services/password-policy-service';

export async function GET(req: NextRequest) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const policy = await getPasswordPolicy(auth.organization.id);

    return NextResponse.json({
      minLength: policy?.minLength ?? 8,
      requireUppercase: policy?.requireUppercase ?? false,
      requireLowercase: policy?.requireLowercase ?? false,
      requireNumbers: policy?.requireNumbers ?? false,
      requireSpecialChars: policy?.requireSpecialChars ?? false,
      expiryDays: policy?.expiryDays ?? null,
    });
  } catch (error) {
    console.error('Failed to fetch password policy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch password policy' },
      { status: 500 }
    );
  }
}
