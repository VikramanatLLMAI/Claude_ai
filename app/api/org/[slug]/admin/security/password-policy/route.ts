/**
 * Password Policy API
 *
 * GET  /api/org/[slug]/admin/security/password-policy - Get current password policy
 * PATCH /api/org/[slug]/admin/security/password-policy - Update password policy
 *
 * Requires Org Admin authentication.
 * Covers: OPWD-01, OPWD-02, OPWD-03, OPWD-05, OPWD-06
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import {
  getPasswordPolicy,
  updatePasswordPolicy,
} from '@/lib/services/password-policy-service';
import { formatValidationErrors } from '@/lib/validation';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

/**
 * Default password policy values when no policy record exists.
 */
const DEFAULT_POLICY = {
  minLength: 8,
  requireUppercase: false,
  requireLowercase: false,
  requireNumbers: false,
  requireSpecialChars: false,
  expiryDays: null,
};

/**
 * Zod schema for PATCH body validation.
 */
const UpdatePasswordPolicySchema = z.object({
  minLength: z.number().int().min(8).max(128).optional(),
  requireUppercase: z.boolean().optional(),
  requireLowercase: z.boolean().optional(),
  requireNumbers: z.boolean().optional(),
  requireSpecialChars: z.boolean().optional(),
  expiryDays: z
    .union([z.number().int().min(1).max(365), z.null()])
    .optional(),
});

/**
 * GET /api/org/[slug]/admin/security/password-policy
 * Returns the current password policy for the organization, or defaults.
 */
export async function GET(req: NextRequest) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const policy = await getPasswordPolicy(auth.organization.id);

    return NextResponse.json(
      policy
        ? {
            minLength: policy.minLength,
            requireUppercase: policy.requireUppercase,
            requireLowercase: policy.requireLowercase,
            requireNumbers: policy.requireNumbers,
            requireSpecialChars: policy.requireSpecialChars,
            expiryDays: policy.expiryDays,
          }
        : DEFAULT_POLICY
    );
  } catch (error) {
    console.error('Failed to get password policy:', error);
    return NextResponse.json(
      { error: 'Failed to load password policy' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/org/[slug]/admin/security/password-policy
 * Update the password policy settings.
 *
 * OPWD-06: No lock-out check at save time -- enforcement is on next login only (OPWD-05).
 * The admin's own password will be checked on their next login, and they can change it before then.
 */
export async function PATCH(req: NextRequest) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();

  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();

    const parsed = UpdatePasswordPolicySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationErrors(parsed.error.issues) },
        { status: 400 }
      );
    }

    const ipAddress = getIpAddress(req);
    const policy = await updatePasswordPolicy(
      auth.organization.id,
      parsed.data,
      {
        userId: auth.user.id,
        organizationId: auth.organization.id,
        ipAddress,
      }
    );

    return NextResponse.json({
      minLength: policy.minLength,
      requireUppercase: policy.requireUppercase,
      requireLowercase: policy.requireLowercase,
      requireNumbers: policy.requireNumbers,
      requireSpecialChars: policy.requireSpecialChars,
      expiryDays: policy.expiryDays,
      note: 'Changes apply to users on their next login',
    });
  } catch (error) {
    console.error('Failed to update password policy:', error);
    return NextResponse.json(
      { error: 'Failed to update password policy' },
      { status: 500 }
    );
  }
}
