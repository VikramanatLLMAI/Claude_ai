/**
 * Change Password API (for logged-in users)
 * POST /api/auth/change-password - Change password while authenticated
 *
 * Enhanced for OPWD-04: validates against org policy, clears forcePasswordChange,
 * and updates passwordChangedAt timestamp.
 */

import { updateUser } from '@/lib/storage';
import { hashPassword, verifyPassword } from '@/lib/encryption';
import { requireAuth } from '@/lib/auth-middleware';
import {
  ChangePasswordSchema,
  validate,
  formatValidationErrors,
} from '@/lib/validation';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';
import {
  getPasswordPolicy,
  validatePasswordAgainstPolicy,
} from '@/lib/services/password-policy-service';

export async function POST(req: NextRequest) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();

  try {
    // Require authentication
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    const body = await req.json();

    // Validate request body
    const validation = validate(ChangePasswordSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationErrors(validation.errors!) },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validation.data!;

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(
      currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Check if new password is same as current
    const isSamePassword = await verifyPassword(newPassword, user.passwordHash);
    if (isSamePassword) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      );
    }

    // Find user's org membership to validate against org policy
    const orgMember = await prisma.orgMember.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
        organization: { deletedAt: null, status: 'ACTIVE' },
      },
      select: {
        id: true,
        organizationId: true,
        forcePasswordChange: true,
      },
    });

    // Validate new password against org policy (if user belongs to an org)
    if (orgMember) {
      const policy = await getPasswordPolicy(orgMember.organizationId);
      const policyResult = validatePasswordAgainstPolicy(newPassword, policy);

      if (!policyResult.valid) {
        return NextResponse.json(
          { error: policyResult.errors.join('. ') },
          { status: 400 }
        );
      }
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update user's password and passwordChangedAt
    await updateUser(user.id, {
      passwordHash,
      passwordChangedAt: new Date(),
    });

    // Clear forcePasswordChange flag if it was set
    if (orgMember?.forcePasswordChange) {
      await prisma.orgMember.update({
        where: { id: orgMember.id },
        data: { forcePasswordChange: false },
      });
    }

    return NextResponse.json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
}
